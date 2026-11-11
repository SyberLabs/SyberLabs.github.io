// telemetry.v1 conformance for site.request (MasterMind docs/contracts/telemetry-v1.md, RFC 0004): one data point
// per response from handle(), only the allowlist's fields and values, route templates instead of paths, no input
// text in any field, responses byte-identical with the binding absent, present and throwing, and the binding in
// the production configuration only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { handle } from '../app.js';
import { TABLE } from '../routes.js';
import { ERRORS } from '../http.js';
import { sitePoint } from '../telemetry.js';
import { RELEASE } from '../release.js';
import { brokenDb } from './d1-shim.js';
import { ORIGIN, SESSION_COOKIE, call, makeEnv, signIn } from './helpers.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const ALLOWLIST = JSON.parse(await read('../../telemetry/events.json'));
const SPEC = ALLOWLIST.events['site.request'];
const API = '/admin/api/v1';
const OMNI = 'https://omni.syberlabs.io';
const RISE = 'https://rise.syberlabs.io';
const SKETCH = 'https://sketch.syberlabs.io';
const NOW = Date.now();

// The closed sets the free blobs must come from: the route table's templates and the account API's three, and the
// error codes the code itself names (ERRORS, the app's own, and every literal the account API fails with).
const ACCOUNT_SOURCE = await read('../account-api.js');
const TEMPLATES = new Set([...TABLE.map(r => r.pattern), `${API}/account`, `${API}/saves`, `${API}/saves/:id`, 'unmatched']);
const CODES = new Set([...Object.keys(ERRORS), 'forbidden', 'unavailable', 'none',
  ...[...ACCOUNT_SOURCE.matchAll(/failure\('([a-z_]+)'|code: '([a-z_]+)'/g)].map(m => m[1] || m[2])]);

const recorder = () => {
  const points = [];
  return { points, writeDataPoint: point => { points.push(point); } };
};

// helpers.call, plus a raw body for the account API's JSON save.
async function send(env, path, opts = {}) {
  if (opts.body === undefined) return call(env, path, opts);
  const headers = new Headers(opts.headers || {});
  if (opts.cookie) headers.set('Cookie', opts.cookie);
  if (opts.origin) headers.set('Origin', opts.origin);
  return handle(new Request(new URL(path, ORIGIN), { method: opts.method || 'POST', headers, body: opts.body }), env, opts.now);
}
const field = (point, name) => point.blobs[1 + SPEC.blobs.findIndex(b => b.name === name)];
const fields = point => Object.fromEntries(SPEC.blobs.map(b => [b.name, field(point, b.name)]));

// An admin with one omni backup, a viewer, and the requests every test below replays: pages, redirects, refusals
// and the account API from each consumer origin.
async function fixture() {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'], now: NOW });
  const viewer = await signIn(env.DB, { roles: ['role_viewer'], now: NOW });
  const saveId = 'save-fixture-0123456789';
  env.DB.sqlite.prepare('INSERT INTO account_saves (id, user_id, app, name, payload, bytes, request_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(saveId, admin.userId, 'omni', 'Private workspace', '{"documents":["hello"]}', 23, randomUUID(), NOW);
  const expect = { 'X-SyberLabs-Expected-User': admin.userId };
  const requests = [
    ['/auth/signin', {}],
    ['/auth/signin?e=expired', {}],
    ['/auth/callback/github?code=c&state=s', {}],
    ['/admin/', {}],
    ['/admin/', { cookie: admin.cookie }],
    ['/admin/', { cookie: admin.cookie, method: 'HEAD' }],
    ['/admin', {}],
    ['/admin/people', { cookie: admin.cookie }],
    ['/admin/people', { cookie: viewer.cookie }],
    ['/admin/nope', { cookie: admin.cookie }],
    ['/admin/changes', { cookie: admin.cookie, method: 'PUT' }],
    ['/admin/people/add', { cookie: admin.cookie }],
    ['/auth/start/github', { method: 'HEAD' }],
    ['/admin/people/add', { cookie: admin.cookie, form: { account: 'octocat' }, origin: 'https://evil.example' }],
    ['/auth/signout', { form: {} }],
    [`/admin/saves/${saveId}/download`, { cookie: admin.cookie }],
    ['/admin/saves/missing-save-id/download', { cookie: admin.cookie }],
    ['/admin/changes?x=1', { host: 'https://syberlabs-home.pages.dev' }],
    [`${API}/account`, { headers: { Origin: RISE } }],
    [`${API}/account`, { cookie: admin.cookie, headers: { Origin: OMNI } }],
    [`${API}/account`, { cookie: admin.cookie }],
    [`${API}/saves`, { method: 'OPTIONS', origin: SKETCH, headers: {
      'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type, x-syberlabs-account' } }],
    [`${API}/saves?app=omni`, { cookie: admin.cookie, headers: { ...expect, Origin: OMNI } }],
    [`${API}/saves/${saveId}`, { cookie: admin.cookie, headers: { ...expect, Origin: OMNI } }],
    [`${API}/saves/${saveId}`, { cookie: admin.cookie, headers: { ...expect, Origin: RISE } }],
    [`${API}/saves`, { cookie: admin.cookie, method: 'POST', origin: 'https://evil.example', headers: expect }],
    [`${API}/nope/deeper`, { cookie: admin.cookie }],
  ];
  return { env, admin, viewer, saveId, requests };
}

async function snapshot(res) {
  return { status: res.status, statusText: res.statusText, headers: [...res.headers], body: await res.text() };
}

test('responses are byte-identical with the EVENTS binding absent, present, throwing or malformed', async () => {
  const { env, requests } = await fixture();
  const recording = recorder();
  const variants = [
    { ...env },
    { ...env, EVENTS: recording },
    { ...env, EVENTS: { writeDataPoint() { throw new Error('analytics engine down'); } } },
    { ...env, EVENTS: {} },
  ];
  for (const [path, opts] of requests) {
    const seen = [];
    for (const variant of variants) seen.push(await snapshot(await call(variant, path, { ...opts, now: NOW })));
    for (let i = 1; i < seen.length; i++) assert.deepEqual(seen[i], seen[0], `${opts.method || 'GET'} ${path}, variant ${i}`);
  }
  assert.equal(recording.points.length, requests.length, 'one data point per response');

  // The failure paths too: D1 down and missing config, on a page and on the account API.
  const realError = console.error;
  console.error = () => {};
  try {
    const { cookie } = await signIn(makeEnv().DB, { roles: ['role_admin'] });
    for (const base of [makeEnv({ DB: brokenDb() }), makeEnv({ APP_SECRET: undefined })]) {
      for (const path of ['/admin/', `${API}/account`]) {
        const seen = [];
        for (const EVENTS of [undefined, recorder(), { writeDataPoint() { throw new Error('down'); } }]) {
          seen.push(await snapshot(await call({ ...base, EVENTS }, path, { cookie, now: NOW })));
        }
        assert.equal(seen[0].status, 503, path);
        for (let i = 1; i < seen.length; i++) assert.deepEqual(seen[i], seen[0], `${path}, variant ${i}`);
      }
    }
  } finally {
    console.error = realError;
  }
});

test('every data point holds only the allowlist: its fields, in order, from their closed sets', async () => {
  const { env, requests } = await fixture();
  const recording = recorder();
  env.EVENTS = recording;
  for (const [path, opts] of requests) await call(env, path, { ...opts, now: NOW });
  assert.equal(recording.points.length, requests.length);
  for (const point of recording.points) {
    const label = JSON.stringify(point);
    assert.deepEqual(Object.keys(point).sort(), ['blobs', 'doubles', 'indexes'], label);
    assert.deepEqual(point.indexes, ['site.request'], label);
    assert.equal(point.blobs.length, 1 + SPEC.blobs.length, label);
    assert.equal(point.blobs[0], 'site.request', label);
    for (const { name, values } of SPEC.blobs) if (values) assert.ok(values.includes(field(point, name)), `${name}: ${label}`);
    assert.equal(field(point, 'release'), RELEASE, label);
    assert.ok(TEMPLATES.has(field(point, 'route')), `route: ${label}`);
    assert.ok(CODES.has(field(point, 'code')), `code: ${label}`);
    assert.equal(point.doubles.length, SPEC.doubles.length, label);
    assert.equal(point.doubles[0], 1, label);
    assert.ok(Number.isFinite(point.doubles[1]) && point.doubles[1] >= 0, label);
  }
  assert.equal(RELEASE, 'unknown', 'the committed release.js; CI writes the short sha before the Function build');
});

test('routes are recorded as templates, with method, status class, error code and consumer app', async () => {
  const { env, admin, viewer, saveId } = await fixture();
  const recording = recorder();
  env.EVENTS = recording;
  const one = async (path, opts = {}) => {
    await send(env, path, { now: NOW, ...opts });
    return fields(recording.points.at(-1));
  };
  const at = (route, method, status, code, app) => ({ release: RELEASE, route, method, status, code, app });
  const expect = { 'X-SyberLabs-Expected-User': admin.userId };

  assert.deepEqual(await one(`/admin/saves/${saveId}/download`, { cookie: admin.cookie }), at('/admin/saves/:id/download', 'GET', '2xx', 'none', 'none'));
  assert.deepEqual(await one(`${API}/saves/${saveId}`, { cookie: admin.cookie, headers: { ...expect, Origin: OMNI } }), at(`${API}/saves/:id`, 'GET', '2xx', 'none', 'omni'));
  assert.deepEqual(await one(`${API}/saves/${saveId}`, { cookie: admin.cookie, headers: { ...expect, Origin: RISE } }), at(`${API}/saves/:id`, 'GET', '4xx', 'not_found', 'rise'));
  assert.deepEqual(await one('/auth/callback/github?code=c&state=s'), at('/auth/callback/:provider', 'GET', '3xx', 'none', 'none'));
  assert.deepEqual(await one(`${API}/account`, { headers: { Origin: RISE } }), at(`${API}/account`, 'GET', '4xx', 'signin_required', 'rise'));
  assert.deepEqual(await one(`${API}/saves?app=sketch`, { cookie: admin.cookie, headers: { Origin: SKETCH } }), at(`${API}/saves`, 'GET', '4xx', 'expected_user_required', 'sketch'));
  assert.deepEqual(await one(`${API}/saves`, { method: 'OPTIONS', origin: SKETCH, headers: { 'Access-Control-Request-Method': 'POST' } }), at(`${API}/saves`, 'OPTIONS', '2xx', 'none', 'sketch'));
  assert.deepEqual(await one(`${API}/saves`, { cookie: admin.cookie, method: 'POST', origin: OMNI, headers: { ...expect, 'Content-Type': 'application/json', 'X-SyberLabs-Account': 'v1' },
    body: JSON.stringify({ app: 'omni', name: 'n', payload: {}, requestId: randomUUID() }) }), at(`${API}/saves`, 'POST', '2xx', 'none', 'omni'));
  assert.deepEqual(await one(`${API}/nope/deeper`, { cookie: admin.cookie }), at('unmatched', 'GET', '4xx', 'not_found', 'none'));
  assert.deepEqual(await one('/admin/people/add', { cookie: admin.cookie, form: { account: 'octocat' }, origin: 'https://evil.example' }), at('/admin/people/add', 'POST', '4xx', 'csrf', 'none'));
  assert.deepEqual(await one('/admin/changes', { cookie: admin.cookie, form: {} }), at('/admin/changes', 'POST', '4xx', 'none', 'site'));
  assert.deepEqual(await one('/admin/changes', { cookie: admin.cookie, method: 'PUT' }), at('/admin/changes', 'other', '4xx', 'method_not_allowed', 'site'));
  assert.deepEqual(await one('/auth/start/github', { method: 'HEAD' }), at('/auth/start/:provider', 'HEAD', '4xx', 'method_not_allowed', 'none'));
  assert.deepEqual(await one('/admin/nope', { cookie: admin.cookie }), at('unmatched', 'GET', '4xx', 'not_found', 'none'));
  assert.deepEqual(await one('/admin/people', { cookie: viewer.cookie }), at('/admin/people', 'GET', '4xx', 'forbidden', 'none'));
  assert.deepEqual(await one('/admin/changes?x=1', { host: 'https://syberlabs-home.pages.dev' }), at('/admin/changes', 'GET', '3xx', 'none', 'none'));
  assert.deepEqual(await one('/admin/account/add-google', { cookie: admin.cookie }), at('unmatched', 'GET', '4xx', 'not_found', 'none'), 'Google off: not in the table');
  assert.deepEqual(await one('/admin/changes', { cookie: admin.cookie, form: { x: 'y'.repeat(20000) } }), at('/admin/changes', 'POST', '4xx', 'too_large', 'site'));

  const realError = console.error;
  console.error = () => {};
  try {
    const broken = { ...makeEnv({ DB: brokenDb() }), EVENTS: recording };
    await call(broken, '/admin/', { cookie: admin.cookie });
    assert.deepEqual(fields(recording.points.at(-1)), at('/admin/', 'GET', '5xx', 'unavailable', 'none'));
    await call(broken, `${API}/account`, { cookie: admin.cookie, headers: { Origin: OMNI } });
    assert.deepEqual(fields(recording.points.at(-1)), at(`${API}/account`, 'GET', '5xx', 'unavailable', 'omni'));
  } finally {
    console.error = realError;
  }
});

test('text pushed into every request field never reaches a data point', async () => {
  const { env, admin, saveId } = await fixture();
  const recording = recorder();
  env.EVENTS = recording;
  const canary = 'canary-7f3e';
  const tries = [
    [`/admin/saves/${canary}-save/download`, { cookie: admin.cookie }],
    [`/admin/changes?q=${canary}&e=${canary}`, { cookie: admin.cookie }],
    [`${API}/saves/${canary}-0123`, { cookie: admin.cookie, headers: { 'X-SyberLabs-Expected-User': admin.userId } }],
    [`${API}/saves?app=${canary}`, { cookie: admin.cookie, headers: { 'X-SyberLabs-Expected-User': `${canary}-user` } }],
    [`/auth/${canary}`, { headers: { 'User-Agent': `Mozilla/5.0 ${canary}`, 'CF-Connecting-IP': '203.0.113.77' } }],
    [`/admin/${canary}`, { cookie: `${SESSION_COOKIE}=${canary}${'A'.repeat(32)}`, headers: { Origin: `https://${canary}.example` } }],
    [`/auth/callback/${canary}?code=${canary}&state=${canary}`, {}],
    ['/admin/changes', { cookie: admin.cookie, method: 'PROPFIND', headers: { Referer: `${ORIGIN}/${canary}` } }],
    [`${API}/saves`, { cookie: admin.cookie, method: 'POST', origin: OMNI, headers: { 'X-SyberLabs-Expected-User': admin.userId, 'Content-Type': 'application/json', 'X-SyberLabs-Account': 'v1' },
      body: JSON.stringify({ app: 'omni', name: canary, payload: { text: canary }, requestId: randomUUID() }) }],
    [`/admin/saves/${saveId}/download`, { cookie: admin.cookie }],
  ];
  for (const [path, opts] of tries) await send(env, path, { now: NOW, ...opts });
  assert.equal(recording.points.length, tries.length);
  const written = JSON.stringify(recording.points);
  for (const secret of [canary, admin.userId, admin.token, saveId, '203.0.113', 'Mozilla', 'PROPFIND', '?', 'octocat']) {
    assert.ok(!written.includes(secret), secret);
  }
  assert.ok(recording.points.every(point => TEMPLATES.has(field(point, 'route'))));
});

test('sitePoint writes nothing outside the allowlist and refuses values outside its sets', () => {
  const good = { release: 'unknown', route: '/admin/saves/:id/download', method: 'GET', status: '2xx', code: 'none', app: 'rise', ms: 12 };
  assert.deepEqual(sitePoint(good), {
    indexes: ['site.request'],
    blobs: ['site.request', 'unknown', '/admin/saves/:id/download', 'GET', '2xx', 'none', 'rise'],
    doubles: [1, 12],
  });
  assert.deepEqual(sitePoint({ ...good, release: '3d16ebe' }).blobs[1], '3d16ebe');
  const extra = sitePoint({ ...good, userId: 'user-canary', ip: '203.0.113.7', userAgent: 'Mozilla/5.0', query: 'q=1' });
  assert.ok(!JSON.stringify(extra).match(/user-canary|203\.0\.113|Mozilla|q=1/), 'fields the allowlist does not name are dropped');
  for (const bad of [
    { method: 'PATCH' }, { method: 'get' }, { status: '1xx' }, { status: '200' }, { app: 'evil' }, { app: 'Rise' },
    { route: '/admin/saves/abc?x=1' }, { route: '/Admin/People' }, { route: 'admin/' }, { route: '/admin/saves/a%2Fb/download' },
    { code: 'not found' }, { code: 'Error: D1_ERROR' }, { code: '' }, { release: 'main' }, { release: '3D16EBE' }, { release: '3d16ebee1cf2' },
    { ms: -1 }, { ms: Number.NaN }, { ms: '12' }, { route: undefined }, { app: null },
  ]) {
    assert.equal(sitePoint({ ...good, ...bad }), null, JSON.stringify(bad));
  }
});

test('the allowlist file is the contract shape, and the code reads every field it lists', () => {
  assert.equal(ALLOWLIST.version, 1);
  assert.equal(ALLOWLIST.dataset, 'syberlabs_events');
  assert.deepEqual(Object.keys(ALLOWLIST.events), ['site.request']);
  assert.equal(SPEC.owner, 'Seth');
  assert.equal(SPEC.decision, 'Are account saves working for each consumer app?');
  assert.deepEqual(SPEC.blobs.map(b => b.name), ['release', 'route', 'method', 'status', 'code', 'app']);
  assert.deepEqual(SPEC.blobs.find(b => b.name === 'method').values, ['GET', 'HEAD', 'POST', 'OPTIONS', 'other']);
  assert.deepEqual(SPEC.blobs.find(b => b.name === 'status').values, ['2xx', '3xx', '4xx', '5xx']);
  assert.deepEqual(SPEC.blobs.find(b => b.name === 'app').values, ['omni', 'rise', 'sketch', 'site', 'none']);
  assert.deepEqual(SPEC.doubles, ['count', 'ms']);
  // At most 20 blobs and 20 doubles per data point (Analytics Engine limits); the event takes one blob.
  assert.ok(1 + SPEC.blobs.length <= 20 && SPEC.doubles.length <= 20);
});

test('the EVENTS binding exists in the production configuration only', async () => {
  const toml = await read('../../wrangler.toml');
  const tables = [...toml.matchAll(/^\[\[([^\]]+)\]\]\n((?:[^[\n].*\n?)*)/gm)].map(([, name, body]) => ({ name, body }));
  const analytics = tables.filter(t => t.name.endsWith('analytics_engine_datasets'));
  assert.deepEqual(analytics.map(t => t.name), ['analytics_engine_datasets'], 'top level only: never under env.preview');
  assert.match(analytics[0].body, /^binding = "EVENTS"$/m);
  assert.match(analytics[0].body, new RegExp(`^dataset = "${ALLOWLIST.dataset}"$`, 'm'));
  assert.doesNotMatch(toml, /\[\[?env\.[^\]]*analytics/);
});
