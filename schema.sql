
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
