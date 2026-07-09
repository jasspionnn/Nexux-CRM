import { Hono } from 'hono';
import { sessionAccountId } from '../auth';
import { buildSegmentQuery } from '../segment-query';

type Bindings = { DB: any; SESSION_SECRET?: string };

export const emailMarketingRoutes = new Hono<{ Bindings: Bindings }>();

// --- Email Templates ---
emailMarketingRoutes.get('/email-templates', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const type = c.req.query('type');
    const query = type ? 'SELECT * FROM email_templates WHERE account_id = ? AND type = ? ORDER BY created_at DESC' : 'SELECT * FROM email_templates WHERE account_id = ? ORDER BY created_at DESC';
    const { results } = await c.env.DB.prepare(query).bind(type ? [accountId, type] : [accountId]).all();
    return c.json(results);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

emailMarketingRoutes.post('/email-templates', async (c) => {
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

emailMarketingRoutes.put('/email-templates/:id', async (c) => {
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

emailMarketingRoutes.delete('/email-templates/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM email_templates WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// --- Email Campaigns ---
emailMarketingRoutes.get('/email-campaigns', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM email_campaigns WHERE account_id = ? ORDER BY created_at DESC'
    ).bind(accountId).all();
    return c.json(results.map((r: any) => ({ ...r, engaged_lead_ids: r.engaged_lead_ids ? JSON.parse(r.engaged_lead_ids) : [] })));
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

emailMarketingRoutes.get('/email-campaigns/:id', async (c) => {
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

emailMarketingRoutes.post('/email-campaigns', async (c) => {
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

emailMarketingRoutes.put('/email-campaigns/:id', async (c) => {
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

emailMarketingRoutes.delete('/email-campaigns/:id', async (c) => {
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
emailMarketingRoutes.post('/email-campaigns/:id/send', async (c) => {
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
emailMarketingRoutes.post('/email-events/track', async (c) => {
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
emailMarketingRoutes.get('/email-campaigns/:id/metrics', async (c) => {
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
