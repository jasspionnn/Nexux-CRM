import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

type Bindings = {
  DB: any; // Using any for D1Database to avoid type errors if @cloudflare/workers-types is not fully configured
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// Funnels
app.get('/funnels', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM funnels').all();
  
  // Get stages for all funnels
  const { results: stages } = await c.env.DB.prepare('SELECT * FROM stages ORDER BY "order" ASC').all();
  
  const funnelsWithStages = results.map((funnel: any) => ({
    ...funnel,
    stages: stages.filter((stage: any) => stage.funnel_id === funnel.id)
  }));

  return c.json(funnelsWithStages);
});

app.post('/funnels', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  // Using a default account_id for now
  const account_id = 'acc_demo'; 
  
  await c.env.DB.prepare('INSERT INTO funnels (id, account_id, name) VALUES (?, ?, ?)')
    .bind(id, account_id, body.name)
    .run();
    
  return c.json({ id, name: body.name, stages: [] });
});

app.put('/funnels/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  await c.env.DB.prepare('UPDATE funnels SET name = ? WHERE id = ?')
    .bind(body.name, id)
    .run();
    
  return c.json({ success: true });
});

app.delete('/funnels/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM funnels WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// Stages
app.post('/funnels/:funnelId/stages', async (c) => {
  const funnelId = c.req.param('funnelId');
  const body = await c.req.json();
  const id = crypto.randomUUID();
  
  await c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)')
    .bind(id, funnelId, body.name, body.color, body.order || 0)
    .run();
    
  return c.json({ id, funnel_id: funnelId, name: body.name, color: body.color, order: body.order || 0 });
});

app.put('/stages/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  await c.env.DB.prepare('UPDATE stages SET name = ?, color = ? WHERE id = ?')
    .bind(body.name, body.color, id)
    .run();
    
  return c.json({ success: true });
});

app.delete('/stages/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM stages WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// Custom Fields
app.get('/custom-fields', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM custom_fields').all();
  return c.json(results);
});

app.post('/custom-fields', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const account_id = 'acc_demo';
  
  await c.env.DB.prepare('INSERT INTO custom_fields (id, account_id, name, type, context) VALUES (?, ?, ?, ?, ?)')
    .bind(id, account_id, body.name, body.type, body.context)
    .run();
    
  return c.json({ id, name: body.name, type: body.type, context: body.context });
});

app.put('/custom-fields/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  await c.env.DB.prepare('UPDATE custom_fields SET name = ?, type = ?, context = ? WHERE id = ?')
    .bind(body.name, body.type, body.context, id)
    .run();
    
  return c.json({ success: true });
});

app.delete('/custom-fields/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM custom_fields WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// Webhooks
app.get('/webhooks', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM webhooks').all();
  return c.json(results.map((w: any) => ({ ...w, active: w.is_active === 1 })));
});

app.post('/webhooks', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const account_id = 'acc_demo';
  
  await c.env.DB.prepare('INSERT INTO webhooks (id, account_id, name, url, events, is_active) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, account_id, body.name, body.url, 'all', body.active ? 1 : 0)
    .run();
    
  return c.json({ id, name: body.name, url: body.url, active: body.active });
});

app.put('/webhooks/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  await c.env.DB.prepare('UPDATE webhooks SET name = ?, url = ?, is_active = ? WHERE id = ?')
    .bind(body.name, body.url, body.active ? 1 : 0, id)
    .run();
    
  return c.json({ success: true });
});

app.delete('/webhooks/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM webhooks WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// Users (Team)
app.get('/users', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, name, email, role, status FROM users').all();
  return c.json(results);
});

app.post('/users', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const account_id = 'acc_demo';
  
  await c.env.DB.prepare('INSERT INTO users (id, account_id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, account_id, body.name, body.email, 'temp_password', body.role, body.status)
    .run();
    
  return c.json({ id, name: body.name, email: body.email, role: body.role, status: body.status });
});

app.put('/users/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  await c.env.DB.prepare('UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?')
    .bind(body.name, body.email, body.role, body.status, id)
    .run();
    
  return c.json({ success: true });
});

app.delete('/users/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// Leads
app.get('/leads', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM leads').all();
  return c.json(results);
});

app.post('/leads', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  
  await c.env.DB.prepare(`
    INSERT INTO leads (id, account_id, funnel_id, stage_id, title, company, value, assigned_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    'acc_demo', // Using the same demo account ID
    body.funnel_id,
    body.stage_id,
    body.title || 'Nova Negociação',
    body.company || '',
    body.value || 0,
    body.assigned_user_id || null
  ).run();
  
  const newLead = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
  return c.json(newLead);
});

app.get('/leads/:id', async (c) => {
  const id = c.req.param('id');
  const lead = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
  if (!lead) return c.json({ error: 'Lead not found' }, 404);
  return c.json(lead);
});

app.put('/leads/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  // Build dynamic update query
  const fields = [];
  const values = [];
  
  const allowedFields = ['title', 'company', 'value', 'contact_name', 'contact_email', 'contact_phone', 'stage_id', 'assigned_user_id', 'probability', 'tags', 'custom_values'];
  
  for (const key of Object.keys(body)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }
  
  if (fields.length === 0) return c.json({ success: true });
  
  values.push(id);
  
  const query = `UPDATE leads SET ${fields.join(', ')} WHERE id = ?`;
  await c.env.DB.prepare(query).bind(...values).run();
  
  return c.json({ success: true });
});

// Notes
app.get('/leads/:id/notes', async (c) => {
  const leadId = c.req.param('id');
  const { results } = await c.env.DB.prepare('SELECT * FROM notes WHERE lead_id = ? ORDER BY created_at DESC').bind(leadId).all();
  return c.json(results);
});

app.post('/leads/:id/notes', async (c) => {
  const leadId = c.req.param('id');
  const body = await c.req.json();
  const id = crypto.randomUUID();
  
  await c.env.DB.prepare('INSERT INTO notes (id, lead_id, content, author_name) VALUES (?, ?, ?, ?)')
    .bind(id, leadId, body.content, body.author_name || 'Usuário')
    .run();
    
  const newNote = await c.env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(id).first();
  return c.json(newNote);
});

// Tasks
app.get('/tasks', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT t.*, l.title as lead_title 
    FROM tasks t 
    LEFT JOIN leads l ON t.lead_id = l.id 
    ORDER BY t.due_date ASC
  `).all();
  return c.json(results);
});

app.post('/tasks', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  
  await c.env.DB.prepare('INSERT INTO tasks (id, lead_id, title, due_date, completed, type) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, body.lead_id, body.title, body.due_date, body.completed ? 1 : 0, body.type || 'task')
    .run();
    
  const newTask = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  return c.json(newTask);
});

app.put('/tasks/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
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
  
  values.push(id);
  
  const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;
  await c.env.DB.prepare(query).bind(...values).run();
  
  return c.json({ success: true });
});

app.delete('/tasks/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

export const onRequest = handle(app);
