// Shared test fixtures: a full env on a fresh database, people seeded straight into D1, a session cookie,
// a request runner that awaits waitUntil work, and a fetch stub that refuses anything not stubbed.
// Ids are obviously fake (gh-test-1); no real people or emails.
import { freshDb } from './d1-shim.js';
import { newId, randomToken, sha256Hex } from '../crypto.js';

export const ORIGIN = 'https://syberlabs.io';
export const SESSION_COOKIE = '__Host-sl_session';
export const OAUTH_COOKIE = '__Host-sl_oauth';
export const HOUR = 3600 * 1000;

export function makeEnv(overrides = {}) {
  return {
    ORIGIN,
    GOOGLE_CLIENT_ID: 'google-client-test.apps.googleusercontent.com',
    GITHUB_CLIENT_ID: 'github-client-test',
    GOOGLE_CLIENT_SECRET: 'google-secret-test',
    GITHUB_CLIENT_SECRET: 'github-secret-test',
    APP_SECRET: 'test-app-secret-0123456789abcdefghijklmnop',
    DB: freshDb(),
    ...overrides,
  };
}

// A custom role holding exactly `perms`; returns its id.
export function seedRole(db, perms, name = `r-${newId().slice(0, 8)}`) {
  const id = `role_${newId().slice(0, 12)}`;
  db.sqlite.prepare('INSERT INTO roles (id, name, created_at) VALUES (?, ?, ?)').run(id, name, Date.now());
  for (const p of perms) db.sqlite.prepare('INSERT INTO role_permissions VALUES (?, ?)').run(id, p);
  return id;
}

// A user with one identity. Pass roles (ids, e.g. ['role_admin']) and/or perms (a custom role is made).
export function seedUser(db, {
  roles = [], perms, provider = 'github', subject = `gh-test-${newId().slice(0, 6)}`, login = 'test-user',
  email = null, displayName = login || 'Test user', disabled = false, now = Date.now(), expiresAt = null,
} = {}) {
  const userId = newId();
  const identityId = newId();
  db.sqlite.prepare('INSERT INTO users (id, display_name, primary_email, created_at, disabled_at) VALUES (?, ?, ?, ?, ?)')
    .run(userId, displayName, email, now, disabled ? now : null);
  db.sqlite.prepare('INSERT INTO identities (id, user_id, provider, subject, email, login, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(identityId, userId, provider, String(subject), email, provider === 'github' ? login : null, now);
  const roleIds = [...roles];
  if (perms) roleIds.push(seedRole(db, perms));
  for (const r of roleIds) {
    db.sqlite.prepare('INSERT INTO user_roles (user_id, role_id, granted_at, expires_at) VALUES (?, ?, ?, ?)')
      .run(userId, r, now, expiresAt);
  }
  return { userId, identityId, roleIds, provider, subject: String(subject), login, displayName };
}

// A session row exactly as session.js writes it: only sha256(token) is stored.
export async function seedSession(db, { userId, identityId, now = Date.now(), ttl = 12 * HOUR }) {
  const token = randomToken();
  db.sqlite.prepare('INSERT INTO sessions (id_hash, user_id, identity_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
    .run(await sha256Hex(token), userId, identityId, now, now + ttl);
  return token;
}

// seedUser + seedSession. Returns the user fields plus { token, cookie } for the Cookie header.
export async function signIn(db, opts = {}) {
  const user = seedUser(db, opts);
  const token = await seedSession(db, { ...user, now: opts.now ?? Date.now(), ttl: opts.ttl });
  return { ...user, token, cookie: `${SESSION_COOKIE}=${token}` };
}

// Runs one request through handle() and waits for its waitUntil work.
// opts: { method='GET', cookie, form (object or URLSearchParams), headers, origin (true = env.ORIGIN,
//         a string, or false for none), host (overrides the URL origin), now }
export async function call(env, path, opts = {}) {
  const { handle } = await import('../app.js');
  const method = opts.method || (opts.form ? 'POST' : 'GET');
  const headers = new Headers(opts.headers || {});
  if (opts.cookie) headers.set('Cookie', opts.cookie);
  const origin = opts.origin === undefined ? true : opts.origin;
  if (method !== 'GET' && method !== 'HEAD' && origin) headers.set('Origin', origin === true ? env.ORIGIN : origin);
  let body;
  if (opts.form) {
    headers.set('Content-Type', 'application/x-www-form-urlencoded');
    body = new URLSearchParams(opts.form).toString();
  }
  const url = new URL(path, opts.host || env.ORIGIN || ORIGIN);
  const pending = [];
  const res = await handle(new Request(url, { method, headers, body, redirect: 'manual' }), env,
    p => pending.push(p), opts.now);
  await Promise.allSettled(pending);
  return res;
}

// Every Set-Cookie value on a response.
export const setCookies = res => res.headers.getSetCookie();

// Replaces globalThis.fetch. `handler(request)` returns a Response (or a plain object, sent as JSON), or
// undefined to fail the call loudly. Every request is recorded in `calls` (cloned, so bodies stay readable).
export function stubFetch(handler = () => undefined) {
  const real = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    calls.push(req.clone());
    const out = await handler(req);
    if (out === undefined) throw new Error(`unstubbed fetch: ${req.method} ${req.url}`);
    return out instanceof Response ? out : Response.json(out);
  };
  return { calls, restore: () => { globalThis.fetch = real; } };
}
