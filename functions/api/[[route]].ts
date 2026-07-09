import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { getCookie } from 'hono/cookie';
import {
  clearSession,
  requireNexusAdmin,
  isPublicRoute,
  sessionAccountId,
  verifySessionToken,
  SESSION_COOKIE,
} from './_lib/auth';
import { calculateLeadScore } from './_lib/scoring-engine';
import { triggerAutomations, executeActionNode } from './_lib/automation-engine';
import { buildSegmentQuery } from './_lib/segment-query';
import { funnelsRoutes } from './_lib/routes/funnels';
import { customFieldsRoutes } from './_lib/routes/custom-fields';
import { webhooksRoutes } from './_lib/routes/webhooks';
import { notificationsRoutes } from './_lib/routes/notifications';
import { usersTeamsRoutes } from './_lib/routes/users-teams';
import { leadsRoutes } from './_lib/routes/leads';
import { authPublicRoutes } from './_lib/routes/auth-public';
import { adminRoutes } from './_lib/routes/admin';

type Bindings = {
  DB: any; // Using any for D1Database to avoid type errors if @cloudflare/workers-types is not fully configured
  SESSION_SECRET?: string;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

app.use('*', async (c: any, next: any) => {
  if (isPublicRoute(c.req.method, c.req.path)) return next();
  const secret = c.env.SESSION_SECRET;
  if (!secret) return c.json({ error: 'Autenticação não configurada no servidor.' }, 500);
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ error: 'Não autenticado.' }, 401);
  const payload = await verifySessionToken(token, secret);
  if (!payload) {
    clearSession(c);
    return c.json({ error: 'Sessão inválida ou expirada.' }, 401);
  }
  c.set('authUser', payload);
  await next();
});

app.use('/admin/*', requireNexusAdmin);

// Safety net for the handful of routes with no try/catch of their own (an uncaught
// exception used to fall through to Hono's default error page). Never leaks
// error.message/stack to the client — only logs it server-side.
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Erro interno no servidor.' }, 500);
});

// Domain routers — each mounted at '/' so their own route paths (already
// matching the real /api/... URLs, since this app has basePath('/api')) are
// used as-is. See functions/api/_lib/routes/*.
app.route('/', funnelsRoutes);
app.route('/', customFieldsRoutes);
app.route('/', webhooksRoutes);
app.route('/', notificationsRoutes);
app.route('/', usersTeamsRoutes);
app.route('/', leadsRoutes);
app.route('/', authPublicRoutes);
app.route('/', adminRoutes);

// NOTE: /debug-schema and /debug-db were removed — they dumped full table contents
// (including plaintext passwords from `users`) to any unauthenticated caller.

// ==================== TRACKING ENDPOINTS ====================

function detectFieldName(name: string): string {
  const lk = name.toLowerCase();
  if (lk.includes('email') || lk.includes('mail')) return 'email';
  if (lk.includes('phone') || lk.includes('tel') || lk.includes('whatsapp') || lk.includes('celular')) return 'phone';
  if (lk.includes('name') || lk.includes('nome')) return 'name';
  if (lk.includes('company') || lk.includes('empresa')) return 'company';
  return 'text';
}

// CORS headers for all tracking endpoints
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Simple test endpoint to verify tracking is reachable
app.get('/tracking/test', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  return c.json({ ok: true, message: 'Tracking endpoint is reachable', timestamp: new Date().toISOString() });
});

// Get tracking settings for current account
app.get('/tracking', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json({});

    let settings = await c.env.DB.prepare(
      'SELECT * FROM tracking_settings WHERE account_id = ?'
    ).bind(accountId).first();

    // Create tracking_id if not exists
    if (!settings) {
      const trackingId = 'trk_' + crypto.randomUUID().substring(0, 12);
      await c.env.DB.prepare(
        'INSERT INTO tracking_settings (account_id, tracking_id) VALUES (?, ?)'
      ).bind(accountId, trackingId).run();
      settings = { account_id: accountId, tracking_id: trackingId };
    }

    return c.json(settings);
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Regenerate tracking ID
app.post('/tracking/regenerate', async (c) => {
  try {
    const body = await c.req.json();
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json({ error: 'account_id is required' }, 400);

    const newTrackingId = 'trk_' + crypto.randomUUID().substring(0, 12);

    await c.env.DB.prepare(
      'INSERT INTO tracking_settings (account_id, tracking_id) VALUES (?, ?) ON CONFLICT(account_id) DO UPDATE SET tracking_id = ?'
    ).bind(accountId, newTrackingId, newTrackingId).run();

    return c.json({ tracking_id: newTrackingId });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Get tracking events
app.get('/tracking/events', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const eventType = c.req.query('event_type');
    const limit = parseInt(c.req.query('limit') || '100');

    let query = 'SELECT * FROM tracking_events WHERE account_id = ?';
    const params: any[] = [accountId];

    if (eventType) {
      query += ' AND event_type = ?';
      params.push(eventType);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const result = await c.env.DB.prepare(query).bind(...params).all();
    return c.json(result.results);
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Public endpoint to receive tracking events from external sites
// OPTIONS preflight - must return headers directly in Response
app.options('/tracking/events', async (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  });
});

app.post('/tracking/events', async (c) => {
  try {
    let body;
    try {
      body = await c.req.json();
    } catch (e) {
      // Fallback: parse as text then JSON (for fetch without Content-Type header)
      const text = await c.req.text();
      try { body = JSON.parse(text); } catch (e2) {
        console.error('[TRACKING] Failed to parse body');
        return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400 });
      }
    }

    console.log('[TRACKING] Received body:', JSON.stringify(body).substring(0, 500));

    const { tracking_id, event_type, url, referrer, form_data, visitor_id } = body;
    console.log('[TRACKING] event_type:', event_type, 'form_data:', JSON.stringify(form_data));

    if (!tracking_id) {
      console.error('[TRACKING] Missing tracking_id');
      return new Response(JSON.stringify({ error: 'Missing tracking_id' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    if (!event_type) {
      console.error('[TRACKING] Missing event_type');
      return new Response(JSON.stringify({ error: 'Missing event_type' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Find account by tracking_id
    const settings: any = await c.env.DB.prepare(
      'SELECT account_id FROM tracking_settings WHERE tracking_id = ?'
    ).bind(tracking_id).first();

    if (!settings) {
      console.error('[TRACKING] Invalid tracking_id:', tracking_id);
      return new Response(JSON.stringify({ error: 'Invalid tracking_id: ' + tracking_id }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    console.log('[TRACKING] Found account:', settings.account_id);

    const eventId = 'evt_' + crypto.randomUUID().substring(0, 12);

    let formDataStr = null;
    if (form_data) {
      formDataStr = typeof form_data === 'string' ? form_data : JSON.stringify(form_data);
    }

    await c.env.DB.prepare(
      'INSERT INTO tracking_events (id, account_id, tracking_id, event_type, url, referrer, form_data, visitor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      eventId,
      settings.account_id,
      tracking_id,
      event_type,
      url || null,
      referrer || null,
      formDataStr,
      visitor_id || null
    ).run();

    console.log('[TRACKING] Event saved:', eventId);

    // Handle pageview: if visitor_id is mapped to a lead, save in lead_visits and trigger automations
    try {
      if (event_type === 'pageview' && visitor_id) {
        const { results: mappedLeads } = await c.env.DB.prepare(
          'SELECT lead_id FROM visitor_leads WHERE visitor_id = ? AND account_id = ?'
        ).bind(visitor_id, settings.account_id).all();

        if (mappedLeads && mappedLeads.length > 0) {
          for (const ml of mappedLeads as any[]) {
            const visitId = crypto.randomUUID();
            await c.env.DB.prepare(
              'UPDATE visitor_leads SET last_seen = datetime(\'now\') WHERE visitor_id = ? AND account_id = ?'
            ).bind(visitor_id, settings.account_id).run();

            await c.env.DB.prepare(
              'INSERT INTO lead_visits (id, account_id, lead_id, visitor_id, url, referrer, title) VALUES (?, ?, ?, ?, ?, ?, ?)'
            ).bind(visitId, settings.account_id, ml.lead_id, visitor_id, url || null, referrer || null, body.page_title || body.title || null).run();

            // Trigger page_visit automation
            await triggerAutomations(settings.account_id, 'page_visit', ml.lead_id, c.env.DB, { url_pattern: url });
          }
        }
      }
    } catch (pvErr: any) {
      console.error('[TRACKING] Pageview handling error:', pvErr.message);
    }

    // Auto-register form if event has form_data
    try {
      var formData = body.form_data;
      if (!formData && event_type === 'conversion' && body.data && typeof body.data === 'object') {
        var d = body.data;
        if (d.fields && typeof d.fields === 'object') {
          formData = { fid: d.fid || (body.event_name || 'unknown_form'), action: url || '', fields: d.fields, has_lead: d.has_lead || false };
        } else if (d.email || d.nome || d.name || d.phone || d.cpf) {
          formData = { fid: body.event_name || 'unknown_form', action: url || '', fields: d, has_lead: true };
        }
      }

      if (formData && formData.fid) {
        const formName = typeof formData.fid === 'string' ? formData.fid.trim() : String(formData.fid).trim();
        const fields = formData.fields || {};
        const fieldNames = Object.keys(fields).map(k => ({ name: k, type: detectFieldName(k) }));

        // Check if form already exists by EXACT name match
        const existing: any = await c.env.DB.prepare(
          'SELECT id, field_mapping FROM tracking_forms WHERE account_id = ? AND name = ?'
        ).bind(settings.account_id, formName).first();

        if (!existing && fieldNames.length > 0) {
          try {
            await c.env.DB.prepare(
              'INSERT INTO tracking_forms (id, account_id, name, url_pattern, form_selector, fields, field_mapping, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
            ).bind(
              crypto.randomUUID(),
              settings.account_id,
              formName,
              (url || null),
              null,
              JSON.stringify(fieldNames),
              JSON.stringify({})
            ).run();
            console.log('[TRACKING] Auto-registered form:', formName);
          } catch (dbErr: any) {
            if (dbErr.message && dbErr.message.includes('UNIQUE')) {
              console.log('[TRACKING] Form already exists (unique constraint):', formName);
            } else {
              console.error('[TRACKING] DB error registering form:', dbErr.message);
            }
          }
        } else if (existing) {
          console.log('[TRACKING] Form already exists:', formName, '(skipping)');

          // If form has field_mapping, check for EMAIL before creating marketing lead
          if (existing.field_mapping) {
            try {
              var mapping = typeof existing.field_mapping === 'string' ? JSON.parse(existing.field_mapping) : existing.field_mapping;
              var mappedData: any = {};
              var hasEmail = false;
              for (var fieldName in fields) {
                if (mapping[fieldName] && mapping[fieldName]) {
                  mappedData[mapping[fieldName]] = fields[fieldName];
                  if (mapping[fieldName] === 'contact_email' && fields[fieldName]) hasEmail = true;
                }
              }

              // EMAIL IS REQUIRED - skip if no email
              if (!hasEmail) {
                console.log('[TRACKING] Skipped marketing lead (no email):', formName);
              } else {
                // Normalize email for consistent matching
                const normalizedEmail = String(mappedData.contact_email).trim().toLowerCase();

                // PREVENT DUPLICATES: Check if marketing lead already exists by email (case-insensitive)
                const existingMLead: any = await c.env.DB.prepare(
                  'SELECT id, raw_data FROM marketing_leads WHERE account_id = ? AND LOWER(contact_email) = ?'
                ).bind(settings.account_id, normalizedEmail).first();

                let mLeadId = existingMLead ? existingMLead.id : crypto.randomUUID();
                
                // Merge new fields into existing raw_data
                let rawData = {};
                if (existingMLead && existingMLead.raw_data) {
                  try { rawData = typeof existingMLead.raw_data === 'string' ? JSON.parse(existingMLead.raw_data) : existingMLead.raw_data; } catch {}
                }
                const updatedRawData = { ...rawData, ...fields };

                if (existingMLead) {
                  // Update existing marketing lead with new data (KEEP CONTACT UNIQUE)
                  await c.env.DB.prepare(
                    'UPDATE marketing_leads SET form_name = ?, contact_name = COALESCE(?, contact_name), contact_phone = COALESCE(?, contact_phone), company = COALESCE(?, company), title = COALESCE(?, title), value = ?, tags = COALESCE(?, tags), raw_data = ?, created_at = datetime(\'now\') WHERE id = ?'
                  ).bind(
                    formName,
                    mappedData.contact_name || null,
                    mappedData.contact_phone || null,
                    mappedData.company || null,
                    mappedData.title || null,
                    mappedData.value ? parseFloat(mappedData.value) : 0,
                    mappedData.tags || null,
                    JSON.stringify(updatedRawData),
                    mLeadId
                  ).run();
                  console.log('[TRACKING] Updated existing marketing lead (contact):', mLeadId);
                } else {
                  // Insert new marketing lead
                  await c.env.DB.prepare(
                    'INSERT INTO marketing_leads (id, account_id, form_name, contact_name, contact_email, contact_phone, company, title, value, tags, raw_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                  ).bind(
                    mLeadId,
                    settings.account_id,
                    formName,
                    mappedData.contact_name || null,
                    normalizedEmail,
                    mappedData.contact_phone || null,
                    mappedData.company || null,
                    mappedData.title || null,
                    mappedData.value ? parseFloat(mappedData.value) : 0,
                    mappedData.tags || null,
                    JSON.stringify(updatedRawData)
                  ).run();
                  console.log('[TRACKING] Created new marketing lead (contact):', mLeadId);
                }

                // Record form submission for segmentation (linked to marketing lead, not CRM)
                try {
                  const fsId = crypto.randomUUID();
                  const canonicalFormId = existing ? existing.id : (formData.fid || formName);
                  await c.env.DB.prepare(
                    'INSERT INTO form_submissions (id, account_id, form_id, lead_id, visitor_id, email, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
                  ).bind(
                    fsId, settings.account_id,
                    canonicalFormId,
                    mLeadId, visitor_id || null,
                    mappedData.contact_email || null,
                    JSON.stringify(fields)
                  ).run();
                } catch (fsErr) {
                  console.error('[TRACKING] Error recording form submission:', fsErr.message);
                }

                // Map visitor_id → marketing lead for future pageview tracking
                if (visitor_id) {
                  try {
                    const vlId = crypto.randomUUID();
                    await c.env.DB.prepare(
                      'INSERT OR IGNORE INTO visitor_leads (id, account_id, visitor_id, lead_id, email, source) VALUES (?, ?, ?, ?, ?, ?)'
                    ).bind(vlId, settings.account_id, visitor_id, mLeadId, mappedData.contact_email || null, 'form_submit').run();
                  } catch (vlErr) { /* visitor_leads table may not exist yet */ }
                }

                // Trigger form_submit automations using marketing lead ID
                // Automations can include the "send_to_crm" action to forward the lead to a CRM funnel
                try {
                  const formId = formData.fid || formName;
                  await triggerAutomations(settings.account_id, 'form_submit', mLeadId, c.env.DB, { form_id: formId });
                } catch (autoErr: any) {
                  console.error('[TRACKING] Error triggering automations:', autoErr.message);
                }
              }
            } catch (leadErr: any) {
              console.error('[TRACKING] Error creating marketing lead:', leadErr.message);
            }
          }
        }
      }
    } catch (e: any) {
      console.error('[TRACKING] Auto-register form error:', e.message);
    }

    return new Response(JSON.stringify({ success: true, id: eventId }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('[TRACKING] Error:', error.message);
    return new Response(JSON.stringify({ error: 'Erro interno no servidor.' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

// Get tracking stats (counts by event type)
app.get('/tracking/stats', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json({});

    const pageviews = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM tracking_events WHERE account_id = ? AND event_type = 'pageview'"
    ).bind(accountId).first() as any;

    const forms = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM tracking_events WHERE account_id = ? AND event_type = 'form'"
    ).bind(accountId).first() as any;

    const conversions = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM tracking_events WHERE account_id = ? AND event_type = 'conversion'"
    ).bind(accountId).first() as any;

    return c.json({
      pageviews: pageviews?.count || 0,
      forms: forms?.count || 0,
      conversions: conversions?.count || 0
    });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// ==================== TRACKING FORMS ENDPOINTS ====================

app.get('/tracking-forms', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare('SELECT * FROM tracking_forms WHERE account_id = ? ORDER BY created_at DESC').bind(accountId).all();
    return c.json(results.map((f: any) => ({ ...f, fields: f.fields ? JSON.parse(f.fields) : [], field_mapping: f.field_mapping ? JSON.parse(f.field_mapping) : {} })));
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.post('/tracking-forms', async (c) => {
  try {
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);
    const { name, url_pattern, form_selector, fields, field_mapping, is_active } = body;
    if (!name) return c.json({ error: 'name is required' }, 400);
    const id = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO tracking_forms (id, account_id, name, url_pattern, form_selector, fields, field_mapping, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, account_id, name, url_pattern || null, form_selector || null, JSON.stringify(fields || []), JSON.stringify(field_mapping || {}), is_active ?? 1).run();
    return c.json({ id, name, url_pattern, form_selector, fields: fields || [], field_mapping: field_mapping || {}, is_active: is_active ?? 1 });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.put('/tracking-forms/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const { name, url_pattern, form_selector, fields, field_mapping, is_active } = body;
    await c.env.DB.prepare('UPDATE tracking_forms SET name = ?, url_pattern = ?, form_selector = ?, fields = ?, field_mapping = ?, is_active = ? WHERE id = ? AND account_id = ?')
      .bind(name, url_pattern || null, form_selector || null, JSON.stringify(fields || []), JSON.stringify(field_mapping || {}), is_active ?? 1, id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.delete('/tracking-forms/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM tracking_forms WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// ==================== MARKETING CUSTOM FIELDS & MAPPING ====================

app.get('/marketing/custom-fields', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare('SELECT * FROM marketing_custom_fields WHERE account_id = ? ORDER BY created_at DESC').bind(accountId).all();
    return c.json(results);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.post('/marketing/custom-fields', async (c) => {
  try {
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);
    const { name, type, options } = body;
    const id = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO marketing_custom_fields (id, account_id, name, type, options) VALUES (?, ?, ?, ?, ?)')
      .bind(id, account_id, name, type, options || null).run();
    return c.json({ id, name, type, options });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.put('/marketing/custom-fields/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const { name, type, options } = body;
    await c.env.DB.prepare('UPDATE marketing_custom_fields SET name = ?, type = ?, options = ? WHERE id = ? AND account_id = ?')
      .bind(name, type, options || null, id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.delete('/marketing/custom-fields/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM marketing_custom_fields WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.get('/marketing/field-mappings', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare('SELECT * FROM marketing_crm_mappings WHERE account_id = ?').bind(accountId).all();
    return c.json(results);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.post('/marketing/field-mappings', async (c) => {
  try {
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);
    const { mappings } = body;
    
    await c.env.DB.prepare('DELETE FROM marketing_crm_mappings WHERE account_id = ?').bind(account_id).run();
    
    if (Array.isArray(mappings) && mappings.length > 0) {
      for (const m of mappings) {
        const id = crypto.randomUUID();
        await c.env.DB.prepare('INSERT INTO marketing_crm_mappings (id, account_id, marketing_field_id, crm_field_id, marketing_standard_field, crm_standard_field) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(id, account_id, m.marketing_field_id || null, m.crm_field_id || null, m.marketing_standard_field || null, m.crm_standard_field || null).run();
      }
    }
    
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// ==================== MARKETING LEADS ENDPOINTS ====================

app.get('/marketing-leads', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM marketing_leads WHERE account_id = ? ORDER BY created_at DESC LIMIT 500'
    ).bind(accountId).all();
    return c.json(results);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.post('/marketing-leads/sync-to-crm', async (c) => {
  try {
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);
    const { lead_ids } = body;

    let synced = 0;
    let skipped = 0;
    for (const leadId of lead_ids) {
      const mLead: any = await c.env.DB.prepare(
        'SELECT * FROM marketing_leads WHERE id = ? AND account_id = ?'
      ).bind(leadId, account_id).first();
      if (!mLead || mLead.synced_to_crm) continue;

      // EMAIL IS REQUIRED to sync to CRM
      if (!mLead.contact_email) {
        console.log('[MARKETING LEADS] Skipped sync (no email):', mLead.form_name, mLead.id);
        skipped++;
        continue;
      }

      // Create NEW lead in CRM (Allowing multiple negotiations for the same contact)
      const crmId = crypto.randomUUID();
      await c.env.DB.prepare(
        'INSERT INTO leads (id, account_id, funnel_id, stage_id, title, company, value, contact_name, contact_email, contact_phone, tags, custom_values, created_at) VALUES (?, ?, (SELECT id FROM funnels WHERE account_id = ? LIMIT 1), (SELECT id FROM stages WHERE funnel_id = (SELECT id FROM funnels WHERE account_id = ? LIMIT 1) LIMIT 1), ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
      ).bind(
        crmId, account_id, account_id, account_id,
        mLead.title || mLead.contact_name || `Negociação: ${mLead.form_name}`,
        mLead.company || null,
        mLead.value || 0,
        mLead.contact_name || null,
        mLead.contact_email || null,
        mLead.contact_phone || null,
        mLead.tags || null,
        JSON.stringify({ source: 'marketing_form', form_name: mLead.form_name, raw: mLead.raw_data ? JSON.parse(mLead.raw_data) : null })
      ).run();

      await c.env.DB.prepare('UPDATE marketing_leads SET synced_to_crm = 1 WHERE id = ?').bind(leadId).run();

      // Trigger new_lead automation
      await triggerAutomations(account_id, 'new_lead', crmId, c.env.DB);

      synced++;
    }
    return c.json({ success: true, synced, skipped });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.delete('/marketing-leads/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM marketing_leads WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// ==================== BIO LINKS ENDPOINTS ====================

// Get all bio link pages for an account
app.get('/bio-links', async (c) => {
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
app.get('/bio-links/public/:slug', async (c) => {
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
app.post('/bio-links', async (c) => {
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
app.put('/bio-links/:id', async (c) => {
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
app.delete('/bio-links/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM bio_links WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// Track link click
app.post('/bio-links/:id/click', async (c) => {
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
app.get('/bio-links/:id/analytics', async (c) => {
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

// ==================== EMAIL MARKETING ENDPOINTS ====================

// --- Email Templates ---
app.get('/email-templates', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const type = c.req.query('type');
    const query = type ? 'SELECT * FROM email_templates WHERE account_id = ? AND type = ? ORDER BY created_at DESC' : 'SELECT * FROM email_templates WHERE account_id = ? ORDER BY created_at DESC';
    const { results } = await c.env.DB.prepare(query).bind(type ? [accountId, type] : [accountId]).all();
    return c.json(results);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.post('/email-templates', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json({ error: 'account_id is required' }, 400);
    await c.env.DB.prepare(
      'INSERT INTO email_templates (id, account_id, name, subject, body, type) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, accountId, body.name, body.subject, body.body, body.type || 'campaign').run();
    return c.json({ id, name: body.name, subject: body.subject, body: body.body, type: body.type || 'campaign' });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.put('/email-templates/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare(
      'UPDATE email_templates SET name = COALESCE(?, name), subject = COALESCE(?, subject), body = COALESCE(?, body), type = COALESCE(?, type), updated_at = datetime(\'now\') WHERE id = ? AND account_id = ?'
    ).bind(body.name, body.subject, body.body, body.type, id, account_id).run();
    const updated: any = await c.env.DB.prepare('SELECT * FROM email_templates WHERE id = ? AND account_id = ?').bind(id, account_id).first();
    return c.json(updated || { success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.delete('/email-templates/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM email_templates WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// --- Email Campaigns ---
app.get('/email-campaigns', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM email_campaigns WHERE account_id = ? ORDER BY created_at DESC'
    ).bind(accountId).all();
    return c.json(results.map((r: any) => ({ ...r, engaged_lead_ids: r.engaged_lead_ids ? JSON.parse(r.engaged_lead_ids) : [] })));
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.get('/email-campaigns/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const campaign: any = await c.env.DB.prepare('SELECT * FROM email_campaigns WHERE id = ? AND account_id = ?').bind(id, account_id).first();
    if (!campaign) return c.json({ error: 'Not found' }, 404);
    campaign.engaged_lead_ids = campaign.engaged_lead_ids ? JSON.parse(campaign.engaged_lead_ids) : [];
    // Get event breakdown
    const events: any = await c.env.DB.prepare(
      'SELECT event_type, COUNT(*) as count FROM email_events WHERE campaign_id = ? GROUP BY event_type'
    ).bind(id).all();
    campaign.event_breakdown = events.results;
    return c.json(campaign);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.post('/email-campaigns', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json({ error: 'account_id is required' }, 400);
    await c.env.DB.prepare(
      'INSERT INTO email_campaigns (id, account_id, name, segment_id, template_id, subject, body, status, scheduled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, accountId, body.name, body.segment_id || null, body.template_id || null, body.subject, body.body, body.status || 'draft', body.scheduled_at || null).run();
    const campaign: any = await c.env.DB.prepare('SELECT * FROM email_campaigns WHERE id = ?').bind(id).first();
    return c.json(campaign);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.put('/email-campaigns/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare(
      'UPDATE email_campaigns SET name = COALESCE(?, name), segment_id = COALESCE(?, segment_id), template_id = COALESCE(?, template_id), subject = COALESCE(?, subject), body = COALESCE(?, body), status = COALESCE(?, status), scheduled_at = COALESCE(?, scheduled_at), updated_at = datetime(\'now\') WHERE id = ? AND account_id = ?'
    ).bind(body.name, body.segment_id, body.template_id, body.subject, body.body, body.status, body.scheduled_at, id, account_id).run();
    const updated: any = await c.env.DB.prepare('SELECT * FROM email_campaigns WHERE id = ? AND account_id = ?').bind(id, account_id).first();
    return c.json(updated || { success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

app.delete('/email-campaigns/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM email_campaigns WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    await c.env.DB.prepare('DELETE FROM email_events WHERE campaign_id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// --- Send Campaign (simulate dispatch) ---
app.post('/email-campaigns/:id/send', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const campaign: any = await c.env.DB.prepare('SELECT * FROM email_campaigns WHERE id = ? AND account_id = ?').bind(id, account_id).first();
    if (!campaign) return c.json({ error: 'Campaign not found' }, 404);

    // Get leads from segment
    let leads: any[] = [];
    if (campaign.segment_id) {
      const segment: any = await c.env.DB.prepare('SELECT * FROM segments WHERE id = ?').bind(campaign.segment_id).first();
      if (segment) {
        const rules = segment.rules ? JSON.parse(segment.rules) : [];
        const campaignSegment: any = await c.env.DB.prepare('SELECT account_id FROM segments WHERE id = ?').bind(campaign.segment_id).first();
        if (campaignSegment) {
          const { whereClause, params } = await buildSegmentQuery(c.env.DB, campaignSegment.account_id, rules);
          const leadResults = await c.env.DB.prepare(`SELECT id, contact_email FROM leads WHERE ${whereClause}`).bind(...params).all();
          leads = leadResults.results || [];
        }
      }
    }

    // Filter leads with email
    const emailLeads = leads.filter(l => l.contact_email);
    const totalSent = emailLeads.length;

    // Update campaign status
    await c.env.DB.prepare(
      'UPDATE email_campaigns SET status = ?, total_sent = ?, sent_at = datetime(\'now\') WHERE id = ?'
    ).bind('sent', totalSent, id).run();

    // Create sent events
    for (const lead of emailLeads) {
      await c.env.DB.prepare(
        'INSERT INTO email_events (id, campaign_id, lead_id, lead_email, event_type) VALUES (?, ?, ?, ?, ?)'
      ).bind(crypto.randomUUID(), id, lead.id, lead.contact_email, 'sent').run();
    }

    return c.json({ success: true, total_sent: totalSent });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// --- Track Email Events (open, click, bounce) ---
app.post('/email-events/track', async (c) => {
  try {
    const body = await c.req.json();
    const { campaign_id, lead_id, lead_email, event_type, clicked_url } = body;

    await c.env.DB.prepare(
      'INSERT INTO email_events (id, campaign_id, lead_id, lead_email, event_type, clicked_url) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), campaign_id, lead_id || null, lead_email, event_type, clicked_url || null).run();

    // Update campaign counters
    const updates: Record<string, string> = {
      opened: 'total_opened',
      clicked: 'total_clicked',
      hard_bounce: 'total_hard_bounce',
      soft_bounce: 'total_soft_bounce',
    };
    if (updates[event_type]) {
      await c.env.DB.prepare(
        `UPDATE email_campaigns SET ${updates[event_type]} = ${updates[event_type]} + 1 WHERE id = ?`
      ).bind(campaign_id).run();
    }

    // Track engaged leads (opened or clicked)
    if (event_type === 'opened' || event_type === 'clicked') {
      const campaign: any = await c.env.DB.prepare('SELECT engaged_lead_ids FROM email_campaigns WHERE id = ?').bind(campaign_id).first();
      if (campaign) {
        const engaged = campaign.engaged_lead_ids ? JSON.parse(campaign.engaged_lead_ids) : [];
        if (lead_id && !engaged.includes(lead_id)) {
          engaged.push(lead_id);
          await c.env.DB.prepare(
            'UPDATE email_campaigns SET engaged_lead_ids = ? WHERE id = ?'
          ).bind(JSON.stringify(engaged), campaign_id).run();
        }
      }
    }

    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// --- Get Campaign Metrics ---
app.get('/email-campaigns/:id/metrics', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const campaign: any = await c.env.DB.prepare('SELECT * FROM email_campaigns WHERE id = ? AND account_id = ?').bind(id, account_id).first();
    if (!campaign) return c.json({ error: 'Not found' }, 404);

    const total = campaign.total_sent || 0;
    const metrics = {
      total_sent: total,
      total_opened: campaign.total_opened || 0,
      total_clicked: campaign.total_clicked || 0,
      total_hard_bounce: campaign.total_hard_bounce || 0,
      total_soft_bounce: campaign.total_soft_bounce || 0,
      open_rate: total > 0 ? ((campaign.total_opened || 0) / total * 100).toFixed(1) : 0,
      click_rate: total > 0 ? ((campaign.total_clicked || 0) / total * 100).toFixed(1) : 0,
      hard_bounce_rate: total > 0 ? ((campaign.total_hard_bounce || 0) / total * 100).toFixed(1) : 0,
      soft_bounce_rate: total > 0 ? ((campaign.total_soft_bounce || 0) / total * 100).toFixed(1) : 0,
      engaged_count: campaign.engaged_lead_ids ? JSON.parse(campaign.engaged_lead_ids).length : 0,
    };

    return c.json(metrics);
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

// ==================== SEGMENT ENDPOINTS ====================

// Get all segments
app.get('/segments', async (c) => {
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
app.post('/segments', async (c) => {
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
app.put('/segments/:id', async (c) => {
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
app.delete('/segments/:id', async (c) => {
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
app.post('/segments/preview', async (c) => {
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

// ==================== AUTOMATION ENDPOINTS ====================

// Get all automations
app.get('/automations', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM automations WHERE account_id = ? ORDER BY created_at DESC'
    ).bind(accountId).all();

    const automations = results.map((a: any) => ({
      ...a,
      nodes: a.nodes ? JSON.parse(a.nodes) : [],
      connections: a.connections ? JSON.parse(a.connections) : [],
      trigger_config: a.trigger_config ? JSON.parse(a.trigger_config) : {}
    }));

    return c.json(automations);
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Create automation
app.post('/automations', async (c) => {
  try {
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'account_id is required' }, 400);
    const { name, description, is_active, trigger_type, trigger_config, nodes, connections } = body;

    if (!name) return c.json({ error: 'name is required' }, 400);

    const id = crypto.randomUUID();

    await c.env.DB.prepare(
      'INSERT INTO automations (id, account_id, name, description, is_active, trigger_type, trigger_config, nodes, connections) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id, account_id, name, description || null, is_active ?? 1, trigger_type || '',
      JSON.stringify(trigger_config || {}),
      JSON.stringify(nodes || []),
      JSON.stringify(connections || [])
    ).run();

    return c.json({ id, name, description, is_active: is_active ?? 1, trigger_type: trigger_type || '', trigger_config: trigger_config || {}, nodes: nodes || [], connections: connections || [] });
  } catch (error: any) {
    console.error('Create automation error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Update automation
app.put('/automations/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const { name, description, is_active, trigger_type, trigger_config, nodes, connections } = body;

    await c.env.DB.prepare(
      'UPDATE automations SET name = ?, description = ?, is_active = ?, trigger_type = ?, trigger_config = ?, nodes = ?, connections = ?, updated_at = datetime(\'now\') WHERE id = ? AND account_id = ?'
    ).bind(
      name, description || null, is_active ?? 1, trigger_type || '',
      JSON.stringify(trigger_config || {}),
      JSON.stringify(nodes || []),
      JSON.stringify(connections || []),
      id, account_id
    ).run();

    return c.json({ success: true, id });
  } catch (error: any) {
    console.error('Update automation error:', error);
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Delete automation
app.delete('/automations/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM automations WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

// Execute automation manually / test mode
app.post('/automations/:id/execute', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const { lead_id, test_mode } = body as any;

    const automation: any = await c.env.DB.prepare(
      'SELECT * FROM automations WHERE id = ?'
    ).bind(id).first();

    if (!automation) return c.json({ error: 'Automação não encontrada' }, 404);

    const nodes = automation.nodes ? JSON.parse(automation.nodes) : [];
    const connections = automation.connections ? JSON.parse(automation.connections) : [];
    const triggerNode = nodes.find((n: any) => n.type === 'trigger');
    if (!triggerNode) return c.json({ error: 'Nenhum gatilho no fluxo' }, 400);

    let targetLeadId = lead_id;
    let testLeadName: string | null = null;
    let testLeadIsMarketing = false;

    // ── Test mode: create a disposable test lead ──────────────────────────
    if (test_mode) {
      const ts = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      testLeadName = `Lead Teste — ${ts}`;

      // For form_submit triggers, create a marketing lead (mirrors real flow)
      if (triggerNode.nodeType === 'form_submit') {
        testLeadIsMarketing = true;
        targetLeadId = crypto.randomUUID();
        await c.env.DB.prepare(`
          INSERT INTO marketing_leads (id, account_id, form_name, contact_name, contact_email, contact_phone, company, title, tags, raw_data)
          VALUES (?, ?, 'Teste', ?, 'teste@automacao.com', '(11) 99999-9999', 'Empresa Teste', ?, 'teste', '{}')
        `).bind(targetLeadId, automation.account_id, testLeadName, testLeadName).run();
      } else {
        // CRM lead for all other triggers
        const funnel: any = await c.env.DB.prepare(
          'SELECT id FROM funnels WHERE account_id = ? LIMIT 1'
        ).bind(automation.account_id).first();
        if (!funnel) return c.json({ error: 'Nenhum funil encontrado na conta' }, 400);
        const stage: any = await c.env.DB.prepare(
          'SELECT id FROM stages WHERE funnel_id = ? ORDER BY "order" ASC LIMIT 1'
        ).bind(funnel.id).first();
        if (!stage) return c.json({ error: 'Nenhuma etapa encontrada' }, 400);
        targetLeadId = crypto.randomUUID();
        await c.env.DB.prepare(`
          INSERT INTO leads (id, account_id, funnel_id, stage_id, title, contact_name, contact_email, contact_phone, company, tags, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'teste@automacao.com', '(11) 99999-9999', 'Empresa Teste', 'teste', datetime('now'))
        `).bind(targetLeadId, automation.account_id, funnel.id, stage.id, testLeadName, testLeadName).run();
      }
    }

    if (!targetLeadId) return c.json({ error: 'lead_id obrigatório' }, 400);

    const executionId = crypto.randomUUID();
    await c.env.DB.prepare(
      "INSERT INTO automation_executions (id, automation_id, lead_id, status) VALUES (?, ?, ?, 'running')"
    ).bind(executionId, id, targetLeadId).run();

    // ── Walk connections and execute nodes ────────────────────────────────
    let currentId = triggerNode.id;
    const executed: string[] = [];
    const nodeResults: any[] = [{
      id: triggerNode.id,
      type: 'trigger',
      nodeType: triggerNode.nodeType,
      label: triggerNode.label,
      status: 'ok',
      detail: test_mode ? `Lead de teste criado${testLeadIsMarketing ? ' (marketing)' : ''}` : 'Gatilho disparado',
    }];

    while (currentId) {
      const conn = connections.find((conn: any) => conn.from === currentId);
      if (!conn) break;
      const nextNode = nodes.find((n: any) => n.id === conn.to);
      if (!nextNode || executed.includes(nextNode.id)) break;
      executed.push(nextNode.id);

      const nr: any = { id: nextNode.id, type: nextNode.type, nodeType: nextNode.nodeType, label: nextNode.label, status: 'ok', detail: '' };
      try {
        if (nextNode.type === 'action') {
          await executeActionNode(nextNode, targetLeadId, c.env.DB);
          nr.detail = describeActionNode(nextNode);
        } else if (nextNode.type === 'condition') {
          nr.detail = 'Condição verificada';
        } else if (nextNode.type === 'delay') {
          nr.detail = `Aguardaria ${nextNode.config?.duration || 0} ${nextNode.config?.unit || 'minutos'} (pulado no teste)`;
        }
      } catch (err: any) {
        nr.status = 'error';
        nr.detail = err.message;
      }
      nodeResults.push(nr);
      currentId = nextNode.id;
    }

    await c.env.DB.prepare(
      "UPDATE automation_executions SET status = 'completed' WHERE id = ?"
    ).bind(executionId).run();

    return c.json({
      success: true,
      test_lead_id: test_mode ? targetLeadId : undefined,
      test_lead_name: test_mode ? testLeadName : undefined,
      test_lead_is_marketing: test_mode ? testLeadIsMarketing : undefined,
      node_results: nodeResults,
      execution_id: executionId,
    });
  } catch (error: any) {
    console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500);
  }
});

function describeActionNode(node: any): string {
  const { nodeType, config } = node;
  switch (nodeType) {
    case 'move_stage':    return `Moveu para etapa`;
    case 'create_task':   return `Criou tarefa: "${config?.title || '?'}"`;
    case 'add_tag':       return `Adicionou tag: "${config?.tag || '?'}"`;
    case 'remove_tag':    return `Removeu tag: "${config?.tag || '?'}"`;
    case 'create_note':   return `Criou nota`;
    case 'assign_user':   return `Atribuiu lead a usuário`;
    case 'send_webhook':  return `Enviou webhook para ${config?.url || '?'}`;
    case 'send_to_crm':   return `Enviou para CRM`;
    case 'send_email':    return `Enviaria email: "${config?.subject || '?'}"`;
    default:              return 'Ação executada';
  }
}

// NOTE: a duplicate, weaker `/login` handler (no status/account checks, plaintext
// comparison) used to live here. Hono only ever reached the first registration
// (see the real /login handler above), so this copy was dead code — removed.

// ========================================
// LEAD SCORING API
// ========================================

// Profile Rules CRUD
app.get('/scoring/profile-rules', async (c) => {
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

app.post('/scoring/profile-rules', async (c) => {
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

app.put('/scoring/profile-rules/:id', async (c) => {
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

app.delete('/scoring/profile-rules/:id', async (c) => {
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

app.post('/scoring/profile-rules/:id/fields', async (c) => {
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
app.get('/scoring/interest-rules', async (c) => {
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

app.post('/scoring/interest-rules', async (c) => {
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

app.put('/scoring/interest-rules/:id', async (c) => {
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

app.delete('/scoring/interest-rules/:id', async (c) => {
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

app.post('/scoring/interest-rules/:id/conversions', async (c) => {
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
app.get('/scoring/leads', async (c) => {
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
app.post('/scoring/recalculate', async (c) => {
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
app.get('/scoring/stats', async (c) => {
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

export { app };
export const onRequest = handle(app);
