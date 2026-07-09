// Shared by leads, webhooks (incoming), tracking (events), and marketing-leads
// (sync-to-crm) route modules — each triggers automations at the point a lead
// event happens. Kept out of the automations domain module for that reason.

export async function executeActionNode(node: any, leadId: string, db: any) {
  const { nodeType, config } = node;

  switch (nodeType) {
    case 'move_stage':
      if (config.to_stage_id) {
        await db.prepare('UPDATE leads SET stage_id = ? WHERE id = ?').bind(config.to_stage_id, leadId).run();
      }
      break;
    case 'create_task':
      if (config.title) {
        const taskId = crypto.randomUUID();
        await db.prepare(
          'INSERT INTO tasks (id, lead_id, title, due_date, assigned_user_id) VALUES (?, ?, ?, ?, ?)'
        ).bind(taskId, leadId, config.title, config.due_date || null, config.assigned_user_id || null).run();
      }
      break;
    case 'add_tag':
      if (config.tag) {
        const lead: any = await db.prepare('SELECT tags FROM leads WHERE id = ?').bind(leadId).first();
        const tags = lead.tags ? lead.tags.split(',').filter(Boolean) : [];
        if (!tags.includes(config.tag)) {
          tags.push(config.tag);
          await db.prepare('UPDATE leads SET tags = ? WHERE id = ?').bind(tags.join(','), leadId).run();
        }
      }
      break;
    case 'remove_tag':
      if (config.tag) {
        const lead: any = await db.prepare('SELECT tags FROM leads WHERE id = ?').bind(leadId).first();
        const tags = lead.tags ? lead.tags.split(',').filter((t: string) => t !== config.tag) : [];
        await db.prepare('UPDATE leads SET tags = ? WHERE id = ?').bind(tags.join(','), leadId).run();
      }
      break;
    case 'create_note':
      if (config.content) {
        const noteId = crypto.randomUUID();
        await db.prepare(
          'INSERT INTO notes (id, lead_id, content, author_name) VALUES (?, ?, ?, ?)'
        ).bind(noteId, leadId, config.content, 'Automação').run();
      }
      break;
    case 'assign_user':
      if (config.user_id) {
        await db.prepare('UPDATE leads SET assigned_user_id = ? WHERE id = ?').bind(config.user_id, leadId).run();
      }
      break;
    case 'send_webhook':
      if (config.url) {
        try {
          await fetch(config.url, {
            method: config.method || 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead_id: leadId, ...config })
          });
        } catch (e) { console.error('Webhook send error:', e); }
      }
      break;
    case 'send_to_crm': {
      const { funnel_id, stage_id } = config;
      if (!funnel_id || !stage_id) break;
      // Check if leadId refers to a marketing lead
      const mLead: any = await db.prepare('SELECT * FROM marketing_leads WHERE id = ?').bind(leadId).first();
      if (mLead) {
        if (mLead.synced_to_crm) break; // already sent
        const crmId = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO leads (id, account_id, funnel_id, stage_id, title, contact_name, contact_email, contact_phone, company, value, tags, custom_values, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          crmId, mLead.account_id, funnel_id, stage_id,
          mLead.title || mLead.contact_name || 'Lead Marketing',
          mLead.contact_name || null,
          mLead.contact_email || null,
          mLead.contact_phone || null,
          mLead.company || null,
          mLead.value || 0,
          mLead.tags || null,
          JSON.stringify({ source: 'marketing_automation', marketing_lead_id: leadId })
        ).run();
        await db.prepare('UPDATE marketing_leads SET synced_to_crm = 1 WHERE id = ?').bind(leadId).run();
      } else {
        // Already a CRM lead — move it to the specified funnel/stage
        await db.prepare('UPDATE leads SET funnel_id = ?, stage_id = ? WHERE id = ?').bind(funnel_id, stage_id, leadId).run();
      }
      break;
    }
    // send_email would require an email service integration
    default:
      console.log(`Unknown action type: ${nodeType}`);
  }
}

export async function triggerAutomations(accountId: string, triggerType: string, leadId: string, db: any, extraConfig?: { form_id?: string; url_pattern?: string }) {
  try {
    let { results: automations } = await db.prepare(
      "SELECT * FROM automations WHERE account_id = ? AND trigger_type = ? AND is_active = 1"
    ).bind(accountId, triggerType).all();

    // If triggerType is form_submit and form_id is provided, filter automations by form_id
    if (triggerType === 'form_submit' && extraConfig?.form_id) {
      automations = automations.filter((a: any) => {
        const triggerConfig = a.trigger_config ? JSON.parse(a.trigger_config) : {};
        // If automation has form_id filter, it must match; otherwise include it
        return !triggerConfig.form_id || triggerConfig.form_id === extraConfig.form_id;
      });
    }

    // If triggerType is page_visit and url_pattern is provided, filter automations by url_pattern
    if (triggerType === 'page_visit' && extraConfig?.url_pattern) {
      automations = automations.filter((a: any) => {
        const triggerConfig = a.trigger_config ? JSON.parse(a.trigger_config) : {};
        // If automation has url_pattern filter, check if URL matches; otherwise include it
        if (!triggerConfig.url_pattern) return true;
        return (extraConfig.url_pattern || '').includes(triggerConfig.url_pattern);
      });
    }

    for (const automation of automations) {
      if (!automation) continue;
      const nodes = automation.nodes ? JSON.parse(automation.nodes) : [];
      const connections = automation.connections ? JSON.parse(automation.connections) : [];

      const triggerNode = nodes.find(function(n: any) { return n.type === 'trigger'; });
      if (!triggerNode) continue;

      const executionId = crypto.randomUUID();
      await db.prepare(
        "INSERT INTO automation_executions (id, automation_id, lead_id, status) VALUES (?, ?, ?, 'running')"
      ).bind(executionId, automation.id, leadId).run();

      let currentId = triggerNode.id;
      const executed: string[] = [];

      while (currentId) {
        const connItem = connections.find(function(c: any) { return c.from === currentId; });
        if (!connItem) break;

        const nextNode = nodes.find(function(n: any) { return n.id === connItem.to; });
        if (!nextNode || executed.includes(nextNode.id)) break;

        executed.push(nextNode.id);

        if (nextNode.type === 'action' && leadId) {
          await executeActionNode(nextNode, leadId, db);
        }
        currentId = nextNode.id;
      }

      await db.prepare(
        "UPDATE automation_executions SET status = 'completed' WHERE id = ?"
      ).bind(executionId).run();
    }
  } catch (err: any) {
    console.error('[AUTOMATIONS] Trigger Error:', err.message);
  }
}
