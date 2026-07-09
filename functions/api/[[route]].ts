import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { getCookie } from 'hono/cookie';
import {
  hashPassword,
  verifyAndUpgradePassword,
  issueSession,
  clearSession,
  requireNexusAdmin,
  getClientIp,
  isRateLimited,
  recordRateLimitHit,
  isPublicRoute,
  sessionAccountId,
  verifySessionToken,
  SESSION_COOKIE,
} from './_lib/auth';

type Bindings = {
  DB: any; // Using any for D1Database to avoid type errors if @cloudflare/workers-types is not fully configured
  SESSION_SECRET?: string;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

app.use('*', async (c: any, next: any) => {
  if (isPublicRoute(c.req.method, c.req.path)) return next();
  const secret = c.env.SESSION_SECRET;
  if (!secret) return c.json({ error: 'Autenticação não configurada no servidor.' }, 500);
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ error: 'Não autenticado.' }, 401);
  const payload = await verifySessionToken(token, secret);
  if (!payload) {
    clearSession(c);
    return c.json({ error: 'Sessão inválida ou expirada.' }, 401);
  }
  c.set('authUser', payload);
  await next();
});

app.use('/admin/*', requireNexusAdmin);

// Safety net for the handful of routes with no try/catch of their own (an uncaught
// exception used to fall through to Hono's default error page). Never leaks
// error.message/stack to the client — only logs it server-side.
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Erro interno no servidor.' }, 500);
});

// Funnels
// NOTE: /debug-schema and /debug-db were removed — they dumped full table contents
// (including plaintext passwords from `users`) to any unauthenticated caller.

app.get('/seed-db', async (c) => {
  try {
    await c.env.DB.prepare(`
      INSERT INTO accounts (id, company_name, owner_name, email, status, plan, expires_at, created_at)
      VALUES ('acc_demo', 'Tech Solutions Ltda', 'João Silva', 'joao@tech.com', 'active', 'pro', '2025-12-31T23:59:59Z', datetime('now'))
      ON CONFLICT(id) DO NOTHING;
    `).run();
    
    // Check if user with email exists to avoid UNIQUE constraint error
    const existingUser: any = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind('joao@tech.com').first();
    if (!existingUser) {
      await c.env.DB.prepare(`
        INSERT INTO users (id, account_id, name, email, password, role, avatar, status, joined_at)
        VALUES ('u_owner', 'acc_demo', 'João Silva', 'joao@tech.com', '123456', 'ACCOUNT_ADMIN', 'https://ui-avatars.com/api/?name=Joao+Silva&background=0D8ABC&color=fff', 'active', '2023-01-01T10:00:00Z')
        ON CONFLICT(id) DO NOTHING;
      `).run();
    }
    
    await c.env.DB.prepare(`
      INSERT INTO funnels (id, account_id, name) VALUES ('f_vendas', 'acc_demo', 'Funil de Vendas Padrão')
      ON CONFLICT(id) DO NOTHING;
    `).run();
    
    // Insert default stage if it doesn't exist
    await c.env.DB.prepare(`
      INSERT INTO stages (id, funnel_id, name, "order", color) VALUES ('s_contato', 'f_vendas', 'Contato Inicial', 0, '#3b82f6')
      ON CONFLICT(id) DO NOTHING;
    `).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Seed error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// NOTE: /seed-nexus-admin was removed — it (re)created the platform super-admin
// account with a hardcoded password ('123') on every call, with no authentication.
// It was a standing backdoor. If this account's password was ever exposed, rotate
// it manually (see seed-nexus-admin.sql for the one-time, hashed replacement).

app.get('/funnels', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json([]);
  // Auto-add colorOpacity column if missing
  try { await c.env.DB.prepare("ALTER TABLE stages ADD COLUMN colorOpacity TEXT DEFAULT '1a'").run(); } catch (e) { /* column already exists */ }
  try { await c.env.DB.prepare("ALTER TABLE stages ADD COLUMN borderOpacity TEXT DEFAULT '4d'").run(); } catch (e) { /* column already exists */ }

  const { results } = await c.env.DB.prepare('SELECT * FROM funnels WHERE account_id = ?').bind(account_id).all();
  
  // Get stages for all funnels of this account
  const { results: stages } = await c.env.DB.prepare(`
    SELECT s.* FROM stages s 
    JOIN funnels f ON s.funnel_id = f.id 
    WHERE f.account_id = ? 
    ORDER BY s."order" ASC
  `).bind(account_id).all();
  
  const funnelsWithStages = results.map((funnel: any) => ({
    ...funnel,
    stages: stages.filter((stage: any) => stage.funnel_id === funnel.id)
  }));

  return c.json(funnelsWithStages);
});

app.post('/funnels', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'account_id is required' }, 400);

  await c.env.DB.prepare('INSERT INTO funnels (id, account_id, name) VALUES (?, ?, ?)')
    .bind(id, account_id, body.name)
    .run();

  return c.json({ id, name: body.name, stages: [] });
});

app.put('/funnels/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);

  await c.env.DB.prepare('UPDATE funnels SET name = ?, default_won_stage_id = ?, default_lost_stage_id = ? WHERE id = ? AND account_id = ?')
    .bind(body.name, body.default_won_stage_id || null, body.default_lost_stage_id || null, id, account_id)
    .run();

  return c.json({ success: true });
});

app.delete('/funnels/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM funnels WHERE id = ? AND account_id = ?').bind(id, account_id).run();
  return c.json({ success: true });
});

// Stages
app.post('/funnels/:funnelId/stages', async (c) => {
  const funnelId = c.req.param('funnelId');
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const stageAccountId = sessionAccountId(c);
  if (!stageAccountId) return c.json({ error: 'Não autorizado.' }, 403);
  const ownedFunnel = await c.env.DB.prepare('SELECT id FROM funnels WHERE id = ? AND account_id = ?').bind(funnelId, stageAccountId).first();
  if (!ownedFunnel) return c.json({ error: 'Funil não encontrado.' }, 404);

  await c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, colorOpacity, borderOpacity, "order") VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, funnelId, body.name, body.color, body.colorOpacity || '1a', body.borderOpacity || '4d', body.order || 0)
    .run();

  return c.json({ id, funnel_id: funnelId, name: body.name, color: body.color, order: body.order || 0 });
});

app.put('/stages/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);

  await c.env.DB.prepare('UPDATE stages SET name = ?, color = ?, colorOpacity = ?, borderOpacity = ? WHERE id = ? AND funnel_id IN (SELECT id FROM funnels WHERE account_id = ?)')
    .bind(body.name, body.color, body.colorOpacity || '1a', body.borderOpacity || '4d', id, account_id)
    .run();

  return c.json({ success: true });
});

app.delete('/stages/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM stages WHERE id = ? AND funnel_id IN (SELECT id FROM funnels WHERE account_id = ?)').bind(id, account_id).run();
  return c.json({ success: true });
});

// Custom Fields
app.get('/custom-fields', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json([]);
  const { results } = await c.env.DB.prepare('SELECT * FROM custom_fields WHERE account_id = ?').bind(account_id).all();
  return c.json(results);
});

app.post('/custom-fields', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);

    // Provide a valid funnel_id to satisfy NOT NULL and FOREIGN KEY constraints on older schemas
    let funnel_id = body.funnel_id;
    if (!funnel_id) {
      const funnel: any = await c.env.DB.prepare('SELECT id FROM funnels WHERE account_id = ? LIMIT 1').bind(account_id).first();
      funnel_id = funnel ? funnel.id : 'f_vendas';
    }
    
    await c.env.DB.prepare('INSERT INTO custom_fields (id, account_id, name, type, context, funnel_id, options, visible_stage_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, account_id, body.name, body.type, body.context, funnel_id, body.options || null, body.visible_stage_ids || null)
      .run();
      
    return c.json({ id, account_id, name: body.name, type: body.type, context: body.context, funnel_id, options: body.options, visible_stage_ids: body.visible_stage_ids });
  } catch (error: any) {
    console.error('Error creating custom field:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

app.put('/custom-fields/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);

  await c.env.DB.prepare('UPDATE custom_fields SET name = ?, type = ?, context = ?, options = ?, visible_stage_ids = ?, funnel_id = ? WHERE id = ? AND account_id = ?')
    .bind(body.name, body.type, body.context, body.options || null, body.visible_stage_ids || null, body.funnel_id || null, id, account_id)
    .run();

  return c.json({ success: true });
});

app.delete('/custom-fields/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM custom_fields WHERE id = ? AND account_id = ?').bind(id, account_id).run();
  return c.json({ success: true });
});

// Webhooks
app.get('/webhooks', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json([]);
  const { results } = await c.env.DB.prepare('SELECT * FROM webhooks WHERE account_id = ?').bind(account_id).all();
  return c.json(results.map((w: any) => ({ ...w, active: w.is_active === 1 })));
});

app.post('/webhooks', async (c) => {
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

app.put('/webhooks/:id', async (c) => {
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
app.options('/webhooks/incoming/:id', async (c) => {
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
app.post('/webhooks/incoming/:id', async (c) => {
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

app.delete('/webhooks/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM webhooks WHERE id = ? AND account_id = ?').bind(id, account_id).run();
  return c.json({ success: true });
});

// Notifications
app.get('/notifications', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ notifications: [], tasks_today: [] });

  const { results: notifs } = await c.env.DB.prepare(
    'SELECT * FROM notifications WHERE account_id = ? ORDER BY created_at DESC LIMIT 40'
  ).bind(account_id).all();

  // Today's pending tasks (joined with leads for account scoping)
  const { results: tasks } = await c.env.DB.prepare(`
    SELECT t.id, t.title, t.due_date, t.type, l.title as lead_title, l.id as lead_id
    FROM tasks t
    INNER JOIN leads l ON t.lead_id = l.id
    WHERE l.account_id = ?
      AND t.completed = 0
      AND t.due_date IS NOT NULL
      AND date(t.due_date) = date('now')
    ORDER BY t.due_date ASC
  `).bind(account_id).all();

  return c.json({ notifications: notifs, tasks_today: tasks });
});

app.put('/notifications/read-all', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'account_id required' }, 400);
  await c.env.DB.prepare('UPDATE notifications SET read = 1 WHERE account_id = ?').bind(account_id).run();
  return c.json({ success: true });
});

app.put('/notifications/:id/read', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND account_id = ?').bind(id, account_id).run();
  return c.json({ success: true });
});

// Users (Team)
app.get('/users', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json([]);
  const { results } = await c.env.DB.prepare('SELECT id, name, email, role, status, account_id FROM users WHERE account_id = ?').bind(account_id).all();
  return c.json(results);
});

app.post('/users', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);

    const team_id = body.team_id || null;
    const avatar = body.avatar || null;
    const password = await hashPassword(body.password || 'temp_password');

    await c.env.DB.prepare('INSERT INTO users (id, account_id, name, email, password, role, status, team_id, avatar, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))')
      .bind(id, account_id, body.name, body.email, password, body.role, body.status, team_id, avatar)
      .run();

    return c.json({ id, account_id, name: body.name, email: body.email, role: body.role, status: body.status, team_id, avatar });
  } catch (error: any) {
    console.error('Error creating user:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});
app.put('/users/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);

  if (body.password) {
    const hashed = await hashPassword(body.password);
    await c.env.DB.prepare('UPDATE users SET name = ?, email = ?, role = ?, status = ?, team_id = ?, password = ? WHERE id = ? AND account_id = ?')
      .bind(body.name, body.email, body.role, body.status, body.team_id || null, hashed, id, account_id)
      .run();
  } else {
    await c.env.DB.prepare('UPDATE users SET name = ?, email = ?, role = ?, status = ?, team_id = ? WHERE id = ? AND account_id = ?')
      .bind(body.name, body.email, body.role, body.status, body.team_id || null, id, account_id)
      .run();
  }

  return c.json({ success: true });
});

app.put('/users/:id/password', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    if (!body.password) return c.json({ error: 'password required' }, 400);
    const hashed = await hashPassword(body.password);
    await c.env.DB.prepare('UPDATE users SET password = ? WHERE id = ? AND account_id = ?').bind(hashed, id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

app.delete('/users/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM users WHERE id = ? AND account_id = ?').bind(id, account_id).run();
  return c.json({ success: true });
});

// Leads
app.get('/leads', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'account_id required' }, 400);
  const { results } = await c.env.DB.prepare('SELECT * FROM leads WHERE account_id = ?').bind(account_id).all();
  return c.json(results);
});

// NOTE: /test-db was removed — it interpolated a client-supplied table name
// straight into a PRAGMA statement and returned raw stack traces to the client.

app.post('/leads', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const account_id = sessionAccountId(c);
    if (!account_id) {
      return c.json({ error: 'account_id is required' }, 400);
    }
    
    await c.env.DB.prepare(`
      INSERT INTO leads (id, account_id, funnel_id, stage_id, title, company, value, assigned_user_id, probability, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
    `).bind(
      id,
      account_id,
      body.funnel_id,
      body.stage_id,
      body.title || 'Nova Negociação',
      body.company || '',
      body.value || 0,
      body.assigned_user_id || null
    ).run();
    
    const newLead = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
    // Trigger automations for the new lead
    await triggerAutomations(account_id, 'new_lead', id, c.env.DB);
    return c.json(newLead);
  } catch (error: any) {
    console.error('Error creating lead:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

app.get('/leads/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  const lead = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ? AND account_id = ?').bind(id, account_id).first();
  if (!lead) return c.json({ error: 'Lead not found' }, 404);
  return c.json(lead);
});

app.put('/leads/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);

  // Build dynamic update query
  const fields = [];
  const values = [];

  const allowedFields = ['title', 'company', 'value', 'contact_name', 'contact_email', 'contact_phone', 'funnel_id', 'stage_id', 'assigned_user_id', 'probability', 'tags', 'custom_values', 'closed_at', 'closing_forecast_at'];

  for (const key of Object.keys(body)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  if (fields.length === 0) return c.json({ success: true });

  values.push(id, account_id);

  const query = `UPDATE leads SET ${fields.join(', ')} WHERE id = ? AND account_id = ?`;
  await c.env.DB.prepare(query).bind(...values).run();

  // Recalculate scoring if custom_values were updated
  if (body.custom_values) {
    const lead: any = await c.env.DB.prepare('SELECT account_id FROM leads WHERE id = ? AND account_id = ?').bind(id, account_id).first();
    if (lead) await calculateLeadScore(c.env.DB, lead.account_id, id);
  }

  return c.json({ success: true });
});

// Notes
app.get('/leads/:id/notes', async (c) => {
  const leadId = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  const lead = await c.env.DB.prepare('SELECT id FROM leads WHERE id = ? AND account_id = ?').bind(leadId, account_id).first();
  if (!lead) return c.json({ error: 'Lead não encontrado.' }, 404);
  const { results } = await c.env.DB.prepare('SELECT * FROM notes WHERE lead_id = ? ORDER BY created_at DESC').bind(leadId).all();
  return c.json(results);
});

app.post('/leads/:id/notes', async (c) => {
  const leadId = c.req.param('id');
  const body = await c.req.json();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  const lead = await c.env.DB.prepare('SELECT id FROM leads WHERE id = ? AND account_id = ?').bind(leadId, account_id).first();
  if (!lead) return c.json({ error: 'Lead não encontrado.' }, 404);
  const id = crypto.randomUUID();

  await c.env.DB.prepare('INSERT INTO notes (id, lead_id, content, author_name, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))')
    .bind(id, leadId, body.content, body.author_name || 'Usuário')
    .run();

  // Sync last_contact_at to leads table
  await c.env.DB.prepare('UPDATE leads SET last_contact_at = datetime(\'now\') WHERE id = ?').bind(leadId).run();

  const newNote = await c.env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(id).first();
  return c.json(newNote);
});

app.get('/leads/:id/tasks', async (c) => {
  const leadId = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  const lead = await c.env.DB.prepare('SELECT id FROM leads WHERE id = ? AND account_id = ?').bind(leadId, account_id).first();
  if (!lead) return c.json({ error: 'Lead não encontrado.' }, 404);
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM tasks
    WHERE lead_id = ?
    ORDER BY completed ASC, due_date ASC
  `).bind(leadId).all();
  return c.json(results || []);
});

// Tasks
app.get('/tasks', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'account_id required' }, 400);
  const { results } = await c.env.DB.prepare(`
    SELECT t.*, l.title as lead_title
    FROM tasks t
    INNER JOIN leads l ON t.lead_id = l.id
    WHERE l.account_id = ?
    ORDER BY t.due_date ASC
  `).bind(account_id).all();
  return c.json(results);
});

app.post('/tasks', async (c) => {
  const body = await c.req.json();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  const lead = await c.env.DB.prepare('SELECT id FROM leads WHERE id = ? AND account_id = ?').bind(body.lead_id, account_id).first();
  if (!lead) return c.json({ error: 'Lead não encontrado.' }, 404);
  const id = crypto.randomUUID();

  await c.env.DB.prepare('INSERT INTO tasks (id, lead_id, title, due_date, completed, type) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, body.lead_id, body.title, body.due_date, body.completed ? 1 : 0, body.type || 'task')
    .run();

  // Sync next_task_at to leads table
  if (body.lead_id && !body.completed && body.due_date) {
    await c.env.DB.prepare('UPDATE leads SET next_task_at = ? WHERE id = ? AND (next_task_at IS NULL OR next_task_at > ?)').bind(body.due_date, body.lead_id, body.due_date).run();
  }

  const newTask = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  return c.json(newTask);
});

app.put('/tasks/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);

  const fields = [];
  const values = [];

  const allowedFields = ['title', 'due_date', 'completed', 'type', 'lead_id'];

  for (const key of Object.keys(body)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(key === 'completed' ? (body[key] ? 1 : 0) : body[key]);
    }
  }

  if (fields.length === 0) return c.json({ success: true });

  values.push(id, account_id);

  const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND lead_id IN (SELECT id FROM leads WHERE account_id = ?)`;
  await c.env.DB.prepare(query).bind(...values).run();

  return c.json({ success: true });
});

app.delete('/tasks/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM tasks WHERE id = ? AND lead_id IN (SELECT id FROM leads WHERE account_id = ?)').bind(id, account_id).run();
  return c.json({ success: true });
});

app.delete('/leads/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM leads WHERE id = ? AND account_id = ?').bind(id, account_id).run();
  return c.json({ success: true });
});

// Notes PUT/DELETE
app.put('/notes/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  const fields = [];
  const values = [];
  if (body.content !== undefined) { fields.push('content = ?'); values.push(body.content); }
  if (fields.length === 0) return c.json({ success: true });
  values.push(id, account_id);
  await c.env.DB.prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ? AND lead_id IN (SELECT id FROM leads WHERE account_id = ?)`).bind(...values).run();
  return c.json({ success: true });
});

app.delete('/notes/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM notes WHERE id = ? AND lead_id IN (SELECT id FROM leads WHERE account_id = ?)').bind(id, account_id).run();
  return c.json({ success: true });
});

// Teams
app.get('/teams', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json([]);
  const { results } = await c.env.DB.prepare('SELECT * FROM teams WHERE account_id = ?').bind(account_id).all();
  return c.json(results);
});

app.post('/teams', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'account_id is required' }, 400);
  await c.env.DB.prepare('INSERT INTO teams (id, account_id, name, goal) VALUES (?, ?, ?, ?)')
    .bind(id, account_id, body.name, body.goal || 0)
    .run();
  return c.json({ id, account_id, name: body.name, goal: body.goal || 0 });
});

app.put('/teams/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('UPDATE teams SET name = ?, goal = ?, permissions = ? WHERE id = ? AND account_id = ?')
    .bind(body.name, body.goal || 0, body.permissions ? JSON.stringify(body.permissions) : '{}', id, account_id).run();
  return c.json({ success: true });
});

app.delete('/teams/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM teams WHERE id = ? AND account_id = ?').bind(id, account_id).run();
  return c.json({ success: true });
});

// Bot Settings
app.get('/bot-settings', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({});
  const settings = await c.env.DB.prepare('SELECT * FROM bot_settings WHERE account_id = ?').bind(account_id).first();
  return c.json(settings || {});
});

app.put('/bot-settings', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'account_id is required' }, 400);
  const body = await c.req.json();
  
  const existing = await c.env.DB.prepare('SELECT account_id FROM bot_settings WHERE account_id = ?').bind(account_id).first();
  if (existing) {
    await c.env.DB.prepare('UPDATE bot_settings SET system_prompt = ?, temperature = ?, auto_reply = ?, whatsapp_webhook_token = ? WHERE account_id = ?')
      .bind(body.system_prompt, body.temperature, body.auto_reply ? 1 : 0, body.whatsapp_webhook_token, account_id).run();
  } else {
    await c.env.DB.prepare('INSERT INTO bot_settings (account_id, system_prompt, temperature, auto_reply, whatsapp_webhook_token) VALUES (?, ?, ?, ?, ?)')
      .bind(account_id, body.system_prompt, body.temperature, body.auto_reply ? 1 : 0, body.whatsapp_webhook_token).run();
  }
  return c.json({ success: true });
});

// Knowledge Sources
app.get('/knowledge-sources', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json([]);
  const { results } = await c.env.DB.prepare('SELECT * FROM knowledge_sources WHERE account_id = ?').bind(account_id).all();
  return c.json(results);
});

app.post('/knowledge-sources', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'account_id is required' }, 400);
  await c.env.DB.prepare('INSERT INTO knowledge_sources (id, account_id, name, type) VALUES (?, ?, ?, ?)')
    .bind(id, account_id, body.name, body.type).run();
  return c.json({ id, account_id, name: body.name, type: body.type });
});

app.delete('/knowledge-sources/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM knowledge_sources WHERE id = ? AND account_id = ?').bind(id, account_id).run();
  return c.json({ success: true });
});

// Knowledge Chunks
app.get('/knowledge-sources/:sourceId/chunks', async (c) => {
  const sourceId = c.req.param('sourceId');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  const { results } = await c.env.DB.prepare('SELECT * FROM knowledge_chunks WHERE source_id = ? AND account_id = ?').bind(sourceId, account_id).all();
  return c.json(results);
});

app.post('/knowledge-sources/:sourceId/chunks', async (c) => {
  const sourceId = c.req.param('sourceId');
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'account_id is required' }, 400);
  await c.env.DB.prepare('INSERT INTO knowledge_chunks (id, account_id, source_id, content) VALUES (?, ?, ?, ?)')
    .bind(id, account_id, sourceId, body.content).run();
  return c.json({ id, account_id, source_id: sourceId, content: body.content });
});

app.delete('/knowledge-chunks/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM knowledge_chunks WHERE id = ? AND account_id = ?').bind(id, account_id).run();
  return c.json({ success: true });
});

// Bot Chat History
app.get('/bot-chat-history/:phone', async (c) => {
  const phone = c.req.param('phone');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json([]);
  const { results } = await c.env.DB.prepare('SELECT * FROM bot_chat_history WHERE account_id = ? AND lead_phone = ? ORDER BY created_at ASC')
    .bind(account_id, phone).all();
  return c.json(results);
});

// Nexus Admin (Super Admin) Endpoints
app.get('/admin/stats', async (c) => {
  try {
    const totalAccounts = await c.env.DB.prepare('SELECT count(*) as count FROM accounts WHERE id != ?').bind('acc_nexus').first();
    const activeAccounts = await c.env.DB.prepare('SELECT count(*) as count FROM accounts WHERE status = "active" AND id != ?').bind('acc_nexus').first();
    const totalUsers = await c.env.DB.prepare('SELECT count(*) as count FROM users WHERE role != ?').bind('NEXUS_ADMIN').first();

    // MRR approx
    const proCount = await c.env.DB.prepare('SELECT count(*) as count FROM accounts WHERE plan = "pro" AND status = "active" AND id != ?').bind('acc_nexus').first();
    const starterCount = await c.env.DB.prepare('SELECT count(*) as count FROM accounts WHERE plan = "starter" AND status = "active" AND id != ?').bind('acc_nexus').first();

    const mrr = (Number(proCount?.count || 0) * 199) + (Number(starterCount?.count || 0) * 49);

    return c.json({
      totalAccounts: totalAccounts?.count || 0,
      activeAccounts: activeAccounts?.count || 0,
      totalUsers: totalUsers?.count || 0,
      mrr: mrr
    });
  } catch(e: any) {
    console.error(e);
    return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

app.get('/admin/accounts', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM accounts WHERE id != ? ORDER BY created_at DESC').bind('acc_nexus').all();
  return c.json(results);
});

app.post('/admin/accounts', async (c) => {
  try {
    const body = await c.req.json();
    const id = `acc_${crypto.randomUUID().slice(0, 8)}`;
    
    const expires_at = body.expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    await c.env.DB.prepare(`
      INSERT INTO accounts (id, company_name, owner_name, email, status, plan, expires_at, created_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?, datetime('now'))
    `).bind(id, body.company_name, body.owner_name, body.email, body.plan || 'starter', expires_at).run();
    
    // Auto-create Master User
    const userId = `u_${crypto.randomUUID().slice(0, 8)}`;
    const initialPassword = 'temp123';
    await c.env.DB.prepare(`
      INSERT INTO users (id, account_id, name, email, password, role, status, joined_at)
      VALUES (?, ?, ?, ?, ?, 'ACCOUNT_ADMIN', 'active', datetime('now'))
    `).bind(userId, id, body.owner_name, body.email, await hashPassword(initialPassword)).run();

    // Init basic funnel
    const funnelId = `f_${crypto.randomUUID().slice(0, 8)}`;
    await c.env.DB.prepare('INSERT INTO funnels (id, account_id, name) VALUES (?, ?, ?)').bind(funnelId, id, 'Funil Inicial').run();
    await c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), funnelId, 'Contato Inicial', '#3b82f6', 0).run();

    return c.json({ id, company_name: body.company_name, status: 'active', owner: body.owner_name, defaultPassword: initialPassword });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

app.put('/admin/accounts/:id/status', async (c) => {
  const id = c.req.param('id');
  if (id === 'acc_nexus') {
    return c.json({ error: 'Não é possível modificar a conta Nexus' }, 403);
  }
  const body = await c.req.json();
  await c.env.DB.prepare('UPDATE accounts SET status = ? WHERE id = ?').bind(body.status, id).run();
  return c.json({ success: true, status: body.status });
});

app.put('/admin/accounts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    await c.env.DB.prepare(`
      UPDATE accounts 
      SET company_name = ?, owner_name = ?, email = ?, plan = ?, expires_at = ?
      WHERE id = ?
    `).bind(body.company_name, body.owner_name, body.email, body.plan, body.expires_at || null, id).run();

    // Also update the master user's name/email if it matches the account's old email
    await c.env.DB.prepare(`
      UPDATE users SET name = ?, email = ? WHERE account_id = ? AND role = 'ACCOUNT_ADMIN'
    `).bind(body.owner_name, body.email, id).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

app.post('/admin/accounts/:id/reset-password', async (c) => {
  try {
    const id = c.req.param('id');
    console.log(`[RESET] Attempting to reset password for account: ${id}`);
    
    // Get the account's official email
    const account: any = await c.env.DB.prepare('SELECT email FROM accounts WHERE id = ?').bind(id).first();
    if (!account) {
      console.error(`[RESET] Account ${id} not found`);
      return c.json({ error: 'Conta não encontrada.' }, 404);
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let newPassword = '';
    for (let i = 0; i < 8; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Reset password for the user matching this account and email
    const result = await c.env.DB.prepare(`
      UPDATE users SET password = ? WHERE account_id = ? AND LOWER(email) = LOWER(?)
    `).bind(await hashPassword(newPassword), id, account.email).run();

    if (result.meta.changes === 0) {
      console.warn(`[RESET] No user found with email ${account.email} in account ${id}`);
      return c.json({ error: `Nenhum usuário encontrado com o e-mail (${account.email}) nesta conta.` }, 404);
    }

    console.log(`[RESET] Success for account ${id}, email ${account.email}`);
    return c.json({ success: true, newPassword });
  } catch (error: any) {
    console.error('[RESET] Error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Generic user password reset (for the users tab)
// NOTE: this used to be registered as '/api/admin/users/:id/reset-password' on an
// app with basePath('/api'), making the real path '/api/api/...' — unreachable.
app.post('/admin/users/:id/reset-password', async (c) => {
  try {
    const id = c.req.param('id');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let newPassword = '';
    for (let i = 0; i < 8; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const result = await c.env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(await hashPassword(newPassword), id).run();

    if (result.meta.changes === 0) return c.json({ error: 'Usuário não encontrado.' }, 404);

    return c.json({ success: true, newPassword });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

app.get('/global-settings', async (c) => {
  const defaultSettings = {
    login_title: 'O CRM feito para times dinâmicos e modernos.',
    login_subtitle: 'Acelere vendas, automatize sua captação com IA, e tenha uma visão cristalina sobre cada etapa do funil do seu cliente.',
    login_badge_text: '✨ Atualização 2.0 disponível',
    login_quote_text: 'A capacidade de plugar IA no WhatsApp e rastrear cada movimentação das oportunidades direto de dentro do Kanban mudou o jogo para a nossa equipe de B2B.',
    login_quote_author: 'Juliana Diniz',
    login_quote_role: 'Head of Sales, TechCorp'
  };

  try {
    const settings = await c.env.DB.prepare('SELECT * FROM global_settings WHERE id = "nexus"').first();
    return c.json(settings || defaultSettings);
  } catch (error: any) {
    console.error('Error fetching global-settings, using defaults:', error);
    return c.json(defaultSettings);
  }
});

app.put('/admin/global-settings', async (c) => {
  try {
    const body = await c.req.json();
    await c.env.DB.prepare(`
      UPDATE global_settings 
      SET login_title = ?, login_subtitle = ?, login_badge_text = ?, login_quote_text = ?, login_quote_author = ?, login_quote_role = ?
      WHERE id = 'nexus'
    `).bind(body.login_title, body.login_subtitle, body.login_badge_text, body.login_quote_text, body.login_quote_author, body.login_quote_role).run();
    return c.json({ success: true });
  } catch(error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});
app.post('/public/register', async (c) => {
  try {
    const body = await c.req.json();

    const ip = getClientIp(c);
    if (await isRateLimited(c.env.DB, 'register_ip', ip, 5, 60)) {
      return c.json({ error: 'Muitas tentativas de cadastro. Tente novamente mais tarde.' }, 429);
    }
    await recordRateLimitHit(c.env.DB, 'register_ip', ip);

    if (!body.password) return c.json({ error: 'password is required' }, 400);

    const id = `acc_${crypto.randomUUID().slice(0, 8)}`;

    await c.env.DB.prepare(`
      INSERT INTO accounts (id, company_name, owner_name, email, status, plan, expires_at, created_at)
      VALUES (?, ?, ?, ?, 'active', 'trial', datetime('now', '+14 days'), datetime('now'))
    `).bind(id, body.company_name, body.owner_name, body.email).run();

    const userId = `u_${crypto.randomUUID().slice(0, 8)}`;
    await c.env.DB.prepare(`
      INSERT INTO users (id, account_id, name, email, password, role, status, joined_at)
      VALUES (?, ?, ?, ?, ?, 'ACCOUNT_ADMIN', 'active', datetime('now'))
    `).bind(userId, id, body.owner_name, body.email, await hashPassword(body.password)).run();

    const funnelId = `f_${crypto.randomUUID().slice(0, 8)}`;
    await c.env.DB.prepare('INSERT INTO funnels (id, account_id, name) VALUES (?, ?, ?)').bind(funnelId, id, 'Funil Inicial').run();
    await c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), funnelId, 'Contato Inicial', '#3b82f6', 0).run();

    return c.json({ 
      id: userId, 
      account_id: id,
      name: body.owner_name, 
      email: body.email, 
      role: 'ACCOUNT_ADMIN'
    });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

app.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!email || !password) {
      return c.json({ error: 'E-mail e senha são obrigatórios' }, 400);
    }

    const ip = getClientIp(c);
    if ((await isRateLimited(c.env.DB, 'login_ip', ip, 15, 15)) || (await isRateLimited(c.env.DB, 'login_email', email, 8, 15))) {
      return c.json({ error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' }, 429);
    }

    const user: any = await c.env.DB.prepare(
      'SELECT id, account_id, name, email, password, role, status FROM users WHERE LOWER(email) = ?'
    ).bind(email).first();

    if (!user) {
      console.log(`[LOGIN] User not found for email: ${email}`);
      await recordRateLimitHit(c.env.DB, 'login_ip', ip);
      return c.json({ error: 'E-mail não cadastrado ou incorreto.' }, 401);
    }

    if (user.status !== 'active') {
      return c.json({ error: `Seu usuário está com status: ${user.status}. Entre em contato com o suporte.` }, 403);
    }

    const { valid, upgradedHash } = await verifyAndUpgradePassword(password, user.password);
    if (!valid) {
      console.log(`[LOGIN] Password mismatch for email: ${email}`);
      await recordRateLimitHit(c.env.DB, 'login_ip', ip);
      await recordRateLimitHit(c.env.DB, 'login_email', email);
      return c.json({ error: 'Senha incorreta.' }, 401);
    }
    if (upgradedHash) {
      // Legacy plaintext password matched — transparently upgrade it to a hash.
      await c.env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(upgradedHash, user.id).run();
    }

    // Check if account is active
    const account: any = await c.env.DB.prepare('SELECT status FROM accounts WHERE id = ?').bind(user.account_id).first();
    if (account && account.status !== 'active') {
       return c.json({ error: `A conta da empresa (${user.account_id}) está ${account.status}.` }, 403);
    }

    await issueSession(c, user);

    // Don't return the password
    const { password: _, ...userWithoutPassword } = user;

    return c.json(userWithoutPassword);
  } catch (error: any) {
    console.error('Login error:', error);
    return c.json({ error: 'Erro interno no servidor' }, 500);
  }
});

app.post('/logout', async (c) => {
  clearSession(c);
  return c.json({ success: true });
});
// ==================== TRACKING ENDPOINTS ====================

function detectFieldName(name: string): string {
  const lk = name.toLowerCase();
  if (lk.includes('email') || lk.includes('mail')) return 'email';
  if (lk.includes('phone') || lk.includes('tel') || lk.includes('whatsapp') || lk.includes('celular')) return 'phone';
  if (lk.includes('name') || lk.includes('nome')) return 'name';
  if (lk.includes('company') || lk.includes('empresa')) return 'company';
  return 'text';
}

// CORS headers for all tracking endpoints
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Simple test endpoint to verify tracking is reachable
app.get('/tracking/test', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  return c.json({ ok: true, message: 'Tracking endpoint is reachable', timestamp: new Date().toISOString() });
});

// Get tracking settings for current account
app.get('/tracking', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json({});

    let settings = await c.env.DB.prepare(
      'SELECT * FROM tracking_settings WHERE account_id = ?'
    ).bind(accountId).first();

    // Create tracking_id if not exists
    if (!settings) {
      const trackingId = 'trk_' + crypto.randomUUID().substring(0, 12);
      await c.env.DB.prepare(
        'INSERT INTO tracking_settings (account_id, tracking_id) VALUES (?, ?)'
      ).bind(accountId, trackingId).run();
      settings = { account_id: accountId, tracking_id: trackingId };
    }

    return c.json(settings);
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Regenerate tracking ID
app.post('/tracking/regenerate', async (c) => {
  try {
    const body = await c.req.json();
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json({ error: 'account_id is required' }, 400);

    const newTrackingId = 'trk_' + crypto.randomUUID().substring(0, 12);

    await c.env.DB.prepare(
      'INSERT INTO tracking_settings (account_id, tracking_id) VALUES (?, ?) ON CONFLICT(account_id) DO UPDATE SET tracking_id = ?'
    ).bind(accountId, newTrackingId, newTrackingId).run();

    return c.json({ tracking_id: newTrackingId });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Get tracking events
app.get('/tracking/events', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const eventType = c.req.query('event_type');
    const limit = parseInt(c.req.query('limit') || '100');

    let query = 'SELECT * FROM tracking_events WHERE account_id = ?';
    const params: any[] = [accountId];

    if (eventType) {
      query += ' AND event_type = ?';
      params.push(eventType);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const result = await c.env.DB.prepare(query).bind(...params).all();
    return c.json(result.results);
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Public endpoint to receive tracking events from external sites
// OPTIONS preflight - must return headers directly in Response
app.options('/tracking/events', async (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  });
});

app.post('/tracking/events', async (c) => {
  try {
    let body;
    try {
      body = await c.req.json();
    } catch (e) {
      // Fallback: parse as text then JSON (for fetch without Content-Type header)
      const text = await c.req.text();
      try { body = JSON.parse(text); } catch (e2) {
        console.error('[TRACKING] Failed to parse body');
        return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400 });
      }
    }

    console.log('[TRACKING] Received body:', JSON.stringify(body).substring(0, 500));

    const { tracking_id, event_type, url, referrer, form_data, visitor_id } = body;
    console.log('[TRACKING] event_type:', event_type, 'form_data:', JSON.stringify(form_data));

    if (!tracking_id) {
      console.error('[TRACKING] Missing tracking_id');
      return new Response(JSON.stringify({ error: 'Missing tracking_id' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    if (!event_type) {
      console.error('[TRACKING] Missing event_type');
      return new Response(JSON.stringify({ error: 'Missing event_type' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Find account by tracking_id
    const settings: any = await c.env.DB.prepare(
      'SELECT account_id FROM tracking_settings WHERE tracking_id = ?'
    ).bind(tracking_id).first();

    if (!settings) {
      console.error('[TRACKING] Invalid tracking_id:', tracking_id);
      return new Response(JSON.stringify({ error: 'Invalid tracking_id: ' + tracking_id }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    console.log('[TRACKING] Found account:', settings.account_id);

    const eventId = 'evt_' + crypto.randomUUID().substring(0, 12);

    let formDataStr = null;
    if (form_data) {
      formDataStr = typeof form_data === 'string' ? form_data : JSON.stringify(form_data);
    }

    await c.env.DB.prepare(
      'INSERT INTO tracking_events (id, account_id, tracking_id, event_type, url, referrer, form_data, visitor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      eventId,
      settings.account_id,
      tracking_id,
      event_type,
      url || null,
      referrer || null,
      formDataStr,
      visitor_id || null
    ).run();

    console.log('[TRACKING] Event saved:', eventId);

    // Handle pageview: if visitor_id is mapped to a lead, save in lead_visits and trigger automations
    try {
      if (event_type === 'pageview' && visitor_id) {
        const { results: mappedLeads } = await c.env.DB.prepare(
          'SELECT lead_id FROM visitor_leads WHERE visitor_id = ? AND account_id = ?'
        ).bind(visitor_id, settings.account_id).all();

        if (mappedLeads && mappedLeads.length > 0) {
          for (const ml of mappedLeads as any[]) {
            const visitId = crypto.randomUUID();
            await c.env.DB.prepare(
              'UPDATE visitor_leads SET last_seen = datetime(\'now\') WHERE visitor_id = ? AND account_id = ?'
            ).bind(visitor_id, settings.account_id).run();

            await c.env.DB.prepare(
              'INSERT INTO lead_visits (id, account_id, lead_id, visitor_id, url, referrer, title) VALUES (?, ?, ?, ?, ?, ?, ?)'
            ).bind(visitId, settings.account_id, ml.lead_id, visitor_id, url || null, referrer || null, body.page_title || body.title || null).run();

            // Trigger page_visit automation
            await triggerAutomations(settings.account_id, 'page_visit', ml.lead_id, c.env.DB, { url_pattern: url });
          }
        }
      }
    } catch (pvErr: any) {
      console.error('[TRACKING] Pageview handling error:', pvErr.message);
    }

    // Auto-register form if event has form_data
    try {
      var formData = body.form_data;
      if (!formData && event_type === 'conversion' && body.data && typeof body.data === 'object') {
        var d = body.data;
        if (d.fields && typeof d.fields === 'object') {
          formData = { fid: d.fid || (body.event_name || 'unknown_form'), action: url || '', fields: d.fields, has_lead: d.has_lead || false };
        } else if (d.email || d.nome || d.name || d.phone || d.cpf) {
          formData = { fid: body.event_name || 'unknown_form', action: url || '', fields: d, has_lead: true };
        }
      }

      if (formData && formData.fid) {
        const formName = typeof formData.fid === 'string' ? formData.fid.trim() : String(formData.fid).trim();
        const fields = formData.fields || {};
        const fieldNames = Object.keys(fields).map(k => ({ name: k, type: detectFieldName(k) }));

        // Check if form already exists by EXACT name match
        const existing: any = await c.env.DB.prepare(
          'SELECT id, field_mapping FROM tracking_forms WHERE account_id = ? AND name = ?'
        ).bind(settings.account_id, formName).first();

        if (!existing && fieldNames.length > 0) {
          try {
            await c.env.DB.prepare(
              'INSERT INTO tracking_forms (id, account_id, name, url_pattern, form_selector, fields, field_mapping, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
            ).bind(
              crypto.randomUUID(),
              settings.account_id,
              formName,
              (url || null),
              null,
              JSON.stringify(fieldNames),
              JSON.stringify({})
            ).run();
            console.log('[TRACKING] Auto-registered form:', formName);
          } catch (dbErr: any) {
            if (dbErr.message && dbErr.message.includes('UNIQUE')) {
              console.log('[TRACKING] Form already exists (unique constraint):', formName);
            } else {
              console.error('[TRACKING] DB error registering form:', dbErr.message);
            }
          }
        } else if (existing) {
          console.log('[TRACKING] Form already exists:', formName, '(skipping)');

          // If form has field_mapping, check for EMAIL before creating marketing lead
          if (existing.field_mapping) {
            try {
              var mapping = typeof existing.field_mapping === 'string' ? JSON.parse(existing.field_mapping) : existing.field_mapping;
              var mappedData: any = {};
              var hasEmail = false;
              for (var fieldName in fields) {
                if (mapping[fieldName] && mapping[fieldName]) {
                  mappedData[mapping[fieldName]] = fields[fieldName];
                  if (mapping[fieldName] === 'contact_email' && fields[fieldName]) hasEmail = true;
                }
              }

              // EMAIL IS REQUIRED - skip if no email
              if (!hasEmail) {
                console.log('[TRACKING] Skipped marketing lead (no email):', formName);
              } else {
                // Normalize email for consistent matching
                const normalizedEmail = String(mappedData.contact_email).trim().toLowerCase();

                // PREVENT DUPLICATES: Check if marketing lead already exists by email (case-insensitive)
                const existingMLead: any = await c.env.DB.prepare(
                  'SELECT id, raw_data FROM marketing_leads WHERE account_id = ? AND LOWER(contact_email) = ?'
                ).bind(settings.account_id, normalizedEmail).first();

                let mLeadId = existingMLead ? existingMLead.id : crypto.randomUUID();
                
                // Merge new fields into existing raw_data
                let rawData = {};
                if (existingMLead && existingMLead.raw_data) {
                  try { rawData = typeof existingMLead.raw_data === 'string' ? JSON.parse(existingMLead.raw_data) : existingMLead.raw_data; } catch {}
                }
                const updatedRawData = { ...rawData, ...fields };

                if (existingMLead) {
                  // Update existing marketing lead with new data (KEEP CONTACT UNIQUE)
                  await c.env.DB.prepare(
                    'UPDATE marketing_leads SET form_name = ?, contact_name = COALESCE(?, contact_name), contact_phone = COALESCE(?, contact_phone), company = COALESCE(?, company), title = COALESCE(?, title), value = ?, tags = COALESCE(?, tags), raw_data = ?, created_at = datetime(\'now\') WHERE id = ?'
                  ).bind(
                    formName,
                    mappedData.contact_name || null,
                    mappedData.contact_phone || null,
                    mappedData.company || null,
                    mappedData.title || null,
                    mappedData.value ? parseFloat(mappedData.value) : 0,
                    mappedData.tags || null,
                    JSON.stringify(updatedRawData),
                    mLeadId
                  ).run();
                  console.log('[TRACKING] Updated existing marketing lead (contact):', mLeadId);
                } else {
                  // Insert new marketing lead
                  await c.env.DB.prepare(
                    'INSERT INTO marketing_leads (id, account_id, form_name, contact_name, contact_email, contact_phone, company, title, value, tags, raw_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                  ).bind(
                    mLeadId,
                    settings.account_id,
                    formName,
                    mappedData.contact_name || null,
                    normalizedEmail,
                    mappedData.contact_phone || null,
                    mappedData.company || null,
                    mappedData.title || null,
                    mappedData.value ? parseFloat(mappedData.value) : 0,
                    mappedData.tags || null,
                    JSON.stringify(updatedRawData)
                  ).run();
                  console.log('[TRACKING] Created new marketing lead (contact):', mLeadId);
                }

                // Record form submission for segmentation (linked to marketing lead, not CRM)
                try {
                  const fsId = crypto.randomUUID();
                  const canonicalFormId = existing ? existing.id : (formData.fid || formName);
                  await c.env.DB.prepare(
                    'INSERT INTO form_submissions (id, account_id, form_id, lead_id, visitor_id, email, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
                  ).bind(
                    fsId, settings.account_id,
                    canonicalFormId,
                    mLeadId, visitor_id || null,
                    mappedData.contact_email || null,
                    JSON.stringify(fields)
                  ).run();
                } catch (fsErr) {
                  console.error('[TRACKING] Error recording form submission:', fsErr.message);
                }

                // Map visitor_id → marketing lead for future pageview tracking
                if (visitor_id) {
                  try {
                    const vlId = crypto.randomUUID();
                    await c.env.DB.prepare(
                      'INSERT OR IGNORE INTO visitor_leads (id, account_id, visitor_id, lead_id, email, source) VALUES (?, ?, ?, ?, ?, ?)'
                    ).bind(vlId, settings.account_id, visitor_id, mLeadId, mappedData.contact_email || null, 'form_submit').run();
                  } catch (vlErr) { /* visitor_leads table may not exist yet */ }
                }

                // Trigger form_submit automations using marketing lead ID
                // Automations can include the "send_to_crm" action to forward the lead to a CRM funnel
                try {
                  const formId = formData.fid || formName;
                  await triggerAutomations(settings.account_id, 'form_submit', mLeadId, c.env.DB, { form_id: formId });
                } catch (autoErr: any) {
                  console.error('[TRACKING] Error triggering automations:', autoErr.message);
                }
              }
            } catch (leadErr: any) {
              console.error('[TRACKING] Error creating marketing lead:', leadErr.message);
            }
          }
        }
      }
    } catch (e: any) {
      console.error('[TRACKING] Auto-register form error:', e.message);
    }

    return new Response(JSON.stringify({ success: true, id: eventId }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('[TRACKING] Error:', error.message);
    return new Response(JSON.stringify({ error: 'Erro interno no servidor.' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

// Get tracking stats (counts by event type)
app.get('/tracking/stats', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json({});

    const pageviews = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM tracking_events WHERE account_id = ? AND event_type = 'pageview'"
    ).bind(accountId).first() as any;

    const forms = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM tracking_events WHERE account_id = ? AND event_type = 'form'"
    ).bind(accountId).first() as any;

    const conversions = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM tracking_events WHERE account_id = ? AND event_type = 'conversion'"
    ).bind(accountId).first() as any;

    return c.json({
      pageviews: pageviews?.count || 0,
      forms: forms?.count || 0,
      conversions: conversions?.count || 0
    });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// ==================== TRACKING FORMS ENDPOINTS ====================

app.get('/tracking-forms', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare('SELECT * FROM tracking_forms WHERE account_id = ? ORDER BY created_at DESC').bind(accountId).all();
    return c.json(results.map((f: any) => ({ ...f, fields: f.fields ? JSON.parse(f.fields) : [], field_mapping: f.field_mapping ? JSON.parse(f.field_mapping) : {} })));
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.post('/tracking-forms', async (c) => {
  try {
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);
    const { name, url_pattern, form_selector, fields, field_mapping, is_active } = body;
    if (!name) return c.json({ error: 'name is required' }, 400);
    const id = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO tracking_forms (id, account_id, name, url_pattern, form_selector, fields, field_mapping, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, account_id, name, url_pattern || null, form_selector || null, JSON.stringify(fields || []), JSON.stringify(field_mapping || {}), is_active ?? 1).run();
    return c.json({ id, name, url_pattern, form_selector, fields: fields || [], field_mapping: field_mapping || {}, is_active: is_active ?? 1 });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.put('/tracking-forms/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const { name, url_pattern, form_selector, fields, field_mapping, is_active } = body;
    await c.env.DB.prepare('UPDATE tracking_forms SET name = ?, url_pattern = ?, form_selector = ?, fields = ?, field_mapping = ?, is_active = ? WHERE id = ? AND account_id = ?')
      .bind(name, url_pattern || null, form_selector || null, JSON.stringify(fields || []), JSON.stringify(field_mapping || {}), is_active ?? 1, id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.delete('/tracking-forms/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM tracking_forms WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// ==================== MARKETING CUSTOM FIELDS & MAPPING ====================

app.get('/marketing/custom-fields', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare('SELECT * FROM marketing_custom_fields WHERE account_id = ? ORDER BY created_at DESC').bind(accountId).all();
    return c.json(results);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.post('/marketing/custom-fields', async (c) => {
  try {
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);
    const { name, type, options } = body;
    const id = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO marketing_custom_fields (id, account_id, name, type, options) VALUES (?, ?, ?, ?, ?)')
      .bind(id, account_id, name, type, options || null).run();
    return c.json({ id, name, type, options });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.put('/marketing/custom-fields/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const { name, type, options } = body;
    await c.env.DB.prepare('UPDATE marketing_custom_fields SET name = ?, type = ?, options = ? WHERE id = ? AND account_id = ?')
      .bind(name, type, options || null, id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.delete('/marketing/custom-fields/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM marketing_custom_fields WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.get('/marketing/field-mappings', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare('SELECT * FROM marketing_crm_mappings WHERE account_id = ?').bind(accountId).all();
    return c.json(results);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.post('/marketing/field-mappings', async (c) => {
  try {
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);
    const { mappings } = body;
    
    await c.env.DB.prepare('DELETE FROM marketing_crm_mappings WHERE account_id = ?').bind(account_id).run();
    
    if (Array.isArray(mappings) && mappings.length > 0) {
      for (const m of mappings) {
        const id = crypto.randomUUID();
        await c.env.DB.prepare('INSERT INTO marketing_crm_mappings (id, account_id, marketing_field_id, crm_field_id, marketing_standard_field, crm_standard_field) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(id, account_id, m.marketing_field_id || null, m.crm_field_id || null, m.marketing_standard_field || null, m.crm_standard_field || null).run();
      }
    }
    
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// ==================== MARKETING LEADS ENDPOINTS ====================

// ==================== LEAD VISITS & TIMELINE ENDPOINTS ====================

app.get('/lead-visits', async (c) => {
  try {
    const leadId = c.req.query('lead_id');
    if (!leadId) return c.json({ error: 'lead_id is required' }, 400);
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const owned = await c.env.DB.prepare('SELECT id FROM leads WHERE id = ? AND account_id = ?').bind(leadId, account_id).first();
    if (!owned) return c.json({ error: 'Lead não encontrado.' }, 404);

    const { results } = await c.env.DB.prepare(
      'SELECT * FROM lead_visits WHERE lead_id = ? ORDER BY visited_at DESC LIMIT 500'
    ).bind(leadId).all();
    return c.json(results);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.get('/lead-timeline', async (c) => {
  try {
    const leadId = c.req.query('lead_id');
    if (!leadId) return c.json({ error: 'lead_id is required' }, 400);
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const ownedLead = await c.env.DB.prepare('SELECT id FROM leads WHERE id = ? AND account_id = ?').bind(leadId, account_id).first();
    const ownedMarketingLead = ownedLead ? null : await c.env.DB.prepare('SELECT id FROM marketing_leads WHERE id = ? AND account_id = ?').bind(leadId, account_id).first();
    if (!ownedLead && !ownedMarketingLead) return c.json({ error: 'Lead não encontrado.' }, 404);

    // 1. Get visitor_ids associated with this lead (either CRM or Marketing lead)
    // First, try visitor_leads (CRM leads)
    let { results: visitors } = await c.env.DB.prepare(
      'SELECT visitor_id FROM visitor_leads WHERE lead_id = ?'
    ).bind(leadId).all();

    // If not found, it might be a marketing_lead. Try finding visitor_ids by email.
    if (!visitors || visitors.length === 0) {
      const mLead: any = await c.env.DB.prepare(
        'SELECT contact_email FROM marketing_leads WHERE id = ?'
      ).bind(leadId).first();

      if (mLead?.contact_email) {
        // Try visitor_leads first (even if not explicitly mapped, they might be there)
        const { results: vids1 } = await c.env.DB.prepare(
          'SELECT DISTINCT visitor_id FROM visitor_leads WHERE email = ?'
        ).bind(mLead.contact_email).all();
        
        // Try form_submissions which stores visitor_id and email
        const { results: vids2 } = await c.env.DB.prepare(
          'SELECT DISTINCT visitor_id FROM form_submissions WHERE email = ?'
        ).bind(mLead.contact_email).all();

        // Fallback: search in tracking_events form_data (legacy or if other tables missed it)
        const { results: vids3 } = await c.env.DB.prepare(
          'SELECT DISTINCT visitor_id FROM tracking_events WHERE form_data LIKE ?'
        ).bind(`%${mLead.contact_email}%`).all();
        
        const allVids = [...(vids1 || []), ...(vids2 || []), ...(vids3 || [])] as any[];
        // Deduplicate
        const uniqueVids = Array.from(new Set(allVids.map(v => v.visitor_id))).map(id => ({ visitor_id: id }));
        visitors = uniqueVids;
      }
    }

    if (!visitors || visitors.length === 0) {
      return c.json([]);
    }

    const visitorIds = (visitors as any[]).map(v => v.visitor_id);
    
    // 2. Fetch all events for these visitor_ids
    const placeholders = visitorIds.map(() => '?').join(',');
    const { results: events } = await c.env.DB.prepare(
      `SELECT * FROM tracking_events WHERE visitor_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 500`
    ).bind(...visitorIds).all();

    // 3. Get the target lead email to filter out "hijacked" visitor events
    const targetLead: any = await c.env.DB.prepare(
      'SELECT contact_email FROM leads WHERE id = ? UNION SELECT contact_email FROM marketing_leads WHERE id = ?'
    ).bind(leadId, leadId).first();
    const targetEmail = targetLead?.contact_email?.toLowerCase();

    // 4. Parse JSON data and filter events
    const parsedEvents = (events as any[]).filter(ev => {
      if (!ev.form_data || !targetEmail) return true;
      try {
        const formData = typeof ev.form_data === 'string' ? JSON.parse(ev.form_data) : ev.form_data;
        const fields = formData.fields || formData;
        
        // Search for ANY field that looks like an email or has "email" in the key
        let foundEmailInEvent = null;
        for (const key in fields) {
          const val = String(fields[key]).toLowerCase();
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('email') || lowerKey.includes('mail') || val.includes('@')) {
            if (val.includes('@') && val.includes('.')) {
              foundEmailInEvent = val;
              break;
            }
          }
        }

        // If an email was found in this form and it's NOT our target lead, exclude it
        if (foundEmailInEvent && foundEmailInEvent !== targetEmail) {
          return false;
        }
      } catch (e) { /* skip parse errors */ }
      return true;
    }).map(ev => {
      let eventData = null;
      try {
        if (ev.data) {
          eventData = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        } else if (ev.form_data) {
          const parsedForm = typeof ev.form_data === 'string' ? JSON.parse(ev.form_data) : ev.form_data;
          eventData = { form_data: parsedForm, ...parsedForm };
        }
      } catch (e) { console.error('JSON parse error in timeline:', e); }

      return {
        ...ev,
        event_data: eventData
      };
    });

    return c.json(parsedEvents);
  } catch (error: any) { 
    console.error('Lead timeline error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); 
  }
});

app.get('/marketing-leads', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM marketing_leads WHERE account_id = ? ORDER BY created_at DESC LIMIT 500'
    ).bind(accountId).all();
    return c.json(results);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.post('/marketing-leads/sync-to-crm', async (c) => {
  try {
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);
    const { lead_ids } = body;

    let synced = 0;
    let skipped = 0;
    for (const leadId of lead_ids) {
      const mLead: any = await c.env.DB.prepare(
        'SELECT * FROM marketing_leads WHERE id = ? AND account_id = ?'
      ).bind(leadId, account_id).first();
      if (!mLead || mLead.synced_to_crm) continue;

      // EMAIL IS REQUIRED to sync to CRM
      if (!mLead.contact_email) {
        console.log('[MARKETING LEADS] Skipped sync (no email):', mLead.form_name, mLead.id);
        skipped++;
        continue;
      }

      // Create NEW lead in CRM (Allowing multiple negotiations for the same contact)
      const crmId = crypto.randomUUID();
      await c.env.DB.prepare(
        'INSERT INTO leads (id, account_id, funnel_id, stage_id, title, company, value, contact_name, contact_email, contact_phone, tags, custom_values, created_at) VALUES (?, ?, (SELECT id FROM funnels WHERE account_id = ? LIMIT 1), (SELECT id FROM stages WHERE funnel_id = (SELECT id FROM funnels WHERE account_id = ? LIMIT 1) LIMIT 1), ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
      ).bind(
        crmId, account_id, account_id, account_id,
        mLead.title || mLead.contact_name || `Negociação: ${mLead.form_name}`,
        mLead.company || null,
        mLead.value || 0,
        mLead.contact_name || null,
        mLead.contact_email || null,
        mLead.contact_phone || null,
        mLead.tags || null,
        JSON.stringify({ source: 'marketing_form', form_name: mLead.form_name, raw: mLead.raw_data ? JSON.parse(mLead.raw_data) : null })
      ).run();

      await c.env.DB.prepare('UPDATE marketing_leads SET synced_to_crm = 1 WHERE id = ?').bind(leadId).run();

      // Trigger new_lead automation
      await triggerAutomations(account_id, 'new_lead', crmId, c.env.DB);

      synced++;
    }
    return c.json({ success: true, synced, skipped });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.delete('/marketing-leads/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM marketing_leads WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// ==================== BIO LINKS ENDPOINTS ====================

// Get all bio link pages for an account
app.get('/bio-links', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    console.log('Fetching bio links for:', accountId);
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM bio_links WHERE account_id = ? ORDER BY created_at DESC'
    ).bind(accountId).all();
    console.log('Bio links found:', results?.length || 0);
    return c.json(results.map((r: any) => ({ ...r, links: r.links ? JSON.parse(r.links) : [] })));
  } catch (error: any) {
    console.error('Bio fetch error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Get a single bio link page by slug (public)
app.get('/bio-links/public/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const page: any = await c.env.DB.prepare(
      'SELECT * FROM bio_links WHERE slug = ? AND is_active = 1'
    ).bind(slug).first();
    if (!page) return c.json({ error: 'Not found' }, 404);
    page.links = page.links ? JSON.parse(page.links) : [];
    // Increment click count
    await c.env.DB.prepare(
      'UPDATE bio_links SET click_count = click_count + 1 WHERE id = ?'
    ).bind(page.id).run();
    return c.json(page);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// ==================== ADMINISTRATIVE / CLEANUP ====================

app.get('/admin/deduplicate-marketing-leads', async (c) => {
  try {
    // Intentionally reads account_id from the query, not the session: this route is
    // already gated by requireNexusAdmin above and exists specifically so a platform
    // admin can target a DIFFERENT tenant's data (their own session account is acc_nexus).
    const accountId = c.req.query("account_id");
    const allAccounts = c.req.query('all') === 'true';
    
    // 1. Find emails with duplicates (trimming and lowercasing)
    let query = `
      SELECT LOWER(TRIM(contact_email)) as email, account_id, COUNT(*) as count
      FROM marketing_leads
      WHERE contact_email IS NOT NULL AND contact_email != ''
    `;
    const queryParams: any[] = [];

    if (!allAccounts) {
      if (!accountId) return c.json({ error: 'account_id is required when not using all=true' }, 400);
      query += ` AND account_id = ?`;
      queryParams.push(accountId);
    }

    query += ` GROUP BY LOWER(TRIM(contact_email)), account_id HAVING count > 1`;

    const { results: duplicates } = await c.env.DB.prepare(query).bind(...queryParams).all();

    let totalRemoved = 0;
    const details = [];

    for (const dup of duplicates as any[]) {
      // 2. Get all records for this email, ordered by created_at (oldest first)
      const { results: records } = await c.env.DB.prepare(
        'SELECT id FROM marketing_leads WHERE account_id = ? AND LOWER(TRIM(contact_email)) = ? ORDER BY created_at ASC'
      ).bind(dup.account_id, dup.email).all();

      if (records.length > 1) {
        const idsToRemove = (records as any[]).slice(1).map(r => r.id);
        
        // 3. Delete duplicates
        for (const id of idsToRemove) {
          await c.env.DB.prepare('DELETE FROM marketing_leads WHERE id = ?').bind(id).run();
          totalRemoved++;
        }
        details.push({ email: dup.email, account: dup.account_id, removedCount: idsToRemove.length });
      }
    }

    return c.json({ success: true, message: `Removidos ${totalRemoved} leads duplicados.`, totalRemoved, details });
  } catch (error: any) { 
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); 
  }
});

// Create a new bio link page
app.post('/bio-links', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json({ error: 'account_id is required' }, 400);
    const slug = body.slug || id.slice(0, 8);
    const links = JSON.stringify(body.links || []);

    console.log('Creating bio page:', { id, accountId, slug, title: body.title, linkCount: body.links?.length || 0 });

    await c.env.DB.prepare(
      `INSERT INTO bio_links (id, account_id, slug, title, description, avatar_url, bg_color, text_color, button_color, button_text_color, button_radius, links, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, accountId, slug, body.title || 'Meus Links', body.description || '', body.avatar_url || '',
      body.bg_color || '#0f172a', body.text_color || '#f8fafc', body.button_color || '#0d9488',
      body.button_text_color || '#ffffff', body.button_radius ?? 12, links, body.is_active ?? 1
    ).run();

    return c.json({ id, account_id: accountId, slug, title: body.title, links: body.links || [], bg_color: body.bg_color, text_color: body.text_color, button_color: body.button_color, button_text_color: body.button_text_color, button_radius: body.button_radius ?? 12 });
  } catch (error: any) {
    console.error('Bio create error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Update a bio link page
app.put('/bio-links/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const links = body.links ? JSON.stringify(body.links) : null;

    await c.env.DB.prepare(
      `UPDATE bio_links SET slug = COALESCE(?, slug), title = COALESCE(?, title), description = COALESCE(?, description),
       avatar_url = COALESCE(?, avatar_url), bg_color = COALESCE(?, bg_color), text_color = COALESCE(?, text_color),
       button_color = COALESCE(?, button_color), button_text_color = COALESCE(?, button_text_color),
       button_radius = COALESCE(?, button_radius), links = COALESCE(?, links),
       is_active = COALESCE(?, is_active), updated_at = datetime('now')
       WHERE id = ? AND account_id = ?`
    ).bind(
      body.slug, body.title, body.description, body.avatar_url,
      body.bg_color, body.text_color, body.button_color, body.button_text_color,
      body.button_radius, links, body.is_active, id, account_id
    ).run();

    // Fetch updated
    const updated: any = await c.env.DB.prepare('SELECT * FROM bio_links WHERE id = ? AND account_id = ?').bind(id, account_id).first();
    if (updated) updated.links = updated.links ? JSON.parse(updated.links) : [];
    return c.json(updated || { success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// Delete a bio link page
app.delete('/bio-links/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM bio_links WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// Track link click
app.post('/bio-links/:id/click', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const clickId = crypto.randomUUID();
    
    await c.env.DB.prepare(
      'INSERT INTO bio_link_clicks (id, bio_link_id, account_id, link_label, link_url, referrer, user_agent, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      clickId, id, body.account_id, body.link_label, body.link_url,
      body.referrer || '', body.user_agent || '', body.ip_address || ''
    ).run();

    // Increment total click count
    await c.env.DB.prepare(
      'UPDATE bio_links SET click_count = click_count + 1 WHERE id = ?'
    ).bind(id).run();

    return c.json({ success: true, click_id: clickId });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// Get analytics for a bio link page
app.get('/bio-links/:id/analytics', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const owned = await c.env.DB.prepare('SELECT id FROM bio_links WHERE id = ? AND account_id = ?').bind(id, account_id).first();
    if (!owned) return c.json({ error: 'Não encontrado.' }, 404);
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    let dateFilter = '';
    const dateParams: any[] = [];
    if (startDate && endDate) {
      dateFilter = 'AND clicked_at BETWEEN ? AND ?';
      dateParams.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'AND clicked_at >= ?';
      dateParams.push(startDate);
    } else if (endDate) {
      dateFilter = 'AND clicked_at <= ?';
      dateParams.push(endDate);
    }

    // Total clicks per link label
    const clicksByLink = await c.env.DB.prepare(
      `SELECT link_label, link_url, COUNT(*) as click_count,
              COUNT(DISTINCT ip_address) as unique_clicks,
              MIN(clicked_at) as first_click,
              MAX(clicked_at) as last_click
       FROM bio_link_clicks
       WHERE bio_link_id = ? ${dateFilter}
       GROUP BY link_label, link_url
       ORDER BY click_count DESC`
    ).bind(id, ...dateParams).all();

    // Daily clicks
    const dailyClicks = await c.env.DB.prepare(
      `SELECT DATE(clicked_at) as date, COUNT(*) as click_count,
              COUNT(DISTINCT ip_address) as unique_clicks
       FROM bio_link_clicks
       WHERE bio_link_id = ? ${dateFilter}
       GROUP BY DATE(clicked_at)
       ORDER BY date ASC`
    ).bind(id, ...dateParams).all();

    // Total stats
    const totalStats = await c.env.DB.prepare(
      `SELECT COUNT(*) as total_clicks,
              COUNT(DISTINCT ip_address) as total_unique_clicks,
              COUNT(DISTINCT link_label) as total_links_clicked
       FROM bio_link_clicks
       WHERE bio_link_id = ? ${dateFilter}`
    ).bind(id, ...dateParams).first();

    return c.json({
      clicks_by_link: clicksByLink.results || [],
      daily_clicks: dailyClicks.results || [],
      total_stats: totalStats || { total_clicks: 0, total_unique_clicks: 0, total_links_clicked: 0 }
    });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// ==================== EMAIL MARKETING ENDPOINTS ====================

// --- Email Templates ---
app.get('/email-templates', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const type = c.req.query('type');
    const query = type ? 'SELECT * FROM email_templates WHERE account_id = ? AND type = ? ORDER BY created_at DESC' : 'SELECT * FROM email_templates WHERE account_id = ? ORDER BY created_at DESC';
    const { results } = await c.env.DB.prepare(query).bind(type ? [accountId, type] : [accountId]).all();
    return c.json(results);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.post('/email-templates', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json({ error: 'account_id is required' }, 400);
    await c.env.DB.prepare(
      'INSERT INTO email_templates (id, account_id, name, subject, body, type) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, accountId, body.name, body.subject, body.body, body.type || 'campaign').run();
    return c.json({ id, name: body.name, subject: body.subject, body: body.body, type: body.type || 'campaign' });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.put('/email-templates/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare(
      'UPDATE email_templates SET name = COALESCE(?, name), subject = COALESCE(?, subject), body = COALESCE(?, body), type = COALESCE(?, type), updated_at = datetime(\'now\') WHERE id = ? AND account_id = ?'
    ).bind(body.name, body.subject, body.body, body.type, id, account_id).run();
    const updated: any = await c.env.DB.prepare('SELECT * FROM email_templates WHERE id = ? AND account_id = ?').bind(id, account_id).first();
    return c.json(updated || { success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.delete('/email-templates/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM email_templates WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// --- Email Campaigns ---
app.get('/email-campaigns', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM email_campaigns WHERE account_id = ? ORDER BY created_at DESC'
    ).bind(accountId).all();
    return c.json(results.map((r: any) => ({ ...r, engaged_lead_ids: r.engaged_lead_ids ? JSON.parse(r.engaged_lead_ids) : [] })));
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.get('/email-campaigns/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const campaign: any = await c.env.DB.prepare('SELECT * FROM email_campaigns WHERE id = ? AND account_id = ?').bind(id, account_id).first();
    if (!campaign) return c.json({ error: 'Not found' }, 404);
    campaign.engaged_lead_ids = campaign.engaged_lead_ids ? JSON.parse(campaign.engaged_lead_ids) : [];
    // Get event breakdown
    const events: any = await c.env.DB.prepare(
      'SELECT event_type, COUNT(*) as count FROM email_events WHERE campaign_id = ? GROUP BY event_type'
    ).bind(id).all();
    campaign.event_breakdown = events.results;
    return c.json(campaign);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.post('/email-campaigns', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json({ error: 'account_id is required' }, 400);
    await c.env.DB.prepare(
      'INSERT INTO email_campaigns (id, account_id, name, segment_id, template_id, subject, body, status, scheduled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, accountId, body.name, body.segment_id || null, body.template_id || null, body.subject, body.body, body.status || 'draft', body.scheduled_at || null).run();
    const campaign: any = await c.env.DB.prepare('SELECT * FROM email_campaigns WHERE id = ?').bind(id).first();
    return c.json(campaign);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.put('/email-campaigns/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare(
      'UPDATE email_campaigns SET name = COALESCE(?, name), segment_id = COALESCE(?, segment_id), template_id = COALESCE(?, template_id), subject = COALESCE(?, subject), body = COALESCE(?, body), status = COALESCE(?, status), scheduled_at = COALESCE(?, scheduled_at), updated_at = datetime(\'now\') WHERE id = ? AND account_id = ?'
    ).bind(body.name, body.segment_id, body.template_id, body.subject, body.body, body.status, body.scheduled_at, id, account_id).run();
    const updated: any = await c.env.DB.prepare('SELECT * FROM email_campaigns WHERE id = ? AND account_id = ?').bind(id, account_id).first();
    return c.json(updated || { success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.delete('/email-campaigns/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM email_campaigns WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    await c.env.DB.prepare('DELETE FROM email_events WHERE campaign_id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// --- Send Campaign (simulate dispatch) ---
app.post('/email-campaigns/:id/send', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const campaign: any = await c.env.DB.prepare('SELECT * FROM email_campaigns WHERE id = ? AND account_id = ?').bind(id, account_id).first();
    if (!campaign) return c.json({ error: 'Campaign not found' }, 404);

    // Get leads from segment
    let leads: any[] = [];
    if (campaign.segment_id) {
      const segment: any = await c.env.DB.prepare('SELECT * FROM segments WHERE id = ?').bind(campaign.segment_id).first();
      if (segment) {
        const rules = segment.rules ? JSON.parse(segment.rules) : [];
        const campaignSegment: any = await c.env.DB.prepare('SELECT account_id FROM segments WHERE id = ?').bind(campaign.segment_id).first();
        if (campaignSegment) {
          const { whereClause, params } = await buildSegmentQuery(c.env.DB, campaignSegment.account_id, rules);
          const leadResults = await c.env.DB.prepare(`SELECT id, contact_email FROM leads WHERE ${whereClause}`).bind(...params).all();
          leads = leadResults.results || [];
        }
      }
    }

    // Filter leads with email
    const emailLeads = leads.filter(l => l.contact_email);
    const totalSent = emailLeads.length;

    // Update campaign status
    await c.env.DB.prepare(
      'UPDATE email_campaigns SET status = ?, total_sent = ?, sent_at = datetime(\'now\') WHERE id = ?'
    ).bind('sent', totalSent, id).run();

    // Create sent events
    for (const lead of emailLeads) {
      await c.env.DB.prepare(
        'INSERT INTO email_events (id, campaign_id, lead_id, lead_email, event_type) VALUES (?, ?, ?, ?, ?)'
      ).bind(crypto.randomUUID(), id, lead.id, lead.contact_email, 'sent').run();
    }

    return c.json({ success: true, total_sent: totalSent });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// --- Track Email Events (open, click, bounce) ---
app.post('/email-events/track', async (c) => {
  try {
    const body = await c.req.json();
    const { campaign_id, lead_id, lead_email, event_type, clicked_url } = body;

    await c.env.DB.prepare(
      'INSERT INTO email_events (id, campaign_id, lead_id, lead_email, event_type, clicked_url) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), campaign_id, lead_id || null, lead_email, event_type, clicked_url || null).run();

    // Update campaign counters
    const updates: Record<string, string> = {
      opened: 'total_opened',
      clicked: 'total_clicked',
      hard_bounce: 'total_hard_bounce',
      soft_bounce: 'total_soft_bounce',
    };
    if (updates[event_type]) {
      await c.env.DB.prepare(
        `UPDATE email_campaigns SET ${updates[event_type]} = ${updates[event_type]} + 1 WHERE id = ?`
      ).bind(campaign_id).run();
    }

    // Track engaged leads (opened or clicked)
    if (event_type === 'opened' || event_type === 'clicked') {
      const campaign: any = await c.env.DB.prepare('SELECT engaged_lead_ids FROM email_campaigns WHERE id = ?').bind(campaign_id).first();
      if (campaign) {
        const engaged = campaign.engaged_lead_ids ? JSON.parse(campaign.engaged_lead_ids) : [];
        if (lead_id && !engaged.includes(lead_id)) {
          engaged.push(lead_id);
          await c.env.DB.prepare(
            'UPDATE email_campaigns SET engaged_lead_ids = ? WHERE id = ?'
          ).bind(JSON.stringify(engaged), campaign_id).run();
        }
      }
    }

    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// --- Get Campaign Metrics ---
app.get('/email-campaigns/:id/metrics', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const campaign: any = await c.env.DB.prepare('SELECT * FROM email_campaigns WHERE id = ? AND account_id = ?').bind(id, account_id).first();
    if (!campaign) return c.json({ error: 'Not found' }, 404);

    const total = campaign.total_sent || 0;
    const metrics = {
      total_sent: total,
      total_opened: campaign.total_opened || 0,
      total_clicked: campaign.total_clicked || 0,
      total_hard_bounce: campaign.total_hard_bounce || 0,
      total_soft_bounce: campaign.total_soft_bounce || 0,
      open_rate: total > 0 ? ((campaign.total_opened || 0) / total * 100).toFixed(1) : 0,
      click_rate: total > 0 ? ((campaign.total_clicked || 0) / total * 100).toFixed(1) : 0,
      hard_bounce_rate: total > 0 ? ((campaign.total_hard_bounce || 0) / total * 100).toFixed(1) : 0,
      soft_bounce_rate: total > 0 ? ((campaign.total_soft_bounce || 0) / total * 100).toFixed(1) : 0,
      engaged_count: campaign.engaged_lead_ids ? JSON.parse(campaign.engaged_lead_ids).length : 0,
    };

    return c.json(metrics);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// ==================== SEGMENT HELPER ====================
// `field` below ends up interpolated directly into SQL as a column name (bind()
// only parameterizes values, not identifiers). It must be checked against this
// allowlist of real `leads` columns before use — otherwise it's SQL injection
// via attacker-controlled segment rules.
const SEGMENT_ALLOWED_FIELDS = new Set([
  'title', 'company', 'value', 'contact_name', 'contact_email', 'contact_phone',
  'funnel_id', 'stage_id', 'assigned_user_id', 'probability', 'tags',
  'score_profile', 'score_interest', 'score_grade', 'created_at',
]);

async function buildSegmentQuery(db: any, accountId: string, rules: any[]) {
  let whereClause = 'account_id = ?';
  const params: any[] = [accountId];

  for (const rule of rules) {
    let { field, operator, value } = rule;

    if (field !== 'filled_form' && field !== 'visited_page' && !SEGMENT_ALLOWED_FIELDS.has(field)) {
      continue; // unknown/unsafe field name — skip this rule rather than build SQL from it
    }

    // The UI hides the operator dropdown for special fields, meaning it often defaults to 'contains'
    // or whatever was last selected. We must normalize it to 'equals' (affirmative) or 'not_equals' (negative).
    if (field === 'filled_form') {
      if (operator !== 'not_equals' && operator !== 'not_contains') {
        operator = 'equals';
      } else {
        operator = 'not_equals';
      }
    }

    if (field === 'visited_page') continue; // Temporarily removed from logic

    if (field === 'filled_form') {
      const formInfo: any = await db.prepare(
        'SELECT id, name FROM tracking_forms WHERE (id = ? OR name = ?) AND account_id = ?'
      ).bind(value, value, accountId).first();

      if (formInfo) {
        // Match by lead_id OR contact_email to be robust
        // Match by form_id UUID OR name to handle inconsistent tracking data correctly
        if (operator === 'equals') {
          whereClause += ` AND (
            id IN (SELECT lead_id FROM form_submissions WHERE account_id = ? AND (form_id = ? OR form_id = ?) AND lead_id IS NOT NULL)
            OR
            contact_email IN (SELECT email FROM form_submissions WHERE account_id = ? AND (form_id = ? OR form_id = ?) AND email IS NOT NULL)
          )`;
          params.push(accountId, formInfo.id, formInfo.name, accountId, formInfo.id, formInfo.name);
        } else if (operator === 'not_equals') {
          whereClause += ` AND (
            id NOT IN (SELECT lead_id FROM form_submissions WHERE account_id = ? AND (form_id = ? OR form_id = ?) AND lead_id IS NOT NULL)
            AND
            contact_email NOT IN (SELECT email FROM form_submissions WHERE account_id = ? AND (form_id = ? OR form_id = ?) AND email IS NOT NULL)
          )`;
          params.push(accountId, formInfo.id, formInfo.name, accountId, formInfo.id, formInfo.name);
        }
      } else if (operator === 'equals') {
        whereClause += ` AND 1=0`;
      }
      continue;
    }



    switch (operator) {
      case 'equals': whereClause += ` AND ${field} = ?`; params.push(value); break;
      case 'not_equals': whereClause += ` AND ${field} != ?`; params.push(value); break;
      case 'contains': whereClause += ` AND ${field} LIKE ?`; params.push(`%${value}%`); break;
      case 'not_contains': whereClause += ` AND ${field} NOT LIKE ?`; params.push(`%${value}%`); break;
      case 'greater_than': whereClause += ` AND ${field} > ?`; params.push(parseFloat(value)); break;
      case 'less_than': whereClause += ` AND ${field} < ?`; params.push(parseFloat(value)); break;
      case 'starts_with': whereClause += ` AND ${field} LIKE ?`; params.push(`${value}%`); break;
      case 'ends_with': whereClause += ` AND ${field} LIKE ?`; params.push(`%${value}`); break;
      case 'is_empty': whereClause += ` AND (${field} IS NULL OR ${field} = '')`; break;
      case 'is_not_empty': whereClause += ` AND ${field} IS NOT NULL AND ${field} != ''`; break;
    }
  }

  return { whereClause, params };
}

// ==================== SEGMENT ENDPOINTS ====================

// Get all segments
app.get('/segments', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM segments WHERE account_id = ? ORDER BY created_at DESC'
    ).bind(accountId).all();

    // Parse rules JSON and count leads for each segment
    const segments = [];
    for (const s of results) {
      const rules = s.rules ? JSON.parse(s.rules) : [];
      let leadCount = 0;

      if (rules.length > 0) {
        const { whereClause, params } = await buildSegmentQuery(c.env.DB, accountId, rules);

        const countResult: any = await c.env.DB.prepare(
          `SELECT COUNT(*) as cnt FROM leads WHERE ${whereClause}`
        ).bind(...params).first();
        leadCount = countResult?.cnt || 0;

        // Update stored lead_count
        await c.env.DB.prepare(
          'UPDATE segments SET lead_count = ? WHERE id = ?'
        ).bind(leadCount, s.id).run();
      }

      segments.push({ ...s, rules, lead_count: leadCount });
    }

    return c.json(segments);
  } catch (error: any) {
    console.error('Get segments error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Create segment
app.post('/segments', async (c) => {
  try {
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);
    const { name, description, rules } = body;

    console.log('[SEGMENTS] Creating segment:', { account_id, name, rulesCount: rules?.length });

    if (!name || !rules || rules.length === 0) {
      console.error('[SEGMENTS] Validation failed:', { name: !!name, rules: !!rules, rulesLength: rules?.length });
      return c.json({ error: 'name and rules are required' }, 400);
    }

    const id = crypto.randomUUID();
    const rulesJson = JSON.stringify(rules);

    await c.env.DB.prepare(
      'INSERT INTO segments (id, account_id, name, description, rules, lead_count) VALUES (?, ?, ?, ?, ?, 0)'
    ).bind(id, account_id, name, description || null, rulesJson).run();

    console.log('[SEGMENTS] Created segment:', id);
    return c.json({ id, name, description, rules, lead_count: 0 });
  } catch (error: any) {
    console.error('[SEGMENTS] Create segment error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Update segment
app.put('/segments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const { name, description, rules } = body;

    await c.env.DB.prepare(
      'UPDATE segments SET name = ?, description = ?, rules = ?, updated_at = datetime(\'now\') WHERE id = ? AND account_id = ?'
    ).bind(name, description || null, JSON.stringify(rules), id, account_id).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Delete segment
app.delete('/segments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM segments WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Preview segment (match leads against rules)
app.post('/segments/preview', async (c) => {
  try {
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);
    const { rules } = body;

    console.log('[SEGMENTS PREVIEW] Input:', { account_id, rulesCount: rules?.length, rules: JSON.stringify(rules) });

    if (!rules || rules.length === 0) {
      return c.json({ leads: [] });
    }

    const { whereClause, params } = await buildSegmentQuery(c.env.DB, account_id, rules);
    const debugInfo: any = { rulesProcessed: rules.length, filledFormChecks: [] };

    const { results } = await c.env.DB.prepare(
      `SELECT * FROM leads WHERE ${whereClause} ORDER BY created_at DESC LIMIT 500`
    ).bind(...params).all();

    console.log('[SEGMENTS PREVIEW] Final query:', { whereClause, paramsCount: params.length, resultCount: results.length });

    return c.json({ 
      leads: results, 
      count: results.length,
      _debug: debugInfo
    });
  } catch (error: any) {
    console.error('Segment preview error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// ==================== AUTOMATION ENDPOINTS ====================

// Get all automations
app.get('/automations', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM automations WHERE account_id = ? ORDER BY created_at DESC'
    ).bind(accountId).all();

    const automations = results.map((a: any) => ({
      ...a,
      nodes: a.nodes ? JSON.parse(a.nodes) : [],
      connections: a.connections ? JSON.parse(a.connections) : [],
      trigger_config: a.trigger_config ? JSON.parse(a.trigger_config) : {}
    }));

    return c.json(automations);
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Create automation
app.post('/automations', async (c) => {
  try {
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);
    const { name, description, is_active, trigger_type, trigger_config, nodes, connections } = body;

    if (!name) return c.json({ error: 'name is required' }, 400);

    const id = crypto.randomUUID();

    await c.env.DB.prepare(
      'INSERT INTO automations (id, account_id, name, description, is_active, trigger_type, trigger_config, nodes, connections) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id, account_id, name, description || null, is_active ?? 1, trigger_type || '',
      JSON.stringify(trigger_config || {}),
      JSON.stringify(nodes || []),
      JSON.stringify(connections || [])
    ).run();

    return c.json({ id, name, description, is_active: is_active ?? 1, trigger_type: trigger_type || '', trigger_config: trigger_config || {}, nodes: nodes || [], connections: connections || [] });
  } catch (error: any) {
    console.error('Create automation error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Update automation
app.put('/automations/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const { name, description, is_active, trigger_type, trigger_config, nodes, connections } = body;

    await c.env.DB.prepare(
      'UPDATE automations SET name = ?, description = ?, is_active = ?, trigger_type = ?, trigger_config = ?, nodes = ?, connections = ?, updated_at = datetime(\'now\') WHERE id = ? AND account_id = ?'
    ).bind(
      name, description || null, is_active ?? 1, trigger_type || '',
      JSON.stringify(trigger_config || {}),
      JSON.stringify(nodes || []),
      JSON.stringify(connections || []),
      id, account_id
    ).run();

    return c.json({ success: true, id });
  } catch (error: any) {
    console.error('Update automation error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Delete automation
app.delete('/automations/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM automations WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Execute automation manually / test mode
app.post('/automations/:id/execute', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const { lead_id, test_mode } = body as any;

    const automation: any = await c.env.DB.prepare(
      'SELECT * FROM automations WHERE id = ?'
    ).bind(id).first();

    if (!automation) return c.json({ error: 'Automação não encontrada' }, 404);

    const nodes = automation.nodes ? JSON.parse(automation.nodes) : [];
    const connections = automation.connections ? JSON.parse(automation.connections) : [];
    const triggerNode = nodes.find((n: any) => n.type === 'trigger');
    if (!triggerNode) return c.json({ error: 'Nenhum gatilho no fluxo' }, 400);

    let targetLeadId = lead_id;
    let testLeadName: string | null = null;
    let testLeadIsMarketing = false;

    // ── Test mode: create a disposable test lead ──────────────────────────
    if (test_mode) {
      const ts = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      testLeadName = `Lead Teste — ${ts}`;

      // For form_submit triggers, create a marketing lead (mirrors real flow)
      if (triggerNode.nodeType === 'form_submit') {
        testLeadIsMarketing = true;
        targetLeadId = crypto.randomUUID();
        await c.env.DB.prepare(`
          INSERT INTO marketing_leads (id, account_id, form_name, contact_name, contact_email, contact_phone, company, title, tags, raw_data)
          VALUES (?, ?, 'Teste', ?, 'teste@automacao.com', '(11) 99999-9999', 'Empresa Teste', ?, 'teste', '{}')
        `).bind(targetLeadId, automation.account_id, testLeadName, testLeadName).run();
      } else {
        // CRM lead for all other triggers
        const funnel: any = await c.env.DB.prepare(
          'SELECT id FROM funnels WHERE account_id = ? LIMIT 1'
        ).bind(automation.account_id).first();
        if (!funnel) return c.json({ error: 'Nenhum funil encontrado na conta' }, 400);
        const stage: any = await c.env.DB.prepare(
          'SELECT id FROM stages WHERE funnel_id = ? ORDER BY "order" ASC LIMIT 1'
        ).bind(funnel.id).first();
        if (!stage) return c.json({ error: 'Nenhuma etapa encontrada' }, 400);
        targetLeadId = crypto.randomUUID();
        await c.env.DB.prepare(`
          INSERT INTO leads (id, account_id, funnel_id, stage_id, title, contact_name, contact_email, contact_phone, company, tags, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'teste@automacao.com', '(11) 99999-9999', 'Empresa Teste', 'teste', datetime('now'))
        `).bind(targetLeadId, automation.account_id, funnel.id, stage.id, testLeadName, testLeadName).run();
      }
    }

    if (!targetLeadId) return c.json({ error: 'lead_id obrigatório' }, 400);

    const executionId = crypto.randomUUID();
    await c.env.DB.prepare(
      "INSERT INTO automation_executions (id, automation_id, lead_id, status) VALUES (?, ?, ?, 'running')"
    ).bind(executionId, id, targetLeadId).run();

    // ── Walk connections and execute nodes ────────────────────────────────
    let currentId = triggerNode.id;
    const executed: string[] = [];
    const nodeResults: any[] = [{
      id: triggerNode.id,
      type: 'trigger',
      nodeType: triggerNode.nodeType,
      label: triggerNode.label,
      status: 'ok',
      detail: test_mode ? `Lead de teste criado${testLeadIsMarketing ? ' (marketing)' : ''}` : 'Gatilho disparado',
    }];

    while (currentId) {
      const conn = connections.find((conn: any) => conn.from === currentId);
      if (!conn) break;
      const nextNode = nodes.find((n: any) => n.id === conn.to);
      if (!nextNode || executed.includes(nextNode.id)) break;
      executed.push(nextNode.id);

      const nr: any = { id: nextNode.id, type: nextNode.type, nodeType: nextNode.nodeType, label: nextNode.label, status: 'ok', detail: '' };
      try {
        if (nextNode.type === 'action') {
          await executeActionNode(nextNode, targetLeadId, c.env.DB);
          nr.detail = describeActionNode(nextNode);
        } else if (nextNode.type === 'condition') {
          nr.detail = 'Condição verificada';
        } else if (nextNode.type === 'delay') {
          nr.detail = `Aguardaria ${nextNode.config?.duration || 0} ${nextNode.config?.unit || 'minutos'} (pulado no teste)`;
        }
      } catch (err: any) {
        nr.status = 'error';
        nr.detail = err.message;
      }
      nodeResults.push(nr);
      currentId = nextNode.id;
    }

    await c.env.DB.prepare(
      "UPDATE automation_executions SET status = 'completed' WHERE id = ?"
    ).bind(executionId).run();

    return c.json({
      success: true,
      test_lead_id: test_mode ? targetLeadId : undefined,
      test_lead_name: test_mode ? testLeadName : undefined,
      test_lead_is_marketing: test_mode ? testLeadIsMarketing : undefined,
      node_results: nodeResults,
      execution_id: executionId,
    });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

function describeActionNode(node: any): string {
  const { nodeType, config } = node;
  switch (nodeType) {
    case 'move_stage':    return `Moveu para etapa`;
    case 'create_task':   return `Criou tarefa: "${config?.title || '?'}"`;
    case 'add_tag':       return `Adicionou tag: "${config?.tag || '?'}"`;
    case 'remove_tag':    return `Removeu tag: "${config?.tag || '?'}"`;
    case 'create_note':   return `Criou nota`;
    case 'assign_user':   return `Atribuiu lead a usuário`;
    case 'send_webhook':  return `Enviou webhook para ${config?.url || '?'}`;
    case 'send_to_crm':   return `Enviou para CRM`;
    case 'send_email':    return `Enviaria email: "${config?.subject || '?'}"`;
    default:              return 'Ação executada';
  }
}

// Helper to trigger automations
async function triggerAutomations(accountId: string, triggerType: string, leadId: string, db: any, extraConfig?: { form_id?: string }) {
  try {
    let { results: automations } = await db.prepare(
      "SELECT * FROM automations WHERE account_id = ? AND trigger_type = ? AND is_active = 1"
    ).bind(accountId, triggerType).all();

    // If triggerType is form_submit and form_id is provided, filter automations by form_id
    if (triggerType === 'form_submit' && extraConfig?.form_id) {
      automations = automations.filter((a: any) => {
        const triggerConfig = a.trigger_config ? JSON.parse(a.trigger_config) : {};
        // If automation has form_id filter, it must match; otherwise include it
        return !triggerConfig.form_id || triggerConfig.form_id === extraConfig.form_id;
      });
    }

    // If triggerType is page_visit and url_pattern is provided, filter automations by url_pattern
    if (triggerType === 'page_visit' && extraConfig?.url_pattern) {
      automations = automations.filter((a: any) => {
        const triggerConfig = a.trigger_config ? JSON.parse(a.trigger_config) : {};
        // If automation has url_pattern filter, check if URL matches; otherwise include it
        if (!triggerConfig.url_pattern) return true;
        return (extraConfig.url_pattern || '').includes(triggerConfig.url_pattern);
      });
    }

    for (const automation of automations) {
      if (!automation) continue;
      const nodes = automation.nodes ? JSON.parse(automation.nodes) : [];
      const connections = automation.connections ? JSON.parse(automation.connections) : [];

      const triggerNode = nodes.find(function(n: any) { return n.type === 'trigger'; });
      if (!triggerNode) continue;

      const executionId = crypto.randomUUID();
      await db.prepare(
        "INSERT INTO automation_executions (id, automation_id, lead_id, status) VALUES (?, ?, ?, 'running')"
      ).bind(executionId, automation.id, leadId).run();

      let currentId = triggerNode.id;
      const executed: string[] = [];

      while (currentId) {
        const connItem = connections.find(function(c: any) { return c.from === currentId; });
        if (!connItem) break;

        const nextNode = nodes.find(function(n: any) { return n.id === connItem.to; });
        if (!nextNode || executed.includes(nextNode.id)) break;

        executed.push(nextNode.id);

        if (nextNode.type === 'action' && leadId) {
          await executeActionNode(nextNode, leadId, db);
        }
        currentId = nextNode.id;
      }

      await db.prepare(
        "UPDATE automation_executions SET status = 'completed' WHERE id = ?"
      ).bind(executionId).run();
    }
  } catch (err: any) {
    console.error('[AUTOMATIONS] Trigger Error:', err.message);
  }
}

// Helper to execute action nodes
async function executeActionNode(node: any, leadId: string, db: any) {
  const { nodeType, config } = node;

  switch (nodeType) {
    case 'move_stage':
      if (config.to_stage_id) {
        await db.prepare('UPDATE leads SET stage_id = ? WHERE id = ?').bind(config.to_stage_id, leadId).run();
      }
      break;
    case 'create_task':
      if (config.title) {
        const taskId = crypto.randomUUID();
        await db.prepare(
          'INSERT INTO tasks (id, lead_id, title, due_date, assigned_user_id) VALUES (?, ?, ?, ?, ?)'
        ).bind(taskId, leadId, config.title, config.due_date || null, config.assigned_user_id || null).run();
      }
      break;
    case 'add_tag':
      if (config.tag) {
        const lead: any = await db.prepare('SELECT tags FROM leads WHERE id = ?').bind(leadId).first();
        const tags = lead.tags ? lead.tags.split(',').filter(Boolean) : [];
        if (!tags.includes(config.tag)) {
          tags.push(config.tag);
          await db.prepare('UPDATE leads SET tags = ? WHERE id = ?').bind(tags.join(','), leadId).run();
        }
      }
      break;
    case 'remove_tag':
      if (config.tag) {
        const lead: any = await db.prepare('SELECT tags FROM leads WHERE id = ?').bind(leadId).first();
        const tags = lead.tags ? lead.tags.split(',').filter((t: string) => t !== config.tag) : [];
        await db.prepare('UPDATE leads SET tags = ? WHERE id = ?').bind(tags.join(','), leadId).run();
      }
      break;
    case 'create_note':
      if (config.content) {
        const noteId = crypto.randomUUID();
        await db.prepare(
          'INSERT INTO notes (id, lead_id, content, author_name) VALUES (?, ?, ?, ?)'
        ).bind(noteId, leadId, config.content, 'Automação').run();
      }
      break;
    case 'assign_user':
      if (config.user_id) {
        await db.prepare('UPDATE leads SET assigned_user_id = ? WHERE id = ?').bind(config.user_id, leadId).run();
      }
      break;
    case 'send_webhook':
      if (config.url) {
        try {
          await fetch(config.url, {
            method: config.method || 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead_id: leadId, ...config })
          });
        } catch (e) { console.error('Webhook send error:', e); }
      }
      break;
    case 'send_to_crm': {
      const { funnel_id, stage_id } = config;
      if (!funnel_id || !stage_id) break;
      // Check if leadId refers to a marketing lead
      const mLead: any = await db.prepare('SELECT * FROM marketing_leads WHERE id = ?').bind(leadId).first();
      if (mLead) {
        if (mLead.synced_to_crm) break; // already sent
        const crmId = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO leads (id, account_id, funnel_id, stage_id, title, contact_name, contact_email, contact_phone, company, value, tags, custom_values, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          crmId, mLead.account_id, funnel_id, stage_id,
          mLead.title || mLead.contact_name || 'Lead Marketing',
          mLead.contact_name || null,
          mLead.contact_email || null,
          mLead.contact_phone || null,
          mLead.company || null,
          mLead.value || 0,
          mLead.tags || null,
          JSON.stringify({ source: 'marketing_automation', marketing_lead_id: leadId })
        ).run();
        await db.prepare('UPDATE marketing_leads SET synced_to_crm = 1 WHERE id = ?').bind(leadId).run();
      } else {
        // Already a CRM lead — move it to the specified funnel/stage
        await db.prepare('UPDATE leads SET funnel_id = ?, stage_id = ? WHERE id = ?').bind(funnel_id, stage_id, leadId).run();
      }
      break;
    }
    // send_email would require an email service integration
    default:
      console.log(`Unknown action type: ${nodeType}`);
  }
}

// Helper to calculate score for a single lead or all leads
async function calculateLeadScore(db: any, account_id: string, leadId?: string) {
  try {
    // Get leads
    let leads: any[] = [];
    if (leadId) {
      const lead = await db.prepare('SELECT * FROM leads WHERE id = ? AND account_id = ?').bind(leadId, account_id).first();
      if (lead) leads = [lead];
    } else {
      const { results } = await db.prepare('SELECT * FROM leads WHERE account_id = ?').bind(account_id).all();
      leads = results || [];
    }

    if (leads.length === 0) return { success: true, count: 0 };

    // Get all active profile rules with fields
    const { results: profileRules } = await db.prepare(
      'SELECT * FROM scoring_profile_rules WHERE account_id = ? AND is_active = 1'
    ).bind(account_id).all();

    const profileFieldsByRule: any = {};
    for (const rule of profileRules || []) {
      const { results: fields } = await db.prepare(
        'SELECT * FROM scoring_profile_fields WHERE rule_id = ?'
      ).bind(rule.id).all();
      profileFieldsByRule[rule.id] = fields || [];
    }

    // Get all active interest rules with conversions
    const { results: interestRules } = await db.prepare(
      'SELECT * FROM scoring_interest_rules WHERE account_id = ? AND is_active = 1'
    ).bind(account_id).all();

    const interestConversionsByRule: any = {};
    for (const rule of interestRules || []) {
      const { results: conversions } = await db.prepare(
        'SELECT * FROM scoring_interest_conversions WHERE rule_id = ?'
      ).bind(rule.id).all();
      interestConversionsByRule[rule.id] = conversions || [];
    }

    // Calculate scores for each lead
    for (const lead of leads) {
      let profileScore = 0;
      let interestScore = 0;

      // 1. Calculate profile score
      const customValues: any = lead.custom_values ? JSON.parse(lead.custom_values) : {};

      for (const ruleId in profileFieldsByRule) {
        const fields = profileFieldsByRule[ruleId];
        for (const field of fields) {
          const leadValue = customValues[field.custom_field_id];
          if (leadValue === undefined || leadValue === null || leadValue === '') continue;

          const weightFactor = (field.weight_percentage || 50) / 100;
          let answerScores: Record<string, number> = {};
          try {
            answerScores = field.answer_scores ? JSON.parse(field.answer_scores) : {};
          } catch { answerScores = {}; }

          let bestStar = 0;
          const values: string[] = Array.isArray(leadValue) ? leadValue : [String(leadValue)];

          const searchMethod = answerScores['__method__'] || 'exact';

          for (const val of values) {
            const strVal = String(val).toLowerCase().trim();
            for (const [key, stars] of Object.entries(answerScores)) {
              if (key === '__method__' || key === '__filled__') continue;
              
              const strKey = String(key).toLowerCase().trim();
              let matched = false;

              if (searchMethod === 'contains') {
                if (strVal.includes(strKey)) matched = true;
              } else {
                if (strVal === strKey) matched = true;
              }

              if (matched) {
                const numStars = Number(stars);
                if (numStars > bestStar) bestStar = numStars;
              }
            }
          }

          // If no specific match, use __filled__ fallback if configured
          if (bestStar === 0 && answerScores['__filled__']) {
            bestStar = Number(answerScores['__filled__']);
          }

          const starFactor = bestStar / 10; // 1-10 -> 0.1-1.0
          profileScore += starFactor * weightFactor * 100;
        }
      }

      // 2. Calculate interest score
      for (const ruleId in interestConversionsByRule) {
        const conversions = interestConversionsByRule[ruleId];
        for (const conversion of conversions) {
          const eventIds: string[] = conversion.event_ids ? JSON.parse(conversion.event_ids) : [];
          if (eventIds.length === 0) continue;
          
          for (const eventId of eventIds) {
            // Count unique conversions for this lead (by form/event ID)
            const { total: eventCount } = await db.prepare(`
              SELECT COUNT(*) as total FROM tracking_events 
              WHERE visitor_id IN (SELECT visitor_id FROM visitor_leads WHERE lead_id = ?) 
              AND (form_data LIKE ? OR event_type = ? OR id = ?)
            `).bind(lead.id, `%${eventId}%`, eventId, eventId).first();

            if (eventCount > 0) {
              interestScore += (conversion.points || 10) * eventCount;
            }
          }
        }
      }

      // Calculate total and grade
      const totalScore = profileScore + interestScore;
      let grade = 'E';
      if (totalScore >= 80) grade = 'A';
      else if (totalScore >= 60) grade = 'B';
      else if (totalScore >= 40) grade = 'C';
      else if (totalScore >= 20) grade = 'D';

      // Update lead
      await db.prepare(
        'UPDATE leads SET score_profile = ?, score_interest = ?, score_grade = ? WHERE id = ?'
      ).bind(profileScore, interestScore, grade, lead.id).run();

      // History entry (only if score changed significantly or on recalculation)
      const historyId = crypto.randomUUID();
      await db.prepare(
        'INSERT INTO lead_score_history (id, account_id, lead_id, score_profile, score_interest, score_total, score_grade) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(historyId, account_id, lead.id, profileScore, interestScore, totalScore, grade).run();
    }

    return { success: true, count: leads.length };
  } catch (error: any) {
    console.error('[SCORING] Helper Error:', error.message);
    throw error;
  }
}

// NOTE: a duplicate, weaker `/login` handler (no status/account checks, plaintext
// comparison) used to live here. Hono only ever reached the first registration
// (see the real /login handler above), so this copy was dead code — removed.

// ========================================
// LEAD SCORING API
// ========================================

// Profile Rules CRUD
app.get('/scoring/profile-rules', async (c) => {
  try {
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json([]);
    const { results: rules } = await c.env.DB.prepare(
      'SELECT * FROM scoring_profile_rules WHERE account_id = ? ORDER BY created_at DESC'
    ).bind(account_id).all();

    // Load fields for each rule
    const rulesWithFields = await Promise.all(
      (rules || []).map(async (rule: any) => {
        const { results: fields } = await c.env.DB.prepare(
          `SELECT spf.*, cf.name as custom_field_name, cf.type as custom_field_type, cf.options as custom_field_options 
           FROM scoring_profile_fields spf 
           LEFT JOIN custom_fields cf ON spf.custom_field_id = cf.id 
           WHERE spf.rule_id = ?`
        ).bind(rule.id).all();

        // Parse answer_scores JSON string -> object
        const parsedFields = (fields || []).map((f: any) => ({
          ...f,
          answer_scores: (() => {
            try { return f.answer_scores ? JSON.parse(f.answer_scores) : {}; }
            catch { return {}; }
          })(),
        }));

        return { ...rule, is_active: rule.is_active === 1, fields: parsedFields };
      })
    );

    return c.json(rulesWithFields);
  } catch (error: any) {
    console.error('Error loading profile rules:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

app.post('/scoring/profile-rules', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);

    await c.env.DB.prepare(
      'INSERT INTO scoring_profile_rules (id, account_id, name, description, is_active) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, account_id, body.name, body.description || null, body.is_active !== false ? 1 : 0).run();

    return c.json({ id, name: body.name, is_active: true, fields: [] });
  } catch (error: any) {
    console.error('Error creating profile rule:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

app.put('/scoring/profile-rules/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);

    await c.env.DB.prepare(
      'UPDATE scoring_profile_rules SET name = ?, description = ?, is_active = ?, updated_at = datetime(\'now\') WHERE id = ? AND account_id = ?'
    ).bind(body.name, body.description || null, body.is_active !== false ? 1 : 0, id, account_id).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error updating profile rule:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

app.delete('/scoring/profile-rules/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM scoring_profile_rules WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting profile rule:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

app.post('/scoring/profile-rules/:id/fields', async (c) => {
  try {
    const ruleId = c.req.param('id');
    const body = await c.req.json();
    const fields = body.fields || [];
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const owned = await c.env.DB.prepare('SELECT id FROM scoring_profile_rules WHERE id = ? AND account_id = ?').bind(ruleId, account_id).first();
    if (!owned) return c.json({ error: 'Regra não encontrada.' }, 404);

    // Delete existing fields for this rule
    await c.env.DB.prepare('DELETE FROM scoring_profile_fields WHERE rule_id = ?').bind(ruleId).run();

    // Insert new fields using answer_scores JSON
    for (const field of fields) {
      if (field.custom_field_id) {
        const fieldId = crypto.randomUUID();
        const answerScores = field.answer_scores
          ? (typeof field.answer_scores === 'string' ? field.answer_scores : JSON.stringify(field.answer_scores))
          : '{}';
        await c.env.DB.prepare(
          'INSERT INTO scoring_profile_fields (id, rule_id, custom_field_id, weight_percentage, answer_scores) VALUES (?, ?, ?, ?, ?)'
        ).bind(
          fieldId,
          ruleId,
          field.custom_field_id,
          field.weight_percentage || 50,
          answerScores
        ).run();
      }
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error saving profile rule fields:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Interest Rules CRUD
app.get('/scoring/interest-rules', async (c) => {
  try {
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json([]);
    const { results: rules } = await c.env.DB.prepare(
      'SELECT * FROM scoring_interest_rules WHERE account_id = ? ORDER BY created_at DESC'
    ).bind(account_id).all();

    // Load conversions for each rule
    const rulesWithConversions = await Promise.all(
      (rules || []).map(async (rule: any) => {
        const { results: conversions } = await c.env.DB.prepare(
          'SELECT * FROM scoring_interest_conversions WHERE rule_id = ? ORDER BY created_at'
        ).bind(rule.id).all();

        return { ...rule, is_active: rule.is_active === 1, conversions: conversions || [] };
      })
    );

    return c.json(rulesWithConversions);
  } catch (error: any) {
    console.error('Error loading interest rules:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

app.post('/scoring/interest-rules', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);

    await c.env.DB.prepare(
      'INSERT INTO scoring_interest_rules (id, account_id, name, description, is_active) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, account_id, body.name, body.description || null, body.is_active !== false ? 1 : 0).run();

    return c.json({ id, name: body.name, is_active: true, conversions: [] });
  } catch (error: any) {
    console.error('Error creating interest rule:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

app.put('/scoring/interest-rules/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);

    await c.env.DB.prepare(
      'UPDATE scoring_interest_rules SET name = ?, description = ?, is_active = ?, updated_at = datetime(\'now\') WHERE id = ? AND account_id = ?'
    ).bind(body.name, body.description || null, body.is_active !== false ? 1 : 0, id, account_id).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error updating interest rule:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

app.delete('/scoring/interest-rules/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM scoring_interest_rules WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting interest rule:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

app.post('/scoring/interest-rules/:id/conversions', async (c) => {
  try {
    const ruleId = c.req.param('id');
    const body = await c.req.json();
    const conversions = body.conversions || [];
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const owned = await c.env.DB.prepare('SELECT id FROM scoring_interest_rules WHERE id = ? AND account_id = ?').bind(ruleId, account_id).first();
    if (!owned) return c.json({ error: 'Regra não encontrada.' }, 404);

    // Delete existing conversions for this rule
    await c.env.DB.prepare('DELETE FROM scoring_interest_conversions WHERE rule_id = ?').bind(ruleId).run();

    // Insert new conversions
    for (const conversion of conversions) {
      if (conversion.conversion_name) {
        const conversionId = crypto.randomUUID();
        await c.env.DB.prepare(
          'INSERT INTO scoring_interest_conversions (id, rule_id, conversion_name, points, event_type, event_ids) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(
          conversionId,
          ruleId,
          conversion.conversion_name,
          conversion.points || 10,
          conversion.event_type || 'form_submit',
          conversion.event_ids || '[]'
        ).run();
      }
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error saving interest rule conversions:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Get leads with scores
app.get('/scoring/leads', async (c) => {
  try {
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json([]);
    const { results: leads } = await c.env.DB.prepare(
      'SELECT id, title, contact_email, score_profile, score_interest, score_grade FROM leads WHERE account_id = ? ORDER BY (score_profile + score_interest) DESC'
    ).bind(account_id).all();

    return c.json(leads || []);
  } catch (error: any) {
    console.error('Error loading leads with scores:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Recalculate scores for all leads
app.post('/scoring/recalculate', async (c) => {
  try {
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);
    const result = await calculateLeadScore(c.env.DB, account_id);
    return c.json(result);
  } catch (error: any) {
    console.error('Error recalculating scores:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Scoring Stats Dashboard
app.get('/scoring/stats', async (c) => {
  try {
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json([]);
    const { results } = await c.env.DB.prepare(
      'SELECT score_grade, COUNT(id) as total, AVG(score_interest) as avg_interest FROM leads WHERE account_id = ? GROUP BY score_grade'
    ).bind(account_id).all();

    return c.json(results || []);
  } catch (error: any) {
    console.error('Error fetching scoring stats:', error);
    return c.json([], 200); // Return empty array even on error to prevent frontend crash
  }
});

// ─────────────────────────────────────────────
// PERFORMANCE ITEMS (Admin CRUD + Public read)
// ─────────────────────────────────────────────

// Admin: list all items (optionally filter by type)
app.get('/admin/performance-items', async (c) => {
  try {
    const type = c.req.query('type');
    let query = `SELECT id, type, name, description, thumb_url, cta_url, status, created_at FROM performance_items WHERE 1=1`;
    const params: any[] = [];
    if (type) { query += ' AND type = ?'; params.push(type); }
    query += ' ORDER BY created_at DESC';
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json(results || []);
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Admin: create item
app.post('/admin/performance-items', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO performance_items (id, type, name, description, thumb_url, cta_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, body.type, body.name, body.description || null, body.thumb_url || null, body.cta_url || null, body.status || 'active').run();
    return c.json({ id, ...body });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Admin: update item
app.put('/admin/performance-items/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    await c.env.DB.prepare(
      `UPDATE performance_items SET type=?, name=?, description=?, thumb_url=?, cta_url=?, status=?, updated_at=datetime('now') WHERE id=?`
    ).bind(body.type, body.name, body.description || null, body.thumb_url || null, body.cta_url || null, body.status || 'active', id).run();
    return c.json({ success: true });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Admin: delete item
app.delete('/admin/performance-items/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM performance_items WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Public: fetch global items (used by Performance.tsx — visible to all accounts)
app.get('/performance-items', async (c) => {
  try {
    const type = c.req.query('type');
    let query = `SELECT id, type, name, description, thumb_url, cta_url, status, created_at
                 FROM performance_items WHERE status = 'active'`;
    const params: any[] = [];
    if (type) { query += ' AND type = ?'; params.push(type); }
    query += ' ORDER BY created_at DESC';
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json(results || []);
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

export { app };
export const onRequest = handle(app);
