// Google claims, stable subject lookup, and session-bound Add Google, including transactional races.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, seedUser, seedSession, stubFetch, ORIGIN, SESSION_COOKIE } from './helpers.js';
import { b64urlEncode, sha256Hex } from '../crypto.js';
import { AuthError, HttpError } from '../http.js';
import { authorizeUrl, fetchIdentity, verifyIdToken } from '../google.js';
import { enabledProviders } from '../providers.js';
import { addGoogle, startLogin, callback, openState, OAUTH_COOKIE } from '../oauth.js';
import { loadSession, signout } from '../session.js';

const NOW = Date.UTC(2026, 9, 9, 14, 2);
const envOf = () => makeEnv({ GOOGLE_CLIENT_ID: 'google-client-test', GOOGLE_CLIENT_SECRET: 'google-secret-test' });
const claims = (changes = {}) => ({ iss: 'https://accounts.google.com', aud: 'google-client-test',
  sub: 'google-sub-test', nonce: 'nonce-test', exp: NOW / 1000 + 3600, iat: NOW / 1000,
  email: 'display@example.test', email_verified: true, ...changes });
const token = c => `${b64urlEncode(JSON.stringify({ alg: 'RS256' }))}.${b64urlEncode(JSON.stringify(c))}.signature`;
function ctx(env, path, { cookie = '', form = {}, user = null, now = NOW } = {}) {
  const url = new URL(path, ORIGIN);
  return { env, url, now, user, params: { provider: 'google' }, form: new URLSearchParams(form),
    request: new Request(url, { headers: cookie ? { Cookie: cookie } : {} }) };
}
const cookieValue = res => res.headers.getSetCookie().find(c => c.startsWith(`${OAUTH_COOKIE}=`)).split(';')[0];
async function start(env, opts = {}) {
  const res = await startLogin(ctx(env, '/auth/start/google', opts));
  const url = new URL(res.headers.get('Location'));
  return { res, url, state: url.searchParams.get('state'), nonce: url.searchParams.get('nonce'), cookie: cookieValue(res) };
}
async function add(env, u, sessionToken, opts = {}) {
  const cookie = `${SESSION_COOKIE}=${sessionToken}`;
  const session = await loadSession(env, ctx(env, '/admin/account', { cookie }).request, NOW);
  const res = await addGoogle(ctx(env, '/admin/account/add-google', { cookie, user: session.user, ...opts }));
  const url = new URL(res.headers.get('Location'), ORIGIN);
  return { res, url, state: url.searchParams.get('state'), nonce: url.searchParams.get('nonce'), cookie: `${cookie}; ${cookieValue(res)}` };
}
async function finish(env, flow, changes = {}, handler) {
  const stub = stubFetch(req => handler ? handler(req) : { id_token: token(claims({ nonce: flow.nonce, ...changes })) });
  try {
    const res = await callback(ctx(env, `/auth/callback/google?code=google-code&state=${flow.state}`, { cookie: flow.cookie }));
    return { res, calls: stub.calls };
  } finally { stub.restore(); }
}

test('Google only enables when both credentials are configured; disabled routes are 404', async () => {
  for (const env of [makeEnv(), makeEnv({ GOOGLE_CLIENT_ID: 'id' }), makeEnv({ GOOGLE_CLIENT_SECRET: 'secret' })]) {
    assert.deepEqual(enabledProviders(env), ['github']);
    await assert.rejects(startLogin(ctx(env, '/auth/start/google')), e => e instanceof HttpError && e.status === 404);
    await assert.rejects(callback(ctx(env, '/auth/callback/google')), e => e instanceof HttpError && e.status === 404);
    await assert.rejects(addGoogle(ctx(env, '/admin/account/add-google')), e => e instanceof HttpError && e.status === 404);
  }
  assert.deepEqual(enabledProviders(envOf()), ['github', 'google']);
});

test('Google authorization carries PKCE, nonce, no offline token, and only explicit account switching', () => {
  const env = envOf();
  const args = { state: 's', challenge: 'c', nonce: 'n' };
  const url = new URL(authorizeUrl(env, args));
  assert.equal(url.searchParams.get('scope'), 'openid email');
  assert.equal(url.searchParams.get('redirect_uri'), `${ORIGIN}/auth/callback/google`);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('nonce'), 'n');
  assert.equal(url.searchParams.has('access_type'), false);
  assert.equal(url.searchParams.has('prompt'), false);
  assert.equal(new URL(authorizeUrl(env, { ...args, selectAccount: true })).searchParams.get('prompt'), 'select_account');
});

test('Google claims reject wrong issuer, audience, times, nonce, subject and malformed tokens', () => {
  const env = envOf();
  const verify = jwt => verifyIdToken(env, jwt, { nonce: 'nonce-test', now: NOW });
  assert.equal(verify(token(claims())).sub, 'google-sub-test');
  assert.equal(verify(token(claims({ iss: 'accounts.google.com' }))).sub, 'google-sub-test');
  for (const patch of [{ iss: 'https://evil.test' }, { aud: 'wrong' }, { aud: ['google-client-test'] },
    { exp: NOW / 1000 - 31 }, { exp: '9999999999' }, { iat: NOW / 1000 + 31 },
    { iat: NOW / 1000 - 601 }, { iat: null }, { nonce: 'other' }, { nonce: ['nonce-test'] },
    { sub: '' }, { sub: 123 }, { sub: 'x'.repeat(256) }]) {
    assert.throws(() => verify(token(claims(patch))), e => e instanceof AuthError && e.code === 'expired');
  }
  for (const jwt of ['', null, 'a.b', 'a.!invalid.c', 'a.' + b64urlEncode('null') + '.c', 'a.' + 'a'.repeat(16384) + '.c']) {
    assert.throws(() => verify(jwt), e => e instanceof AuthError && e.code === 'expired');
  }
  // JSON numeric overflow must not bypass the expiration check.
  const overflow = JSON.stringify(claims()).replace(/"exp":\d+/, '"exp":1e999');
  assert.throws(() => verify(`a.${b64urlEncode(overflow)}.c`), e => e instanceof AuthError && e.code === 'expired');
});

test('Google exchange sends code verifier, returns only subject and verified display email', async () => {
  const env = envOf();
  for (const email_verified of [true, false, 'true']) {
    const stub = stubFetch(() => ({ id_token: token(claims({ email_verified })), access_token: 'must-not-persist' }));
    try {
      const id = await fetchIdentity(env, { code: 'test-code', verifier: 'test-verifier', nonce: 'nonce-test', now: NOW });
      assert.deepEqual(id, { subject: 'google-sub-test', email: email_verified === true ? 'display@example.test' : null });
      assert.equal(stub.calls.length, 1);
      const body = new URLSearchParams(await stub.calls[0].text());
      assert.equal(body.get('code_verifier'), 'test-verifier');
      assert.equal(body.get('client_secret'), env.GOOGLE_CLIENT_SECRET);
    } finally { stub.restore(); }
  }
});

test('Google provider errors and missing id token fail without exposing the provider response', async () => {
  const env = envOf();
  for (const handler of [() => { throw Error('network'); }, () => new Response('failed', { status: 500 }),
    () => new Response('not json'), () => ({ error: 'bad-code' })]) {
    const stub = stubFetch(handler);
    try { await assert.rejects(fetchIdentity(env, { code: 'c', verifier: 'v', nonce: 'nonce-test', now: NOW }),
      e => e instanceof AuthError && e.code === 'provider'); } finally { stub.restore(); }
  }
});

test('unknown Google email matching an existing person never links or creates a session', async () => {
  const env = envOf();
  seedUser(env.DB, { email: 'display@example.test', roles: ['role_admin'] });
  const flow = await start(env);
  const before = env.DB.totalChanges();
  const { res, calls } = await finish(env, flow);
  assert.equal(res.status, 403);
  assert.equal(calls.length, 1);
  assert.equal(env.DB.totalChanges(), before);
  assert.equal(env.DB.count('sessions'), 0);
});

test('known Google subject signs into its own person and refreshes display email', async () => {
  const env = envOf();
  const u = seedUser(env.DB, { provider: 'google', subject: 'google-sub-test', email: 'old@example.test' });
  const flow = await start(env, { form: { next: '/admin/account' } });
  const { res } = await finish(env, flow);
  assert.equal(res.headers.get('Location'), '/admin/account');
  assert.equal(env.DB.sqlite.prepare('SELECT user_id FROM sessions').get().user_id, u.userId);
  assert.equal(env.DB.sqlite.prepare('SELECT email FROM identities').get().email, 'display@example.test');
  assert.equal(env.DB.sqlite.prepare('SELECT action FROM audit_events').get().action, 'signin.ok');
});

test('Add Google requires a recent session and skips people who already have Google', async () => {
  const env = envOf();
  const u = seedUser(env.DB);
  const staleToken = await seedSession(env.DB, { ...u, now: NOW - 600000 });
  const request = ctx(env, '/admin/account', { cookie: `${SESSION_COOKIE}=${staleToken}` }).request;
  const session = await loadSession(env, request, NOW);
  const res = await addGoogle(ctx(env, '/admin/account/add-google', { user: session.user }));
  assert.equal(res.headers.get('Location'), '/admin/account');
  assert.equal(res.headers.getSetCookie().length, 0);
  const recentToken = await seedSession(env.DB, { ...u, now: NOW });
  env.DB.sqlite.prepare("INSERT INTO identities (id, user_id, provider, subject, created_at) VALUES (?, ?, 'google', ?, ?)")
    .run('already-google', u.userId, 'already-google-sub', NOW);
  const recent = await loadSession(env, ctx(env, '/admin/account', { cookie: `${SESSION_COOKIE}=${recentToken}` }).request, NOW);
  const already = await addGoogle(ctx(env, '/admin/account/add-google', { user: recent.user }));
  assert.equal(already.headers.get('Location'), '/admin/account');
  assert.equal(already.headers.getSetCookie().length, 0);
});

test('Add Google seals the signed-in user and uses chooser; callback inserts method and one audit only', async () => {
  const env = envOf();
  const u = seedUser(env.DB);
  const sessionToken = await seedSession(env.DB, { ...u, now: NOW });
  const flow = await add(env, u, sessionToken);
  assert.equal(flow.url.searchParams.get('prompt'), 'select_account');
  const st = await openState(env, 'google', flow.cookie.split(`${OAUTH_COOKIE}=`)[1], NOW);
  assert.equal(st.l, u.userId);
  const { res } = await finish(env, flow);
  assert.equal(res.headers.get('Location'), '/admin/account?added=google');
  assert.equal(env.DB.sqlite.prepare("SELECT user_id FROM identities WHERE provider = 'google'").get().user_id, u.userId);
  assert.equal(env.DB.count('sessions'), 1, 'linking preserves the existing session');
  assert.equal(env.DB.sqlite.prepare('SELECT action FROM audit_events').get().action, 'identity.add');
});

test('Add Google rejects ended sessions, switched users, and a subject already belonging to somebody else', async () => {
  for (const reason of ['ended', 'switched', 'taken']) {
    const env = envOf();
    const u = seedUser(env.DB);
    const sessionToken = await seedSession(env.DB, { ...u, now: NOW });
    const flow = await add(env, u, sessionToken);
    if (reason === 'ended') env.DB.sqlite.prepare('DELETE FROM sessions').run();
    if (reason === 'switched') {
      const other = seedUser(env.DB);
      const otherToken = await seedSession(env.DB, { ...other, now: NOW });
      flow.cookie = flow.cookie.replace(sessionToken, otherToken);
    }
    if (reason === 'taken') seedUser(env.DB, { provider: 'google', subject: 'google-sub-test' });
    const before = env.DB.totalChanges();
    const { res } = await finish(env, flow);
    assert.equal(env.DB.totalChanges(), before, reason);
    assert.match(res.headers.get('Location'), reason === 'taken' ? /e=google_taken/ : /e=expired_session/);
  }
});

test('Add Google transaction rechecks session revocation and concurrent Google attachment without false success', async () => {
  for (const race of ['revoked', 'another-google']) {
    const env = envOf();
    const u = seedUser(env.DB);
    const sessionToken = await seedSession(env.DB, { ...u, now: NOW });
    const flow = await add(env, u, sessionToken);
    const batch = env.DB.batch.bind(env.DB);
    env.DB.batch = async stmts => {
      if (race === 'revoked') env.DB.sqlite.prepare('DELETE FROM sessions WHERE id_hash = ?').run(await sha256Hex(sessionToken));
      else env.DB.sqlite.prepare("INSERT INTO identities (id, user_id, provider, subject, created_at) VALUES (?, ?, 'google', ?, ?)")
        .run('concurrent-method', u.userId, 'other-google-sub', NOW);
      return batch(stmts);
    };
    const { res } = await finish(env, flow);
    assert.equal(res.headers.get('Location'), '/admin/account');
    assert.equal(env.DB.count('audit_events'), 0);
    assert.equal(env.DB.sqlite.prepare("SELECT count(*) AS n FROM identities WHERE provider = 'google'").get().n,
      race === 'revoked' ? 0 : 1);
  }
});


// Force both live handlers past their identity/session reads before allowing either write.
// The actual SQL transaction, rather than the test fixture, decides which callback wins.
test('two concurrent Google callbacks for one person attach only one method and audit', async () => {
  const env = envOf();
  const u = seedUser(env.DB);
  const sessionToken = await seedSession(env.DB, { ...u, now: NOW });
  const flows = [await add(env, u, sessionToken), await add(env, u, sessionToken)];
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  const batch = env.DB.batch.bind(env.DB);
  let arrivals = 0;
  env.DB.batch = async stmts => {
    if (++arrivals === 2) release();
    await ready;
    return batch(stmts);
  };
  const stub = stubFetch(async req => {
    const i = Number(new URLSearchParams(await req.text()).get('code'));
    return { id_token: token(claims({ nonce: flows[i].nonce, sub: `concurrent-sub-${i}` })) };
  });
  try {
    const responses = await Promise.all(flows.map((flow, i) => callback(ctx(env,
      `/auth/callback/google?code=${i}&state=${flow.state}`, { cookie: flow.cookie }))));
    assert.deepEqual(responses.map(res => res.headers.get('Location')).sort(),
      ['/admin/account', '/admin/account?added=google']);
    assert.equal(env.DB.sqlite.prepare("SELECT count(*) AS n FROM identities WHERE provider = 'google'").get().n, 1);
    assert.equal(env.DB.count('audit_events'), 1);
    assert.equal(env.DB.count('sessions'), 1);
  } finally { stub.restore(); }
});

test('two people concurrently claiming one Google subject produce one link and one google_taken', async () => {
  const env = envOf();
  const users = [seedUser(env.DB), seedUser(env.DB)];
  const flows = [];
  for (const u of users) {
    const sessionToken = await seedSession(env.DB, { ...u, now: NOW });
    flows.push(await add(env, u, sessionToken));
  }
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  const batch = env.DB.batch.bind(env.DB);
  let arrivals = 0;
  env.DB.batch = async stmts => {
    if (++arrivals === 2) release();
    await ready;
    return batch(stmts);
  };
  const stub = stubFetch(async req => {
    const i = Number(new URLSearchParams(await req.text()).get('code'));
    return { id_token: token(claims({ nonce: flows[i].nonce })) };
  });
  try {
    const responses = await Promise.all(flows.map((flow, i) => callback(ctx(env,
      `/auth/callback/google?code=${i}&state=${flow.state}`, { cookie: flow.cookie }))));
    assert.deepEqual(responses.map(res => res.headers.get('Location')).sort(),
      ['/admin/account?added=google', '/admin/account?e=google_taken']);
    assert.equal(env.DB.sqlite.prepare("SELECT count(*) AS n FROM identities WHERE provider = 'google'").get().n, 1);
    assert.equal(env.DB.count('audit_events'), 1);
  } finally { stub.restore(); }
});

test('signout while Google callback awaits its transaction prevents linking and success notice', async () => {
  const env = envOf();
  const u = seedUser(env.DB);
  const sessionToken = await seedSession(env.DB, { ...u, now: NOW });
  const flow = await add(env, u, sessionToken);
  let atBatch;
  const entered = new Promise(resolve => { atBatch = resolve; });
  let resume;
  const proceed = new Promise(resolve => { resume = resolve; });
  const batch = env.DB.batch.bind(env.DB);
  env.DB.batch = async stmts => { atBatch(); await proceed; return batch(stmts); };
  const stub = stubFetch(() => ({ id_token: token(claims({ nonce: flow.nonce })) }));
  try {
    const pending = callback(ctx(env, `/auth/callback/google?code=c&state=${flow.state}`, { cookie: flow.cookie }));
    await entered;
    const out = await signout(ctx(env, '/auth/signout', { cookie: `${SESSION_COOKIE}=${sessionToken}` }));
    assert.equal(out.status, 303);
    resume();
    const res = await pending;
    assert.equal(res.headers.get('Location'), '/admin/account');
    assert.equal(env.DB.count('sessions'), 0);
    assert.equal(env.DB.count('identities'), 1);
    assert.equal(env.DB.count('audit_events'), 0);
  } finally { resume(); stub.restore(); }
});
