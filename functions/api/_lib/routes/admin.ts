import { Hono } from 'hono';
import { hashPassword } from '../auth';

type Bindings = { DB: any; SESSION_SECRET?: string };

// Every route here is under /admin/* and already gated by requireNexusAdmin
// (registered on the main app before this router is mounted).
export const adminRoutes = new Hono<{ Bindings: Bindings }>();

adminRoutes.get('/admin/stats', async (c) => {
  try {
    const totalAccounts = await c.env.DB.prepare('SELECT count(*) as count FROM accounts WHERE id != ?').bind('acc_nexus').first();
    const activeAccounts = await c.env.DB.prepare('SELECT count(*) as count FROM accounts WHERE status = "active" AND id != ?').bind('acc_nexus').first();
    const totalUsers = await c.env.DB.prepare('SELECT count(*) as count FROM users WHERE role != ?').bind('NEXUS_ADMIN').first();

    // MRR approx
    const proCount = await c.env.DB.prepare('SELECT count(*) as count FROM accounts WHERE plan = "pro" AND status = "active" AND id != ?').bind('acc_nexus').first();
    const starterCount = await c.env.DB.prepare('SELECT count(*) as count FROM accounts WHERE plan = "starter" AND status = "active" AND id != ?').bind('acc_nexus').first();

    const mrr = (Number(proCount?.count || 0) * 199) + (Number(starterCount?.count || 0) * 49);

    return c.json({
      totalAccounts: totalAccounts?.count || 0,
      activeAccounts: activeAccounts?.count || 0,
      totalUsers: totalUsers?.count || 0,
      mrr: mrr
    });
  } catch(e: any) {
    console.error(e);
    return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

adminRoutes.get('/admin/accounts', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM accounts WHERE id != ? ORDER BY created_at DESC').bind('acc_nexus').all();
  return c.json(results);
});

adminRoutes.post('/admin/accounts', async (c) => {
  try {
    const body = await c.req.json();
    const id = `acc_${crypto.randomUUID().slice(0, 8)}`;

    const expires_at = body.expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    await c.env.DB.prepare(`
      INSERT INTO accounts (id, company_name, owner_name, email, status, plan, expires_at, created_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?, datetime('now'))
    `).bind(id, body.company_name, body.owner_name, body.email, body.plan || 'starter', expires_at).run();

    // Auto-create Master User
    const userId = `u_${crypto.randomUUID().slice(0, 8)}`;
    const initialPassword = 'temp123';
    await c.env.DB.prepare(`
      INSERT INTO users (id, account_id, name, email, password, role, status, joined_at)
      VALUES (?, ?, ?, ?, ?, 'ACCOUNT_ADMIN', 'active', datetime('now'))
    `).bind(userId, id, body.owner_name, body.email, await hashPassword(initialPassword)).run();

    // Init basic funnel
    const funnelId = `f_${crypto.randomUUID().slice(0, 8)}`;
    await c.env.DB.prepare('INSERT INTO funnels (id, account_id, name) VALUES (?, ?, ?)').bind(funnelId, id, 'Funil Inicial').run();
    await c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, "order") VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), funnelId, 'Contato Inicial', '#3b82f6', 0).run();

    return c.json({ id, company_name: body.company_name, status: 'active', owner: body.owner_name, defaultPassword: initialPassword });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

adminRoutes.put('/admin/accounts/:id/status', async (c) => {
  const id = c.req.param('id');
  if (id === 'acc_nexus') {
    return c.json({ error: 'Não é possível modificar a conta Nexus' }, 403);
  }
  const body = await c.req.json();
  await c.env.DB.prepare('UPDATE accounts SET status = ? WHERE id = ?').bind(body.status, id).run();
  return c.json({ success: true, status: body.status });
});

adminRoutes.put('/admin/accounts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    await c.env.DB.prepare(`
      UPDATE accounts
      SET company_name = ?, owner_name = ?, email = ?, plan = ?, expires_at = ?
      WHERE id = ?
    `).bind(body.company_name, body.owner_name, body.email, body.plan, body.expires_at || null, id).run();

    // Also update the master user's name/email if it matches the account's old email
    await c.env.DB.prepare(`
      UPDATE users SET name = ?, email = ? WHERE account_id = ? AND role = 'ACCOUNT_ADMIN'
    `).bind(body.owner_name, body.email, id).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

adminRoutes.post('/admin/accounts/:id/reset-password', async (c) => {
  try {
    const id = c.req.param('id');
    console.log(`[RESET] Attempting to reset password for account: ${id}`);

    // Get the account's official email
    const account: any = await c.env.DB.prepare('SELECT email FROM accounts WHERE id = ?').bind(id).first();
    if (!account) {
      console.error(`[RESET] Account ${id} not found`);
      return c.json({ error: 'Conta não encontrada.' }, 404);
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let newPassword = '';
    for (let i = 0; i < 8; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Reset password for the user matching this account and email
    const result = await c.env.DB.prepare(`
      UPDATE users SET password = ? WHERE account_id = ? AND LOWER(email) = LOWER(?)
    `).bind(await hashPassword(newPassword), id, account.email).run();

    if (result.meta.changes === 0) {
      console.warn(`[RESET] No user found with email ${account.email} in account ${id}`);
      return c.json({ error: `Nenhum usuário encontrado com o e-mail (${account.email}) nesta conta.` }, 404);
    }

    console.log(`[RESET] Success for account ${id}, email ${account.email}`);
    return c.json({ success: true, newPassword });
  } catch (error: any) {
    console.error('[RESET] Error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Generic user password reset (for the users tab)
adminRoutes.post('/admin/users/:id/reset-password', async (c) => {
  try {
    const id = c.req.param('id');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let newPassword = '';
    for (let i = 0; i < 8; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const result = await c.env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(await hashPassword(newPassword), id).run();

    if (result.meta.changes === 0) return c.json({ error: 'Usuário não encontrado.' }, 404);

    return c.json({ success: true, newPassword });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

adminRoutes.put('/admin/global-settings', async (c) => {
  try {
    const body = await c.req.json();
    await c.env.DB.prepare(`
      UPDATE global_settings
      SET login_title = ?, login_subtitle = ?, login_badge_text = ?, login_quote_text = ?, login_quote_author = ?, login_quote_role = ?
      WHERE id = 'nexus'
    `).bind(body.login_title, body.login_subtitle, body.login_badge_text, body.login_quote_text, body.login_quote_author, body.login_quote_role).run();
    return c.json({ success: true });
  } catch(error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

adminRoutes.get('/admin/deduplicate-marketing-leads', async (c) => {
  try {
    // Intentionally reads account_id from the query, not the session: this route is
    // already gated by requireNexusAdmin above and exists specifically so a platform
    // admin can target a DIFFERENT tenant's data (their own session account is acc_nexus).
    const accountId = c.req.query("account_id");
    const allAccounts = c.req.query('all') === 'true';

    // 1. Find emails with duplicates (trimming and lowercasing)
    let query = `
      SELECT LOWER(TRIM(contact_email)) as email, account_id, COUNT(*) as count
      FROM marketing_leads
      WHERE contact_email IS NOT NULL AND contact_email != ''
    `;
    const queryParams: any[] = [];

    if (!allAccounts) {
      if (!accountId) return c.json({ error: 'account_id is required when not using all=true' }, 400);
      query += ` AND account_id = ?`;
      queryParams.push(accountId);
    }

    query += ` GROUP BY LOWER(TRIM(contact_email)), account_id HAVING count > 1`;

    const { results: duplicates } = await c.env.DB.prepare(query).bind(...queryParams).all();

    let totalRemoved = 0;
    const details = [];

    for (const dup of duplicates as any[]) {
      // 2. Get all records for this email, ordered by created_at (oldest first)
      const { results: records } = await c.env.DB.prepare(
        'SELECT id FROM marketing_leads WHERE account_id = ? AND LOWER(TRIM(contact_email)) = ? ORDER BY created_at ASC'
      ).bind(dup.account_id, dup.email).all();

      if (records.length > 1) {
        const idsToRemove = (records as any[]).slice(1).map(r => r.id);

        // 3. Delete duplicates
        for (const id of idsToRemove) {
          await c.env.DB.prepare('DELETE FROM marketing_leads WHERE id = ?').bind(id).run();
          totalRemoved++;
        }
        details.push({ email: dup.email, account: dup.account_id, removedCount: idsToRemove.length });
      }
    }

    return c.json({ success: true, message: `Removidos ${totalRemoved} leads duplicados.`, totalRemoved, details });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

adminRoutes.get('/admin/performance-items', async (c) => {
  try {
    const type = c.req.query('type');
    let query = `SELECT id, type, name, description, thumb_url, cta_url, status, created_at FROM performance_items WHERE 1=1`;
    const params: any[] = [];
    if (type) { query += ' AND type = ?'; params.push(type); }
    query += ' ORDER BY created_at DESC';
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json(results || []);
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Admin: create item
adminRoutes.post('/admin/performance-items', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO performance_items (id, type, name, description, thumb_url, cta_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, body.type, body.name, body.description || null, body.thumb_url || null, body.cta_url || null, body.status || 'active').run();
    return c.json({ id, ...body });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Admin: update item
adminRoutes.put('/admin/performance-items/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    await c.env.DB.prepare(
      `UPDATE performance_items SET type=?, name=?, description=?, thumb_url=?, cta_url=?, status=?, updated_at=datetime('now') WHERE id=?`
    ).bind(body.type, body.name, body.description || null, body.thumb_url || null, body.cta_url || null, body.status || 'active', id).run();
    return c.json({ success: true });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Admin: delete item
adminRoutes.delete('/admin/performance-items/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM performance_items WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Public: fetch global items (used by Performance.tsx — visible to all accounts,
// gated only by the general session middleware, not requireNexusAdmin, since this
// path doesn't start with /admin/).
adminRoutes.get('/performance-items', async (c) => {
  try {
    const type = c.req.query('type');
    let query = `SELECT id, type, name, description, thumb_url, cta_url, status, created_at
                 FROM performance_items WHERE status = 'active'`;
    const params: any[] = [];
    if (type) { query += ' AND type = ?'; params.push(type); }
    query += ' ORDER BY created_at DESC';
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json(results || []);
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});
