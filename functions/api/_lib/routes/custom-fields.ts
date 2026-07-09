import { Hono } from 'hono';
import { sessionAccountId } from '../auth';

type Bindings = { DB: any; SESSION_SECRET?: string };

export const customFieldsRoutes = new Hono<{ Bindings: Bindings }>();

customFieldsRoutes.get('/custom-fields', async (c) => {
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json([]);
  const { results } = await c.env.DB.prepare('SELECT * FROM custom_fields WHERE account_id = ?').bind(account_id).all();
  return c.json(results);
});

customFieldsRoutes.post('/custom-fields', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);

    // Provide a valid funnel_id to satisfy NOT NULL and FOREIGN KEY constraints on older schemas
    let funnel_id = body.funnel_id;
    if (!funnel_id) {
      const funnel: any = await c.env.DB.prepare('SELECT id FROM funnels WHERE account_id = ? LIMIT 1').bind(account_id).first();
      funnel_id = funnel ? funnel.id : 'f_vendas';
    }

    await c.env.DB.prepare('INSERT INTO custom_fields (id, account_id, name, type, context, funnel_id, options, visible_stage_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, account_id, body.name, body.type, body.context, funnel_id, body.options || null, body.visible_stage_ids || null)
      .run();

    return c.json({ id, account_id, name: body.name, type: body.type, context: body.context, funnel_id, options: body.options, visible_stage_ids: body.visible_stage_ids });
  } catch (error: any) {
    console.error('Error creating custom field:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

customFieldsRoutes.put('/custom-fields/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);

  await c.env.DB.prepare('UPDATE custom_fields SET name = ?, type = ?, context = ?, options = ?, visible_stage_ids = ?, funnel_id = ? WHERE id = ? AND account_id = ?')
    .bind(body.name, body.type, body.context, body.options || null, body.visible_stage_ids || null, body.funnel_id || null, id, account_id)
    .run();

  return c.json({ success: true });
});

customFieldsRoutes.delete('/custom-fields/:id', async (c) => {
  const id = c.req.param('id');
  const account_id = sessionAccountId(c);
  if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
  await c.env.DB.prepare('DELETE FROM custom_fields WHERE id = ? AND account_id = ?').bind(id, account_id).run();
  return c.json({ success: true });
});
