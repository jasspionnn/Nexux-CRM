-- Migration number: 0001 	 2026-07-09T02:30:28.245Z
--
-- Baseline migration. Content mirrors schema.sql at the time this migration system
-- was introduced (previously, schema evolution happened ad hoc via a GET /api/migrate-db
-- endpoint that ran a long hand-maintained sequence of CREATE TABLE IF NOT EXISTS /
-- ALTER TABLE statements with no version tracking). Every statement below is
-- idempotent (IF NOT EXISTS), so applying this migration against a database that
-- already has these tables (e.g. one bootstrapped by the old /migrate-db endpoint)
-- is safe and a no-op.
--
-- Going forward: run `wrangler d1 migrations create nexus-db <name>` for schema
-- changes instead of editing this file, and keep schema.sql updated to match (it
-- remains the human-readable reference / fresh-install bootstrap for local dev).

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
    permissions TEXT DEFAULT '{}',
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS funnels (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    default_won_stage_id TEXT,
    default_lost_stage_id TEXT,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stages (
    id TEXT PRIMARY KEY,
    funnel_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    colorOpacity TEXT DEFAULT '1a',
    borderOpacity TEXT DEFAULT '4d',
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
    score_profile REAL DEFAULT 0,
    score_interest INTEGER DEFAULT 0,
    score_grade TEXT DEFAULT 'D',
    source TEXT DEFAULT 'manual',
    created_at TEXT DEFAULT (datetime('now')),
    last_contact_at TEXT,
    next_task_at TEXT,
    closed_at TEXT,
    closing_forecast_at TEXT,
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
    field_mapping TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tracking_forms_account_name ON tracking_forms(account_id, name);

-- Envios individuais de formulários rastreados (usado na pré-visualização de segmentos)
CREATE TABLE IF NOT EXISTS form_submissions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    form_id TEXT NOT NULL,
    lead_id TEXT,
    visitor_id TEXT,
    email TEXT,
    data TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (form_id) REFERENCES tracking_forms(id) ON DELETE CASCADE
);

-- Page views brutos (usado na pré-visualização de segmentos)
CREATE TABLE IF NOT EXISTS page_views (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    url TEXT NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Leads capturados por formulários de marketing, antes de serem sincronizados para o CRM
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

-- Campos personalizados do módulo de Marketing (distintos dos custom_fields do CRM)
CREATE TABLE IF NOT EXISTS marketing_custom_fields (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    options TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Mapeamento entre campos de Marketing e campos do CRM na sincronização de leads
CREATE TABLE IF NOT EXISTS marketing_crm_mappings (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    marketing_field_id TEXT,
    crm_field_id TEXT,
    marketing_standard_field TEXT,
    crm_standard_field TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Biblioteca de conteúdo da área "Performance" (global à plataforma, não por conta)
CREATE TABLE IF NOT EXISTS performance_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    thumb_url TEXT,
    cta_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Notificações in-app por conta (tarefas do dia, eventos do sistema, etc.)
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    related_id TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Clique em link individual de uma página de Bio (para analytics)
CREATE TABLE IF NOT EXISTS bio_link_clicks (
    id TEXT PRIMARY KEY,
    bio_link_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    link_label TEXT NOT NULL,
    link_url TEXT NOT NULL,
    clicked_at TEXT DEFAULT (datetime('now')),
    referrer TEXT,
    user_agent TEXT,
    ip_address TEXT,
    FOREIGN KEY (bio_link_id) REFERENCES bio_links(id) ON DELETE CASCADE
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
    connections TEXT,
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
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Regras de Lead Scoring - Perfil (campos personalizados com peso e estrela)
CREATE TABLE IF NOT EXISTS scoring_profile_rules (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Campos personalizados vinculados a regras de perfil
CREATE TABLE IF NOT EXISTS scoring_profile_fields (
    id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL,
    custom_field_id TEXT NOT NULL,
    weight_percentage INTEGER NOT NULL DEFAULT 50, -- 1% a 100% (peso do campo)
    answer_scores TEXT, -- JSON: mapeia cada resposta possível -> pontuação 1-10. Ex: {"Sim": 9, "Não": 2, "Talvez": 5}
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (rule_id) REFERENCES scoring_profile_rules(id) ON DELETE CASCADE,
    FOREIGN KEY (custom_field_id) REFERENCES custom_fields(id) ON DELETE CASCADE
);

-- Regras de Lead Scoring - Interesse (conversões com pontos)
CREATE TABLE IF NOT EXISTS scoring_interest_rules (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Conversões vinculadas a regras de interesse (segmentação por formulários/eventos)
CREATE TABLE IF NOT EXISTS scoring_interest_conversions (
    id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL,
    conversion_name TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 10, -- pontos que esta conversão vale
    event_type TEXT DEFAULT 'form_submit', -- 'form_submit', 'page_view', 'custom_event'
    event_ids TEXT, -- JSON com IDs dos formulários/eventos vinculados
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (rule_id) REFERENCES scoring_interest_rules(id) ON DELETE CASCADE
);

-- Histórico de scores calculados por lead
CREATE TABLE IF NOT EXISTS lead_score_history (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    score_profile REAL DEFAULT 0,
    score_interest INTEGER DEFAULT 0,
    score_total REAL DEFAULT 0,
    score_grade TEXT DEFAULT 'D',
    calculated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Contador de tentativas para rate limiting (login, cadastro público, etc.), lido
-- por functions/api/[[route]].ts. `scope` distingue o tipo de limite (ex.: "login_ip"),
-- `key` é o valor limitado (IP ou e-mail).
CREATE TABLE IF NOT EXISTS security_rate_limits (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    key TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_security_rate_limits_lookup ON security_rate_limits(scope, key, created_at);

-- ==================== ÍNDICES ====================
-- Quase toda query do sistema filtra por account_id (isolamento multi-tenant) ou
-- por uma chave estrangeira (lead_id, funnel_id, etc). Sem índice, D1 faz table
-- scan nessas colunas conforme a base cresce.
CREATE INDEX IF NOT EXISTS idx_users_account_id ON users(account_id);
CREATE INDEX IF NOT EXISTS idx_leads_account_id ON leads(account_id);
CREATE INDEX IF NOT EXISTS idx_leads_funnel_id ON leads(funnel_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage_id ON leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_user_id ON leads(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_stages_funnel_id ON stages(funnel_id);
CREATE INDEX IF NOT EXISTS idx_notes_lead_id ON notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_account_id ON custom_fields(account_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_account_id ON webhooks(account_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_account_id ON tracking_events(account_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_tracking_id ON tracking_events(tracking_id);
CREATE INDEX IF NOT EXISTS idx_segments_account_id ON segments(account_id);
CREATE INDEX IF NOT EXISTS idx_automations_account_id ON automations(account_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_automation_id ON automation_executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_lead_id ON automation_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_bio_links_account_id ON bio_links(account_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_account_id ON email_templates(account_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_account_id ON email_campaigns(account_id);
CREATE INDEX IF NOT EXISTS idx_email_events_campaign_id ON email_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_visitor_leads_lead_id ON visitor_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_visits_lead_id ON lead_visits(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_score_history_lead_id ON lead_score_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_bot_chat_history_account_phone ON bot_chat_history(account_id, lead_phone);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source_id ON knowledge_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_account_id ON form_submissions(account_id);
CREATE INDEX IF NOT EXISTS idx_page_views_account_id ON page_views(account_id);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_account_id ON marketing_leads(account_id);
CREATE INDEX IF NOT EXISTS idx_notifications_account_id ON notifications(account_id);
CREATE INDEX IF NOT EXISTS idx_bio_link_clicks_bio_link_id ON bio_link_clicks(bio_link_id);
