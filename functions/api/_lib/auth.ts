import { getCookie, setCookie, deleteCookie } from 'hono/cookie';

// ==================== PASSWORD HASHING (Web Crypto — works in the Workers runtime) ====================
// Passwords used to be stored and compared in plaintext. New/changed passwords are now
// hashed with PBKDF2-SHA256. Existing plaintext passwords are transparently upgraded to a
// hash the next time their owner logs in successfully (see verifyAndUpgradePassword).
const PBKDF2_ITERATIONS = 100000;

function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  return Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function derivePbkdf2Hex(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' }, keyMaterial, 256);
  return bytesToHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hashHex = await derivePbkdf2Hex(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${hashHex}`;
}

export function isHashedPassword(stored: string): boolean {
  return typeof stored === 'string' && stored.startsWith('pbkdf2$');
}

// Verifies a password against a stored value that may be a legacy plaintext string
// or a `pbkdf2$iterations$salt$hash` string. Returns whether it matched, and — for
// legacy matches — a freshly hashed value the caller should persist immediately.
export async function verifyAndUpgradePassword(password: string, stored: string): Promise<{ valid: boolean; upgradedHash?: string }> {
  if (!stored) return { valid: false };
  if (!isHashedPassword(stored)) {
    const valid = timingSafeEqual(stored, password);
    return valid ? { valid: true, upgradedHash: await hashPassword(password) } : { valid: false };
  }
  const [, iterStr, saltHex, hashHex] = stored.split('$');
  const iterations = parseInt(iterStr, 10);
  const candidateHex = await derivePbkdf2Hex(password, hexToBytes(saltHex), iterations);
  return { valid: timingSafeEqual(candidateHex, hashHex) };
}

// ==================== SESSION (signed httpOnly cookie) ====================
// There used to be no session at all — the client's claimed role/account_id was
// trusted as-is. This issues a signed, expiring token on login and a middleware
// below verifies it before allowing access to the Nexus platform-admin routes.
export const SESSION_COOKIE = 'nexus_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  return new Uint8Array([...binary].map((c) => c.charCodeAt(0)));
}

async function getSessionSigningKey(secret: string) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export type SessionPayload = { sub: string; accountId: string | null; role: string; exp: number };

export async function createSessionToken(payload: SessionPayload, secret: string): Promise<string> {
  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await getSessionSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return `${body}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string, secret: string): Promise<SessionPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sigB64] = parts;
  const key = await getSessionSigningKey(secret);
  const valid = await crypto.subtle.verify('HMAC', key, base64UrlDecode(sigB64) as BufferSource, new TextEncoder().encode(body));
  if (!valid) return null;
  try {
    const payload: SessionPayload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body)));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function issueSession(c: any, user: { id: string; account_id: string | null; role: string }) {
  const secret = c.env.SESSION_SECRET;
  if (!secret) {
    console.error('[SESSION] SESSION_SECRET is not configured — no session cookie was issued.');
    return;
  }
  const token = await createSessionToken(
    { sub: user.id, accountId: user.account_id, role: user.role, exp: Date.now() + SESSION_TTL_MS },
    secret
  );
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSession(c: any) {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

// Guards every /admin/* route (the Nexus platform-admin surface). Fails closed:
// if SESSION_SECRET isn't configured, admin routes stay inaccessible rather than open.
export async function requireNexusAdmin(c: any, next: any) {
  const secret = c.env.SESSION_SECRET;
  if (!secret) return c.json({ error: 'Autenticação de administrador não configurada no servidor.' }, 500);
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ error: 'Não autenticado.' }, 401);
  const payload = await verifySessionToken(token, secret);
  if (!payload || payload.role !== 'NEXUS_ADMIN') return c.json({ error: 'Acesso negado.' }, 403);
  c.set('authUser', payload);
  await next();
}

// ==================== RATE LIMITING (D1-backed) ====================
// Cloudflare Workers isolates are ephemeral/distributed, so an in-memory counter
// isn't reliable — attempts are tracked in D1 instead. Table is created lazily
// (see /migrate-db and schema.sql) with an index on (scope, key, created_at).
export function getClientIp(c: any): string {
  return c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || 'unknown';
}

export async function isRateLimited(db: any, scope: string, key: string, maxAttempts: number, windowMinutes: number): Promise<boolean> {
  try {
    const row: any = await db.prepare(
      `SELECT COUNT(*) as cnt FROM security_rate_limits WHERE scope = ? AND key = ? AND created_at > datetime('now', ?)`
    ).bind(scope, key, `-${windowMinutes} minutes`).first();
    return (row?.cnt || 0) >= maxAttempts;
  } catch {
    return false; // table not migrated yet — fail open rather than lock everyone out
  }
}

export async function recordRateLimitHit(db: any, scope: string, key: string) {
  try {
    await db.prepare('INSERT INTO security_rate_limits (id, scope, key) VALUES (?, ?, ?)').bind(crypto.randomUUID(), scope, key).run();
    if (Math.random() < 0.02) {
      db.prepare(`DELETE FROM security_rate_limits WHERE created_at < datetime('now', '-1 day')`).run().catch(() => {});
    }
  } catch {
    // table not migrated yet — nothing to do
  }
}

// ==================== GENERAL SESSION REQUIREMENT ====================
// Historically almost every route trusted a client-supplied `account_id` (query
// param or request body) with no session check at all — any caller could read or
// write another tenant's data by guessing/changing that value (IDOR). The general
// middleware in [[route]].ts requires a valid session on everything except the
// routes below, which are genuinely meant to be reachable without a logged-in user
// (login itself, public signup, public bio pages, inbound webhooks, tracking/email
// pixels). Once a session exists, routes should read the account via
// sessionAccountId(c) instead of trusting the client.
export function isPublicRoute(method: string, path: string): boolean {
  const exactByMethod: Record<string, string[]> = {
    GET: ['/api/global-settings', '/api/seed-db', '/api/tracking/test'],
    POST: ['/api/login', '/api/logout', '/api/public/register', '/api/tracking/events', '/api/email-events/track'],
  };
  if (exactByMethod[method]?.includes(path)) return true;
  if (method === 'GET' && path.startsWith('/api/bio-links/public/')) return true;
  if (method === 'POST' && /^\/api\/bio-links\/[^/]+\/click$/.test(path)) return true;
  if (method === 'POST' && path.startsWith('/api/webhooks/incoming/')) return true;
  // CORS preflight for the public endpoints above — browsers send OPTIONS with no
  // cookie/credentials at all, so these must stay outside the session requirement.
  if (method === 'OPTIONS' && (path.startsWith('/api/webhooks/incoming/') || path === '/api/tracking/events')) return true;
  return false;
}

export function sessionAccountId(c: any): string | null {
  return c.get('authUser')?.accountId ?? null;
}
