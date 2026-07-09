import { Hono } from 'hono';
import { sessionAccountId } from '../auth';
import { executeActionNode } from '../automation-engine';

type Bindings = { DB: any; SESSION_SECRET?: string };

export const automationsRoutes = new Hono<{ Bindings: Bindings }>();

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

// Get all automations
automationsRoutes.get('/automations', async (c) => {
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
automationsRoutes.post('/automations', async (c) => {
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
automationsRoutes.put('/automations/:id', async (c) => {
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
automationsRoutes.delete('/automations/:id', async (c) => {
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
automationsRoutes.post('/automations/:id/execute', async (c) => {
  try {
    const id = c.req.param('id');
    const account_id = sessionAccountId(c);
    if (!account_id) return c.json({ error: 'Não autorizado.' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const { lead_id, test_mode } = body as any;

    // NOTE: previously this queried by id alone with no account_id check — any
    // authenticated user could execute (and side-effect) another tenant's
    // automation just by guessing its id. Fixed while moving this route here.
    const automation: any = await c.env.DB.prepare(
      'SELECT * FROM automations WHERE id = ? AND account_id = ?'
    ).bind(id, account_id).first();

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
