import { Hono } from 'hono';
import { sessionAccountId } from '../auth';
import { triggerAutomations } from '../automation-engine';
import { calculateLeadScore } from '../scoring-engine';

type Bindings = { DB: any; SESSION_SECRET?: string };

export const leadsRoutes = new Hono<{ Bindings: Bindings }>();

leadsRoutes.get('/leads', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'account_id required' }, 400);
  const { results } = await c.env.DB.prepare('SELECT * FROM leads WHERE account_id = ?').bind(account_id).all();
  return c.json(results);
});

leadsRoutes.post('/leads', async (c) => {
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

leadsRoutes.get('/leads/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  const lead = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ? AND account_id = ?').bind(id, account_id).first();
  if (!lead) return c.json({ error: 'Lead not found' }, 404);
  return c.json(lead);
});

leadsRoutes.put('/leads/:id', async (c) => {
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

leadsRoutes.delete('/leads/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM leads WHERE id = ? AND account_id = ?').bind(id, account_id).run();
  return c.json({ success: true });
});

// Notes
leadsRoutes.get('/leads/:id/notes', async (c) => {
  const leadId = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  const lead = await c.env.DB.prepare('SELECT id FROM leads WHERE id = ? AND account_id = ?').bind(leadId, account_id).first();
  if (!lead) return c.json({ error: 'Lead não encontrado.' }, 404);
  const { results } = await c.env.DB.prepare('SELECT * FROM notes WHERE lead_id = ? ORDER BY created_at DESC').bind(leadId).all();
  return c.json(results);
});

leadsRoutes.post('/leads/:id/notes', async (c) => {
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

leadsRoutes.put('/notes/:id', async (c) => {
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

leadsRoutes.delete('/notes/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM notes WHERE id = ? AND lead_id IN (SELECT id FROM leads WHERE account_id = ?)').bind(id, account_id).run();
  return c.json({ success: true });
});

// Tasks
leadsRoutes.get('/leads/:id/tasks', async (c) => {
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

leadsRoutes.get('/tasks', async (c) => {
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

leadsRoutes.post('/tasks', async (c) => {
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

leadsRoutes.put('/tasks/:id', async (c) => {
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

leadsRoutes.delete('/tasks/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM tasks WHERE id = ? AND lead_id IN (SELECT id FROM leads WHERE account_id = ?)').bind(id, account_id).run();
  return c.json({ success: true });
});

// Lead visits & timeline (fed by tracking data)
leadsRoutes.get('/lead-visits', async (c) => {
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

leadsRoutes.get('/lead-timeline', async (c) => {
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
