import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { app } from '../[[route]]';
import { createD1Shim, createTestDb } from './d1-test-shim';
import { hashPassword } from './auth';

// End-to-end tests against the real Hono app (functions/api/[[route]].ts), backed
// by an in-memory SQLite database instead of Cloudflare D1. These exist to lock in
// the security properties that were previously only checked by hand with curl:
// session requirement, cross-tenant isolation (IDOR), admin gating, and rate limits.

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SCHEMA_SQL = readFileSync(join(__dirname, '../../../schema.sql'), 'utf-8');
const SESSION_SECRET = 'test-secret-do-not-use-in-prod';

function makeEnv() {
  const sqlite = createTestDb();
  sqlite.exec(SCHEMA_SQL);
  return { DB: createD1Shim(sqlite), SESSION_SECRET };
}

function cookieFrom(res: Response): string {
  const setCookie = res.headers.get('set-cookie') || '';
  return setCookie.split(';')[0];
}

async function seedAccountWithUser(env: any, accountId: string, userId: string, email: string, password: string, role = 'ACCOUNT_ADMIN') {
  await env.DB.prepare(
    `INSERT INTO accounts (id, company_name, owner_name, email, status, plan) VALUES (?, ?, ?, ?, 'active', 'pro')`
  ).bind(accountId, accountId, accountId, email).run();
  const hashed = await hashPassword(password);
  await env.DB.prepare(
    `INSERT INTO users (id, account_id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?, 'active')`
  ).bind(userId, accountId, userId, email, hashed, role).run();
}

async function login(env: any, email: string, password: string): Promise<string> {
  const res = await app.request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }, env);
  expect(res.status).toBe(200);
  return cookieFrom(res);
}

describe('session requirement', () => {
  let env: any;
  beforeEach(() => { env = makeEnv(); });

  it('rejects tenant CRUD routes with no session', async () => {
    const res = await app.request('/api/leads', {}, env);
    expect(res.status).toBe(401);
  });

  it('rejects admin routes with no session', async () => {
    const res = await app.request('/api/admin/accounts', {}, env);
    expect(res.status).toBe(401);
  });

  it('allows public routes with no session', async () => {
    const res = await app.request('/api/global-settings', {}, env);
    expect(res.status).toBe(200);
  });

  it('allows a valid session to reach tenant CRUD routes', async () => {
    await seedAccountWithUser(env, 'acc_a', 'u_a', 'a@example.com', 'password123');
    const cookie = await login(env, 'a@example.com', 'password123');
    const res = await app.request('/api/leads', { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(200);
  });
});

describe('cross-tenant isolation (IDOR)', () => {
  let env: any;
  let cookieA: string;
  let cookieB: string;
  let leadId: string;

  beforeEach(async () => {
    env = makeEnv();
    await seedAccountWithUser(env, 'acc_a', 'u_a', 'a@example.com', 'password123');
    await seedAccountWithUser(env, 'acc_b', 'u_b', 'b@example.com', 'password456');
    cookieA = await login(env, 'a@example.com', 'password123');
    cookieB = await login(env, 'b@example.com', 'password456');

    await env.DB.prepare(`INSERT INTO funnels (id, account_id, name) VALUES ('f_a', 'acc_a', 'Funil A')`).run();
    await env.DB.prepare(`INSERT INTO stages (id, funnel_id, name, "order") VALUES ('s_a', 'f_a', 'Novo', 0)`).run();

    const createRes = await app.request('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ title: 'Lead da conta A', funnel_id: 'f_a', stage_id: 's_a' }),
    }, env);
    expect(createRes.status).toBe(200);
    leadId = (await createRes.json()).id;
  });

  it('lets the owner read their own lead', async () => {
    const res = await app.request(`/api/leads/${leadId}`, { headers: { Cookie: cookieA } }, env);
    expect(res.status).toBe(200);
  });

  it('blocks a different tenant from reading the lead by id', async () => {
    const res = await app.request(`/api/leads/${leadId}`, { headers: { Cookie: cookieB } }, env);
    expect(res.status).toBe(404);
  });

  it('blocks a different tenant from updating the lead by id', async () => {
    await app.request(`/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieB },
      body: JSON.stringify({ title: 'Sequestrado pela conta B' }),
    }, env);

    const check = await app.request(`/api/leads/${leadId}`, { headers: { Cookie: cookieA } }, env);
    const lead = await check.json();
    expect(lead.title).toBe('Lead da conta A');
  });

  it('blocks a different tenant from deleting the lead by id', async () => {
    await app.request(`/api/leads/${leadId}`, { method: 'DELETE', headers: { Cookie: cookieB } }, env);

    const check = await app.request(`/api/leads/${leadId}`, { headers: { Cookie: cookieA } }, env);
    expect(check.status).toBe(200);
  });

  it("does not leak account A's leads into account B's list", async () => {
    const res = await app.request('/api/leads', { headers: { Cookie: cookieB } }, env);
    const leads = await res.json();
    expect(leads.find((l: any) => l.id === leadId)).toBeUndefined();
  });
});

describe('admin gating', () => {
  let env: any;

  beforeEach(async () => {
    env = makeEnv();
    await seedAccountWithUser(env, 'acc_nexus', 'u_nexus', 'admin@nexus.com', 'adminpass', 'NEXUS_ADMIN');
    await seedAccountWithUser(env, 'acc_a', 'u_a', 'a@example.com', 'password123');
  });

  it('lets a NEXUS_ADMIN session reach /api/admin/*', async () => {
    const cookie = await login(env, 'admin@nexus.com', 'adminpass');
    const res = await app.request('/api/admin/accounts', { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(200);
  });

  it('rejects a regular tenant session on /api/admin/*', async () => {
    const cookie = await login(env, 'a@example.com', 'password123');
    const res = await app.request('/api/admin/accounts', { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(403);
  });
});

describe('legacy plaintext password migration', () => {
  it('upgrades a plaintext password to a hash on first successful login', async () => {
    const env = makeEnv();
    await env.DB.prepare(
      `INSERT INTO accounts (id, company_name, owner_name, email, status, plan) VALUES ('acc_legacy', 'Legacy', 'Legacy', 'legacy@example.com', 'active', 'pro')`
    ).run();
    await env.DB.prepare(
      `INSERT INTO users (id, account_id, name, email, password, role, status) VALUES ('u_legacy', 'acc_legacy', 'Legacy', 'legacy@example.com', 'plaintext123', 'ACCOUNT_ADMIN', 'active')`
    ).run();

    const cookie = await login(env, 'legacy@example.com', 'plaintext123');
    expect(cookie).toContain('nexus_session=');

    const row: any = await env.DB.prepare('SELECT password FROM users WHERE id = ?').bind('u_legacy').first();
    expect(row.password.startsWith('pbkdf2$')).toBe(true);

    // the same plaintext password must still work against the now-hashed value
    const second = await app.request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'legacy@example.com', password: 'plaintext123' }),
    }, env);
    expect(second.status).toBe(200);
  });
});

describe('login rate limiting', () => {
  it('blocks an IP after repeated failed login attempts', async () => {
    const env = makeEnv();
    await seedAccountWithUser(env, 'acc_a', 'u_a', 'a@example.com', 'password123');

    let lastStatus = 0;
    for (let i = 0; i < 16; i++) {
      const res = await app.request('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'a@example.com', password: 'wrong-password' }),
      }, env);
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);

    // even the correct password is now rate-limited for this IP
    const res = await app.request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', password: 'password123' }),
    }, env);
    expect(res.status).toBe(429);
  });
});
