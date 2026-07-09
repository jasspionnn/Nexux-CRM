import { Hono } from 'hono';
import { sessionAccountId, hashPassword } from '../auth';

type Bindings = { DB: any; SESSION_SECRET?: string };

export const usersTeamsRoutes = new Hono<{ Bindings: Bindings }>();

// Users (Team members)
usersTeamsRoutes.get('/users', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json([]);
  const { results } = await c.env.DB.prepare('SELECT id, name, email, role, status, account_id FROM users WHERE account_id = ?').bind(account_id).all();
  return c.json(results);
});

usersTeamsRoutes.post('/users', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);

    const team_id = body.team_id || null;
    const avatar = body.avatar || null;
    const password = await hashPassword(body.password || 'temp_password');

    await c.env.DB.prepare('INSERT INTO users (id, account_id, name, email, password, role, status, team_id, avatar, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))')
      .bind(id, account_id, body.name, body.email, password, body.role, body.status, team_id, avatar)
      .run();

    return c.json({ id, account_id, name: body.name, email: body.email, role: body.role, status: body.status, team_id, avatar });
  } catch (error: any) {
    console.error('Error creating user:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

usersTeamsRoutes.put('/users/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);

  if (body.password) {
    const hashed = await hashPassword(body.password);
    await c.env.DB.prepare('UPDATE users SET name = ?, email = ?, role = ?, status = ?, team_id = ?, password = ? WHERE id = ? AND account_id = ?')
      .bind(body.name, body.email, body.role, body.status, body.team_id || null, hashed, id, account_id)
      .run();
  } else {
    await c.env.DB.prepare('UPDATE users SET name = ?, email = ?, role = ?, status = ?, team_id = ? WHERE id = ? AND account_id = ?')
      .bind(body.name, body.email, body.role, body.status, body.team_id || null, id, account_id)
      .run();
  }

  return c.json({ success: true });
});

usersTeamsRoutes.put('/users/:id/password', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    if (!body.password) return c.json({ error: 'password required' }, 400);
    const hashed = await hashPassword(body.password);
    await c.env.DB.prepare('UPDATE users SET password = ? WHERE id = ? AND account_id = ?').bind(hashed, id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

usersTeamsRoutes.delete('/users/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM users WHERE id = ? AND account_id = ?').bind(id, account_id).run();
  return c.json({ success: true });
});

// Teams
usersTeamsRoutes.get('/teams', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json([]);
  const { results } = await c.env.DB.prepare('SELECT * FROM teams WHERE account_id = ?').bind(account_id).all();
  return c.json(results);
});

usersTeamsRoutes.post('/teams', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'account_id is required' }, 400);
  await c.env.DB.prepare('INSERT INTO teams (id, account_id, name, goal) VALUES (?, ?, ?, ?)')
    .bind(id, account_id, body.name, body.goal || 0)
    .run();
  return c.json({ id, account_id, name: body.name, goal: body.goal || 0 });
});

usersTeamsRoutes.put('/teams/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('UPDATE teams SET name = ?, goal = ?, permissions = ? WHERE id = ? AND account_id = ?')
    .bind(body.name, body.goal || 0, body.permissions ? JSON.stringify(body.permissions) : '{}', id, account_id).run();
  return c.json({ success: true });
});

usersTeamsRoutes.delete('/teams/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM teams WHERE id = ? AND account_id = ?').bind(id, account_id).run();
  return c.json({ success: true });
});
