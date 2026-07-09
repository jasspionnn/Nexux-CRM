import { Hono } from 'hono';
import {
  hashPassword,
  verifyAndUpgradePassword,
  issueSession,
  clearSession,
  getClientIp,
  isRateLimited,
  recordRateLimitHit,
} from '../auth';

type Bindings = { DB: any; SESSION_SECRET?: string };

export const authPublicRoutes = new Hono<{ Bindings: Bindings }>();

authPublicRoutes.get('/seed-db', async (c) => {
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
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// NOTE: /seed-nexus-admin was removed — it (re)created the platform super-admin
// account with a hardcoded password ('123') on every call, with no authentication.
// It was a standing backdoor. If this account's password was ever exposed, rotate
// it manually (see seed-nexus-admin.sql for the one-time, hashed replacement).

authPublicRoutes.get('/global-settings', async (c) => {
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

authPublicRoutes.post('/public/register', async (c) => {
  try {
    const body = await c.req.json();

    const ip = getClientIp(c);
    if (await isRateLimited(c.env.DB, 'register_ip', ip, 5, 60)) {
      return c.json({ error: 'Muitas tentativas de cadastro. Tente novamente mais tarde.' }, 429);
    }
    await recordRateLimitHit(c.env.DB, 'register_ip', ip);

    if (!body.password) return c.json({ error: 'password is required' }, 400);

    const id = `acc_${crypto.randomUUID().slice(0, 8)}`;

    await c.env.DB.prepare(`
      INSERT INTO accounts (id, company_name, owner_name, email, status, plan, expires_at, created_at)
      VALUES (?, ?, ?, ?, 'active', 'trial', datetime('now', '+14 days'), datetime('now'))
    `).bind(id, body.company_name, body.owner_name, body.email).run();

    const userId = `u_${crypto.randomUUID().slice(0, 8)}`;
    await c.env.DB.prepare(`
      INSERT INTO users (id, account_id, name, email, password, role, status, joined_at)
      VALUES (?, ?, ?, ?, ?, 'ACCOUNT_ADMIN', 'active', datetime('now'))
    `).bind(userId, id, body.owner_name, body.email, await hashPassword(body.password)).run();

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
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

authPublicRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!email || !password) {
      return c.json({ error: 'E-mail e senha são obrigatórios' }, 400);
    }

    const ip = getClientIp(c);
    if ((await isRateLimited(c.env.DB, 'login_ip', ip, 15, 15)) || (await isRateLimited(c.env.DB, 'login_email', email, 8, 15))) {
      return c.json({ error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' }, 429);
    }

    const user: any = await c.env.DB.prepare(
      'SELECT id, account_id, name, email, password, role, status FROM users WHERE LOWER(email) = ?'
    ).bind(email).first();

    if (!user) {
      console.log(`[LOGIN] User not found for email: ${email}`);
      await recordRateLimitHit(c.env.DB, 'login_ip', ip);
      return c.json({ error: 'E-mail não cadastrado ou incorreto.' }, 401);
    }

    if (user.status !== 'active') {
      return c.json({ error: `Seu usuário está com status: ${user.status}. Entre em contato com o suporte.` }, 403);
    }

    const { valid, upgradedHash } = await verifyAndUpgradePassword(password, user.password);
    if (!valid) {
      console.log(`[LOGIN] Password mismatch for email: ${email}`);
      await recordRateLimitHit(c.env.DB, 'login_ip', ip);
      await recordRateLimitHit(c.env.DB, 'login_email', email);
      return c.json({ error: 'Senha incorreta.' }, 401);
    }
    if (upgradedHash) {
      // Legacy plaintext password matched — transparently upgrade it to a hash.
      await c.env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(upgradedHash, user.id).run();
    }

    // Check if account is active
    const account: any = await c.env.DB.prepare('SELECT status FROM accounts WHERE id = ?').bind(user.account_id).first();
    if (account && account.status !== 'active') {
       return c.json({ error: `A conta da empresa (${user.account_id}) está ${account.status}.` }, 403);
    }

    await issueSession(c, user);

    // Don't return the password
    const { password: _, ...userWithoutPassword } = user;

    return c.json(userWithoutPassword);
  } catch (error: any) {
    console.error('Login error:', error);
    return c.json({ error: 'Erro interno no servidor' }, 500);
  }
});

authPublicRoutes.post('/logout', async (c) => {
  clearSession(c);
  return c.json({ success: true });
});
