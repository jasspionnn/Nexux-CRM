
-- ... (tabelas anteriores permanecem)

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
