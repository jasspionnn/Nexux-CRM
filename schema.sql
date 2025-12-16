-- 1. Accounts (Tenants)
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    plan TEXT DEFAULT 'trial',
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT,
    stripe_customer_id TEXT,
    subscription_status TEXT
);

-- 2. Teams
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    goal REAL DEFAULT 0,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- 3. Users
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
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- 4. Funnels
CREATE TABLE IF NOT EXISTS funnels (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    default_won_stage_id TEXT,
    default_lost_stage_id TEXT,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- 5. Stages
CREATE TABLE IF NOT EXISTS stages (
    id TEXT PRIMARY KEY,
    funnel_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    FOREIGN KEY (funnel_id) REFERENCES funnels(id) ON DELETE CASCADE
);

-- 6. Leads
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
    tags TEXT DEFAULT '[]',
    custom_values TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (funnel_id) REFERENCES funnels(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. Notes
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- 8. Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    title TEXT NOT NULL,
    due_date TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    type TEXT DEFAULT 'todo',
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- 9. Custom Fields
CREATE TABLE IF NOT EXISTS custom_fields (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    context TEXT NOT NULL,
    funnel_id TEXT NOT NULL,
    options TEXT,
    visible_stage_ids TEXT,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (funnel_id) REFERENCES funnels(id) ON DELETE CASCADE
);
