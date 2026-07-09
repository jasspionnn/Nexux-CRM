-- Executar este SQL manualmente (Dashboard do Cloudflare D1 ou `wrangler d1 execute`)
-- para criar/recuperar o usuário super-admin da plataforma (NEXUS_ADMIN).
--
-- Este arquivo NÃO é mais chamado por nenhuma rota HTTP (a antiga rota pública
-- GET /api/seed-nexus-admin foi removida por ser uma porta dos fundos: ela recriava
-- este usuário com a senha fixa "123" para qualquer pessoa que a chamasse).
--
-- Antes de rodar este arquivo, gere o hash da SUA própria senha (não deixe uma senha
-- real neste arquivo nem em nenhum lugar versionado) e substitua o placeholder abaixo:
--
--   node -e "const c=require('crypto');const p=process.argv[1];const s=c.randomBytes(16);const h=c.pbkdf2Sync(p,s,100000,32,'sha256');console.log('pbkdf2$100000$'+s.toString('hex')+'$'+h.toString('hex'))" "SUA_SENHA_AQUI"
--
-- Copie a saída do comando (uma string começando com "pbkdf2$...") e cole no lugar
-- de SUBSTITUA_PELO_HASH_GERADO nas duas linhas abaixo.

INSERT INTO accounts (id, company_name, owner_name, email, status, plan, expires_at, created_at)
VALUES ('acc_nexus', 'Nexus CRM', 'Admin Nexus', 'adminnexus@nexus.com', 'active', 'enterprise', '2099-12-31T23:59:59Z', datetime('now'))
ON CONFLICT(id) DO UPDATE SET email = 'adminnexus@nexus.com';

INSERT INTO users (id, account_id, name, email, password, role, status, joined_at)
VALUES ('u_nexus_admin', 'acc_nexus', 'Administrador Nexus', 'adminnexus@nexus.com', 'SUBSTITUA_PELO_HASH_GERADO', 'NEXUS_ADMIN', 'active', datetime('now'))
ON CONFLICT(id) DO UPDATE SET email = 'adminnexus@nexus.com', password = 'SUBSTITUA_PELO_HASH_GERADO', account_id = 'acc_nexus';
