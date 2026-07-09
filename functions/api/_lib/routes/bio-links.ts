import { Hono } from 'hono';
import { sessionAccountId } from '../auth';

type Bindings = { DB: any; SESSION_SECRET?: string };

export const bioLinksRoutes = new Hono<{ Bindings: Bindings }>();

bioLinksRoutes.get('/bio-links', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    console.log('Fetching bio links for:', accountId);
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM bio_links WHERE account_id = ? ORDER BY created_at DESC'
    ).bind(accountId).all();
    console.log('Bio links found:', results?.length || 0);
    return c.json(results.map((r: any) => ({ ...r, links: r.links ? JSON.parse(r.links) : [] })));
  } catch (error: any) {
    console.error('Bio fetch error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Get a single bio link page by slug (public)
bioLinksRoutes.get('/bio-links/public/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const page: any = await c.env.DB.prepare(
      'SELECT * FROM bio_links WHERE slug = ? AND is_active = 1'
    ).bind(slug).first();
    if (!page) return c.json({ error: 'Not found' }, 404);
    page.links = page.links ? JSON.parse(page.links) : [];
    // Increment click count
    await c.env.DB.prepare(
      'UPDATE bio_links SET click_count = click_count + 1 WHERE id = ?'
    ).bind(page.id).run();
    return c.json(page);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// Create a new bio link page
bioLinksRoutes.post('/bio-links', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json({ error: 'account_id is required' }, 400);
    const slug = body.slug || id.slice(0, 8);
    const links = JSON.stringify(body.links || []);

    console.log('Creating bio page:', { id, accountId, slug, title: body.title, linkCount: body.links?.length || 0 });

    await c.env.DB.prepare(
      `INSERT INTO bio_links (id, account_id, slug, title, description, avatar_url, bg_color, text_color, button_color, button_text_color, button_radius, links, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, accountId, slug, body.title || 'Meus Links', body.description || '', body.avatar_url || '',
      body.bg_color || '#0f172a', body.text_color || '#f8fafc', body.button_color || '#0d9488',
      body.button_text_color || '#ffffff', body.button_radius ?? 12, links, body.is_active ?? 1
    ).run();

    return c.json({ id, account_id: accountId, slug, title: body.title, links: body.links || [], bg_color: body.bg_color, text_color: body.text_color, button_color: body.button_color, button_text_color: body.button_text_color, button_radius: body.button_radius ?? 12 });
  } catch (error: any) {
    console.error('Bio create error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Update a bio link page
bioLinksRoutes.put('/bio-links/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const links = body.links ? JSON.stringify(body.links) : null;

    await c.env.DB.prepare(
      `UPDATE bio_links SET slug = COALESCE(?, slug), title = COALESCE(?, title), description = COALESCE(?, description),
       avatar_url = COALESCE(?, avatar_url), bg_color = COALESCE(?, bg_color), text_color = COALESCE(?, text_color),
       button_color = COALESCE(?, button_color), button_text_color = COALESCE(?, button_text_color),
       button_radius = COALESCE(?, button_radius), links = COALESCE(?, links),
       is_active = COALESCE(?, is_active), updated_at = datetime('now')
       WHERE id = ? AND account_id = ?`
    ).bind(
      body.slug, body.title, body.description, body.avatar_url,
      body.bg_color, body.text_color, body.button_color, body.button_text_color,
      body.button_radius, links, body.is_active, id, account_id
    ).run();

    // Fetch updated
    const updated: any = await c.env.DB.prepare('SELECT * FROM bio_links WHERE id = ? AND account_id = ?').bind(id, account_id).first();
    if (updated) updated.links = updated.links ? JSON.parse(updated.links) : [];
    return c.json(updated || { success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// Delete a bio link page
bioLinksRoutes.delete('/bio-links/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM bio_links WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// Track link click
bioLinksRoutes.post('/bio-links/:id/click', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const clickId = crypto.randomUUID();

    await c.env.DB.prepare(
      'INSERT INTO bio_link_clicks (id, bio_link_id, account_id, link_label, link_url, referrer, user_agent, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      clickId, id, body.account_id, body.link_label, body.link_url,
      body.referrer || '', body.user_agent || '', body.ip_address || ''
    ).run();

    // Increment total click count
    await c.env.DB.prepare(
      'UPDATE bio_links SET click_count = click_count + 1 WHERE id = ?'
    ).bind(id).run();

    return c.json({ success: true, click_id: clickId });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// Get analytics for a bio link page
bioLinksRoutes.get('/bio-links/:id/analytics', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const owned = await c.env.DB.prepare('SELECT id FROM bio_links WHERE id = ? AND account_id = ?').bind(id, account_id).first();
    if (!owned) return c.json({ error: 'Não encontrado.' }, 404);
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    let dateFilter = '';
    const dateParams: any[] = [];
    if (startDate && endDate) {
      dateFilter = 'AND clicked_at BETWEEN ? AND ?';
      dateParams.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'AND clicked_at >= ?';
      dateParams.push(startDate);
    } else if (endDate) {
      dateFilter = 'AND clicked_at <= ?';
      dateParams.push(endDate);
    }

    // Total clicks per link label
    const clicksByLink = await c.env.DB.prepare(
      `SELECT link_label, link_url, COUNT(*) as click_count,
              COUNT(DISTINCT ip_address) as unique_clicks,
              MIN(clicked_at) as first_click,
              MAX(clicked_at) as last_click
       FROM bio_link_clicks
       WHERE bio_link_id = ? ${dateFilter}
       GROUP BY link_label, link_url
       ORDER BY click_count DESC`
    ).bind(id, ...dateParams).all();

    // Daily clicks
    const dailyClicks = await c.env.DB.prepare(
      `SELECT DATE(clicked_at) as date, COUNT(*) as click_count,
              COUNT(DISTINCT ip_address) as unique_clicks
       FROM bio_link_clicks
       WHERE bio_link_id = ? ${dateFilter}
       GROUP BY DATE(clicked_at)
       ORDER BY date ASC`
    ).bind(id, ...dateParams).all();

    // Total stats
    const totalStats = await c.env.DB.prepare(
      `SELECT COUNT(*) as total_clicks,
              COUNT(DISTINCT ip_address) as total_unique_clicks,
              COUNT(DISTINCT link_label) as total_links_clicked
       FROM bio_link_clicks
       WHERE bio_link_id = ? ${dateFilter}`
    ).bind(id, ...dateParams).first();

    return c.json({
      clicks_by_link: clicksByLink.results || [],
      daily_clicks: dailyClicks.results || [],
      total_stats: totalStats || { total_clicks: 0, total_unique_clicks: 0, total_links_clicked: 0 }
    });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});
