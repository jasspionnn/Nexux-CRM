import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  isHashedPassword,
  verifyAndUpgradePassword,
  createSessionToken,
  verifySessionToken,
  isPublicRoute,
  sessionAccountId,
  type SessionPayload,
} from './auth';

describe('password hashing', () => {
  it('hashes a password into the pbkdf2$... format', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(isHashedPassword(hash)).toBe(true);
    expect(hash.split('$')).toHaveLength(4);
  });

  it('verifies a correct password against its own hash', async () => {
    const hash = await hashPassword('correct horse battery staple');
    const result = await verifyAndUpgradePassword('correct horse battery staple', hash);
    expect(result.valid).toBe(true);
    expect(result.upgradedHash).toBeUndefined();
  });

  it('rejects a wrong password against a hash', async () => {
    const hash = await hashPassword('correct horse battery staple');
    const result = await verifyAndUpgradePassword('wrong password', hash);
    expect(result.valid).toBe(false);
  });

  it('two hashes of the same password are different (random salt)', async () => {
    const a = await hashPassword('same password');
    const b = await hashPassword('same password');
    expect(a).not.toBe(b);
  });

  it('accepts a matching legacy plaintext password and returns an upgraded hash', async () => {
    const result = await verifyAndUpgradePassword('123456', '123456');
    expect(result.valid).toBe(true);
    expect(result.upgradedHash).toBeDefined();
    expect(isHashedPassword(result.upgradedHash!)).toBe(true);

    // the upgraded hash must itself verify the same password going forward
    const second = await verifyAndUpgradePassword('123456', result.upgradedHash!);
    expect(second.valid).toBe(true);
    expect(second.upgradedHash).toBeUndefined();
  });

  it('rejects a non-matching legacy plaintext password without upgrading', async () => {
    const result = await verifyAndUpgradePassword('wrong', '123456');
    expect(result.valid).toBe(false);
    expect(result.upgradedHash).toBeUndefined();
  });

  it('rejects when there is no stored password at all', async () => {
    const result = await verifyAndUpgradePassword('anything', '');
    expect(result.valid).toBe(false);
  });
});

describe('session tokens', () => {
  const secret = 'test-secret-do-not-use-in-prod';
  const payload: SessionPayload = { sub: 'u_1', accountId: 'acc_1', role: 'ACCOUNT_ADMIN', exp: Date.now() + 60_000 };

  it('round-trips a valid token', async () => {
    const token = await createSessionToken(payload, secret);
    const decoded = await verifySessionToken(token, secret);
    expect(decoded).toEqual(payload);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await createSessionToken(payload, secret);
    const decoded = await verifySessionToken(token, 'a-different-secret');
    expect(decoded).toBeNull();
  });

  it('rejects a tampered payload (signature no longer matches)', async () => {
    const token = await createSessionToken(payload, secret);
    const [body, sig] = token.split('.');
    const tamperedPayload = { ...payload, role: 'NEXUS_ADMIN' };
    const tamperedBody = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64url');
    const tampered = `${tamperedBody}.${sig}`;
    const decoded = await verifySessionToken(tampered, secret);
    expect(decoded).toBeNull();
  });

  it('rejects an expired token', async () => {
    const expired: SessionPayload = { ...payload, exp: Date.now() - 1000 };
    const token = await createSessionToken(expired, secret);
    const decoded = await verifySessionToken(token, secret);
    expect(decoded).toBeNull();
  });

  it('rejects a malformed token', async () => {
    expect(await verifySessionToken('not-a-real-token', secret)).toBeNull();
    expect(await verifySessionToken('', secret)).toBeNull();
  });
});

describe('isPublicRoute', () => {
  it('allows login, logout, and public register without a session', () => {
    expect(isPublicRoute('POST', '/api/login')).toBe(true);
    expect(isPublicRoute('POST', '/api/logout')).toBe(true);
    expect(isPublicRoute('POST', '/api/public/register')).toBe(true);
  });

  it('allows public bio pages and bio-link click tracking', () => {
    expect(isPublicRoute('GET', '/api/bio-links/public/my-slug')).toBe(true);
    expect(isPublicRoute('POST', '/api/bio-links/abc123/click')).toBe(true);
  });

  it('allows inbound webhooks and their CORS preflight', () => {
    expect(isPublicRoute('POST', '/api/webhooks/incoming/wh_1')).toBe(true);
    expect(isPublicRoute('OPTIONS', '/api/webhooks/incoming/wh_1')).toBe(true);
  });

  it('allows tracking ingestion and its CORS preflight, but not the dashboard view', () => {
    expect(isPublicRoute('POST', '/api/tracking/events')).toBe(true);
    expect(isPublicRoute('OPTIONS', '/api/tracking/events')).toBe(true);
    expect(isPublicRoute('GET', '/api/tracking/events')).toBe(false);
  });

  it('requires a session for tenant CRUD and admin routes', () => {
    expect(isPublicRoute('GET', '/api/leads')).toBe(false);
    expect(isPublicRoute('POST', '/api/leads')).toBe(false);
    expect(isPublicRoute('DELETE', '/api/leads/l_1')).toBe(false);
    expect(isPublicRoute('GET', '/api/admin/accounts')).toBe(false);
  });

  it('does not allow GET on the click-tracking or webhook paths (wrong method)', () => {
    expect(isPublicRoute('GET', '/api/bio-links/abc123/click')).toBe(false);
    expect(isPublicRoute('GET', '/api/webhooks/incoming/wh_1')).toBe(false);
  });
});

describe('sessionAccountId', () => {
  it('returns the accountId from the authenticated session', () => {
    const c = { get: (key: string) => (key === 'authUser' ? { accountId: 'acc_1' } : undefined) };
    expect(sessionAccountId(c)).toBe('acc_1');
  });

  it('returns null when there is no session', () => {
    const c = { get: () => undefined };
    expect(sessionAccountId(c)).toBeNull();
  });

  it('returns null when the session has no accountId (edge case: legacy admin row)', () => {
    const c = { get: (key: string) => (key === 'authUser' ? { accountId: null } : undefined) };
    expect(sessionAccountId(c)).toBeNull();
  });
});
