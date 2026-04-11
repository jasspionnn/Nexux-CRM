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

app.get('/seed-nexus-admin', async (c) => {
  try {
    // Criar conta Nexus se não existir
    await c.env.DB.prepare(`
      INSERT INTO accounts (id, company_name, owner_name, email, status, plan, created_at)
      VALUES ('acc_nexus', 'Nexus CRM', 'Admin Nexus', 'adminnexus@nexus.com', 'active', 'enterprise', datetime('now'))
      ON CONFLICT(id) DO UPDATE SET email = 'adminnexus@nexus.com'
    `).run();

    // Criar usuário admin do Nexus
    await c.env.DB.prepare(`
      INSERT INTO users (id, account_id, name, email, password, role, status, joined_at)
      VALUES ('u_nexus_admin', 'acc_nexus', 'Administrador Nexus', 'adminnexus@nexus.com', '123', 'NEXUS_ADMIN', 'active', datetime('now'))
      ON CONFLICT(id) DO UPDATE SET email = 'adminnexus@nexus.com', password = '123', account_id = 'acc_nexus'
    `).run();

    // Verificar se foi criado corretamente
    const user = await c.env.DB.prepare('SELECT id, account_id, name, email, role FROM users WHERE email = ?').bind('adminnexus@nexus.com').first();

    return c.json({ success: true, user });
  } catch (error: any) {
    console.error('Seed Nexus Admin error:', error);
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
          default_lost_stage_id TEXT,
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
          last_contact_at TEXT,
          next_task_at TEXT,
          closed_at TEXT,
          closing_forecast_at TEXT,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (funnel_id) REFERENCES funnels(id) ON DELETE CASCADE,
          FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE
      );
    `).run();

    // Migration for existing tables
    try {
      await c.env.DB.prepare('ALTER TABLE leads ADD COLUMN last_contact_at TEXT').run();
      await c.env.DB.prepare('ALTER TABLE leads ADD COLUMN next_task_at TEXT').run();
      await c.env.DB.prepare('ALTER TABLE leads ADD COLUMN closed_at TEXT').run();
      await c.env.DB.prepare('ALTER TABLE leads ADD COLUMN closing_forecast_at TEXT').run();
    } catch (e) {
      // Columns probably exist
    }

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

    // Add missing columns to funnels
    try {
      await c.env.DB.prepare('ALTER TABLE funnels ADD COLUMN default_won_stage_id TEXT').run();
    } catch (e) { /* Ignore if already exists */ }
    try {
      await c.env.DB.prepare('ALTER TABLE funnels ADD COLUMN default_lost_stage_id TEXT').run();
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

    // Tracking tables
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS tracking_settings (
          account_id TEXT PRIMARY KEY,
          tracking_id TEXT NOT NULL UNIQUE,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `).run();

    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS tracking_events (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          tracking_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          url TEXT,
          referrer TEXT,
          form_data TEXT,
          visitor_id TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `).run();

    // Tracking forms table
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS tracking_forms (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          name TEXT NOT NULL,
          url_pattern TEXT,
          form_selector TEXT,
          fields TEXT,
          field_mapping TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `).run();

    // Add UNIQUE constraint on (account_id, name) if not exists
    try {
      await c.env.DB.prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_tracking_forms_account_name ON tracking_forms(account_id, name)'
      ).run();
    } catch (e) { /* index may already exist */ }

    // Add field_mapping column if not exists
    try {
      await c.env.DB.prepare('ALTER TABLE tracking_forms ADD COLUMN field_mapping TEXT').run();
    } catch (e) { /* column already exists */ }

    // Marketing leads table
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS marketing_leads (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          form_name TEXT NOT NULL,
          contact_name TEXT,
          contact_email TEXT,
          contact_phone TEXT,
          company TEXT,
          title TEXT,
          value REAL DEFAULT 0,
          tags TEXT,
          raw_data TEXT,
          synced_to_crm INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `).run();

    // Segments table
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS segments (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          rules TEXT NOT NULL,
          lead_count INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `).run();

    // Automations tables
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS automations (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          is_active INTEGER DEFAULT 1,
          trigger_type TEXT NOT NULL,
          trigger_config TEXT,
          nodes TEXT,
          connections TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `).run();

    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS automation_executions (
          id TEXT PRIMARY KEY,
          automation_id TEXT NOT NULL,
          lead_id TEXT,
          node_id TEXT,
          status TEXT DEFAULT 'pending',
          error TEXT,
          executed_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE,
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
      );
    `).run();

    // Bio Links table
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS bio_links (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          slug TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          avatar_url TEXT,
          bg_color TEXT DEFAULT '#0f172a',
          text_color TEXT DEFAULT '#f8fafc',
          button_color TEXT DEFAULT '#0d9488',
          button_text_color TEXT DEFAULT '#ffffff',
          button_radius INTEGER DEFAULT 12,
          links TEXT NOT NULL,
          is_active INTEGER DEFAULT 1,
          click_count INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `).run();

    // Email marketing tables
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS email_templates (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          name TEXT NOT NULL,
          subject TEXT NOT NULL,
          body TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'campaign',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `).run();

    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS email_campaigns (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          name TEXT NOT NULL,
          segment_id TEXT,
          template_id TEXT,
          subject TEXT NOT NULL,
          body TEXT NOT NULL,
          status TEXT DEFAULT 'draft',
          total_sent INTEGER DEFAULT 0,
          total_opened INTEGER DEFAULT 0,
          total_clicked INTEGER DEFAULT 0,
          total_hard_bounce INTEGER DEFAULT 0,
          total_soft_bounce INTEGER DEFAULT 0,
          engaged_lead_ids TEXT,
          sent_at TEXT,
          scheduled_at TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `).run();

    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS email_events (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL,
          lead_id TEXT,
          lead_email TEXT NOT NULL,
          event_type TEXT NOT NULL,
          clicked_url TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE
      );
    `).run();

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
  
  await c.env.DB.prepare('UPDATE funnels SET name = ?, default_won_stage_id = ?, default_lost_stage_id = ? WHERE id = ?')
    .bind(body.name, body.default_won_stage_id || null, body.default_lost_stage_id || null, id)
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

    // Trigger automations for the new lead
    await triggerAutomations(webhook.account_id || 'acc_demo', 'new_lead', leadId, c.env.DB);

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
    // Trigger automations for the new lead
    await triggerAutomations('acc_demo', 'new_lead', id, c.env.DB);
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
  
  const allowedFields = ['title', 'company', 'value', 'contact_name', 'contact_email', 'contact_phone', 'stage_id', 'assigned_user_id', 'probability', 'tags', 'custom_values', 'closed_at', 'closing_forecast_at'];
  
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
    
  // Sync last_contact_at to leads table
  await c.env.DB.prepare('UPDATE leads SET last_contact_at = datetime(\'now\') WHERE id = ?').bind(leadId).run();
    
  const newNote = await c.env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(id).first();
  return c.json(newNote);
});

app.get('/leads/:id/tasks', async (c) => {
  const leadId = c.req.param('id');
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM tasks 
    WHERE lead_id = ? 
    ORDER BY completed ASC, due_date ASC
  `).bind(leadId).all();
  return c.json(results || []);
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
    return c.json({ error: e.message }, 500);
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
  if (id === 'acc_nexus') {
    return c.json({ error: 'Não é possível modificar a conta Nexus' }, 403);
  }
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
    const accountId = c.req.query('account_id') || 'acc_demo';

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
    return c.json({ error: error.message }, 500);
  }
});

// Regenerate tracking ID
app.post('/tracking/regenerate', async (c) => {
  try {
    const body = await c.req.json();
    const accountId = body.account_id || 'acc_demo';

    const newTrackingId = 'trk_' + crypto.randomUUID().substring(0, 12);

    await c.env.DB.prepare(
      'INSERT INTO tracking_settings (account_id, tracking_id) VALUES (?, ?) ON CONFLICT(account_id) DO UPDATE SET tracking_id = ?'
    ).bind(accountId, newTrackingId, newTrackingId).run();

    return c.json({ tracking_id: newTrackingId });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get tracking events
app.get('/tracking/events', async (c) => {
  try {
    const accountId = c.req.query('account_id') || 'acc_demo';
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
    return c.json({ error: error.message }, 500);
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
              'INSERT INTO lead_visits (id, account_id, lead_id, visitor_id, url, referrer, title) VALUES (?, ?, ?, ?, ?, ?, ?)'
            ).bind(visitId, settings.account_id, ml.lead_id, visitor_id, url || null, referrer || null, body.title || null).run();

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
              } else if (Object.keys(mappedData).length > 0) {
                var mLeadId = crypto.randomUUID();
                await c.env.DB.prepare(
                  'INSERT INTO marketing_leads (id, account_id, form_name, contact_name, contact_email, contact_phone, company, title, value, tags, raw_data, synced_to_crm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
                ).bind(
                  mLeadId,
                  settings.account_id,
                  formName,
                  mappedData.contact_name || null,
                  mappedData.contact_email || null,
                  mappedData.contact_phone || null,
                  mappedData.company || null,
                  mappedData.title || null,
                  mappedData.value ? parseFloat(mappedData.value) : 0,
                  mappedData.tags || null,
                  JSON.stringify(fields)
                ).run();
                console.log('[TRACKING] Created marketing lead:', mLeadId, '(email validated)');

                try {
                  var existingLead: any = await c.env.DB.prepare(
                    'SELECT id FROM leads WHERE account_id = ? AND contact_email = ?'
                  ).bind(settings.account_id, mappedData.contact_email).first();

                  var crmLeadId = existingLead ? existingLead.id : crypto.randomUUID();

                  if (!existingLead) {
                    await c.env.DB.prepare(
                      'INSERT INTO leads (id, account_id, funnel_id, stage_id, title, company, value, contact_name, contact_email, contact_phone, tags, custom_values, created_at) VALUES (?, ?, (SELECT id FROM funnels WHERE account_id = ? LIMIT 1), (SELECT id FROM stages WHERE funnel_id = (SELECT id FROM funnels WHERE account_id = ? LIMIT 1) LIMIT 1), ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
                    ).bind(
                      crmLeadId, settings.account_id, settings.account_id, settings.account_id,
                      mappedData.title || mappedData.contact_name || 'Lead from Tracking',
                      mappedData.company || null,
                      mappedData.value ? parseFloat(mappedData.value) : 0,
                      mappedData.contact_name || null,
                      mappedData.contact_email || null,
                      mappedData.contact_phone || null,
                      mappedData.tags || null,
                      JSON.stringify({ source: 'tracking_form', form_name: formName, raw: fields })
                    ).run();
                    console.log('[TRACKING] Auto-synced lead to CRM:', crmLeadId);
                  }

                  // Trigger new_lead automation
                  await triggerAutomations(settings.account_id, 'new_lead', crmLeadId, c.env.DB);
                  
                  // Trigger form_submit automation with form_id
                  const formId = formData.fid || formName;
                  await triggerAutomations(settings.account_id, 'form_submit', crmLeadId, c.env.DB, { form_id: formId });

                  // Map visitor_id to lead for future pageview tracking
                  if (visitor_id) {
                    try {
                      const vlId = crypto.randomUUID();
                      await c.env.DB.prepare(
                        'INSERT OR IGNORE INTO visitor_leads (id, account_id, visitor_id, lead_id, email, source) VALUES (?, ?, ?, ?, ?, ?)'
                      ).bind(vlId, settings.account_id, visitor_id, crmLeadId, mappedData.contact_email || null, 'form_submit').run();
                      console.log('[TRACKING] Mapped visitor to lead:', visitor_id, '->', crmLeadId);
                    } catch (vlErr: any) {
                      console.log('[TRACKING] Visitor already mapped:', visitor_id);
                    }
                  }
                } catch (autoErr: any) {
                  console.error('[TRACKING] Error auto-syncing / running automations:', autoErr.message);
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
    return new Response(JSON.stringify({ error: error.message }), {
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
    const accountId = c.req.query('account_id') || 'acc_demo';

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
    return c.json({ error: error.message }, 500);
  }
});

// ==================== TRACKING FORMS ENDPOINTS ====================

app.get('/tracking-forms', async (c) => {
  try {
    const accountId = c.req.query('account_id') || 'acc_demo';
    const { results } = await c.env.DB.prepare('SELECT * FROM tracking_forms WHERE account_id = ? ORDER BY created_at DESC').bind(accountId).all();
    return c.json(results.map((f: any) => ({ ...f, fields: f.fields ? JSON.parse(f.fields) : [], field_mapping: f.field_mapping ? JSON.parse(f.field_mapping) : {} })));
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.post('/tracking-forms', async (c) => {
  try {
    const body = await c.req.json();
    const { account_id = 'acc_demo', name, url_pattern, form_selector, fields, field_mapping, is_active } = body;
    if (!name) return c.json({ error: 'name is required' }, 400);
    const id = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO tracking_forms (id, account_id, name, url_pattern, form_selector, fields, field_mapping, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, account_id, name, url_pattern || null, form_selector || null, JSON.stringify(fields || []), JSON.stringify(field_mapping || {}), is_active ?? 1).run();
    return c.json({ id, name, url_pattern, form_selector, fields: fields || [], field_mapping: field_mapping || {}, is_active: is_active ?? 1 });
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.put('/tracking-forms/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, url_pattern, form_selector, fields, field_mapping, is_active } = body;
    await c.env.DB.prepare('UPDATE tracking_forms SET name = ?, url_pattern = ?, form_selector = ?, fields = ?, field_mapping = ?, is_active = ? WHERE id = ?')
      .bind(name, url_pattern || null, form_selector || null, JSON.stringify(fields || []), JSON.stringify(field_mapping || {}), is_active ?? 1, id).run();
    return c.json({ success: true });
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.delete('/tracking-forms/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM tracking_forms WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

// Add field_mapping column to tracking_forms
app.get('/migrate-tracking-forms', async (c) => {
  try {
    try { await c.env.DB.prepare('ALTER TABLE tracking_forms ADD COLUMN field_mapping TEXT').run(); } catch (e) { /* column already exists */ }
    // Create marketing_leads table if not exists
    try {
      await c.env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS marketing_leads (
          id TEXT PRIMARY KEY, account_id TEXT NOT NULL, form_name TEXT NOT NULL,
          contact_name TEXT, contact_email TEXT, contact_phone TEXT,
          company TEXT, title TEXT, value REAL DEFAULT 0, tags TEXT,
          raw_data TEXT, synced_to_crm INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );
      `).run();
    } catch (e) { /* table may already exist */ }
    // Create visitor_leads and lead_visits tables
    try {
      await c.env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS visitor_leads (
          id TEXT PRIMARY KEY, account_id TEXT NOT NULL, visitor_id TEXT NOT NULL,
          lead_id TEXT NOT NULL, email TEXT, first_seen TEXT DEFAULT (datetime('now')),
          last_seen TEXT DEFAULT (datetime('now')), source TEXT DEFAULT 'form_submit',
          UNIQUE(visitor_id, lead_id),
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );
      `).run();
    } catch (e) { /* */ }
    try {
      await c.env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS lead_visits (
          id TEXT PRIMARY KEY, account_id TEXT NOT NULL, lead_id TEXT NOT NULL,
          visitor_id TEXT, url TEXT NOT NULL, referrer TEXT, title TEXT,
          duration_seconds INTEGER DEFAULT 0, visited_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );
      `).run();
    } catch (e) { /* */ }
    return c.json({ success: true });
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

// ==================== MARKETING LEADS ENDPOINTS ====================

// ==================== LEAD VISITS ENDPOINTS ====================
app.get('/lead-visits', async (c) => {
  try {
    const leadId = c.req.query('lead_id');
    if (!leadId) return c.json({ error: 'lead_id is required' }, 400);

    const { results } = await c.env.DB.prepare(
      'SELECT * FROM lead_visits WHERE lead_id = ? ORDER BY visited_at DESC LIMIT 500'
    ).bind(leadId).all();
    return c.json(results);
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.get('/marketing-leads', async (c) => {
  try {
    const accountId = c.req.query('account_id') || 'acc_demo';
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM marketing_leads WHERE account_id = ? ORDER BY created_at DESC LIMIT 500'
    ).bind(accountId).all();
    return c.json(results);
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.post('/marketing-leads/sync-to-crm', async (c) => {
  try {
    const body = await c.req.json();
    const { account_id = 'acc_demo', lead_ids } = body;

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

      // Check if lead already exists in CRM by email
      const existingLead: any = await c.env.DB.prepare(
        'SELECT id FROM leads WHERE account_id = ? AND contact_email = ?'
      ).bind(account_id, mLead.contact_email).first();

      if (existingLead) {
        console.log('[MARKETING LEADS] Lead already exists in CRM:', mLead.contact_email);
        skipped++;
        continue;
      }

      // Create lead in CRM
      const crmId = crypto.randomUUID();
      await c.env.DB.prepare(
        'INSERT INTO leads (id, account_id, funnel_id, stage_id, title, company, value, contact_name, contact_email, contact_phone, tags, custom_values, created_at) VALUES (?, ?, (SELECT id FROM funnels WHERE account_id = ? LIMIT 1), (SELECT id FROM stages WHERE funnel_id = (SELECT id FROM funnels WHERE account_id = ? LIMIT 1) LIMIT 1), ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
      ).bind(
        crmId, account_id, account_id, account_id,
        mLead.title || mLead.contact_name || 'Lead from Marketing',
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
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.delete('/marketing-leads/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM marketing_leads WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

// ==================== BIO LINKS ENDPOINTS ====================

// Get all bio link pages for an account
app.get('/bio-links', async (c) => {
  try {
    const accountId = c.req.query('account_id') || 'acc_demo';
    console.log('Fetching bio links for:', accountId);
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM bio_links WHERE account_id = ? ORDER BY created_at DESC'
    ).bind(accountId).all();
    console.log('Bio links found:', results?.length || 0);
    return c.json(results.map((r: any) => ({ ...r, links: r.links ? JSON.parse(r.links) : [] })));
  } catch (error: any) {
    console.error('Bio fetch error:', error);
    return c.json({ error: error.message }, 500);
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
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

// Create a new bio link page
app.post('/bio-links', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const accountId = body.account_id || 'acc_demo';
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
    return c.json({ error: error.message }, 500);
  }
});

// Update a bio link page
app.put('/bio-links/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const links = body.links ? JSON.stringify(body.links) : null;

    await c.env.DB.prepare(
      `UPDATE bio_links SET slug = COALESCE(?, slug), title = COALESCE(?, title), description = COALESCE(?, description),
       avatar_url = COALESCE(?, avatar_url), bg_color = COALESCE(?, bg_color), text_color = COALESCE(?, text_color),
       button_color = COALESCE(?, button_color), button_text_color = COALESCE(?, button_text_color),
       button_radius = COALESCE(?, button_radius), links = COALESCE(?, links),
       is_active = COALESCE(?, is_active), updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.slug, body.title, body.description, body.avatar_url,
      body.bg_color, body.text_color, body.button_color, body.button_text_color,
      body.button_radius, links, body.is_active, id
    ).run();

    // Fetch updated
    const updated: any = await c.env.DB.prepare('SELECT * FROM bio_links WHERE id = ?').bind(id).first();
    if (updated) updated.links = updated.links ? JSON.parse(updated.links) : [];
    return c.json(updated || { success: true });
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

// Delete a bio link page
app.delete('/bio-links/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM bio_links WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

// ==================== EMAIL MARKETING ENDPOINTS ====================

// --- Email Templates ---
app.get('/email-templates', async (c) => {
  try {
    const accountId = c.req.query('account_id') || 'acc_demo';
    const type = c.req.query('type');
    const query = type ? 'SELECT * FROM email_templates WHERE account_id = ? AND type = ? ORDER BY created_at DESC' : 'SELECT * FROM email_templates WHERE account_id = ? ORDER BY created_at DESC';
    const { results } = await c.env.DB.prepare(query).bind(type ? [accountId, type] : [accountId]).all();
    return c.json(results);
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.post('/email-templates', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const accountId = body.account_id || 'acc_demo';
    await c.env.DB.prepare(
      'INSERT INTO email_templates (id, account_id, name, subject, body, type) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, accountId, body.name, body.subject, body.body, body.type || 'campaign').run();
    return c.json({ id, name: body.name, subject: body.subject, body: body.body, type: body.type || 'campaign' });
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.put('/email-templates/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    await c.env.DB.prepare(
      'UPDATE email_templates SET name = COALESCE(?, name), subject = COALESCE(?, subject), body = COALESCE(?, body), type = COALESCE(?, type), updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(body.name, body.subject, body.body, body.type, id).run();
    const updated: any = await c.env.DB.prepare('SELECT * FROM email_templates WHERE id = ?').bind(id).first();
    return c.json(updated || { success: true });
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.delete('/email-templates/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM email_templates WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

// --- Email Campaigns ---
app.get('/email-campaigns', async (c) => {
  try {
    const accountId = c.req.query('account_id') || 'acc_demo';
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM email_campaigns WHERE account_id = ? ORDER BY created_at DESC'
    ).bind(accountId).all();
    return c.json(results.map((r: any) => ({ ...r, engaged_lead_ids: r.engaged_lead_ids ? JSON.parse(r.engaged_lead_ids) : [] })));
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.get('/email-campaigns/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const campaign: any = await c.env.DB.prepare('SELECT * FROM email_campaigns WHERE id = ?').bind(id).first();
    if (!campaign) return c.json({ error: 'Not found' }, 404);
    campaign.engaged_lead_ids = campaign.engaged_lead_ids ? JSON.parse(campaign.engaged_lead_ids) : [];
    // Get event breakdown
    const events: any = await c.env.DB.prepare(
      'SELECT event_type, COUNT(*) as count FROM email_events WHERE campaign_id = ? GROUP BY event_type'
    ).bind(id).all();
    campaign.event_breakdown = events.results;
    return c.json(campaign);
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.post('/email-campaigns', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const accountId = body.account_id || 'acc_demo';
    await c.env.DB.prepare(
      'INSERT INTO email_campaigns (id, account_id, name, segment_id, template_id, subject, body, status, scheduled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, accountId, body.name, body.segment_id || null, body.template_id || null, body.subject, body.body, body.status || 'draft', body.scheduled_at || null).run();
    const campaign: any = await c.env.DB.prepare('SELECT * FROM email_campaigns WHERE id = ?').bind(id).first();
    return c.json(campaign);
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.put('/email-campaigns/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    await c.env.DB.prepare(
      'UPDATE email_campaigns SET name = COALESCE(?, name), segment_id = COALESCE(?, segment_id), template_id = COALESCE(?, template_id), subject = COALESCE(?, subject), body = COALESCE(?, body), status = COALESCE(?, status), scheduled_at = COALESCE(?, scheduled_at), updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(body.name, body.segment_id, body.template_id, body.subject, body.body, body.status, body.scheduled_at, id).run();
    const updated: any = await c.env.DB.prepare('SELECT * FROM email_campaigns WHERE id = ?').bind(id).first();
    return c.json(updated || { success: true });
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

app.delete('/email-campaigns/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM email_campaigns WHERE id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM email_events WHERE campaign_id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

// --- Send Campaign (simulate dispatch) ---
app.post('/email-campaigns/:id/send', async (c) => {
  try {
    const id = c.req.param('id');
    const campaign: any = await c.env.DB.prepare('SELECT * FROM email_campaigns WHERE id = ?').bind(id).first();
    if (!campaign) return c.json({ error: 'Campaign not found' }, 404);

    // Get leads from segment
    let leads: any[] = [];
    if (campaign.segment_id) {
      const segment: any = await c.env.DB.prepare('SELECT * FROM segments WHERE id = ?').bind(campaign.segment_id).first();
      if (segment) {
        const rules = segment.rules ? JSON.parse(segment.rules) : [];
        // Build query from rules
        let where = 'account_id = (SELECT account_id FROM segments WHERE id = ?)';
        const params: any[] = [campaign.segment_id];
        for (const rule of rules) {
          switch (rule.operator) {
            case 'equals': where += ` AND ${rule.field} = ?`; params.push(rule.value); break;
            case 'not_equals': where += ` AND ${rule.field} != ?`; params.push(rule.value); break;
            case 'contains': where += ` AND ${rule.field} LIKE ?`; params.push(`%${rule.value}%`); break;
            case 'starts_with': where += ` AND ${rule.field} LIKE ?`; params.push(`${rule.value}%`); break;
            case 'is_empty': where += ` AND (${rule.field} IS NULL OR ${rule.field} = '')`; break;
          }
        }
        const leadResults = await c.env.DB.prepare(`SELECT id, contact_email FROM leads WHERE ${where}`).bind(...params).all();
        leads = leadResults.results || [];
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
  } catch (error: any) { return c.json({ error: error.message }, 500); }
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
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

// --- Get Campaign Metrics ---
app.get('/email-campaigns/:id/metrics', async (c) => {
  try {
    const id = c.req.param('id');
    const campaign: any = await c.env.DB.prepare('SELECT * FROM email_campaigns WHERE id = ?').bind(id).first();
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
  } catch (error: any) { return c.json({ error: error.message }, 500); }
});

// ==================== SEGMENT ENDPOINTS ====================

// Get all segments
app.get('/segments', async (c) => {
  try {
    const accountId = c.req.query('account_id') || 'acc_demo';
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM segments WHERE account_id = ? ORDER BY created_at DESC'
    ).bind(accountId).all();

    // Parse rules JSON and count leads for each segment
    const segments = [];
    for (const s of results) {
      const rules = s.rules ? JSON.parse(s.rules) : [];
      let leadCount = 0;

      if (rules.length > 0) {
        // Separate regular from special rules
        const regularRules = rules.filter((r: any) => !['filled_form', 'visited_page'].includes(r.field));
        const filledFormRules = rules.filter((r: any) => r.field === 'filled_form');
        const visitedPageRules = rules.filter((r: any) => r.field === 'visited_page');
        const hasSpecialRules = filledFormRules.length > 0 || visitedPageRules.length > 0;

        try {
          if (hasSpecialRules) {
            let fromClause = 'leads l';
            let whereClause = 'l.account_id = ?';
            const params: any[] = [accountId];
            let jc = 0;

            for (const rule of filledFormRules) {
              const alias = `vf${jc++}`;
              fromClause += ` INNER JOIN visitor_leads ${alias} ON l.id = ${alias}.lead_id`;
              whereClause += ` AND ${alias}.source = 'form_submit'`;
              if (rule.value) {
                const formRes = await c.env.DB.prepare('SELECT name FROM tracking_forms WHERE id = ? AND account_id = ?').bind(rule.value, accountId).first();
                if (formRes) {
                  const va = `vf${jc++}`;
                  fromClause += ` INNER JOIN tracking_events ${va} ON l.contact_email = JSON_EXTRACT(${va}.form_data, '$.fields.email')`;
                  whereClause += ` AND ${va}.event_type = 'form' AND ${va}.account_id = ? AND ${va}.form_data LIKE ?`;
                  params.push(accountId);
                  params.push(`%"${formRes.name}"%`);
                }
              }
            }
            for (const rule of visitedPageRules) {
              const alias = `lv${jc++}`;
              fromClause += ` INNER JOIN lead_visits ${alias} ON l.id = ${alias}.lead_id`;
              if (rule.value) { whereClause += ` AND ${alias}.url LIKE ?`; params.push(`%${rule.value}%`); }
            }
            regularRules.forEach((rule: any) => {
              const { field, operator, value } = rule;
              switch (operator) {
                case 'equals': whereClause += ` AND l.${field} = ?`; params.push(value); break;
                case 'not_equals': whereClause += ` AND l.${field} != ?`; params.push(value); break;
                case 'contains': whereClause += ` AND l.${field} LIKE ?`; params.push(`%${value}%`); break;
                case 'not_contains': whereClause += ` AND l.${field} NOT LIKE ?`; params.push(`%${value}%`); break;
                case 'greater_than': whereClause += ` AND l.${field} > ?`; params.push(parseFloat(value)); break;
                case 'less_than': whereClause += ` AND l.${field} < ?`; params.push(parseFloat(value)); break;
                case 'starts_with': whereClause += ` AND l.${field} LIKE ?`; params.push(`${value}%`); break;
                case 'ends_with': whereClause += ` AND l.${field} LIKE ?`; params.push(`%${value}`); break;
                case 'is_empty': whereClause += ` AND (l.${field} IS NULL OR l.${field} = '')`; break;
                case 'is_not_empty': whereClause += ` AND l.${field} IS NOT NULL AND l.${field} != ''`; break;
              }
            });

            const cr: any = await c.env.DB.prepare(
              `SELECT COUNT(DISTINCT l.id) as cnt FROM ${fromClause} WHERE ${whereClause}`
            ).bind(...params).first();
            leadCount = cr?.cnt || 0;
          } else {
            // Simple query - no special rules
            let whereClause = 'account_id = ?';
            const params: any[] = [accountId];
            for (const rule of rules) {
              const { field, operator, value } = rule;
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
            const cr: any = await c.env.DB.prepare(
              `SELECT COUNT(*) as cnt FROM leads WHERE ${whereClause}`
            ).bind(...params).first();
            leadCount = cr?.cnt || 0;
          }
        } catch (countErr: any) {
          console.error('[SEGMENTS] Count error:', countErr.message);
          leadCount = 0;
        }

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
    return c.json({ error: error.message }, 500);
  }
});

// Create segment
app.post('/segments', async (c) => {
  try {
    const body = await c.req.json();
    const { account_id = 'acc_demo', name, description, rules } = body;

    if (!name || !rules || rules.length === 0) {
      return c.json({ error: 'name and rules are required' }, 400);
    }

    const id = crypto.randomUUID();
    const rulesJson = JSON.stringify(rules);

    await c.env.DB.prepare(
      'INSERT INTO segments (id, account_id, name, description, rules, lead_count) VALUES (?, ?, ?, ?, ?, 0)'
    ).bind(id, account_id, name, description || null, rulesJson).run();

    return c.json({ id, name, description, rules, lead_count: 0 });
  } catch (error: any) {
    console.error('Create segment error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Update segment
app.put('/segments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, description, rules } = body;

    await c.env.DB.prepare(
      'UPDATE segments SET name = ?, description = ?, rules = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(name, description || null, JSON.stringify(rules), id).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Delete segment
app.delete('/segments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM segments WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Preview segment (match leads against rules)
app.post('/segments/preview', async (c) => {
  try {
    const body = await c.req.json();
    const { account_id = 'acc_demo', rules } = body;

    if (!rules || rules.length === 0) {
      return c.json({ leads: [] });
    }

    // Separate regular rules from special rules
    const regularRules = rules.filter((r: any) => !['filled_form', 'visited_page'].includes(r.field));
    const filledFormRules = rules.filter((r: any) => r.field === 'filled_form');
    const visitedPageRules = rules.filter((r: any) => r.field === 'visited_page');

    // Check if we have special rules that require JOINs
    const hasSpecialRules = filledFormRules.length > 0 || visitedPageRules.length > 0;

    if (hasSpecialRules) {
      // Build query with JOINs for special rules
      let fromClause = 'leads l';
      let whereClause = 'l.account_id = ?';
      const params: any[] = [account_id];
      let joinCounter = 0;

      // Handle filled_form rules
      for (const rule of filledFormRules) {
        const alias = `vf${joinCounter++}`;
        fromClause += ` INNER JOIN visitor_leads ${alias} ON l.id = ${alias}.lead_id`;
        whereClause += ` AND ${alias}.source = 'form_submit'`;
        if (rule.value) {
          // Find form name by ID
          const formRes = await c.env.DB.prepare('SELECT name FROM tracking_forms WHERE id = ? AND account_id = ?').bind(rule.value, account_id).first();
          if (formRes) {
            whereClause += ` AND ${alias}.email IN (SELECT contact_email FROM leads WHERE account_id = ?)`;
            // Use lead_visits to check if lead submitted this specific form
            const visitAlias = `vf${joinCounter++}`;
            fromClause += ` INNER JOIN tracking_events ${visitAlias} ON l.contact_email = JSON_EXTRACT(${visitAlias}.form_data, '$.fields.email')`;
            whereClause += ` AND ${visitAlias}.event_type = 'form' AND ${visitAlias}.account_id = ? AND ${visitAlias}.form_data LIKE ?`;
            params.push(account_id);
            params.push(`%"${formRes.name}"%`);
          }
        }
      }

      // Handle visited_page rules
      for (const rule of visitedPageRules) {
        const alias = `lv${joinCounter++}`;
        fromClause += ` INNER JOIN lead_visits ${alias} ON l.id = ${alias}.lead_id`;
        if (rule.value) {
          whereClause += ` AND ${alias}.url LIKE ?`;
          params.push(`%${rule.value}%`);
        }
      }

      // Add regular rules conditions
      regularRules.forEach((rule: any) => {
        const { field, operator, value } = rule;
        switch (operator) {
          case 'equals': whereClause += ` AND l.${field} = ?`; params.push(value); break;
          case 'not_equals': whereClause += ` AND l.${field} != ?`; params.push(value); break;
          case 'contains': whereClause += ` AND l.${field} LIKE ?`; params.push(`%${value}%`); break;
          case 'not_contains': whereClause += ` AND l.${field} NOT LIKE ?`; params.push(`%${value}%`); break;
          case 'greater_than': whereClause += ` AND l.${field} > ?`; params.push(parseFloat(value)); break;
          case 'less_than': whereClause += ` AND l.${field} < ?`; params.push(parseFloat(value)); break;
          case 'starts_with': whereClause += ` AND l.${field} LIKE ?`; params.push(`${value}%`); break;
          case 'ends_with': whereClause += ` AND l.${field} LIKE ?`; params.push(`%${value}`); break;
          case 'is_empty': whereClause += ` AND (l.${field} IS NULL OR l.${field} = '')`; break;
          case 'is_not_empty': whereClause += ` AND l.${field} IS NOT NULL AND l.${field} != ''`; break;
        }
      });

      // Use DISTINCT to avoid duplicates from JOINs
      const { results } = await c.env.DB.prepare(
        `SELECT DISTINCT l.* FROM ${fromClause} WHERE ${whereClause} ORDER BY l.created_at DESC LIMIT 500`
      ).bind(...params).all();

      return c.json({ leads: results, count: results.length });
    }

    // Original simple query for regular rules only
    let whereClause = 'account_id = ?';
    const params: any[] = [account_id];

    regularRules.forEach((rule: any) => {
      const { field, operator, value } = rule;

      switch (operator) {
        case 'equals':
          whereClause += ` AND ${field} = ?`;
          params.push(value);
          break;
        case 'not_equals':
          whereClause += ` AND ${field} != ?`;
          params.push(value);
          break;
        case 'contains':
          whereClause += ` AND ${field} LIKE ?`;
          params.push(`%${value}%`);
          break;
        case 'not_contains':
          whereClause += ` AND ${field} NOT LIKE ?`;
          params.push(`%${value}%`);
          break;
        case 'greater_than':
          whereClause += ` AND ${field} > ?`;
          params.push(parseFloat(value));
          break;
        case 'less_than':
          whereClause += ` AND ${field} < ?`;
          params.push(parseFloat(value));
          break;
        case 'starts_with':
          whereClause += ` AND ${field} LIKE ?`;
          params.push(`${value}%`);
          break;
        case 'ends_with':
          whereClause += ` AND ${field} LIKE ?`;
          params.push(`%${value}`);
          break;
        case 'is_empty':
          whereClause += ` AND (${field} IS NULL OR ${field} = '')`;
          break;
        case 'is_not_empty':
          whereClause += ` AND ${field} IS NOT NULL AND ${field} != ''`;
          break;
      }
    });

    const { results } = await c.env.DB.prepare(
      `SELECT * FROM leads WHERE ${whereClause} ORDER BY created_at DESC LIMIT 500`
    ).bind(...params).all();

    return c.json({ leads: results, count: results.length });
  } catch (error: any) {
    console.error('Segment preview error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== AUTOMATION ENDPOINTS ====================

// Get all automations
app.get('/automations', async (c) => {
  try {
    const accountId = c.req.query('account_id') || 'acc_demo';
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
    return c.json({ error: error.message }, 500);
  }
});

// Create automation
app.post('/automations', async (c) => {
  try {
    const body = await c.req.json();
    const { account_id = 'acc_demo', name, description, is_active, trigger_type, trigger_config, nodes, connections } = body;

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
    return c.json({ error: error.message }, 500);
  }
});

// Update automation
app.put('/automations/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, description, is_active, trigger_type, trigger_config, nodes, connections } = body;

    await c.env.DB.prepare(
      'UPDATE automations SET name = ?, description = ?, is_active = ?, trigger_type = ?, trigger_config = ?, nodes = ?, connections = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(
      name, description || null, is_active ?? 1, trigger_type || '',
      JSON.stringify(trigger_config || {}),
      JSON.stringify(nodes || []),
      JSON.stringify(connections || []),
      id
    ).run();

    return c.json({ success: true, id });
  } catch (error: any) {
    console.error('Update automation error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete automation
app.delete('/automations/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM automations WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Execute automation manually (for testing)
app.post('/automations/:id/execute', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { lead_id } = body;

    const automation: any = await c.env.DB.prepare(
      'SELECT * FROM automations WHERE id = ?'
    ).bind(id).first();

    if (!automation) return c.json({ error: 'Automation not found' }, 404);
    if (automation.is_active === 0) return c.json({ error: 'Automation is paused' }, 400);

    const nodes = automation.nodes ? JSON.parse(automation.nodes) : [];
    const connections = automation.connections ? JSON.parse(automation.connections) : [];

    // Simple linear execution
    const triggerNode = nodes.find((n: any) => n.type === 'trigger');
    if (!triggerNode) return c.json({ error: 'No trigger node found' }, 400);

    const executionId = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT INTO automation_executions (id, automation_id, lead_id, status) VALUES (?, ?, ?, \'running\')'
    ).bind(executionId, id, lead_id || null).run();

    // Follow connections and execute actions
    let currentId = triggerNode.id;
    const executed: string[] = [];

    while (currentId) {
      const conn = connections.find((c: any) => c.from === currentId);
      if (!conn) break;

      const nextNode = nodes.find((n: any) => n.id === conn.to);
      if (!nextNode || executed.includes(nextNode.id)) break;

      executed.push(nextNode.id);

      // Execute action
      if (nextNode.type === 'action' && lead_id) {
        await executeActionNode(nextNode, lead_id, c.env.DB);
      }

      currentId = nextNode.id;
    }

    await c.env.DB.prepare(
      'UPDATE automation_executions SET status = \'completed\' WHERE id = ?'
    ).bind(executionId).run();

    return c.json({ success: true, executed_nodes: executed.length });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

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
    // send_email would require an email service integration
    default:
      console.log(`Unknown action type: ${nodeType}`);
  }
}

app.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Email e senha são obrigatórios' }, 400);
    }

    const user: any = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 401);
    }

    // Direct comparison for now as requested. 
    // In a production app, we would use hashing.
    if (user.password !== password) {
      return c.json({ error: 'Senha incorreta' }, 401);
    }

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    return c.json(userWithoutPassword);
  } catch (error: any) {
    console.error('Login error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export const onRequest = handle(app);
