// Cases 1, 2, 10 (through handle) and 17's route-level parts: the table, deny by default, HEAD and 405
// rules, the /admin 308 and CSRF.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES, TABLE, compile, match, ownerPage } from '../routes.js';
import { CATALOGUE, PUBLIC, SIGNED_IN } from '../permissions.js';
import { call, makeEnv, signIn } from './helpers.js';

const noop = () => {};

test('case 1: every route has a valid access slot and PUBLIC sits only under /auth/', () => {
  assert.equal(TABLE.length, ROUTES.length);
  for (const r of TABLE) {
    assert.ok(r.access === PUBLIC || r.access === SIGNED_IN || r.access in CATALOGUE, r.pattern);
    if (r.access === PUBLIC) assert.ok(r.pattern.startsWith('/auth/'), r.pattern);
    assert.equal(typeof r.handler, 'function', r.pattern);
  }
  assert.throws(() => compile([['GET  /admin/x', undefined, noop]]), /access/);
  assert.throws(() => compile([['GET  /admin/x', 'site:nope.read', noop]]), /access/);
  assert.throws(() => compile([['GET  /admin/x', PUBLIC, noop]]), /PUBLIC/);
  assert.throws(() => compile([['GET  /api/x', PUBLIC, noop]]), /PUBLIC/);
  // RFC-0002 R1-8: no JSON API.
  assert.ok(TABLE.every(r => !r.pattern.startsWith('/api')));
  assert.ok(TABLE.every(r => !('opts' in r)));
  assert.throws(() => compile([['GET  /admin/x', SIGNED_IN]]), /handler/);
  assert.throws(() => compile([['PUT  /admin/x', SIGNED_IN, noop]]), /method/);
  assert.doesNotThrow(() => compile([['GET  /auth/x', PUBLIC, noop]]));
});

test('match: params, HEAD as GET, known path with another method, unknown', () => {
  const cb = match(TABLE, 'GET', '/auth/callback/github');
  assert.equal(cb.route.pattern, '/auth/callback/:provider');
  assert.deepEqual(cb.params, { provider: 'github' });
  assert.equal(match(TABLE, 'HEAD', '/admin/people').route.pattern, '/admin/people');
  assert.deepEqual(match(TABLE, 'GET', '/admin/people/invite'), { methods: ['POST'] });
  assert.deepEqual(match(TABLE, 'POST', '/admin/changes').route.method, 'POST');
  assert.equal(match(TABLE, 'GET', '/admin/nope'), null);
  assert.equal(match(TABLE, 'GET', '/auth/callback/'), null);
  assert.equal(match(TABLE, 'GET', '/admin/changes/'), null);
  assert.equal(match(TABLE, 'GET', '/auth/callback/%E0%A4%A'), null);
});

test('ownerPage: a signed-out POST returns to the page that owns the form', () => {
  assert.equal(ownerPage(TABLE, '/admin/people/roles/grant'), '/admin/people');
  assert.equal(ownerPage(TABLE, '/admin/account/signout-everywhere'), '/admin/account');
  assert.equal(ownerPage(TABLE, '/admin/changes'), '/admin/changes');
  assert.equal(ownerPage(TABLE, '/admin/changes/delete'), '/admin/changes');
  assert.equal(ownerPage(TABLE, '/admin/peoplex'), '/admin/');
  assert.equal(ownerPage(TABLE, '/admin/whatever'), '/admin/');
});

test('case 1: unknown paths are 303 / 404 signed out, 404 signed in, always as HTML', async () => {
  const env = makeEnv();
  let res = await call(env, '/admin/x');
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), '/auth/signin?next=%2Fadmin%2Fx');
  res = await call(env, '/api/x');
  assert.equal(res.status, 404);
  assert.match(res.headers.get('Content-Type'), /^text\/html/);
  assert.equal((await call(env, '/auth/nope')).status, 404);
  assert.equal((await call(env, '/')).status, 404);

  const { cookie } = await signIn(env.DB, { roles: ['role_admin'] });
  for (const p of ['/admin/x', '/admin/changes/', '/api/x', '/auth/nope']) {
    res = await call(env, p, { cookie });
    assert.equal(res.status, 404, p);
  }
});

test('case 1: GET /admin is a 308 to /admin/, keeping the query', async () => {
  const env = makeEnv();
  let res = await call(env, '/admin');
  assert.equal(res.status, 308);
  assert.equal(res.headers.get('Location'), '/admin/');
  res = await call(env, '/admin?welcome=1');
  assert.equal(res.headers.get('Location'), '/admin/?welcome=1');
});

test('case 1: HEAD gets GET\'s status and headers with no body, except 405 under start and callback', async () => {
  const env = makeEnv();
  const { cookie } = await signIn(env.DB, { roles: ['role_admin'] });
  for (const p of ['/admin/', '/admin/people', '/admin/account', '/auth/signin']) {
    const get = await call(env, p, { cookie });
    const head = await call(env, p, { cookie, method: 'HEAD' });
    assert.equal(head.status, get.status, p);
    assert.equal(head.headers.get('Content-Type'), get.headers.get('Content-Type'), p);
    assert.equal(head.headers.get('Content-Security-Policy'), get.headers.get('Content-Security-Policy'), p);
    assert.equal(await head.text(), '', p);
  }
  for (const p of ['/auth/start/github', '/auth/callback/github', '/auth/callback/google']) {
    const res = await call(env, p, { method: 'HEAD' });
    assert.equal(res.status, 405, p);
    assert.equal(await res.text(), '', p);
  }
});

test('case 1: other methods, and known paths with the wrong method, are 405', async () => {
  const env = makeEnv();
  const { cookie } = await signIn(env.DB, { roles: ['role_admin'] });
  for (const method of ['PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
    const res = await call(env, '/admin/changes', { method, cookie });
    assert.equal(res.status, 405, method);
  }
  let res = await call(env, '/admin/people/invite', { cookie });
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('Allow'), 'POST');
  res = await call(env, '/auth/start/github');
  assert.equal(res.status, 405);
  res = await call(env, '/admin/people', { cookie, form: {} });
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('Allow'), 'GET, HEAD');
  assert.match(res.headers.get('Content-Type'), /^text\/html/);
});

test('case 2: signed out, gated pages 303 with an empty body and no entry text', async () => {
  const env = makeEnv();
  env.DB.sqlite.prepare(`INSERT INTO change_entries (id, date, project, state, title, text, href, created_at)
    VALUES ('c1', '2026-10-01', 'RISE', 'merged', 'Secret entry title', 'Secret entry text', '/x', 1)`).run();
  for (const p of ['/admin/', '/admin/changes', '/admin/account', '/admin/people', '/admin/audit']) {
    const res = await call(env, p);
    assert.equal(res.status, 303, p);
    assert.equal(res.headers.get('Location'), `/auth/signin?next=${encodeURIComponent(p)}`);
    assert.equal(await res.text(), '', p);
  }
});

test('signed-out GET keeps its query in next; a signed-out POST returns to the owning page', async () => {
  const env = makeEnv();
  let res = await call(env, '/admin/changes?edit=abc');
  assert.equal(res.headers.get('Location'), '/auth/signin?next=%2Fadmin%2Fchanges%3Fedit%3Dabc');
  const before = env.DB.totalChanges();
  res = await call(env, '/admin/people/roles/grant', { form: { user: 'u', role: 'role_admin' } });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), '/auth/signin?next=%2Fadmin%2Fpeople');
  res = await call(env, '/admin/account/signout-everywhere', { form: {} });
  assert.equal(res.headers.get('Location'), '/auth/signin?next=%2Fadmin%2Faccount');
  assert.equal(env.DB.totalChanges(), before);
});

test('case 10: POSTs without our exact Origin, or with Sec-Fetch-Site other than same-origin, get 403', async () => {
  const env = makeEnv();
  const { cookie, userId } = await signIn(env.DB, { roles: ['role_admin'] });
  const before = env.DB.totalChanges();
  const tries = [
    { origin: false },
    { origin: 'null' },
    { origin: 'https://sketch.syberlabs.io' },
    { origin: 'https://staging.syberlabs.io' },
    { origin: 'http://syberlabs.io' },
    { origin: true, headers: { 'Sec-Fetch-Site': 'same-site' } },
    { origin: true, headers: { 'Sec-Fetch-Site': 'cross-site' } },
  ];
  for (const t of tries) {
    for (const path of ['/admin/account/signout-everywhere', '/auth/start/github', '/admin/people/disable']) {
      const res = await call(env, path, { cookie, form: { user: userId }, ...t });
      assert.equal(res.status, 403, `${path} ${JSON.stringify(t)}`);
      assert.match(await res.text(), /another site or an old tab/);
    }
  }
  assert.equal(env.DB.totalChanges(), before);
  // Same-origin passes the check.
  const ok = await call(env, '/admin/account/signout-everywhere', { cookie, form: {}, headers: { 'Sec-Fetch-Site': 'same-origin' } });
  assert.equal(ok.status, 303);
});

test('signed in without the route key: 403 page naming the permission', async () => {
  const env = makeEnv();
  const { cookie } = await signIn(env.DB, { roles: ['role_viewer'] });
  let res = await call(env, '/admin/people', { cookie });
  assert.equal(res.status, 403);
  assert.match(await res.text(), /See staff accounts/);
  res = await call(env, '/admin/', { cookie });
  assert.equal(res.status, 200);
});
