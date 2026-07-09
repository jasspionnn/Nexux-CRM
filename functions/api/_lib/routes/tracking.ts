import { Hono } from 'hono';
import { sessionAccountId } from '../auth';
import { triggerAutomations } from '../automation-engine';

type Bindings = { DB: any; SESSION_SECRET?: string };

export const trackingRoutes = new Hono<{ Bindings: Bindings }>();

function detectFieldName(name: string): string {
  const lk = name.toLowerCase();
  if (lk.includes('email') || lk.includes('mail')) return 'email';
  if (lk.includes('phone') || lk.includes('tel') || lk.includes('whatsapp') || lk.includes('celular')) return 'phone';
  if (lk.includes('name') || lk.includes('nome')) return 'name';
  if (lk.includes('company') || lk.includes('empresa')) return 'company';
  return 'text';
}

// Simple test endpoint to verify tracking is reachable
trackingRoutes.get('/tracking/test', async (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  return c.json({ ok: true, message: 'Tracking endpoint is reachable', timestamp: new Date().toISOString() });
});

// Get tracking settings for current account
trackingRoutes.get('/tracking', async (c) => {
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
trackingRoutes.post('/tracking/regenerate', async (c) => {
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
trackingRoutes.get('/tracking/events', async (c) => {
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
trackingRoutes.options('/tracking/events', async (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  });
});

trackingRoutes.post('/tracking/events', async (c) => {
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
trackingRoutes.get('/tracking/stats', async (c) => {
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

// Tracking forms (config for the auto-registered forms above)
trackingRoutes.get('/tracking-forms', async (c) => {
  try {
    const accountId = sessionAccountId(c);
    if (!accountId) return c.json([]);
    const { results } = await c.env.DB.prepare('SELECT * FROM tracking_forms WHERE account_id = ? ORDER BY created_at DESC').bind(accountId).all();
    return c.json(results.map((f: any) => ({ ...f, fields: f.fields ? JSON.parse(f.fields) : [], field_mapping: f.field_mapping ? JSON.parse(f.field_mapping) : {} })));
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});

trackingRoutes.post('/tracking-forms', async (c) => {
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

trackingRoutes.put('/tracking-forms/:id', async (c) => {
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

trackingRoutes.delete('/tracking-forms/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    await c.env.DB.prepare('DELETE FROM tracking_forms WHERE id = ? AND account_id = ?').bind(id, account_id).run();
    return c.json({ success: true });
  } catch (error: any) { console.error(error); return c.json({ error: 'Erro interno no servidor.' }, 500); }
});
