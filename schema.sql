CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    plan TEXT DEFAULT 'trial',
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    stripe_customer_id TEXT,
    subscription_status TEXT
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
    joined_at TEXT,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    goal REAL DEFAULT 0,
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
    color TEXT NOT NULL,
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
    created_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (funnel_id) REFERENCES funnels(id),
    FOREIGN KEY (stage_id) REFERENCES stages(id)
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    title TEXT NOT NULL,
    due_date TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    type TEXT DEFAULT 'todo',
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_fields (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    context TEXT NOT NULL,
    funnel_id TEXT NOT NULL,
    options TEXT,
    visible_stage_ids TEXT,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO users (id, account_id, name, email, password, role, avatar, status, joined_at)
VALUES (
    'nexus-admin', 
    NULL, 
    'Super Admin Nexus', 
    'adminnexus@nexus.com', 
    '123', 
    'NEXUS_ADMIN', 
    'https://ui-avatars.com/api/?name=Nexus+Admin&background=000&color=fff', 
    'active', 
    datetime('now')
);