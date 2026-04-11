
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

CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    goal REAL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS funnels (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    default_won_stage_id TEXT,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stages (
    id TEXT PRIMARY KEY,
    funnel_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    "order" INTEGER NOT NULL,
    FOREIGN KEY (funnel_id) REFERENCES funnels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT,
    value REAL DEFAULT 0,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    funnel_id TEXT NOT NULL,
    stage_id TEXT NOT NULL,
    assigned_user_id TEXT,
    probability INTEGER DEFAULT 0,
    tags TEXT,
    custom_values TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (funnel_id) REFERENCES funnels(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    title TEXT NOT NULL,
    due_date TEXT,
    completed INTEGER DEFAULT 0,
    type TEXT,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS knowledge_sources (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Histórico de conversas do Bot para manter contexto (Short-term memory)
CREATE TABLE IF NOT EXISTS bot_chat_history (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    lead_phone TEXT NOT NULL,
    role TEXT NOT NULL, -- 'user' ou 'model'
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Configurações específicas de comportamento da IA por Tenant
CREATE TABLE IF NOT EXISTS bot_settings (
    account_id TEXT PRIMARY KEY,
    system_prompt TEXT DEFAULT 'Você é um assistente de vendas gentil. Use as informações fornecidas para tirar dúvidas.',
    temperature REAL DEFAULT 0.7,
    auto_reply INTEGER DEFAULT 1,
    whatsapp_webhook_token TEXT, -- Token para validar requisições do Meta/Z-API
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Fragmentos da Base de Conhecimento (para rastreio no D1 além do Vectorize)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (source_id) REFERENCES knowledge_sources(id) ON DELETE CASCADE
);

-- Configurações Globais (White-label do Sistema)
CREATE TABLE IF NOT EXISTS global_settings (
    id TEXT PRIMARY KEY DEFAULT 'nexus',
    login_title TEXT,
    login_subtitle TEXT,
    login_badge_text TEXT,
    login_quote_text TEXT,
    login_quote_author TEXT,
    login_quote_role TEXT
);

-- Configurações de Tracking por Conta
CREATE TABLE IF NOT EXISTS tracking_settings (
    account_id TEXT PRIMARY KEY,
    tracking_id TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Eventos de Tracking (pageviews, formulários, conversões)
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

-- Formulários rastreados (mapeamento de campos)
CREATE TABLE IF NOT EXISTS tracking_forms (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    url_pattern TEXT,
    form_selector TEXT,
    fields TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Segmentações de Leads
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

-- Fluxos de Automação
CREATE TABLE IF NOT EXISTS automations (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    trigger_type TEXT NOT NULL,
    trigger_config TEXT,
    nodes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Histórico de execuções de automações
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

-- Links na Bio (páginas de links personalizáveis)
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

-- Templates de Email (para campanhas e automações)
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

-- Campanhas de Email (disparos)
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

-- Eventos de Email (tracking por lead)
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

-- Mapeamento Visitor -> Lead (conecta visitor_id anônimo a lead identificado)
CREATE TABLE IF NOT EXISTS visitor_leads (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    email TEXT,
    first_seen TEXT DEFAULT (datetime('now')),
    last_seen TEXT DEFAULT (datetime('now')),
    source TEXT DEFAULT 'form_submit',
    UNIQUE(visitor_id, lead_id),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Histórico de visitas de páginas por lead
CREATE TABLE IF NOT EXISTS lead_visits (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    visitor_id TEXT,
    url TEXT NOT NULL,
    referrer TEXT,
    title TEXT,
    duration_seconds INTEGER DEFAULT 0,
    visited_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
