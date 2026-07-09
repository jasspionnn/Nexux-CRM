import { Hono } from 'hono';
import { sessionAccountId } from '../auth';

type Bindings = { DB: any; SESSION_SECRET?: string };

export const notificationsRoutes = new Hono<{ Bindings: Bindings }>();

notificationsRoutes.get('/notifications', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ notifications: [], tasks_today: [] });

  const { results: notifs } = await c.env.DB.prepare(
    'SELECT * FROM notifications WHERE account_id = ? ORDER BY created_at DESC LIMIT 40'
  ).bind(account_id).all();

  // Today's pending tasks (joined with leads for account scoping)
  const { results: tasks } = await c.env.DB.prepare(`
    SELECT t.id, t.title, t.due_date, t.type, l.title as lead_title, l.id as lead_id
    FROM tasks t
    INNER JOIN leads l ON t.lead_id = l.id
    WHERE l.account_id = ?
      AND t.completed = 0
      AND t.due_date IS NOT NULL
      AND date(t.due_date) = date('now')
    ORDER BY t.due_date ASC
  `).bind(account_id).all();

  return c.json({ notifications: notifs, tasks_today: tasks });
});

notificationsRoutes.put('/notifications/read-all', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'account_id required' }, 400);
  await c.env.DB.prepare('UPDATE notifications SET read = 1 WHERE account_id = ?').bind(account_id).run();
  return c.json({ success: true });
});

notificationsRoutes.put('/notifications/:id/read', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND account_id = ?').bind(id, account_id).run();
  return c.json({ success: true });
});
