import { Hono } from 'hono';
import { sessionAccountId } from '../auth';
import { triggerAutomations } from '../automation-engine';
import { calculateLeadScore } from '../scoring-engine';

type Bindings = { DB: any; SESSION_SECRET?: string };

export const webhooksRoutes = new Hono<{ Bindings: Bindings }>();

webhooksRoutes.get('/webhooks', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json([]);
  const { results } = await c.env.DB.prepare('SELECT * FROM webhooks WHERE account_id = ?').bind(account_id).all();
  return c.json(results.map((w: any) => ({ ...w, active: w.is_active === 1 })));
});

webhooksRoutes.post('/webhooks', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);

    // Provide valid funnel_id and stage_id to satisfy NOT NULL and FOREIGN KEY constraints on older schemas
    let funnel_id = body.funnel_id;
    if (!funnel_id) {
      const funnel: any = await c.env.DB.prepare('SELECT id FROM funnels WHERE account_id = ? LIMIT 1').bind(account_id).first();
      funnel_id = funnel ? funnel.id : 'f_vendas';
    }

    let stage_id = body.stage_id;
    if (!stage_id) {
      const stage: any = await c.env.DB.prepare('SELECT id FROM stages WHERE funnel_id = ? LIMIT 1').bind(funnel_id).first();
      stage_id = stage ? stage.id : 's_contato';
    }

    await c.env.DB.prepare('INSERT INTO webhooks (id, account_id, name, url, events, is_active, funnel_id, stage_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, account_id, body.name || 'Novo Webhook', body.url || '', 'all', body.active ? 1 : 0, funnel_id, stage_id)
      .run();

    return c.json({ id, account_id, name: body.name, url: body.url, active: body.active, funnel_id, stage_id });
  } catch (error: any) {
    console.error('Error creating webhook:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

webhooksRoutes.put('/webhooks/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);

  await c.env.DB.prepare('UPDATE webhooks SET name = ?, url = ?, is_active = ?, funnel_id = ?, stage_id = ? WHERE id = ? AND account_id = ?')
    .bind(body.name || 'Webhook', body.url || '', body.active ? 1 : 0, body.funnel_id || null, body.stage_id || null, id, account_id)
    .run();

  return c.json({ success: true });
});

// CORS preflight for inbound webhooks (cross-origin form builders)
webhooksRoutes.options('/webhooks/incoming/:id', async (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
});

// Inbound Webhooks (Capture)
webhooksRoutes.post('/webhooks/incoming/:id', async (c) => {
  const id = c.req.param('id');
  c.header('Access-Control-Allow-Origin', '*');
  try {
    const webhook: any = await c.env.DB.prepare('SELECT * FROM webhooks WHERE id = ?').bind(id).first();
    if (!webhook) return c.json({ error: 'Webhook not found' }, 404);
    if (webhook.is_active === 0) return c.json({ error: 'Webhook is inactive' }, 403);

    // Accept JSON, form-encoded (Elementor, Gravity Forms, etc.) or multipart
    let payload: any = {};
    try {
      const contentType = c.req.header('Content-Type') || '';
      if (contentType.includes('application/json')) {
        payload = await c.req.json();
      } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const formData = await c.req.parseBody();
        payload = { ...formData };
      } else {
        try {
          payload = await c.req.json();
        } catch {
          const formData = await c.req.parseBody();
          payload = { ...formData };
        }
      }
    } catch {
      // If all parsing fails, proceed with empty payload (lead will be created with defaults)
    }
    console.log('Incoming webhook payload:', payload);

    // Field extraction: exact key match first, then substring fallback, then recurse into nested objects
    const extractField = (data: any, exactKeys: string[], fallbackKeywords: string[]): string | null => {
      if (!data || typeof data !== 'object') return null;

      // 1. Exact key match (case-insensitive) — highest priority
      for (const key of Object.keys(data)) {
        if (exactKeys.includes(key.toLowerCase())) {
          if (typeof data[key] === 'string' || typeof data[key] === 'number') {
            return String(data[key]);
          }
        }
      }

      // 2. Substring keyword match on remaining keys
      for (const key of Object.keys(data)) {
        const lowerKey = key.toLowerCase();
        if (!exactKeys.includes(lowerKey) && fallbackKeywords.some(kw => lowerKey.includes(kw))) {
          if (typeof data[key] === 'string' || typeof data[key] === 'number') {
            return String(data[key]);
          }
        }
      }

      // 3. Recurse into nested objects
      for (const key of Object.keys(data)) {
        if (typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key])) {
          const found = extractField(data[key], exactKeys, fallbackKeywords);
          if (found) return found;
        }
      }

      return null;
    };

    // Standard field IDs: name, email, telefone — fallbacks cover other common conventions
    const name  = extractField(payload, ['name'],     ['nome', 'first', 'full_name', 'cliente', 'lead_name', 'seu_nome', 'primeiro_nome', 'contato']) || 'Lead Webhook';
    const email = extractField(payload, ['email'],    ['mail', 'e-mail', 'contato_email', 'seu_email', 'email_address']);
    const phone = extractField(payload, ['telefone'], ['phone', 'tel', 'whatsapp', 'mobile', 'celular', 'cel', 'fone', 'contato_telefone', 'numero']);

    // Create Lead — resolve valid funnel/stage (prevent FK constraint failure)
    const leadId = crypto.randomUUID();
    let funnel_id = webhook.funnel_id;
    let stage_id = webhook.stage_id;

    // Validate stored funnel still exists; fall back to any funnel of the account
    try {
      if (funnel_id) {
        const funnelExists = await c.env.DB.prepare('SELECT id FROM funnels WHERE id = ? AND account_id = ?').bind(funnel_id, webhook.account_id).first();
        if (!funnelExists) funnel_id = null;
      }
      if (!funnel_id) {
        const anyFunnel: any = await c.env.DB.prepare('SELECT id FROM funnels WHERE account_id = ? LIMIT 1').bind(webhook.account_id).first();
        funnel_id = anyFunnel?.id || null;
      }
      if (stage_id && funnel_id) {
        const stageExists = await c.env.DB.prepare('SELECT id FROM stages WHERE id = ? AND funnel_id = ?').bind(stage_id, funnel_id).first();
        if (!stageExists) stage_id = null;
      }
      if (!stage_id && funnel_id) {
        const anyStage: any = await c.env.DB.prepare('SELECT id FROM stages WHERE funnel_id = ? ORDER BY "order" ASC LIMIT 1').bind(funnel_id).first();
        stage_id = anyStage?.id || null;
      }
    } catch (_) { /* use whatever we have */ }

    if (!funnel_id || !stage_id) {
      return c.json({ error: 'No valid funnel/stage found for this account' }, 500);
    }

    // Store original payload in custom_values
    const custom_values = JSON.stringify({
      webhook_id: id,
      webhook_name: webhook.name,
      original_payload: payload,
      captured_email: email,
      captured_phone: phone
    });

    await c.env.DB.prepare(`
      INSERT INTO leads (id, account_id, funnel_id, stage_id, title, contact_name, contact_email, contact_phone, company, value, assigned_user_id, custom_values, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      leadId,
      webhook.account_id,
      funnel_id,
      stage_id,
      name,
      name,
      email || null,
      phone || null,
      'Captado via Webhook',
      0,
      null,
      custom_values
    ).run();

    // Respond immediately so the form doesn't timeout waiting for automations/scoring
    // Background work runs via waitUntil to avoid killing pending promises after response
    const bgWork = async () => {
      try {
        const notifId = crypto.randomUUID();
        await c.env.DB.prepare(`
          INSERT INTO notifications (id, account_id, type, title, message, related_id, read, created_at)
          VALUES (?, ?, 'new_lead_webhook', ?, ?, ?, 0, datetime('now'))
        `).bind(notifId, webhook.account_id, `Novo lead: ${name}`, `Captado via ${webhook.name}`, leadId).run();
      } catch (_) { /* non-critical */ }
      await triggerAutomations(webhook.account_id, 'new_lead', leadId, c.env.DB);
      await calculateLeadScore(c.env.DB, webhook.account_id, leadId);
    };

    try {
      c.executionCtx.waitUntil(bgWork());
    } catch {
      bgWork().catch(console.error);
    }

    return c.json({ success: true, lead_id: leadId });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

webhooksRoutes.delete('/webhooks/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM webhooks WHERE id = ? AND account_id = ?').bind(id, account_id).run();
  return c.json({ success: true });
});
