// oauth.js: the sealed state cookie, state attacks, and the GitHub callback outcomes (RFC-0002 8.5
// tests 3-7, 10, 15). Handlers are called directly with a ctx shaped like app.js builds; fetch is stubbed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, seedUser, stubFetch, ORIGIN, HOUR } from './helpers.js';
import { b64urlDecode, b64urlEncode, stateKey, openJson, randomToken, sha256Hex, newId } from '../crypto.js';
import { HttpError } from '../http.js';
import { OAUTH_COOKIE, STATE_TTL_MS, PROVIDERS, sealState, openState, startLogin, callback } from '../oauth.js';

const NOW = Date.UTC(2026, 9, 9, 14, 2);
const GH_TOKEN = 'gho_test_token_do_not_leak';

function ctxOf(env, { method = 'GET', path, cookie, form = {}, provider = 'github', now = NOW }) {
  const url = new URL(path, ORIGIN);
  const headers = new Headers();
  if (cookie) headers.set('Cookie', cookie);
  return { request: new Request(url, { method, headers }), env, url, now,
    params: { provider }, form: new URLSearchParams(form), user: null, perms: new Set() };
}

const cookieValue = (res, name) => {
  const c = res.headers.getSetCookie().find(s => s.startsWith(`${name}=`));
  return c ? c.slice(name.length + 1).split(';')[0] : null;
};

function assertHostCookie(setCookie, name, maxAge) {
  const [pair, ...attrs] = setCookie.split(';').map(s => s.trim());
  assert.ok(name.startsWith('__Host-') && pair.startsWith(`${name}=`), setCookie);
  const seen = new Map(attrs.map(a => { const [k, v] = a.split('='); return [k.toLowerCase(), v]; }));
  assert.deepEqual([...seen.keys()].sort(), ['httponly', 'max-age', 'path', 'samesite', 'secure']);
  assert.equal(seen.get('path'), '/');
  assert.equal(seen.get('samesite'), 'Lax');
  assert.equal(seen.get('max-age'), String(maxAge));
  assert.ok(!/domain/i.test(setCookie));
}

async function start(env, form = {}, { provider = 'github', now = NOW } = {}) {
  const res = await startLogin(ctxOf(env, { method: 'POST', path: `/auth/start/${provider}`, form, provider, now }));
  const loc = new URL(res.headers.get('Location'));
  const sealed = cookieValue(res, OAUTH_COOKIE);
  return { res, loc, sealed, state: loc.searchParams.get('state'), cookie: `${OAUTH_COOKIE}=${sealed}` };
}

function github({ id = 1001, login = 'octo-test', token = { access_token: GH_TOKEN, token_type: 'bearer', scope: '' } } = {}) {
  return stubFetch(req => {
    if (req.url === 'https://github.com/login/oauth/access_token') return token;
    if (req.url === 'https://api.github.com/user') return { id, login };
    return undefined;
  });
}

async function cb(env, { cookie, state, query = '', now = NOW, user = {} } = {}) {
  const stub = github(user);
  try {
    const q = query || `code=gh-code&state=${encodeURIComponent(state)}`;
    const res = await callback(ctxOf(env, { path: `/auth/callback/github?${q}`, cookie, now }));
    return { res, calls: stub.calls };
  } finally { stub.restore(); }
}

const loc = res => new URL(res.headers.get('Location'), ORIGIN);
const tables = env => Object.fromEntries(['users', 'identities', 'sessions', 'invites', 'user_roles', 'audit_events']
  .map(t => [t, env.DB.sqlite.prepare(`SELECT * FROM ${t}`).all()]));

// A GitHub invite pinned to `subject`, from an enabled admin unless `invitedBy` says otherwise.
function seedGithubInvite(env, { subject = '1001', roleId = 'role_viewer', invitedBy, now = NOW } = {}) {
  const by = invitedBy || seedUser(env.DB, { subject: 'gh-test-inviter', login: 'inviter', roles: ['role_admin'] }).userId;
  const id = newId();
  env.DB.sqlite.prepare(`INSERT INTO invites (id, role_id, subject, login_hint, invited_by, created_at, expires_at)
    VALUES (?, ?, ?, 'octo-test', ?, ?, ?)`).run(id, roleId, subject, by, now, now + 7 * 24 * HOUR);
  return { id, invitedBy: by };
}

// --- the state cookie ------------------------------------------------------------------------------

test('sealState/openState: AAD binds the provider, v must be 1, and the cookie lives under 600 s', async () => {
  const env = makeEnv();
  const st = { v: 1, p: 'github', s: 'state-1', cv: 'verifier-1', r: '/admin/', t: NOW };
  const sealed = await sealState(env, 'github', st);
  assert.deepEqual(await openState(env, 'github', sealed, NOW), st);
  assert.deepEqual(await openState(env, 'github', sealed, NOW + STATE_TTL_MS - 1), st);
  assert.equal(await openState(env, 'github', sealed, NOW + STATE_TTL_MS), null);
  assert.equal(await openState(env, 'google', sealed, NOW), null, 'other provider AAD');
  assert.equal(await openState(env, 'github', await sealState(env, 'github', { ...st, v: 2 }), NOW), null);
  assert.equal(await openState(env, 'github', await sealState(env, 'github', { ...st, p: 'google' }), NOW), null);
  assert.equal(await openState(env, 'github', await sealState(env, 'github', { ...st, t: NOW + 3600000 }), NOW), null);
  assert.equal(await openState(env, 'github', null, NOW), null);
  assert.equal(await openState(env, 'github', 'garbage!', NOW), null);
  assert.equal(await openState({ ...env, APP_SECRET: 'another-app-secret-0123456789abcdefghijklmn' }, 'github', sealed, NOW), null);
  assert.deepEqual(PROVIDERS, ['github', 'google']);
});

test('POST /auth/start/github: 303 to GitHub, sealed cookie for 600 s, no D1 access, no fetch', async () => {
  const env = makeEnv();
  const before = env.DB.totalChanges();
  const stub = stubFetch();
  let s;
  try {
    s = await start(env, { next: '/admin/changes?x=1' });
  } finally { stub.restore(); }
  assert.equal(stub.calls.length, 0);
  assert.equal(env.DB.totalChanges(), before);
  assert.equal(s.res.status, 303);
  assert.equal(s.loc.origin + s.loc.pathname, 'https://github.com/login/oauth/authorize');
  assert.equal(s.loc.searchParams.has('scope'), false);
  assert.equal(s.loc.searchParams.get('allow_signup'), 'false');
  assert.equal(s.loc.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(s.loc.searchParams.has('prompt'), false);
  assertHostCookie(s.res.headers.getSetCookie()[0], OAUTH_COOKIE, 600);

  const st = await openJson(await stateKey(env.APP_SECRET), s.sealed, 'sl_oauth|github');
  assert.equal(st.v, 1);
  assert.equal(st.p, 'github');
  assert.equal(st.s, s.loc.searchParams.get('state'));
  assert.equal(st.r, '/admin/changes?x=1');
  assert.equal(st.t, NOW);
  assert.equal(st.n, undefined);
  assert.deepEqual(Object.keys(st).sort(), ['cv', 'p', 'r', 's', 't', 'v']);
  // PKCE: the challenge is S256 of the sealed verifier.
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(st.cv)));
  assert.equal(s.loc.searchParams.get('code_challenge'), b64urlEncode(digest));
  assert.ok(!s.loc.href.includes(st.cv), 'the verifier never leaves the cookie');
});

test('start sanitizes next and seals nothing from an invite field (invites have no link)', async () => {
  const env = makeEnv();
  const key = await stateKey(env.APP_SECRET);
  for (const next of ['//evil.com', 'https://evil.com/admin/', '/\\evil.com', '/plus/', 'javascript:alert(1)', 'x'.repeat(600)]) {
    const s = await start(env, { next });
    assert.equal((await openJson(key, s.sealed, 'sl_oauth|github')).r, '/admin/', next);
  }
  const withInvite = await start(env, { invite: randomToken() });
  assert.equal('inv' in (await openJson(key, withInvite.sealed, 'sl_oauth|github')), false);
});

test('an unknown provider is 404 at start and callback', async () => {
  const env = makeEnv();
  await assert.rejects(startLogin(ctxOf(env, { method: 'POST', path: '/auth/start/gitlab', provider: 'gitlab' })),
    err => err instanceof HttpError && err.status === 404);
  await assert.rejects(callback(ctxOf(env, { path: '/auth/callback/gitlab?code=x&state=y', provider: 'gitlab' })),
    err => err instanceof HttpError && err.status === 404);
});

test('switch=1 asks GitHub for the account picker; otherwise none', async () => {
  const env = makeEnv();
  assert.equal((await start(env, { switch: '1' })).loc.searchParams.get('prompt'), 'select_account');
  assert.equal((await start(env, { prompt: 'select_account' })).loc.searchParams.has('prompt'), false, 'one name: switch=1');
  assert.equal((await start(env, { switch: '0' })).loc.searchParams.has('prompt'), false);
});

// --- state attacks: e=expired, zero provider calls, cookie cleared ---------------------------------

test('state attacks all fail with e=expired before any provider call', async () => {
  const env = makeEnv();
  const s = await start(env);
  const tampered = (() => {
    const raw = b64urlDecode(s.sealed);
    raw[raw.length - 1] ^= 1;
    return `${OAUTH_COOKIE}=${b64urlEncode(raw)}`;
  })();
  const g = await start(env, {}, { provider: 'google' });
  const cases = {
    'missing cookie': { state: s.state },
    'tampered ciphertext': { cookie: tampered, state: s.state },
    'cookie sealed for google sent to the github callback': { cookie: g.cookie, state: g.state },
    'state mismatch': { cookie: s.cookie, state: randomToken() },
    'state missing': { cookie: s.cookie, query: 'code=gh-code' },
    'older than 600 s': { cookie: s.cookie, state: s.state, now: NOW + STATE_TTL_MS },
  };
  const before = env.DB.totalChanges();
  for (const [name, opts] of Object.entries(cases)) {
    const { res, calls } = await cb(env, opts);
    assert.equal(res.status, 303, name);
    assert.equal(res.headers.get('Location'), '/auth/signin?e=expired', name);
    assert.equal(calls.length, 0, `${name}: no provider call`);
    assertHostCookie(res.headers.getSetCookie().find(c => c.startsWith(OAUTH_COOKIE)), OAUTH_COOKIE, 0);
  }
  assert.equal(env.DB.totalChanges(), before);
});

test('a second callback after the cookie was cleared is e=expired', async () => {
  const env = makeEnv();
  seedUser(env.DB, { subject: '1001', roles: ['role_viewer'] });
  const s = await start(env);
  const first = await cb(env, { cookie: s.cookie, state: s.state });
  assert.equal(first.res.headers.get('Location'), '/admin/');
  const cleared = first.res.headers.getSetCookie().find(c => c.startsWith(`${OAUTH_COOKIE}=`));
  assertHostCookie(cleared, OAUTH_COOKIE, 0);
  // The browser applied Max-Age=0, so the replay arrives with no state cookie.
  const second = await cb(env, { state: s.state });
  assert.equal(second.res.headers.get('Location'), '/auth/signin?e=expired');
  assert.equal(second.calls.length, 0);
});

test('a junk code makes one failing call, writes nothing, and keeps next', async () => {
  const env = makeEnv();
  const s = await start(env, { next: '/admin/people' });
  const before = env.DB.totalChanges();
  const { res, calls } = await cb(env, { cookie: s.cookie, state: s.state, user: { token: { error: 'bad_verification_code' } } });
  assert.equal(calls.length, 1);
  assert.equal(env.DB.totalChanges(), before);
  const l = loc(res);
  assert.equal(l.pathname, '/auth/signin');
  assert.deepEqual(Object.fromEntries(l.searchParams), { next: '/admin/people', p: 'github', e: 'provider' });
});

test('error=access_denied is e=cancelled with no provider call; any other error is e=provider', async () => {
  const env = makeEnv();
  const s = await start(env, { next: '/admin/changes' });
  const c = await cb(env, { cookie: s.cookie, query: `error=access_denied&state=${s.state}` });
  assert.equal(c.calls.length, 0);
  assert.deepEqual(Object.fromEntries(loc(c.res).searchParams), { next: '/admin/changes', e: 'cancelled' });
  const o = await cb(env, { cookie: s.cookie, query: `error=server_error&state=${s.state}` });
  assert.equal(loc(o.res).searchParams.get('e'), 'provider');
  assert.equal(loc(o.res).searchParams.get('p'), 'github');
  const none = await cb(env, { cookie: s.cookie, query: `state=${s.state}` });
  assert.equal(loc(none.res).searchParams.get('e'), 'provider');
});

// --- outcomes ---------------------------------------------------------------------------------

test('a: a known identity gets a new session, last_login_at and login refreshed, signin.ok audited', async () => {
  const env = makeEnv();
  const u = seedUser(env.DB, { subject: '1001', login: 'old-login', roles: ['role_viewer'] });
  const s = await start(env, { next: '/admin/changes' });
  const { res, calls } = await cb(env, { cookie: s.cookie, state: s.state, user: { login: 'renamed-login' } });
  assert.equal(calls.length, 2, 'token exchange and /user only');
  assert.deepEqual(calls.map(c => `${c.method} ${c.url}`), [
    'POST https://github.com/login/oauth/access_token', 'GET https://api.github.com/user']);
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), '/admin/changes');
  const cookies = res.headers.getSetCookie();
  const session = cookies.find(c => c.startsWith('__Host-sl_session='));
  assertHostCookie(session, '__Host-sl_session', 43200);
  assertHostCookie(cookies.find(c => c.startsWith(`${OAUTH_COOKIE}=`)), OAUTH_COOKIE, 0);
  const token = session.split(';')[0].split('=')[1];

  const t = tables(env);
  assert.equal(t.users.length, 1, 'a changed login maps to the same user');
  assert.equal(t.sessions.length, 1);
  assert.equal(t.sessions[0].id_hash, await sha256Hex(token));
  assert.equal(t.sessions[0].user_id, u.userId);
  assert.equal(t.identities[0].login, 'renamed-login');
  assert.equal(t.identities[0].last_login_at, NOW);
  assert.deepEqual(t.audit_events.map(a => [a.action, a.actor_user_id, a.target_id]), [['signin.ok', u.userId, u.identityId]]);

  const everything = JSON.stringify(t) + JSON.stringify([...res.headers]) + await res.text();
  assert.ok(!everything.includes(GH_TOKEN), 'the provider token is in no response and no row');
  assert.ok(!JSON.stringify(t).includes(token), 'the session token is stored only as a hash');
});

test('the callback ignores any next in its own query', async () => {
  const env = makeEnv();
  seedUser(env.DB, { subject: '1001', roles: ['role_viewer'] });
  const s = await start(env, { next: '/admin/people' });
  const { res } = await cb(env, { cookie: s.cookie, query: `code=c&state=${s.state}&next=https%3A%2F%2Fevil.com&return_to=//evil.com` });
  assert.equal(res.headers.get('Location'), '/admin/people');
});

test('a disabled user is sent to e=disabled with no session', async () => {
  const env = makeEnv();
  seedUser(env.DB, { subject: '1001', roles: ['role_viewer'], disabled: true });
  const s = await start(env);
  const before = env.DB.totalChanges();
  const { res } = await cb(env, { cookie: s.cookie, state: s.state });
  assert.equal(res.headers.get('Location'), '/auth/signin?e=disabled');
  assert.equal(env.DB.totalChanges(), before);
  assert.ok(!res.headers.getSetCookie().some(c => c.startsWith('__Host-sl_session=')));
});

test('b: a subject-pinned GitHub invite redeems with no link', async () => {
  const env = makeEnv();
  const inv = seedGithubInvite(env);
  const s = await start(env, { next: '/admin/changes' });
  const { res } = await cb(env, { cookie: s.cookie, state: s.state });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), '/admin/?welcome=1');
  assert.ok(res.headers.getSetCookie().some(c => c.startsWith('__Host-sl_session=') && c.includes('Max-Age=43200')));
  const t = tables(env);
  const ident = t.identities.find(i => i.subject === '1001');
  assert.equal(ident.login, 'octo-test');
  assert.deepEqual(t.user_roles.filter(r => r.user_id === ident.user_id).map(r => r.role_id), ['role_viewer']);
  assert.equal(t.sessions.length, 1);
  assert.ok(t.invites[0].redeemed_at);
  assert.equal(t.invites[0].redeemed_identity_id, ident.id);
  assert.ok(t.audit_events.some(a => a.action === 'signin.ok'));
  assert.ok(t.audit_events.some(a => a.action === 'invite.redeem' && a.target_id === inv.id));
  assert.ok(!JSON.stringify(t).includes(GH_TOKEN));
});

test('a GitHub invite pinned to another id does not let this account in', async () => {
  const env = makeEnv();
  seedGithubInvite(env, { subject: '2002' });
  const s = await start(env);
  const before = tables(env);
  const { res } = await cb(env, { cookie: s.cookie, state: s.state });
  assert.equal(res.status, 403);
  assert.deepEqual(tables(env), before);
});

test('one invite redeems once: the next callback signs in the same user', async () => {
  const env = makeEnv();
  seedGithubInvite(env);
  const a = await start(env);
  assert.equal((await cb(env, { cookie: a.cookie, state: a.state })).res.headers.get('Location'), '/admin/?welcome=1');
  const b = await start(env);
  assert.equal((await cb(env, { cookie: b.cookie, state: b.state })).res.headers.get('Location'), '/admin/');
  assert.equal(env.DB.count('users'), 2); // the inviter and the invitee
  assert.equal(env.DB.count('identities'), 2);
});

// RFC-0002 2.2 case b: a guarded UPDATE that changes 0 rows is case c, the denied page.
test('an invite whose inviter is no longer an admin is the denied page, and stays open', async () => {
  const env = makeEnv();
  const inviter = seedUser(env.DB, { subject: 'gh-test-inviter', roles: ['role_viewer'] });
  const inv = seedGithubInvite(env, { invitedBy: inviter.userId });
  const s = await start(env, { next: '/admin/changes' });
  const { res } = await cb(env, { cookie: s.cookie, state: s.state });
  assert.equal(res.status, 403);
  const row = env.DB.sqlite.prepare('SELECT redeemed_at, revoked_at FROM invites WHERE id = ?').get(inv.id);
  assert.deepEqual({ ...row }, { redeemed_at: null, revoked_at: null });
  assert.equal(env.DB.count('identities'), 1);
  assert.equal(env.DB.count('sessions'), 0);
});

test('c: an uninvited identity gets the 403 page and leaves every table unchanged, audit included', async () => {
  const env = makeEnv();
  seedUser(env.DB, { subject: 'gh-test-someone-else', roles: ['role_admin'] });
  const s = await start(env, { next: '/admin/changes' });
  const before = tables(env);
  const changes = env.DB.totalChanges();
  const { res, calls } = await cb(env, { cookie: s.cookie, state: s.state, user: { login: 'stranger-login' } });
  assert.equal(calls.length, 2);
  assert.equal(res.status, 403);
  assert.match(res.headers.get('Content-Type'), /^text\/html/);
  const body = await res.text();
  assert.ok(body.includes('stranger-login'));
  assert.ok(!body.includes(GH_TOKEN));
  assert.match(body, /name="next" value="\/admin\/changes"/, 'Try another account carries the sealed next');
  const cookies = res.headers.getSetCookie();
  assert.equal(cookies.length, 1);
  assertHostCookie(cookies[0], OAUTH_COOKIE, 0);
  assert.deepEqual(tables(env), before);
  assert.equal(env.DB.totalChanges(), changes);
});

// Plan 12.1 case 7 asked for one HMAC'd signin.denied row per hour; RFC-0002 section 0 (test 5) records nothing.
test('case 7: ten uninvited tries within an hour write no row at all', async () => {
  const env = makeEnv();
  const before = tables(env);
  const changes = env.DB.totalChanges();
  for (let i = 0; i < 10; i++) {
    const now = NOW + i * 60000;
    const s = await start(env, {}, { now });
    const { res } = await cb(env, { cookie: s.cookie, state: s.state, now, user: { id: 7700 + (i % 2), login: 'stranger' } });
    assert.equal(res.status, 403);
  }
  assert.deepEqual(tables(env), before);
  assert.equal(env.DB.totalChanges(), changes);
});
