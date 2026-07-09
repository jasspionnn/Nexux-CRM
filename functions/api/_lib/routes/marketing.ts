import { Hono } from 'hono';
import { sessionAccountId } from '../auth';
import { triggerAutomations } from '../automation-engine';

type Bindings = { DB: any; SESSION_SECRET?: string };

export const marketingRoutes = new Hono<{ Bindings: Bindings }>();

marketingRoutes.get('/marketing/custom-fields', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare('SELECT * FROM marketing_custom_fields WHERE account_id = ? ORDER BY created_at DESC').bind(accountId).all();
    return c.json(results);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

marketingRoutes.post('/marketing/custom-fields', async (c) => {
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

marketingRoutes.put('/marketing/custom-fields/:id', async (c) => {
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

marketingRoutes.delete('/marketing/custom-fields/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM marketing_custom_fields WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

marketingRoutes.get('/marketing/field-mappings', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare('SELECT * FROM marketing_crm_mappings WHERE account_id = ?').bind(accountId).all();
    return c.json(results);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

marketingRoutes.post('/marketing/field-mappings', async (c) => {
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

marketingRoutes.get('/marketing-leads', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM marketing_leads WHERE account_id = ? ORDER BY created_at DESC LIMIT 500'
    ).bind(accountId).all();
    return c.json(results);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

marketingRoutes.post('/marketing-leads/sync-to-crm', async (c) => {
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

marketingRoutes.delete('/marketing-leads/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM marketing_leads WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});
