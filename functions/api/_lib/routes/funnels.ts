import { Hono } from 'hono';
import { sessionAccountId } from '../auth';

type Bindings = { DB: any; SESSION_SECRET?: string };

export const funnelsRoutes = new Hono<{ Bindings: Bindings }>();

funnelsRoutes.get('/funnels', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json([]);
  // Auto-add colorOpacity column if missing
  try { await c.env.DB.prepare("ALTER TABLE stages ADD COLUMN colorOpacity TEXT DEFAULT '1a'").run(); } catch (e) { /* column already exists */ }
  try { await c.env.DB.prepare("ALTER TABLE stages ADD COLUMN borderOpacity TEXT DEFAULT '4d'").run(); } catch (e) { /* column already exists */ }

  const { results } = await c.env.DB.prepare('SELECT * FROM funnels WHERE account_id = ?').bind(account_id).all();

  // Get stages for all funnels of this account
  const { results: stages } = await c.env.DB.prepare(`
    SELECT s.* FROM stages s
    JOIN funnels f ON s.funnel_id = f.id
    WHERE f.account_id = ?
    ORDER BY s."order" ASC
  `).bind(account_id).all();

  const funnelsWithStages = results.map((funnel: any) => ({
    ...funnel,
    stages: stages.filter((stage: any) => stage.funnel_id === funnel.id)
  }));

  return c.json(funnelsWithStages);
});

funnelsRoutes.post('/funnels', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'account_id is required' }, 400);

  await c.env.DB.prepare('INSERT INTO funnels (id, account_id, name) VALUES (?, ?, ?)')
    .bind(id, account_id, body.name)
    .run();

  return c.json({ id, name: body.name, stages: [] });
});

funnelsRoutes.put('/funnels/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);

  await c.env.DB.prepare('UPDATE funnels SET name = ?, default_won_stage_id = ?, default_lost_stage_id = ? WHERE id = ? AND account_id = ?')
    .bind(body.name, body.default_won_stage_id || null, body.default_lost_stage_id || null, id, account_id)
    .run();

  return c.json({ success: true });
});

funnelsRoutes.delete('/funnels/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM funnels WHERE id = ? AND account_id = ?').bind(id, account_id).run();
  return c.json({ success: true });
});

// Stages
funnelsRoutes.post('/funnels/:funnelId/stages', async (c) => {
  const funnelId = c.req.param('funnelId');
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const stageAccountId = sessionAccountId(c);
  if (!stageAccountId) return c.json({ error: 'Não autorizado.' }, 403);
  const ownedFunnel = await c.env.DB.prepare('SELECT id FROM funnels WHERE id = ? AND account_id = ?').bind(funnelId, stageAccountId).first();
  if (!ownedFunnel) return c.json({ error: 'Funil não encontrado.' }, 404);

  await c.env.DB.prepare('INSERT INTO stages (id, funnel_id, name, color, colorOpacity, borderOpacity, "order") VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, funnelId, body.name, body.color, body.colorOpacity || '1a', body.borderOpacity || '4d', body.order || 0)
    .run();

  return c.json({ id, funnel_id: funnelId, name: body.name, color: body.color, order: body.order || 0 });
});

funnelsRoutes.put('/stages/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);

  await c.env.DB.prepare('UPDATE stages SET name = ?, color = ?, colorOpacity = ?, borderOpacity = ? WHERE id = ? AND funnel_id IN (SELECT id FROM funnels WHERE account_id = ?)')
    .bind(body.name, body.color, body.colorOpacity || '1a', body.borderOpacity || '4d', id, account_id)
    .run();

  return c.json({ success: true });
});

funnelsRoutes.delete('/stages/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM stages WHERE id = ? AND funnel_id IN (SELECT id FROM funnels WHERE account_id = ?)').bind(id, account_id).run();
  return c.json({ success: true });
});
