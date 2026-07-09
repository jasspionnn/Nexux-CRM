import { Hono } from 'hono';
import { sessionAccountId } from '../auth';
import { calculateLeadScore } from '../scoring-engine';

type Bindings = { DB: any; SESSION_SECRET?: string };

export const scoringRoutes = new Hono<{ Bindings: Bindings }>();

// Profile Rules CRUD
scoringRoutes.get('/scoring/profile-rules', async (c) => {
  try {
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json([]);
    const { results: rules } = await c.env.DB.prepare(
      'SELECT * FROM scoring_profile_rules WHERE account_id = ? ORDER BY created_at DESC'
    ).bind(account_id).all();

    // Load fields for each rule
    const rulesWithFields = await Promise.all(
      (rules || []).map(async (rule: any) => {
        const { results: fields } = await c.env.DB.prepare(
          `SELECT spf.*, cf.name as custom_field_name, cf.type as custom_field_type, cf.options as custom_field_options
           FROM scoring_profile_fields spf
           LEFT JOIN custom_fields cf ON spf.custom_field_id = cf.id
           WHERE spf.rule_id = ?`
        ).bind(rule.id).all();

        // Parse answer_scores JSON string -> object
        const parsedFields = (fields || []).map((f: any) => ({
          ...f,
          answer_scores: (() => {
            try { return f.answer_scores ? JSON.parse(f.answer_scores) : {}; }
            catch { return {}; }
          })(),
        }));

        return { ...rule, is_active: rule.is_active === 1, fields: parsedFields };
      })
    );

    return c.json(rulesWithFields);
  } catch (error: any) {
    console.error('Error loading profile rules:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

scoringRoutes.post('/scoring/profile-rules', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);

    await c.env.DB.prepare(
      'INSERT INTO scoring_profile_rules (id, account_id, name, description, is_active) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, account_id, body.name, body.description || null, body.is_active !== false ? 1 : 0).run();

    return c.json({ id, name: body.name, is_active: true, fields: [] });
  } catch (error: any) {
    console.error('Error creating profile rule:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

scoringRoutes.put('/scoring/profile-rules/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);

    await c.env.DB.prepare(
      'UPDATE scoring_profile_rules SET name = ?, description = ?, is_active = ?, updated_at = datetime(\'now\') WHERE id = ? AND account_id = ?'
    ).bind(body.name, body.description || null, body.is_active !== false ? 1 : 0, id, account_id).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error updating profile rule:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

scoringRoutes.delete('/scoring/profile-rules/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM scoring_profile_rules WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting profile rule:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

scoringRoutes.post('/scoring/profile-rules/:id/fields', async (c) => {
  try {
    const ruleId = c.req.param('id');
    const body = await c.req.json();
    const fields = body.fields || [];
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const owned = await c.env.DB.prepare('SELECT id FROM scoring_profile_rules WHERE id = ? AND account_id = ?').bind(ruleId, account_id).first();
    if (!owned) return c.json({ error: 'Regra não encontrada.' }, 404);

    // Delete existing fields for this rule
    await c.env.DB.prepare('DELETE FROM scoring_profile_fields WHERE rule_id = ?').bind(ruleId).run();

    // Insert new fields using answer_scores JSON
    for (const field of fields) {
      if (field.custom_field_id) {
        const fieldId = crypto.randomUUID();
        const answerScores = field.answer_scores
          ? (typeof field.answer_scores === 'string' ? field.answer_scores : JSON.stringify(field.answer_scores))
          : '{}';
        await c.env.DB.prepare(
          'INSERT INTO scoring_profile_fields (id, rule_id, custom_field_id, weight_percentage, answer_scores) VALUES (?, ?, ?, ?, ?)'
        ).bind(
          fieldId,
          ruleId,
          field.custom_field_id,
          field.weight_percentage || 50,
          answerScores
        ).run();
      }
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error saving profile rule fields:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Interest Rules CRUD
scoringRoutes.get('/scoring/interest-rules', async (c) => {
  try {
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json([]);
    const { results: rules } = await c.env.DB.prepare(
      'SELECT * FROM scoring_interest_rules WHERE account_id = ? ORDER BY created_at DESC'
    ).bind(account_id).all();

    // Load conversions for each rule
    const rulesWithConversions = await Promise.all(
      (rules || []).map(async (rule: any) => {
        const { results: conversions } = await c.env.DB.prepare(
          'SELECT * FROM scoring_interest_conversions WHERE rule_id = ? ORDER BY created_at'
        ).bind(rule.id).all();

        return { ...rule, is_active: rule.is_active === 1, conversions: conversions || [] };
      })
    );

    return c.json(rulesWithConversions);
  } catch (error: any) {
    console.error('Error loading interest rules:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

scoringRoutes.post('/scoring/interest-rules', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);

    await c.env.DB.prepare(
      'INSERT INTO scoring_interest_rules (id, account_id, name, description, is_active) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, account_id, body.name, body.description || null, body.is_active !== false ? 1 : 0).run();

    return c.json({ id, name: body.name, is_active: true, conversions: [] });
  } catch (error: any) {
    console.error('Error creating interest rule:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

scoringRoutes.put('/scoring/interest-rules/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);

    await c.env.DB.prepare(
      'UPDATE scoring_interest_rules SET name = ?, description = ?, is_active = ?, updated_at = datetime(\'now\') WHERE id = ? AND account_id = ?'
    ).bind(body.name, body.description || null, body.is_active !== false ? 1 : 0, id, account_id).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error updating interest rule:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

scoringRoutes.delete('/scoring/interest-rules/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM scoring_interest_rules WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting interest rule:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

scoringRoutes.post('/scoring/interest-rules/:id/conversions', async (c) => {
  try {
    const ruleId = c.req.param('id');
    const body = await c.req.json();
    const conversions = body.conversions || [];
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const owned = await c.env.DB.prepare('SELECT id FROM scoring_interest_rules WHERE id = ? AND account_id = ?').bind(ruleId, account_id).first();
    if (!owned) return c.json({ error: 'Regra não encontrada.' }, 404);

    // Delete existing conversions for this rule
    await c.env.DB.prepare('DELETE FROM scoring_interest_conversions WHERE rule_id = ?').bind(ruleId).run();

    // Insert new conversions
    for (const conversion of conversions) {
      if (conversion.conversion_name) {
        const conversionId = crypto.randomUUID();
        await c.env.DB.prepare(
          'INSERT INTO scoring_interest_conversions (id, rule_id, conversion_name, points, event_type, event_ids) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(
          conversionId,
          ruleId,
          conversion.conversion_name,
          conversion.points || 10,
          conversion.event_type || 'form_submit',
          conversion.event_ids || '[]'
        ).run();
      }
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error saving interest rule conversions:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Get leads with scores
scoringRoutes.get('/scoring/leads', async (c) => {
  try {
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json([]);
    const { results: leads } = await c.env.DB.prepare(
      'SELECT id, title, contact_email, score_profile, score_interest, score_grade FROM leads WHERE account_id = ? ORDER BY (score_profile + score_interest) DESC'
    ).bind(account_id).all();

    return c.json(leads || []);
  } catch (error: any) {
    console.error('Error loading leads with scores:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Recalculate scores for all leads
scoringRoutes.post('/scoring/recalculate', async (c) => {
  try {
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);
    const result = await calculateLeadScore(c.env.DB, account_id);
    return c.json(result);
  } catch (error: any) {
    console.error('Error recalculating scores:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Scoring Stats Dashboard
scoringRoutes.get('/scoring/stats', async (c) => {
  try {
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json([]);
    const { results } = await c.env.DB.prepare(
      'SELECT score_grade, COUNT(id) as total, AVG(score_interest) as avg_interest FROM leads WHERE account_id = ? GROUP BY score_grade'
    ).bind(account_id).all();

    return c.json(results || []);
  } catch (error: any) {
    console.error('Error fetching scoring stats:', error);
    return c.json([], 200); // Return empty array even on error to prevent frontend crash
  }
});
