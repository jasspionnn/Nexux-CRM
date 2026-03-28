import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

type Bindings = {
  DB: any; // Using any for D1Database to avoid type errors if @cloudflare/workers-types is not fully configured
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// Funnels
app.get('/debug-schema', async (c) => {
  try {
    const table = c.req.query('table') || 'custom_fields';
    let query = 'PRAGMA table_info(custom_fields)';
    if (table === 'stages') query = 'PRAGMA table_info(stages)';
    if (table === 'funnels') query = 'PRAGMA table_info(funnels)';
    if (table === 'leads') query = 'PRAGMA table_info(leads)';
    
    const tableInfo = await c.env.DB.prepare(query).all();
    return c.json(tableInfo.results);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/debug-db', async (c) => {
  try {
    const accounts = await c.env.DB.prepare('SELECT * FROM accounts').all();
    const users = await c.env.DB.prepare('SELECT * FROM users').all();
    return c.json({ accounts: accounts.results, users: users.results });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/seed-db', async (c) => {
  try {
    await c.env.DB.prepare(`
      INSERT INTO accounts (id, company_name, owner_name, email, status, plan, expires_at)
      VALUES ('acc_demo', 'Tech Solutions Ltda', 'João Silva', 'joao@tech.com', 'active', 'pro', '2025-12-31T23:59:59Z')
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
    return c.json({ error: error.message }, 500);
  }
});

app.get('/migrate-db', async (c) => {
  try {
    // We can't easily run the entire schema.sql here because D1 prepare().run() only executes one statement at a time.
    // Instead, we will just ensure the most critical tables exist if they somehow got deleted.
    
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY,
          company_name TEXT NOT NULL,
          owner_name TEXT,
          email TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          plan TEXT DEFAULT 'pro',
          expires_at TEXT,
          created_at TEXT DEFAULT (datetime('now'))
      );
    `).run();

    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS funnels (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          name TEXT NOT NULL,
          default_won_stage_id TEXT,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `).run();

    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS stages (
          id TEXT PRIMARY KEY,
          funnel_id TEXT NOT NULL,
          name TEXT NOT NULL,
          "order" INTEGER NOT NULL,
          color TEXT,
          FOREIGN KEY (funnel_id) REFERENCES funnels(id) ON DELETE CASCADE
      );
    `).run();

    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS leads (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          funnel_id TEXT NOT NULL,
          stage_id TEXT NOT NULL,
          title TEXT NOT NULL,
          company TEXT,
          value REAL,
          assigned_user_id TEXT,
          custom_values TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (funnel_id) REFERENCES funnels(id) ON DELETE CASCADE,
          FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE
      );
    `).run();

    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS custom_fields (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          context TEXT,
          funnel_id TEXT,
          options TEXT,
          visible_stage_ids TEXT,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `).run();

    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS webhooks (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          events TEXT NOT NULL,
          is_active INTEGER DEFAULT 1,
          funnel_id TEXT,
          stage_id TEXT,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `).run();

    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          account_id TEXT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT NOT NULL,
          avatar TEXT,
          status TEXT DEFAULT 'active',
          team_id TEXT,
          joined_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `).run();

    // Fix stages table if it was created with order_index instead of "order"
    try {
      await c.env.DB.prepare('ALTER TABLE stages RENAME COLUMN order_index TO "order"').run();
    } catch (e) { /* Ignore if already renamed or doesn't exist */ }

    // Add missing columns to custom_fields
    try {
      await c.env.DB.prepare('ALTER TABLE custom_fields ADD COLUMN context TEXT').run();
    } catch (e) { /* Ignore if already exists */ }
    try {
      await c.env.DB.prepare('ALTER TABLE custom_fields ADD COLUMN funnel_id TEXT').run();
    } catch (e) { /* Ignore if already exists */ }
    try {
      await c.env.DB.prepare('ALTER TABLE custom_fields ADD COLUMN options TEXT').run();
    } catch (e) { /* Ignore if already exists */ }
    try {
      await c.env.DB.prepare('ALTER TABLE custom_fields ADD COLUMN visible_stage_ids TEXT').run();
    } catch (e) { /* Ignore if already exists */ }

    // Add missing columns to webhooks
    try {
      await c.env.DB.prepare('ALTER TABLE webhooks ADD COLUMN url TEXT NOT NULL DEFAULT ""').run();
    } catch (e) { /* Ignore if already exists */ }
    try {
      await c.env.DB.prepare('ALTER TABLE webhooks ADD COLUMN events TEXT NOT NULL DEFAULT "all"').run();
    } catch (e) { /* Ignore if already exists */ }
    try {
      await c.env.DB.prepare('ALTER TABLE webhooks ADD COLUMN funnel_id TEXT').run();
    } catch (e) { /* Ignore if already exists */ }
    try {
      await c.env.DB.prepare('ALTER TABLE webhooks ADD COLUMN stage_id TEXT').run();
    } catch (e) { /* Ignore if already exists */ }

    // Add missing columns to users
    try {
      await c.env.DB.prepare('ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT "USER"').run();
    } catch (e) { /* Ignore if already exists */ }
    try {
      await c.env.DB.prepare('ALTER TABLE users ADD COLUMN avatar TEXT').run();
    } catch (e) { /* Ignore if already exists */ }
    try {
      await c.env.DB.prepare('ALTER TABLE users ADD COLUMN status TEXT DEFAULT "active"').run();
    } catch (e) { /* Ignore if already exists */ }
    try {
      await c.env.DB.prepare('ALTER TABLE users ADD COLUMN team_id TEXT').run();
    } catch (e) { /* Ignore if already exists */ }
    try {
      await c.env.DB.prepare('ALTER TABLE users ADD COLUMN joined_at TEXT DEFAULT (datetime(\'now\'))').run();
    } catch (e) { /* Ignore if already exists */ }

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

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
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const account_id = 'acc_demo';
    
    // Provide a valid funnel_id to satisfy NOT NULL and FOREIGN KEY constraints on older schemas
    let funnel_id = body.funnel_id;
    if (!funnel_id) {
      const funnel: any = await c.env.DB.prepare('SELECT id FROM funnels LIMIT 1').first();
      funnel_id = funnel ? funnel.id : 'f_vendas';
    }
    
    await c.env.DB.prepare('INSERT INTO custom_fields (id, account_id, name, type, context, funnel_id) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, account_id, body.name, body.type, body.context, funnel_id)
      .run();
      
    return c.json({ id, name: body.name, type: body.type, context: body.context, funnel_id });
  } catch (error: any) {
    console.error('Error creating custom field:', error);
    return c.json({ error: error.message }, 500);
  }
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
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const account_id = 'acc_demo';
    
    // Provide valid funnel_id and stage_id to satisfy NOT NULL and FOREIGN KEY constraints on older schemas
    let funnel_id = body.funnel_id;
    if (!funnel_id) {
      const funnel: any = await c.env.DB.prepare('SELECT id FROM funnels LIMIT 1').first();
      funnel_id = funnel ? funnel.id : 'f_vendas';
    }
    
    let stage_id = body.stage_id;
    if (!stage_id) {
      const stage: any = await c.env.DB.prepare('SELECT id FROM stages WHERE funnel_id = ? LIMIT 1').bind(funnel_id).first();
      stage_id = stage ? stage.id : 's_contato';
    }
    
    await c.env.DB.prepare('INSERT INTO webhooks (id, account_id, name, url, events, is_active, funnel_id, stage_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, account_id, body.name, body.url, 'all', body.active ? 1 : 0, funnel_id, stage_id)
      .run();
      
    return c.json({ id, name: body.name, url: body.url, active: body.active, funnel_id, stage_id });
  } catch (error: any) {
    console.error('Error creating webhook:', error);
    return c.json({ error: error.message }, 500);
  }
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
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const account_id = 'acc_demo';
    
    // Provide empty strings for team_id and avatar to satisfy NOT NULL constraints on older schemas
    const team_id = body.team_id || '';
    const avatar = body.avatar || '';
    
    await c.env.DB.prepare('INSERT INTO users (id, account_id, name, email, password, role, status, team_id, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, account_id, body.name, body.email, 'temp_password', body.role, body.status, team_id, avatar)
      .run();
      
    return c.json({ id, name: body.name, email: body.email, role: body.role, status: body.status, team_id, avatar });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return c.json({ error: error.message }, 500);
  }
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
