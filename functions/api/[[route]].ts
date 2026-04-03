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

    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS teams (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          name TEXT NOT NULL,
          goal REAL,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `).run();

    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          lead_id TEXT NOT NULL,
          content TEXT NOT NULL,
          author_name TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
      );
    `).run();

    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          lead_id TEXT NOT NULL,
          title TEXT NOT NULL,
          due_date TEXT,
          completed INTEGER DEFAULT 0,
          type TEXT,
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
      );
    `).run();

    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS knowledge_sources (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `).run();

    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS bot_chat_history (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          lead_phone TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `).run();

    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS bot_settings (
          account_id TEXT PRIMARY KEY,
          system_prompt TEXT DEFAULT 'Você é um assistente de vendas gentil. Use as informações fornecidas para tirar dúvidas.',
          temperature REAL DEFAULT 0.7,
          auto_reply INTEGER DEFAULT 1,
          whatsapp_webhook_token TEXT,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `).run();

    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS knowledge_chunks (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          source_id TEXT NOT NULL,
          content TEXT NOT NULL,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (source_id) REFERENCES knowledge_sources(id) ON DELETE CASCADE
      );
    `).run();

    // Fix stages table if it was created with order_index instead of "order"
    try {
      await c.env.DB.prepare('ALTER TABLE stages RENAME COLUMN order_index TO "order"').run();
    } catch (e) { /* Ignore if already renamed or doesn't exist */ }

    try { await c.env.DB.prepare('ALTER TABLE accounts ADD COLUMN expires_at TEXT').run(); } catch (e) { /* Ignore if already exists */ }
    try { await c.env.DB.prepare(`ALTER TABLE accounts ADD COLUMN created_at TEXT DEFAULT (datetime('now'))`).run(); } catch (e) { /* Ignore if already exists */ }

    try { await c.env.DB.prepare('ALTER TABLE funnels ADD COLUMN default_won_stage_id TEXT').run(); } catch (e) { /* Ignore if already exists */ }

    try { await c.env.DB.prepare('ALTER TABLE stages ADD COLUMN color TEXT').run(); } catch (e) { /* Ignore if already exists */ }

    try { await c.env.DB.prepare('ALTER TABLE leads ADD COLUMN custom_values TEXT').run(); } catch (e) { /* Ignore if already exists */ }
    try { await c.env.DB.prepare(`ALTER TABLE leads ADD COLUMN created_at TEXT DEFAULT (datetime('now'))`).run(); } catch (e) { /* Ignore if already exists */ }

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
    try {
      await c.env.DB.prepare('ALTER TABLE webhooks ADD COLUMN is_active INTEGER DEFAULT 1').run();
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

    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS global_settings (
          id TEXT PRIMARY KEY DEFAULT 'nexus',
          login_title TEXT,
          login_subtitle TEXT,
          login_badge_text TEXT,
          login_quote_text TEXT,
          login_quote_author TEXT,
          login_quote_role TEXT
      );
    `).run();
    
    try {
      await c.env.DB.prepare(`
        INSERT INTO global_settings (id, login_title, login_subtitle, login_badge_text, login_quote_text, login_quote_author, login_quote_role)
        VALUES ('nexus', 'O CRM feito para times dinâmicos e modernos.', 'Acelere vendas, automatize sua captação com IA, e tenha uma visão cristalina sobre cada etapa do funil do seu cliente.', '✨ Atualização 2.0 disponível', 'A capacidade de plugar IA no WhatsApp e rastrear cada movimentação das oportunidades direto de dentro do Kanban mudou o jogo para a nossa equipe de B2B.', 'Juliana Diniz', 'Head of Sales, TechCorp')
      `).run();
    } catch (e) { /* ignore if already seeded */ }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Migration error:', error);
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
    
    await c.env.DB.prepare('INSERT INTO custom_fields (id, account_id, name, type, context, funnel_id, options, visible_stage_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, account_id, body.name, body.type, body.context, funnel_id, body.options || null, body.visible_stage_ids || null)
      .run();
      
    return c.json({ id, name: body.name, type: body.type, context: body.context, funnel_id, options: body.options, visible_stage_ids: body.visible_stage_ids });
  } catch (error: any) {
    console.error('Error creating custom field:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/custom-fields/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  await c.env.DB.prepare('UPDATE custom_fields SET name = ?, type = ?, context = ?, options = ?, visible_stage_ids = ?, funnel_id = ? WHERE id = ?')
    .bind(body.name, body.type, body.context, body.options || null, body.visible_stage_ids || null, body.funnel_id || null, id)
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
  
  await c.env.DB.prepare('UPDATE webhooks SET name = ?, url = ?, is_active = ?, funnel_id = ?, stage_id = ? WHERE id = ?')
    .bind(body.name, body.url, body.active ? 1 : 0, body.funnel_id || null, body.stage_id || null, id)
    .run();
    
  return c.json({ success: true });
});

// Inbound Webhooks (Capture)
app.post('/webhooks/incoming/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const webhook: any = await c.env.DB.prepare('SELECT * FROM webhooks WHERE id = ?').bind(id).first();
    if (!webhook) return c.json({ error: 'Webhook not found' }, 404);
    if (webhook.is_active === 0) return c.json({ error: 'Webhook is inactive' }, 403);

    const payload = await c.req.json();
    console.log('Incoming webhook payload:', payload);

    // Smart Extraction Logic
    const extractField = (data: any, keywords: string[]): string | null => {
      if (!data || typeof data !== 'object') return null;
      
      // Check first level keys
      for (const key of Object.keys(data)) {
        const lowerKey = key.toLowerCase();
        if (keywords.some(kw => lowerKey.includes(kw))) {
          if (typeof data[key] === 'string' || typeof data[key] === 'number') {
            return String(data[key]);
          }
        }
      }
      
      // Recursive search for nested objects
      for (const key of Object.keys(data)) {
        if (typeof data[key] === 'object' && data[key] !== null) {
          const found = extractField(data[key], keywords);
          if (found) return found;
        }
      }
      
      return null;
    };

    const name = extractField(payload, ['nome', 'name', 'first', 'full_name', 'cliente', 'lead_name']) || 'Lead Webhook';
    const email = extractField(payload, ['email', 'mail', 'e-mail', 'contato_email']);
    const phone = extractField(payload, ['phone', 'tel', 'whatsapp', 'mobile', 'celular', 'cel']);

    // Create Lead
    const leadId = crypto.randomUUID();
    const funnel_id = webhook.funnel_id || 'f_vendas';
    const stage_id = webhook.stage_id || 's_contato';
    
    // Store original payload in custom_values
    const custom_values = JSON.stringify({ 
      webhook_id: id,
      webhook_name: webhook.name,
      original_payload: payload,
      captured_email: email,
      captured_phone: phone
    });

    await c.env.DB.prepare(`
      INSERT INTO leads (id, account_id, funnel_id, stage_id, title, company, value, assigned_user_id, custom_values, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      leadId,
      webhook.account_id,
      funnel_id,
      stage_id,
      name,
      'Captado via Webhook',
      0,
      null,
      custom_values
    ).run();

    return c.json({ success: true, lead_id: leadId });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return c.json({ error: error.message }, 500);
  }
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
    
    const team_id = body.team_id || null;
    const avatar = body.avatar || null;
    
    await c.env.DB.prepare('INSERT INTO users (id, account_id, name, email, password, role, status, team_id, avatar, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))')
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

app.get('/test-db', async (c) => {
  try {
    const table = c.req.query('table') || 'leads';
    const schema = await c.env.DB.prepare(`PRAGMA table_info(${table})`).all();
    return c.json({ success: true, schema: schema.results });
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack });
  }
});

app.post('/leads', async (c) => {
  try {
    const body = await c.req.json();
    console.log('POST /leads body:', body);
    const id = crypto.randomUUID();
    
    await c.env.DB.prepare(`
      INSERT INTO leads (id, account_id, funnel_id, stage_id, title, company, value, assigned_user_id, probability, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
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
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return c.json({ error: error.message }, 500);
  }
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
  
  await c.env.DB.prepare('INSERT INTO notes (id, lead_id, content, author_name, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))')
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

app.delete('/leads/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// Notes PUT/DELETE
app.put('/notes/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const fields = [];
  const values = [];
  if (body.content !== undefined) { fields.push('content = ?'); values.push(body.content); }
  if (fields.length === 0) return c.json({ success: true });
  values.push(id);
  await c.env.DB.prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  return c.json({ success: true });
});

app.delete('/notes/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// Teams
app.get('/teams', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM teams').all();
  return c.json(results);
});

app.post('/teams', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const account_id = 'acc_demo';
  await c.env.DB.prepare('INSERT INTO teams (id, account_id, name, goal) VALUES (?, ?, ?, ?)')
    .bind(id, account_id, body.name, body.goal || 0)
    .run();
  return c.json({ id, account_id, name: body.name, goal: body.goal || 0 });
});

app.put('/teams/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare('UPDATE teams SET name = ?, goal = ? WHERE id = ?')
    .bind(body.name, body.goal, id).run();
  return c.json({ success: true });
});

app.delete('/teams/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM teams WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// Bot Settings
app.get('/bot-settings', async (c) => {
  const account_id = 'acc_demo';
  const settings = await c.env.DB.prepare('SELECT * FROM bot_settings WHERE account_id = ?').bind(account_id).first();
  return c.json(settings || {});
});

app.put('/bot-settings', async (c) => {
  const account_id = 'acc_demo';
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
  const account_id = 'acc_demo';
  const { results } = await c.env.DB.prepare('SELECT * FROM knowledge_sources WHERE account_id = ?').bind(account_id).all();
  return c.json(results);
});

app.post('/knowledge-sources', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const account_id = 'acc_demo';
  await c.env.DB.prepare('INSERT INTO knowledge_sources (id, account_id, name, type) VALUES (?, ?, ?, ?)')
    .bind(id, account_id, body.name, body.type).run();
  return c.json({ id, account_id, name: body.name, type: body.type });
});

app.delete('/knowledge-sources/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM knowledge_sources WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// Knowledge Chunks
app.get('/knowledge-sources/:sourceId/chunks', async (c) => {
  const sourceId = c.req.param('sourceId');
  const { results } = await c.env.DB.prepare('SELECT * FROM knowledge_chunks WHERE source_id = ?').bind(sourceId).all();
  return c.json(results);
});

app.post('/knowledge-sources/:sourceId/chunks', async (c) => {
  const sourceId = c.req.param('sourceId');
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const account_id = 'acc_demo';
  await c.env.DB.prepare('INSERT INTO knowledge_chunks (id, account_id, source_id, content) VALUES (?, ?, ?, ?)')
    .bind(id, account_id, sourceId, body.content).run();
  return c.json({ id, account_id, source_id: sourceId, content: body.content });
});

app.delete('/knowledge-chunks/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM knowledge_chunks WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// Bot Chat History
app.get('/bot-chat-history/:phone', async (c) => {
  const phone = c.req.param('phone');
  const account_id = 'acc_demo';
  const { results } = await c.env.DB.prepare('SELECT * FROM bot_chat_history WHERE account_id = ? AND lead_phone = ? ORDER BY created_at ASC')
    .bind(account_id, phone).all();
  return c.json(results);
});

// Nexus Admin (Super Admin) Endpoints
app.get('/admin/stats', async (c) => {
  try {
    const totalAccounts = await c.env.DB.prepare('SELECT count(*) as count FROM accounts').first();
    const activeAccounts = await c.env.DB.prepare('SELECT count(*) as count FROM accounts WHERE status = "active"').first();
    const totalUsers = await c.env.DB.prepare('SELECT count(*) as count FROM users').first();
    
    // MRR approx
    const proCount = await c.env.DB.prepare('SELECT count(*) as count FROM accounts WHERE plan = "pro" AND status = "active"').first();
    const starterCount = await c.env.DB.prepare('SELECT count(*) as count FROM accounts WHERE plan = "starter" AND status = "active"').first();
    
    const mrr = (Number(proCount?.count || 0) * 199) + (Number(starterCount?.count || 0) * 49);

    return c.json({
      totalAccounts: totalAccounts?.count || 0,
      activeAccounts: activeAccounts?.count || 0,
      totalUsers: totalUsers?.count || 0,
      mrr: mrr
    });
  } catch(e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.get('/admin/accounts', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all();
  return c.json(results);
});

app.post('/admin/accounts', async (c) => {
  try {
    const body = await c.req.json();
    const id = `acc_${crypto.randomUUID().slice(0, 8)}`;
    
    await c.env.DB.prepare(`
      INSERT INTO accounts (id, company_name, owner_name, email, status, plan, expires_at, created_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?, datetime('now'))
    `).bind(id, body.company_name, body.owner_name, body.email, body.plan || 'starter', body.expires_at || null).run();
    
    // Auto-create Master User
    const userId = `u_${crypto.randomUUID().slice(0, 8)}`;
    await c.env.DB.prepare(`
      INSERT INTO users (id, account_id, name, email, password, role, status, joined_at)
      VALUES (?, ?, ?, ?, ?, 'ACCOUNT_ADMIN', 'active', datetime('now'))
    `).bind(userId, id, body.owner_name, body.email, 'temp123').run();

    // Init basic funnel
    const funnelId = `f_${crypto.randomUUID().slice(0, 8)}`;
    await c.env.DB.prepare('INSERT INTO funnels (id, account_id, name) VALUES (?, ?, ?)').bind(funnelId, id, 'Funil Inicial').run();
    await c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), funnelId, 'Contato Inicial', '#3b82f6', 0).run();

    return c.json({ id, company_name: body.company_name, status: 'active', owner: body.owner_name, defaultPassword: 'temp123' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.put('/admin/accounts/:id/status', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await c.env.DB.prepare('UPDATE accounts SET status = ? WHERE id = ?').bind(body.status, id).run();
  return c.json({ success: true, status: body.status });
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
    return c.json({ error: error.message }, 500);
  }
});
app.post('/public/register', async (c) => {
  try {
    const body = await c.req.json();
    const id = `acc_${crypto.randomUUID().slice(0, 8)}`;
    
    await c.env.DB.prepare(`
      INSERT INTO accounts (id, company_name, owner_name, email, status, plan, expires_at, created_at)
      VALUES (?, ?, ?, ?, 'active', 'trial', datetime('now', '+14 days'), datetime('now'))
    `).bind(id, body.company_name, body.owner_name, body.email).run();
    
    const userId = `u_${crypto.randomUUID().slice(0, 8)}`;
    await c.env.DB.prepare(`
      INSERT INTO users (id, account_id, name, email, password, role, status, joined_at)
      VALUES (?, ?, ?, ?, ?, 'ACCOUNT_ADMIN', 'active', datetime('now'))
    `).bind(userId, id, body.owner_name, body.email, body.password).run();

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
    return c.json({ error: error.message }, 500);
  }
});

export const onRequest = handle(app);
