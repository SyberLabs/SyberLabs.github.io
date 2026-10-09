// google.js: the authorize URL, the token call and the id_token claim checks, then the Google callback
// outcomes through oauth.js. RFC-0002 2.2 and 8.5 tests 23-25 supersede the plan's JWKS test 5: the
// id_token comes only from our own TLS call to Google, so claims are checked and no JWKS is fetched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, seedUser, stubFetch, ORIGIN, HOUR } from './helpers.js';
import { b64urlEncode } from '../crypto.js';
import { AuthError } from '../http.js';
import { authorizeUrl, fetchIdentity, verifyIdToken } from '../google.js';
import { startLogin, callback, OAUTH_COOKIE } from '../oauth.js';

const NOW = Date.UTC(2026, 9, 9, 14, 2);
const CLIENT = 'google-client-test.apps.googleusercontent.com';

// An unsigned id_token built in the test, as Google's token endpoint would return it.
function idToken(claims = {}, header = { alg: 'RS256', kid: 'k1', typ: 'JWT' }) {
  const payload = {
    iss: 'https://accounts.google.com', aud: CLIENT, azp: CLIENT, sub: 'g-test-1',
    email: 'invitee@gmail.com', email_verified: true, iat: NOW / 1000, exp: NOW / 1000 + 3600, ...claims,
  };
  for (const k of Object.keys(payload)) if (payload[k] === undefined) delete payload[k];
  return `${b64urlEncode(JSON.stringify(header))}.${b64urlEncode(JSON.stringify(payload))}.c2ln`;
}

// The token endpoint answers with an id_token whose nonce is whatever the start sealed.
function googleStub(claims = {}, { status = 200 } = {}) {
  let nonce = null;
  const stub = stubFetch(async req => {
    if (req.method === 'POST' && req.url === 'https://oauth2.googleapis.com/token') {
      if (status !== 200) return new Response('{"error":"invalid_grant"}', { status });
      return { access_token: 'ya29.test-do-not-leak', id_token: idToken({ nonce, ...claims }), expires_in: 3599 };
    }
    return undefined;
  });
  return { ...stub, setNonce: n => { nonce = n; } };
}

function ctxOf(env, { method = 'GET', path, cookie, form = {}, provider = 'google', now = NOW }) {
  const url = new URL(path, ORIGIN);
  const headers = new Headers();
  if (cookie) headers.set('Cookie', cookie);
  return { request: new Request(url, { method, headers }), env, url, now, waitUntil: () => {},
    params: { provider }, form: new URLSearchParams(form), user: null, perms: new Set() };
}

const cookieValue = (res, name) => {
  const c = res.headers.getSetCookie().find(s => s.startsWith(`${name}=`));
  return c ? c.slice(name.length + 1).split(';')[0] : null;
};

async function startGoogle(env, form = {}) {
  const res = await startLogin(ctxOf(env, { method: 'POST', path: '/auth/start/google', form }));
  const loc = new URL(res.headers.get('Location'));
  return { res, loc, state: loc.searchParams.get('state'), nonce: loc.searchParams.get('nonce'),
    cookie: `${OAUTH_COOKIE}=${cookieValue(res, OAUTH_COOKIE)}` };
}

// One full round trip: start, then the callback with the id_token the stub returns.
async function signInGoogle(env, claims = {}, form = {}) {
  const s = await startGoogle(env, form);
  const stub = googleStub(claims);
  stub.setNonce(s.nonce);
  try {
    const res = await callback(ctxOf(env, { path: `/auth/callback/google?code=4%2Fcode&state=${s.state}`, cookie: s.cookie }));
    return { res, calls: stub.calls, start: s };
  } finally { stub.restore(); }
}

const tables = env => Object.fromEntries(['users', 'identities', 'sessions', 'invites', 'user_roles', 'audit_events']
  .map(t => [t, JSON.stringify(env.DB.sqlite.prepare(`SELECT * FROM ${t}`).all())]));

// --- google.js units ------------------------------------------------------------------------------

test('authorize URL: code + openid email + nonce + S256, no access_type or login_hint, prompt only when asked', () => {
  const env = makeEnv();
  const u = new URL(authorizeUrl(env, { state: 'st', challenge: 'ch', nonce: 'nn' }));
  assert.equal(u.origin + u.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.deepEqual(Object.fromEntries(u.searchParams), {
    client_id: CLIENT,
    redirect_uri: 'https://syberlabs.io/auth/callback/google',
    response_type: 'code',
    scope: 'openid email',
    state: 'st',
    nonce: 'nn',
    code_challenge: 'ch',
    code_challenge_method: 'S256',
  });
  const both = new URL(authorizeUrl(env, { state: 's', challenge: 'c', nonce: 'n', loginHint: 'a@gmail.com', selectAccount: true }));
  assert.equal(both.searchParams.has('login_hint'), false);
  assert.equal(both.searchParams.get('prompt'), 'select_account');
  assert.equal(both.searchParams.has('access_type'), false);
});

test('verifyIdToken accepts a good token from either issuer form', () => {
  const env = makeEnv();
  for (const iss of ['https://accounts.google.com', 'accounts.google.com']) {
    const c = verifyIdToken(env, idToken({ iss, nonce: 'n1' }), { nonce: 'n1', now: NOW });
    assert.equal(c.sub, 'g-test-1');
  }
  // exp within the 30 s skew still passes
  verifyIdToken(env, idToken({ nonce: 'n1', exp: NOW / 1000 - 20 }), { nonce: 'n1', now: NOW });
});

test('verifyIdToken refuses wrong aud, wrong iss, expired exp, nonce mismatch and junk with e=expired', () => {
  const env = makeEnv();
  const bad = [
    idToken({ nonce: 'n1', aud: 'someone-else.apps.googleusercontent.com' }),
    idToken({ nonce: 'n1', aud: [CLIENT] }),
    idToken({ nonce: 'n1', iss: 'https://evil.example' }),
    idToken({ nonce: 'n1', exp: NOW / 1000 - 31 }),
    idToken({ nonce: 'n1', exp: undefined }),
    idToken({ nonce: 'other' }),
    idToken({ nonce: undefined }),
    idToken({ nonce: 'n1', sub: '' }),
    idToken({ nonce: 'n1', sub: undefined }),
    'a.b',
    'a.!!!.c',
    `${b64urlEncode('{}')}.${b64urlEncode('[1]')}.x`,
    null,
  ];
  for (const jwt of bad) {
    assert.throws(() => verifyIdToken(env, jwt, { nonce: 'n1', now: NOW }),
      err => err instanceof AuthError && err.code === 'expired', String(jwt));
  }
  assert.throws(() => verifyIdToken(env, idToken({ nonce: 'n1' }), { nonce: '', now: NOW }), err => err.code === 'expired');
});

test('fetchIdentity: one POST to the token endpoint with PKCE and the secret; failures are e=provider', async () => {
  const env = makeEnv();
  const ok = googleStub({ hd: undefined });
  ok.setNonce('n1');
  try {
    const id = await fetchIdentity(env, { code: 'c1', verifier: 'v1', nonce: 'n1', now: NOW });
    assert.deepEqual(id, { subject: 'g-test-1', email: 'invitee@gmail.com', emailVerified: true });
  } finally { ok.restore(); }
  assert.equal(ok.calls.length, 1);
  const body = Object.fromEntries(new URLSearchParams(await ok.calls[0].text()));
  assert.deepEqual(body, {
    code: 'c1', client_id: CLIENT, client_secret: 'google-secret-test',
    redirect_uri: 'https://syberlabs.io/auth/callback/google', grant_type: 'authorization_code', code_verifier: 'v1',
  });

  const down = googleStub({}, { status: 400 });
  try {
    await assert.rejects(fetchIdentity(env, { code: 'c', verifier: 'v', nonce: 'n', now: NOW }), err => err.code === 'provider');
  } finally { down.restore(); }
  const noId = stubFetch(() => ({ access_token: 'x' }));
  try {
    await assert.rejects(fetchIdentity(env, { code: 'c', verifier: 'v', nonce: 'n', now: NOW }), err => err.code === 'provider');
  } finally { noId.restore(); }

  const unverified = googleStub({ email_verified: 'true' });
  unverified.setNonce('n1');
  try {
    const id = await fetchIdentity(env, { code: 'c', verifier: 'v', nonce: 'n1', now: NOW });
    assert.equal(id.emailVerified, false, 'only the boolean true counts');
  } finally { unverified.restore(); }
});

// --- the Google callback through oauth.js (RFC-0002 8.5 tests 23-25) -------------------------------

test('a claim failure at the callback is e=expired after exactly one Google call and no JWKS', async () => {
  for (const claims of [{ aud: 'x' }, { iss: 'https://evil.example' }, { exp: NOW / 1000 - 60 }, { nonce: 'not-the-cookie-nonce' }]) {
    const env = makeEnv();
    const before = env.DB.totalChanges();
    const { res, calls } = await signInGoogle(env, claims);
    assert.equal(res.status, 303);
    assert.equal(new URL(res.headers.get('Location'), ORIGIN).searchParams.get('e'), 'expired');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://oauth2.googleapis.com/token');
    assert.equal(env.DB.totalChanges(), before);
  }
});

test('the start: nonce and S256 sealed, never a login_hint, no D1 access', async () => {
  const env = makeEnv();
  const before = env.DB.totalChanges();
  const plain = await startGoogle(env, { login_hint: 'invitee@gmail.com', invite: 'A'.repeat(43) });
  assert.equal(plain.loc.searchParams.has('login_hint'), false);
  assert.match(plain.nonce, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(plain.loc.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(env.DB.totalChanges(), before);
});

// RFC-0002 2.5: Google is added from a signed-in session (Packet 5), never invited, so every unknown
// Google identity is case c, whatever its email.
test('an unknown Google identity is the 403 page, told to sign in with GitHub, and writes nothing', async () => {
  const env = makeEnv();
  seedUser(env.DB, { subject: 'gh-test-1', email: 'invitee@gmail.com', login: 'octo-test', roles: ['role_admin'] });
  const before = tables(env);
  const { res } = await signInGoogle(env, {}, { next: '/admin/changes' });
  assert.equal(res.status, 403);
  const body = await res.text();
  assert.match(body, /This Google account \(invitee@gmail\.com\) isn(?:&#39;|')t on a SyberLabs account\./);
  assert.match(body, /Sign in with GitHub, then add Google from your account page\./);
  assert.ok(!res.headers.getSetCookie().some(c => c.startsWith('__Host-sl_session=')));
  assert.deepEqual(tables(env), before);
});

test('case d: an unknown Google identity whose email is on an existing identity is not linked', async () => {
  const env = makeEnv();
  seedUser(env.DB, { provider: 'google', subject: 'g-test-existing', email: 'invitee@gmail.com', login: null, displayName: 'Existing' });
  const before = tables(env);
  const { res } = await signInGoogle(env, { sub: 'g-test-new' });
  assert.equal(res.status, 403);
  assert.deepEqual(tables(env), before);
});

test('a known Google identity signs in and its verified email is refreshed', async () => {
  const env = makeEnv();
  const u = seedUser(env.DB, { provider: 'google', subject: 'g-test-1', email: 'old@gmail.com', login: null, displayName: 'G' });
  const { res } = await signInGoogle(env, { email: 'new@gmail.com' }, { next: '/admin/changes' });
  assert.equal(res.headers.get('Location'), '/admin/changes');
  const row = env.DB.sqlite.prepare('SELECT * FROM identities WHERE id = ?').get(u.identityId);
  assert.equal(row.email, 'new@gmail.com');
  assert.equal(row.last_login_at, NOW);

  const again = await signInGoogle(env, { email: 'unverified@gmail.com', email_verified: false });
  assert.equal(again.res.status, 303);
  assert.equal(env.DB.sqlite.prepare('SELECT email FROM identities WHERE id = ?').get(u.identityId).email, 'new@gmail.com');
});
