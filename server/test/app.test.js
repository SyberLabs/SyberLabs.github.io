// Cases 11 (through handle) and 17: headers on every response, the canonical host, fail-closed config,
// no secret anywhere in a response, and a signed-in GET that writes nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../app.js';
import { brokenDb } from './d1-shim.js';
import { ORIGIN, SESSION_COOKIE, HOUR, call, makeEnv, seedSession, seedUser, setCookies, signIn, stubFetch } from './helpers.js';

const PATHS = ['/admin/', '/admin', '/admin/changes', '/admin/people', '/admin/roles', '/admin/audit', '/admin/account',
  '/admin/nope', '/auth/signin', '/auth/signin?e=expired',
  '/auth/callback/github?code=c&state=s', '/auth/nope'];
const POSTS = ['/auth/start/github', '/auth/signout', '/admin/changes', '/admin/people/add', '/admin/roles',
  '/admin/account/signout-everywhere'];

function assertHeaders(res, label) {
  const csp = res.headers.get('Content-Security-Policy') || '';
  assert.match(csp, /default-src 'none'/, label);
  assert.match(csp, /frame-ancestors 'none'/, label);
  assert.doesNotMatch(csp, /script-src|connect-src/, label);
  assert.equal(res.headers.get('Cache-Control'), 'no-store', label);
  assert.equal(res.headers.get('X-Robots-Tag'), 'noindex, nofollow', label);
  assert.equal(res.headers.get('X-Frame-Options'), 'DENY', label);
  assert.equal(res.headers.get('Referrer-Policy'), 'same-origin', label);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), null, label);
  assert.doesNotMatch(res.headers.get('Clear-Site-Data') || '', /cookies/, label);
}

test('case 17: every response, signed in or out, carries the security headers and no CORS', async () => {
  const env = makeEnv();
  const { cookie } = await signIn(env.DB, { roles: ['role_admin'] });
  for (const c of [undefined, cookie, `${SESSION_COOKIE}=deadbeef`]) {
    for (const p of PATHS) assertHeaders(await call(env, p, { cookie: c }), `${p} ${c ? 'cookie' : ''}`);
    for (const p of POSTS) assertHeaders(await call(env, p, { cookie: c, form: {}, origin: false }), `POST ${p}`);
  }
  assertHeaders(await call(env, '/admin/', { host: 'https://syberlabs-home.pages.dev' }), 'host');
  assertHeaders(await call(makeEnv({ DB: undefined }), '/admin/'), '503');
});

test('case 17: a non-canonical host gets 308 to ORIGIN with the same path and query, before anything else', async () => {
  const env = makeEnv({ DB: brokenDb() });
  for (const host of ['https://syberlabs-home.pages.dev', 'https://abc123.syberlabs-home.pages.dev', 'http://syberlabs.io',
    'https://www.syberlabs.io']) {
    for (const method of ['GET', 'POST', 'HEAD']) {
      const res = await call(env, '/admin/changes?x=1', { host, method, origin: false });
      assert.equal(res.status, 308, `${host} ${method}`);
      assert.equal(res.headers.get('Location'), `${ORIGIN}/admin/changes?x=1`);
    }
  }
});

test('case 17: missing config is 503 on every routed path, and so is a D1 throw', async () => {
  const keys = ['ORIGIN', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'APP_SECRET', 'DB'];
  const envs = keys.map(k => makeEnv({ [k]: undefined }));
  // APP_SECRET is the AES-GCM key itself: anything but 32 bytes is unconfigured, not a 503 at first use.
  for (const bad of ['too-short', 'x'.repeat(40), 'sekret-canary-3-0123456789abcdefghijklmnopqrstuvwxyz']) {
    envs.push(makeEnv({ APP_SECRET: bad }));
  }
  for (const env of envs) {
    for (const p of PATHS) {
      const res = await call(env, p);
      assert.equal(res.status, 503, p);
      assert.match(res.headers.get('Content-Type'), /^text\/html/, p);
      assert.match(await res.text(), /unavailable/i);
    }
  }
  // ORIGIN missing: no host to compare against, still 503 (and not a redirect loop).
  const res = await handle(new Request('https://syberlabs-home.pages.dev/admin/'), makeEnv({ ORIGIN: undefined }));
  assert.equal(res.status, 503);

  const broken = makeEnv({ DB: brokenDb() });
  const { cookie } = await signIn(makeEnv().DB, { roles: ['role_admin'] }); // a cookie the broken DB must look up
  const errors = [];
  const realError = console.error;
  console.error = (...a) => errors.push(a.join(' '));
  try {
    for (const p of ['/admin/', '/admin/changes', '/admin/people']) {
      const r = await call(broken, p, { cookie });
      assert.equal(r.status, 503, p);
    }
  } finally {
    console.error = realError;
  }
  for (const line of errors) assert.doesNotMatch(line, /simulated outage/); // no exception message in logs
});

test('case 17: canary secrets never appear in any body or header', async () => {
  const env = makeEnv({
    GITHUB_CLIENT_SECRET: 'sekret-canary-1',
    APP_SECRET: 'sekret-canary-3-0123456789abcdefghijklmnopq',
  });
  const fetchStub = stubFetch(() => new Response('nope', { status: 500 }));
  try {
    const { cookie } = await signIn(env.DB, { roles: ['role_admin'] });
    const check = async res => {
      const all = [...res.headers].map(([k, v]) => `${k}: ${v}`).join('\n') + '\n' + await res.text();
      assert.doesNotMatch(all, /sekret-canary/);
    };
    for (const c of [undefined, cookie]) {
      for (const p of PATHS) await check(await call(env, p, { cookie: c }));
      for (const p of POSTS) await check(await call(env, p, { cookie: c, form: { next: '/admin/' } }));
      for (const p of POSTS) await check(await call(env, p, { cookie: c, form: {}, origin: 'https://evil.example' }));
    }
    await check(await call(makeEnv({ DB: brokenDb(), GITHUB_CLIENT_SECRET: 'sekret-canary-1' }), '/admin/', { cookie }));
  } finally {
    fetchStub.restore();
  }
});

test('case 11: a signed-in GET writes zero rows and reads with permissions fresh each time', async () => {
  const env = makeEnv();
  const { cookie } = await signIn(env.DB, { roles: ['role_admin'] });
  const before = env.DB.totalChanges();
  for (const p of ['/admin/', '/admin/changes', '/admin/people', '/admin/roles', '/admin/audit', '/admin/account']) {
    const res = await call(env, p, { cookie });
    assert.equal(res.status, 200, p);
  }
  assert.equal(env.DB.totalChanges(), before);
});

// Every signed-in staff member lands on the portal, with links matching their current keys.
test('/admin/ renders a portal whose tool cards follow the current permissions', async () => {
  const env = makeEnv();
  const cases = [
    [['role_admin'], undefined, ['changes', 'people', 'roles', 'audit', 'saves', 'account']],
    [[], ['id:users.read', 'id:audit.read'], ['people', 'roles', 'audit', 'saves', 'account']],
    [[], ['id:audit.read'], ['audit', 'saves', 'account']],
    [[], [], ['saves', 'account']],
  ];
  for (const [roles, perms, tools] of cases) {
    const { cookie } = await signIn(env.DB, { roles, perms });
    const res = await call(env, '/admin/', { cookie });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Location'), null);
    assertHeaders(res, 'portal');
    const body = await res.text();
    assert.match(body, /<title>Portal · SyberLabs staff<\/title>/);
    assert.equal(body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(), 'Your launchpad.');
    const main = body.match(/<main[^>]*>([\s\S]*?)<\/main>/)[1];
    const cards = [...main.matchAll(/<a\b[^>]*>/g)].map(m => m[0]).filter(tag => /class="[^"]*\bportal-card\b/.test(tag)).map(tag => tag.match(/href="\/admin\/([^"/]+)"/)[1]);
    assert.deepEqual(cards, tools);
    assert.doesNotMatch(body, /<script/i);
  }
});

test('portal access requires a live staff session and follows revoked permissions immediately', async () => {
  const env = makeEnv();
  const unsigned = await call(env, '/admin/');
  assert.equal(unsigned.status, 303);
  assert.match(unsigned.headers.get('Location'), /^\/auth\/signin\?next=/);
  assert.doesNotMatch(await unsigned.text(), /Your launchpad/);

  const founder = await signIn(env.DB, { roles: ['role_admin'] });
  const head = await call(env, '/admin/', { method: 'HEAD', cookie: founder.cookie });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assertHeaders(head, 'portal HEAD');

  const user = await signIn(env.DB, { perms: ['id:audit.read'] });
  const initial = await call(env, '/admin/', { cookie: user.cookie });
  assert.match(await initial.text(), /<a\b(?=[^>]*class="[^"]*\bportal-card\b)(?=[^>]*href="\/admin\/audit")[^>]*>/);
  env.DB.sqlite.prepare('DELETE FROM user_roles WHERE user_id = ?').run(user.userId);
  const refreshed = await call(env, '/admin/', { cookie: user.cookie });
  assert.equal(refreshed.status, 200);
  assert.doesNotMatch(await refreshed.text(), /href="\/admin\/audit"/);
  assert.equal((await call(env, '/admin/audit', { cookie: user.cookie })).status, 403);
});

// RFC-0002 2.3, test 3: a session cookie that is not 43 base64url characters counts as absent and costs no
// D1 query; it is still expired, like any cookie that does not resolve.
test('a malformed session cookie on /admin/ makes zero D1 queries and is expired', async () => {
  const env = makeEnv();
  let queries = 0;
  const real = env.DB;
  env.DB = { prepare: (...a) => { queries++; return real.prepare(...a); }, batch: (...a) => { queries++; return real.batch(...a); } };
  for (const bad of ['short', 'A'.repeat(44), `${'A'.repeat(42)}!`]) {
    const res = await call(env, '/admin/', { cookie: `${SESSION_COOKIE}=${bad}` });
    assert.equal(res.status, 303, bad);
    assert.equal(res.headers.get('Location'), '/auth/signin?next=%2Fadmin%2F&e=expired_session', bad);
    assert.match(setCookies(res).find(c => c.startsWith(`${SESSION_COOKIE}=`)), /Max-Age=0/, bad);
  }
  assert.equal(queries, 0);
});

test('case 11: an expired session redirects with e=expired_session and clears the cookie; nothing is written', async () => {
  const env = makeEnv();
  const user = seedUser(env.DB, { roles: ['role_admin'] });
  const token = await seedSession(env.DB, { ...user, now: Date.now() - 13 * HOUR });
  const cookie = `${SESSION_COOKIE}=${token}`;
  const off = await signIn(env.DB, { roles: ['role_admin'], disabled: true });
  const before = env.DB.totalChanges();
  let res = await call(env, '/admin/changes', { cookie });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), '/auth/signin?next=%2Fadmin%2Fchanges&e=expired_session');
  const cleared = setCookies(res).find(c => c.startsWith(`${SESSION_COOKIE}=`));
  assert.match(cleared, /Max-Age=0/);
  // A disabled user's surviving row authenticates nobody either.
  res = await call(env, '/admin/', { cookie: off.cookie });
  assert.equal(res.status, 303);
  assert.match(res.headers.get('Location'), /e=expired_session/);
  assert.equal(env.DB.totalChanges(), before);
});

// Review round 4, finding 1 (RFC-0002 R4-8, 2.3, test 9): the cookie outlives its session by an hour, so a
// browser back 30 min after the 12 h expiry still presents it and is told why it has to sign in again.
test('a session that ended 30 min ago, inside the 13 h cookie, gets e=expired_session', async () => {
  const env = makeEnv();
  const user = seedUser(env.DB, { roles: ['role_admin'] });
  const token = await seedSession(env.DB, { ...user, now: Date.now() - 12.5 * HOUR });
  const before = env.DB.totalChanges();
  const res = await call(env, '/admin/changes', { cookie: `${SESSION_COOKIE}=${token}` });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), '/auth/signin?next=%2Fadmin%2Fchanges&e=expired_session');
  assert.match(setCookies(res).find(c => c.startsWith(`${SESSION_COOKIE}=`)), /Max-Age=0/);
  assert.equal(env.DB.totalChanges(), before);
});

// RFC-0002 8.5 test 14: the POST's owning page is the next, and the expired row is neither used nor touched.
test('an expired session on POST signout-everywhere returns to /admin/account and writes nothing', async () => {
  const env = makeEnv();
  const user = seedUser(env.DB, { roles: ['role_admin'] });
  const token = await seedSession(env.DB, { ...user, now: Date.now() - 13 * HOUR });
  const before = env.DB.totalChanges();
  const res = await call(env, '/admin/account/signout-everywhere', { cookie: `${SESSION_COOKIE}=${token}`, form: {} });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), '/auth/signin?next=%2Fadmin%2Faccount&e=expired_session');
  assert.equal(await res.text(), '');
  assert.equal(env.DB.totalChanges(), before);
  assert.equal(env.DB.count('sessions'), 1);
  assert.equal(env.DB.count('audit_events'), 0);
});

test('case 11: no response anywhere sends Clear-Site-Data with cookies', async () => {
  const env = makeEnv();
  const { cookie } = await signIn(env.DB, { roles: ['role_admin'] });
  const res = await call(env, '/auth/signout', { cookie, form: {} });
  assert.equal(res.status, 303);
  assert.doesNotMatch(res.headers.get('Clear-Site-Data') || '', /cookies/);
  assert.equal(env.DB.count('sessions'), 0);
});

test('an oversized form is 413, not a crash', async () => {
  const env = makeEnv();
  const { cookie } = await signIn(env.DB, { roles: ['role_admin'] });
  const res = await call(env, '/admin/changes', { cookie, form: { text: 'x'.repeat(20000) } });
  assert.equal(res.status, 413);
});

// RFC-0002 Packet 5: Google is on only when both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set. Otherwise the
// page has one button, the CSP does not name Google, and every Google route answers like an unknown path.
test('Google is off unless both its values are set: one button, no Google in the CSP, its routes 404', async () => {
  for (const extra of [{}, { GOOGLE_CLIENT_ID: 'x.apps.googleusercontent.com' }, { GOOGLE_CLIENT_SECRET: 'y' },
    { GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: 'y' }]) {
    const env = makeEnv(extra);
    const label = JSON.stringify(extra);
    const page = await call(env, '/auth/signin?e=provider&p=google');
    const body = await page.text();
    assert.match(body, /action="\/auth\/start\/github"/, label);
    assert.doesNotMatch(body, /google/i, label);
    assert.match(body, /The sign-in provider didn(?:&#39;|')t finish the sign-in/, `${label}: p=google is ignored`);
    assert.doesNotMatch(page.headers.get('Content-Security-Policy'), /google/, label);
    assert.equal((await call(env, '/auth/start/google', { form: { next: '/admin/' } })).status, 404, label);
    assert.equal((await call(env, '/auth/callback/google?code=x&state=y')).status, 404, label);
    const { cookie } = await signIn(env.DB, { roles: ['role_admin'] });
    assert.equal((await call(env, '/admin/account/add-google', { cookie, form: {} })).status, 404, label);
    assert.equal((await call(env, '/admin/account/add-google', { cookie })).status, 404, `${label}: GET too`);
    const account = await (await call(env, '/admin/account?added=google&e=google_taken', { cookie })).text();
    assert.doesNotMatch(account, /google/i, label);
  }
});

// Review round 3, finding 3 (RFC-0002 2.2, 8.2): sign-out is PUBLIC, so "Sign out and switch account"
// still reaches the account picker after the session ended, and a dead cookie is still expired.
test('sign out with an expired or deleted session keeps next and switch=1 and expires the cookie', async () => {
  const env = makeEnv();
  const user = seedUser(env.DB, { roles: ['role_viewer'] });
  const expired = await seedSession(env.DB, { ...user, now: Date.now() - 13 * HOUR });
  const deleted = 'A'.repeat(43);
  for (const token of [expired, deleted]) {
    const before = env.DB.count('audit_events');
    const res = await call(env, '/auth/signout', { cookie: `${SESSION_COOKIE}=${token}`, form: { next: '/admin/people', switch: '1' } });
    assert.equal(res.status, 303);
    assert.equal(res.headers.get('Location'), '/auth/signin?e=signed_out&next=%2Fadmin%2Fpeople&switch=1');
    assert.ok(setCookies(res).some(c => c.startsWith(`${SESSION_COOKIE}=;`) && c.includes('Max-Age=0')));
    assert.equal(env.DB.count('audit_events'), before);
  }
  assert.equal(env.DB.count('sessions'), 0, 'the expired row the cookie named is deleted too');
  // No cookie at all: the same landing, still CSRF-checked.
  const none = await call(env, '/auth/signout', { form: { switch: '1' } });
  assert.equal(none.headers.get('Location'), '/auth/signin?e=signed_out&switch=1');
  assert.equal((await call(env, '/auth/signout', { form: {}, origin: 'https://sketch.syberlabs.io' })).status, 403);
  // The landing page's button asks GitHub for the account picker.
  const page = await (await call(env, none.headers.get('Location'))).text();
  assert.match(page, /You(&#39;|')re signed out\. Choose the account to use\./);
  assert.match(page, /name="switch" value="1"/);
});
