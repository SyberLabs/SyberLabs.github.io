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
const POSTS = ['/auth/start/github', '/auth/signout', '/admin/changes', '/admin/people/invite', '/admin/roles',
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
    GOOGLE_CLIENT_SECRET: 'sekret-canary-2',
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

test('Google is optional: without both of its values the button and its routes are gone, GitHub still works', async () => {
  for (const missing of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']) {
    const env = makeEnv({ [missing]: undefined });
    const page = await call(env, '/auth/signin');
    assert.equal(page.status, 200);
    const body = await page.text();
    assert.match(body, /action="\/auth\/start\/github"/);
    assert.doesNotMatch(body, /\/auth\/start\/google/);
    const start = await handle(new Request('https://syberlabs.io/auth/start/google', { method: 'POST', headers: { Origin: 'https://syberlabs.io', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'next=%2Fadmin%2F' }), env);
    assert.equal(start.status, 404);
    const cb = await call(env, '/auth/callback/google?code=x&state=y');
    assert.equal(cb.status, 404);
  }
});
