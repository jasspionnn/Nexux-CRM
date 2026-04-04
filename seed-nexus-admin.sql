-- Executar este SQL no Dashboard do Cloudflare D1 para criar o usuário admin do Nexus

-- Criar conta Nexus
INSERT INTO accounts (id, company_name, owner_name, email, status, plan, expires_at, created_at)
VALUES ('acc_nexus', 'Nexus CRM', 'Admin Nexus', 'adminnexus@nexus.com', 'active', 'enterprise', '2099-12-31T23:59:59Z', datetime('now'))
ON CONFLICT(id) DO UPDATE SET email = 'adminnexus@nexus.com';

-- Criar usuário admin do Nexus
INSERT INTO users (id, account_id, name, email, password, role, status, joined_at)
VALUES ('u_nexus_admin', 'acc_nexus', 'Administrador Nexus', 'adminnexus@nexus.com', '123', 'NEXUS_ADMIN', 'active', datetime('now'))
ON CONFLICT(id) DO UPDATE SET email = 'adminnexus@nexus.com', password = '123', account_id = 'acc_nexus';