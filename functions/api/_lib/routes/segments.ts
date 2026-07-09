import { Hono } from 'hono';
import { sessionAccountId } from '../auth';
import { buildSegmentQuery } from '../segment-query';

type Bindings = { DB: any; SESSION_SECRET?: string };

export const segmentsRoutes = new Hono<{ Bindings: Bindings }>();

// Get all segments
segmentsRoutes.get('/segments', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM segments WHERE account_id = ? ORDER BY created_at DESC'
    ).bind(accountId).all();

    // Parse rules JSON and count leads for each segment
    const segments = [];
    for (const s of results) {
      const rules = s.rules ? JSON.parse(s.rules) : [];
      let leadCount = 0;

      if (rules.length > 0) {
        const { whereClause, params } = await buildSegmentQuery(c.env.DB, accountId, rules);

        const countResult: any = await c.env.DB.prepare(
          `SELECT COUNT(*) as cnt FROM leads WHERE ${whereClause}`
        ).bind(...params).first();
        leadCount = countResult?.cnt || 0;

        // Update stored lead_count
        await c.env.DB.prepare(
          'UPDATE segments SET lead_count = ? WHERE id = ?'
        ).bind(leadCount, s.id).run();
      }

      segments.push({ ...s, rules, lead_count: leadCount });
    }

    return c.json(segments);
  } catch (error: any) {
    console.error('Get segments error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Create segment
segmentsRoutes.post('/segments', async (c) => {
  try {
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);
    const { name, description, rules } = body;

    console.log('[SEGMENTS] Creating segment:', { account_id, name, rulesCount: rules?.length });

    if (!name || !rules || rules.length === 0) {
      console.error('[SEGMENTS] Validation failed:', { name: !!name, rules: !!rules, rulesLength: rules?.length });
      return c.json({ error: 'name and rules are required' }, 400);
    }

    const id = crypto.randomUUID();
    const rulesJson = JSON.stringify(rules);

    await c.env.DB.prepare(
      'INSERT INTO segments (id, account_id, name, description, rules, lead_count) VALUES (?, ?, ?, ?, ?, 0)'
    ).bind(id, account_id, name, description || null, rulesJson).run();

    console.log('[SEGMENTS] Created segment:', id);
    return c.json({ id, name, description, rules, lead_count: 0 });
  } catch (error: any) {
    console.error('[SEGMENTS] Create segment error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Update segment
segmentsRoutes.put('/segments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const { name, description, rules } = body;

    await c.env.DB.prepare(
      'UPDATE segments SET name = ?, description = ?, rules = ?, updated_at = datetime(\'now\') WHERE id = ? AND account_id = ?'
    ).bind(name, description || null, JSON.stringify(rules), id, account_id).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Delete segment
segmentsRoutes.delete('/segments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM segments WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Preview segment (match leads against rules)
segmentsRoutes.post('/segments/preview', async (c) => {
  try {
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);
    const { rules } = body;

    console.log('[SEGMENTS PREVIEW] Input:', { account_id, rulesCount: rules?.length, rules: JSON.stringify(rules) });

    if (!rules || rules.length === 0) {
      return c.json({ leads: [] });
    }

    const { whereClause, params } = await buildSegmentQuery(c.env.DB, account_id, rules);
    const debugInfo: any = { rulesProcessed: rules.length, filledFormChecks: [] };

    const { results } = await c.env.DB.prepare(
      `SELECT * FROM leads WHERE ${whereClause} ORDER BY created_at DESC LIMIT 500`
    ).bind(...params).all();

    console.log('[SEGMENTS PREVIEW] Final query:', { whereClause, paramsCount: params.length, resultCount: results.length });

    return c.json({
      leads: results,
      count: results.length,
      _debug: debugInfo
    });
  } catch (error: any) {
    console.error('Segment preview error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});
