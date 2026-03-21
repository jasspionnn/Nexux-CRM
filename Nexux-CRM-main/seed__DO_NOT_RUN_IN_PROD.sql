-- ⚠️⚠️ ATENÇÃO ⚠️⚠️
-- Este arquivo é APENAS para ambientes vazios ou de desenvolvimento.
-- NÃO EXECUTAR EM PRODUÇÃO.

-- 1. Create Nexus Admin (Super User)
-- Note: This user manages other accounts but belongs to a 'system' account or null account context in logic
INSERT INTO users (id, account_id, name, email, password, role, avatar, status, joined_at)
VALUES 
('u_nexus_admin', NULL, 'Administrador Nexus', 'admin@nexus.com', 'admin123', 'NEXUS_ADMIN', 'https://ui-avatars.com/api/?name=Nexus+Admin&background=000&color=fff', 'active', '2023-01-01T00:00:00Z');

-- 2. Create Default Account (Demo Company)
INSERT INTO accounts (id, company_name, owner_name, email, status, plan, expires_at)
VALUES 
('acc_demo', 'Tech Solutions Ltda', 'João Silva', 'joao@tech.com', 'active', 'pro', '2025-12-31T23:59:59Z');

-- 3. Create Account Users
INSERT INTO users (id, account_id, name, email, password, role, avatar, status, team_id, joined_at)
VALUES 
('u_owner', 'acc_demo', 'João Silva', 'joao@tech.com', '123456', 'ACCOUNT_ADMIN', 'https://ui-avatars.com/api/?name=Joao+Silva&background=0D8ABC&color=fff', 'active', NULL, '2023-01-01T10:00:00Z'),
('u_sales1', 'acc_demo', 'Ana Pereira', 'ana@tech.com', '123456', 'USER', 'https://ui-avatars.com/api/?name=Ana+Pereira&background=random', 'active', NULL, '2023-01-02T10:00:00Z'),
('u_sales2', 'acc_demo', 'Carlos Souza', 'carlos@tech.com', '123456', 'USER', 'https://ui-avatars.com/api/?name=Carlos+Souza&background=random', 'active', NULL, '2023-01-03T10:00:00Z');

-- 4. Create Teams
INSERT INTO teams (id, account_id, name, goal)
VALUES 
('t_inside_sales', 'acc_demo', 'Inside Sales', 500000),
('t_closer', 'acc_demo', 'Closers', 1000000);

-- Update users to teams
UPDATE users SET team_id = 't_inside_sales' WHERE id = 'u_sales1';
UPDATE users SET team_id = 't_closer' WHERE id = 'u_sales2';

-- 5. Create Default Funnel
INSERT INTO funnels (id, account_id, name) VALUES ('f_vendas', 'acc_demo', 'Funil de Vendas Padrão');

-- 6. Create Stages
INSERT INTO stages (id, funnel_id, name, color, "order") VALUES 
('s_new', 'f_vendas', 'Novo Lead', 'bg-gray-100 border-gray-300', 0),
('s_qual', 'f_vendas', 'Qualificação', 'bg-blue-50 border-blue-200', 1),
('s_prop', 'f_vendas', 'Proposta', 'bg-yellow-50 border-yellow-200', 2),
('s_neg', 'f_vendas', 'Negociação', 'bg-purple-50 border-purple-200', 3),
('s_won', 'f_vendas', 'Fechado Ganho', 'bg-green-50 border-green-200', 4);

-- Update Funnel Defaults
UPDATE funnels SET default_won_stage_id = 's_won' WHERE id = 'f_vendas';

-- 7. Create Leads
INSERT INTO leads (id, account_id, title, company, value, contact_name, contact_email, contact_phone, funnel_id, stage_id, assigned_user_id, probability, tags, created_at) VALUES
('l_1', 'acc_demo', 'Licença Enterprise', 'Mega Corp', 150000, 'Roberto Justus', 'roberto@mega.com', '1199999999', 'f_vendas', 's_neg', 'u_owner', 80, '["Enterprise","Q3"]', '2023-10-01T10:00:00Z'),
('l_2', 'acc_demo', 'Consultoria CRM', 'StartUp Inc', 25000, 'Maria Luiza', 'maria@start.com', '1188888888', 'f_vendas', 's_prop', 'u_sales1', 60, '["Consultoria"]', '2023-10-05T14:30:00Z'),
('l_3', 'acc_demo', 'Implantação', 'Retail S.A.', 80000, 'Fernando', 'fer@retail.com', '1177777777', 'f_vendas', 's_new', 'u_sales2', 20, '["Indicação"]', '2023-10-10T09:00:00Z');

-- 8. Create Notes
INSERT INTO notes (id, lead_id, content, author_name, created_at) VALUES
('n_1', 'l_1', 'Cliente pediu desconto de 5%.', 'João Silva', '2023-10-02T10:00:00Z'),
('n_2', 'l_1', 'Reunião agendada para sexta.', 'João Silva', '2023-10-03T11:00:00Z');

-- 9. Create Tasks
INSERT INTO tasks (id, lead_id, title, due_date, completed, type) VALUES
('t_1', 'l_1', 'Enviar contrato revisado', '2023-11-20T10:00:00Z', 0, 'email'),
('t_2', 'l_2', 'Follow-up proposta', '2023-11-21T15:00:00Z', 0, 'call');

-- 10. Custom Fields
INSERT INTO custom_fields (id, account_id, name, type, context, funnel_id, options, visible_stage_ids) VALUES
('cf_origem', 'acc_demo', 'Origem do Lead', 'select', 'lead_detail', 'f_vendas', '[{"id":"opt1","label":"Google"},{"id":"opt2","label":"Linkedin"},{"id":"opt3","label":"Indicação"}]', '[]'),
('cf_motivo', 'acc_demo', 'Motivo da Perda', 'select', 'lost_reason', 'f_vendas', '[{"id":"l1","label":"Preço Alto"},{"id":"l2","label":"Concorrência"},{"id":"l3","label":"Sem Budget"}]', '[]');
