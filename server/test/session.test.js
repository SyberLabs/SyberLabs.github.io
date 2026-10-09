// session.js: hashed ids, the 12 h absolute limit, one read and no writes per request, sign-out and
// "Sign out everywhere", and the cookie attributes (RFC-0002 8.5 tests 9, 10, 14).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, signIn, seedRole, ORIGIN, HOUR } from './helpers.js';
import { sha256Hex } from '../crypto.js';
import {
  SESSION_COOKIE, SESSION_TTL_MS, loadSession, mintSession, sessionCookie, clearSessionCookie,
  deleteUserSessionsStmt, signout, revokeOwnSessions,
} from '../session.js';

const NOW = Date.UTC(2026, 9, 9, 14, 2);

function req(path = '/admin/', { cookie, headers = {}, method = 'GET' } = {}) {
  const h = new Headers(headers);
  if (cookie) h.set('Cookie', cookie);
  return new Request(new URL(path, ORIGIN), { method, headers: h });
}

async function ctxFor(env, cookieHeader, { form = {}, now = NOW } = {}) {
  const request = req('/auth/signout', { cookie: cookieHeader, method: 'POST' });
  const { user, perms } = await loadSession(env, request, now);
  return { request, env, url: new URL(request.url), now, waitUntil: () => {}, params: {},
    form: new URLSearchParams(form), route: null, user, perms };
}

// Exactly: __Host- name, Path=/, Secure, HttpOnly, SameSite=Lax, Max-Age, and nothing else (no Domain).
function assertHostCookie(setCookie, name, maxAge) {
  const [pair, ...attrs] = setCookie.split(';').map(s => s.trim());
  assert.ok(pair.startsWith(`${name}=`), setCookie);
  assert.ok(name.startsWith('__Host-'));
  const seen = new Map(attrs.map(a => { const [k, v] = a.split('='); return [k.toLowerCase(), v]; }));
  assert.deepEqual([...seen.keys()].sort(), ['httponly', 'max-age', 'path', 'samesite', 'secure']);
  assert.equal(seen.get('path'), '/');
  assert.equal(seen.get('samesite'), 'Lax');
  assert.equal(seen.get('max-age'), String(maxAge));
  assert.ok(!/domain/i.test(setCookie));
}

test('mintSession stores only sha256(token), for exactly 12 hours, with the request metadata', async () => {
  const env = makeEnv();
  const u = await signIn(env.DB, { now: NOW });
  const request = req('/auth/callback/github', {
    headers: { 'CF-Connecting-IP': '203.0.113.77', 'User-Agent': 'x'.repeat(300) },
  });
  const s = await mintSession(env, { userId: u.userId, identityId: u.identityId, request, now: NOW });
  assert.match(s.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(env.DB.count('sessions'), 1, 'stmt is not executed by mintSession');
  await env.DB.batch([s.stmt]);
  const row = env.DB.sqlite.prepare('SELECT * FROM sessions WHERE user_id = ? AND id_hash = ?')
    .get(u.userId, await sha256Hex(s.token));
  assert.ok(row);
  assert.equal(row.expires_at - row.created_at, 12 * HOUR);
  assert.equal(SESSION_TTL_MS, 12 * HOUR);
  assert.equal(row.ip_prefix, '203.0.113.0/24');
  assert.equal(row.user_agent.length, 200);
  const dump = JSON.stringify(env.DB.sqlite.prepare('SELECT * FROM sessions').all());
  assert.ok(!dump.includes(s.token), 'the raw token is never stored');
  assertHostCookie(s.cookie, SESSION_COOKIE, 43200);
  assert.ok(s.cookie.startsWith(`${SESSION_COOKIE}=${s.token};`));
});

test('session cookie and its clearing carry exactly the __Host- attributes', () => {
  assertHostCookie(sessionCookie('abc'), SESSION_COOKIE, 43200);
  assertHostCookie(clearSessionCookie(), SESSION_COOKIE, 0);
  assert.equal(SESSION_COOKIE, '__Host-sl_session');
});

test('loadSession resolves the user and effective permissions in one read with no writes', async () => {
  const env = makeEnv();
  const viewer = 'role_viewer';
  const extra = seedRole(env.DB, ['id:audit.read']);
  const u = await signIn(env.DB, { roles: [viewer, extra], login: 'octo-test', now: NOW });
  const before = env.DB.totalChanges();
  const out = await loadSession(env, req('/admin/', { cookie: u.cookie }), NOW + HOUR);
  assert.equal(env.DB.totalChanges(), before, 'a signed-in request writes nothing');
  assert.equal(out.stale, false);
  assert.equal(out.user.id, u.userId);
  assert.equal(out.user.identityId, u.identityId);
  assert.equal(out.user.sessionHash, await sha256Hex(u.token));
  assert.equal(out.user.displayName, 'octo-test');
  assert.equal(out.user.provider, 'github');
  assert.equal(out.user.login, 'octo-test');
  assert.equal(out.user.expiresAt, NOW + 12 * HOUR);
  assert.equal(out.user.createdAt, NOW);
  assert.deepEqual([...out.perms].sort(), ['id:audit.read', 'site:changes.read']);
});

test('no cookie is signed out and not stale; a dead cookie is stale', async () => {
  const env = makeEnv();
  const none = await loadSession(env, req('/admin/'), NOW);
  assert.deepEqual({ user: none.user, stale: none.stale, size: none.perms.size }, { user: null, stale: false, size: 0 });

  const unknown = await loadSession(env, req('/admin/', { cookie: `${SESSION_COOKIE}=${'A'.repeat(43)}` }), NOW);
  assert.equal(unknown.user, null);
  assert.equal(unknown.stale, true);

  const junk = await loadSession(env, req('/admin/', { cookie: `${SESSION_COOKIE}=not-a-token` }), NOW);
  assert.equal(junk.user, null);
  assert.equal(junk.stale, true);
});

test('past expires_at the session is dead (12 h absolute, no idle extension)', async () => {
  const env = makeEnv();
  const u = await signIn(env.DB, { now: NOW });
  assert.ok((await loadSession(env, req('/admin/', { cookie: u.cookie }), NOW + 12 * HOUR - 1)).user);
  const dead = await loadSession(env, req('/admin/', { cookie: u.cookie }), NOW + 12 * HOUR);
  assert.equal(dead.user, null);
  assert.equal(dead.stale, true);
});

test('a disabled user, or an identity moved to another user, does not authenticate', async () => {
  const env = makeEnv();
  const a = await signIn(env.DB, { now: NOW });
  env.DB.sqlite.prepare('UPDATE users SET disabled_at = ? WHERE id = ?').run(NOW, a.userId);
  assert.equal((await loadSession(env, req('/admin/', { cookie: a.cookie }), NOW + 1)).user, null);

  const b = await signIn(env.DB, { now: NOW });
  const other = await signIn(env.DB, { now: NOW });
  env.DB.sqlite.prepare('UPDATE identities SET user_id = ? WHERE id = ?').run(other.userId, b.identityId);
  assert.equal((await loadSession(env, req('/admin/', { cookie: b.cookie }), NOW + 1)).user, null);
});

test('expired grants and retired keys grant nothing', async () => {
  const env = makeEnv();
  const u = await signIn(env.DB, { roles: ['role_viewer'], now: NOW, expiresAt: NOW + HOUR });
  assert.deepEqual([...(await loadSession(env, req('/admin/', { cookie: u.cookie }), NOW + 1)).perms], ['site:changes.read']);
  assert.equal((await loadSession(env, req('/admin/', { cookie: u.cookie }), NOW + HOUR)).perms.size, 0);

  const v = await signIn(env.DB, { roles: ['role_viewer'], now: NOW });
  env.DB.sqlite.prepare("UPDATE permissions SET deprecated_at = 1 WHERE key = 'site:changes.read'").run();
  assert.equal((await loadSession(env, req('/admin/', { cookie: v.cookie }), NOW + 1)).perms.size, 0);
});

test('signout deletes only its own row, clears the cookie and lands on e=signed_out', async () => {
  const env = makeEnv();
  const u = await signIn(env.DB, { now: NOW });
  const second = await signIn(env.DB, { now: NOW });
  const res = await signout(await ctxFor(env, u.cookie));
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), '/auth/signin?e=signed_out');
  assert.equal(await res.text(), '');
  const cookies = res.headers.getSetCookie();
  assert.equal(cookies.length, 1);
  assertHostCookie(cookies[0], SESSION_COOKIE, 0);
  assert.equal(res.headers.get('Clear-Site-Data'), null);
  assert.equal(env.DB.count('sessions'), 1);
  assert.equal((await loadSession(env, req('/admin/', { cookie: u.cookie }), NOW + 1)).user, null);
  assert.ok((await loadSession(env, req('/admin/', { cookie: second.cookie }), NOW + 1)).user);
});

test('signout keeps a sanitized next and switch=1', async () => {
  const env = makeEnv();
  const u = await signIn(env.DB, { now: NOW });
  const res = await signout(await ctxFor(env, u.cookie, { form: { next: '/admin/people?x=1', switch: '1' } }));
  const loc = new URL(res.headers.get('Location'), ORIGIN);
  assert.equal(loc.pathname, '/auth/signin');
  assert.equal(loc.searchParams.get('e'), 'signed_out');
  assert.equal(loc.searchParams.get('next'), '/admin/people?x=1');
  assert.equal(loc.searchParams.get('switch'), '1');

  const v = await signIn(env.DB, { now: NOW });
  const evil = await signout(await ctxFor(env, v.cookie, { form: { next: '//evil.com/admin/' } }));
  assert.equal(new URL(evil.headers.get('Location'), ORIGIN).searchParams.get('next'), '/admin/');
});

test('Sign out everywhere deletes every session of the user, this one included, and audits it', async () => {
  const env = makeEnv();
  const u = await signIn(env.DB, { now: NOW });
  const { seedSession } = await import('./helpers.js');
  await seedSession(env.DB, { userId: u.userId, identityId: u.identityId, now: NOW });
  await seedSession(env.DB, { userId: u.userId, identityId: u.identityId, now: NOW });
  const bystander = await signIn(env.DB, { now: NOW });
  assert.equal(env.DB.count('sessions'), 4);

  const res = await revokeOwnSessions(await ctxFor(env, u.cookie));
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), '/auth/signin?e=signed_out');
  assertHostCookie(res.headers.getSetCookie()[0], SESSION_COOKIE, 0);
  assert.equal(res.headers.get('Clear-Site-Data'), null);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM sessions WHERE user_id = ?').get(u.userId).n, 0);
  assert.ok((await loadSession(env, req('/admin/', { cookie: bystander.cookie }), NOW + 1)).user);
  const audit = env.DB.sqlite.prepare("SELECT * FROM audit_events WHERE action = 'session.revoke_all'").all();
  assert.equal(audit.length, 1);
  assert.equal(audit[0].actor_user_id, u.userId);
  assert.ok(!JSON.stringify(audit).includes(u.token));
});

test('deleteUserSessionsStmt is unexecuted and scoped to one user', async () => {
  const env = makeEnv();
  const a = await signIn(env.DB, { now: NOW });
  const b = await signIn(env.DB, { now: NOW });
  const stmt = deleteUserSessionsStmt(env.DB, a.userId);
  assert.equal(env.DB.count('sessions'), 2);
  await env.DB.batch([stmt]);
  assert.equal(env.DB.count('sessions'), 1);
  assert.ok((await loadSession(env, req('/admin/', { cookie: b.cookie }), NOW + 1)).user);
});
