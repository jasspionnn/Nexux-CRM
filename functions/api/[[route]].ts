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
  const account_id = '1'; 
  
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
  const account_id = '1';
  
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
  const account_id = '1';
  
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
  const account_id = '1';
  
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

export const onRequest = handle(app);
