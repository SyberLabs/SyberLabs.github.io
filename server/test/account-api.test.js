import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { handle } from '../app.js';
import { makeEnv, signIn, ORIGIN, HOUR } from './helpers.js';
import { brokenDb } from './d1-shim.js';

const ROOT = '/admin/api/v1';
const OMNI = 'https://omni.syberlabs.io';
const RISE = 'https://rise.syberlabs.io';
const snapshot = (overrides = {}) => ({ app: 'omni', name: 'Private workspace', payload: { documents: ['hello'] }, requestId: randomUUID(), ...overrides });
function request(env, path, { method = 'GET', cookie, origin, body, headers = {}, now } = {}) {
  const h = new Headers(headers);
  if (cookie) h.set('Cookie', cookie);
  if (origin !== undefined) h.set('Origin', origin);
  return handle(new Request(new URL(path, ORIGIN), { method, headers: h, body }), env, now);
}
function save(env, cookie, data = snapshot(), opts = {}) {
  return request(env, `${ROOT}/saves`, { method: 'POST', cookie, origin: OMNI,
    headers: { 'Content-Type': 'application/json', 'X-SyberLabs-Account': 'v1' }, body: JSON.stringify(data), ...opts });
}
async function json(res, status) {
  assert.equal(res.status, status);
  assert.match(res.headers.get('Content-Type'), /application\/json/);
  assert.match(res.headers.get('Cache-Control'), /no-store/);
  const data = await res.json();
  assert.equal(data.version, 1);
  return data;
}

test('account API rejects missing, expired and disabled sessions with JSON 401, never a sign-in redirect', async () => {
  const env = makeEnv();
  for (const path of [`${ROOT}/account`, `${ROOT}/saves?app=omni`, `${ROOT}/saves/not-found`]) {
    const res = await request(env, path);
    await json(res, 401);
    assert.equal(res.headers.get('Location'), null);
  }
  await json(await save(env, null), 401);
  const expired = await signIn(env.DB, { now: Date.now() - 2 * HOUR, ttl: HOUR });
  await json(await request(env, `${ROOT}/account`, { cookie: expired.cookie }), 401);
  const disabled = await signIn(env.DB, { disabled: true });
  await json(await request(env, `${ROOT}/account`, { cookie: disabled.cookie }), 401);
});

test('account API supports only exact production credentialed CORS origins, including unauthenticated failures', async () => {
  const env = makeEnv();
  const user = await signIn(env.DB);
  for (const origin of [ORIGIN, OMNI, RISE]) {
    const res = await request(env, `${ROOT}/account`, { cookie: user.cookie, origin });
    const body = await json(res, 200);
    assert.deepEqual(body.user, { id: user.userId, label: `@${user.login}` });
    assert.equal(body.portalUrl, `${ORIGIN}/admin/`);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal(res.headers.get('Access-Control-Allow-Credentials'), 'true');
    assert.match(res.headers.get('Vary'), /Origin/i);
    const signedOut = await request(env, `${ROOT}/account`, { origin });
    await json(signedOut, 401);
    assert.equal(signedOut.headers.get('Access-Control-Allow-Origin'), origin);
  }
  for (const origin of ['https://evil.example', 'https://omni.syberlabs.io.evil.example', 'http://omni.syberlabs.io', 'https://preview.omni.syberlabs.io', 'null', 'https://omni.syberlabs.io/']) {
    const res = await request(env, `${ROOT}/account`, { cookie: user.cookie, origin });
    await json(res, 403);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
  }
});

test('preflight permits named app origins without a session and refuses unsafe origins or requested headers', async () => {
  const env = makeEnv();
  for (const origin of [OMNI, RISE]) {
    const res = await request(env, `${ROOT}/saves`, { method: 'OPTIONS', origin, headers: {
      'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type, x-syberlabs-account',
    } });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal(res.headers.get('Access-Control-Allow-Credentials'), 'true');
    assert.match(res.headers.get('Access-Control-Allow-Headers'), /x-syberlabs-account/i);
  }
  await json(await request(env, `${ROOT}/saves`, { method: 'OPTIONS', origin: 'https://evil.example', headers: { 'Access-Control-Request-Method': 'POST' } }), 403);
  await json(await request(env, `${ROOT}/saves`, { method: 'OPTIONS', origin: OMNI, headers: {
    'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'x-unapproved',
  } }), 403);
});

test('mutations refuse foreign or absent Origin, form content and absent/wrong custom header', async () => {
  const env = makeEnv(), user = await signIn(env.DB);
  for (const opts of [
    { origin: 'https://evil.example' }, { origin: undefined },
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-SyberLabs-Account': 'v1' } },
    { headers: { 'Content-Type': 'text/plain', 'X-SyberLabs-Account': 'v1' } },
    { headers: { 'Content-Type': 'application/json' } },
    { headers: { 'Content-Type': 'application/json', 'X-SyberLabs-Account': 'v2' } },
  ]) await json(await save(env, user.cookie, snapshot(), opts), 403);
  assert.deepEqual((await json(await request(env, `${ROOT}/saves?app=omni`, { cookie: user.cookie }), 200)).saves, []);
});

test('private saves list/download expose only their owner and requested app', async () => {
  const env = makeEnv(), a = await signIn(env.DB), b = await signIn(env.DB);
  const input = snapshot({ payload: { private: 'owner-a-private-payload-canary' } });
  const saved = (await json(await save(env, a.cookie, input), 201)).save;
  assert.equal(saved.app, input.app);
  assert.equal(saved.name, input.name);
  assert.equal(typeof saved.id, 'string');
  assert.equal(saved.bytes, Buffer.byteLength(JSON.stringify(input.payload)));
  assert.equal(Object.hasOwn(saved, 'payload'), false);
  assert.deepEqual((await json(await request(env, `${ROOT}/saves?app=omni`, { cookie: b.cookie }), 200)).saves, []);
  await json(await request(env, `${ROOT}/saves/${saved.id}`, { cookie: b.cookie }), 404);
  await json(await request(env, `${ROOT}/saves/${randomUUID()}`, { cookie: a.cookie }), 404);
  assert.deepEqual((await json(await request(env, `${ROOT}/saves?app=rise`, { cookie: a.cookie }), 200)).saves, []);
  const foreignDownload = await request(env, `/admin/saves/${saved.id}/download`, { cookie: b.cookie });
  assert.equal(foreignDownload.status, 404);
  assert.equal((await foreignDownload.text()).includes('owner-a-private-payload-canary'), false);
  const downloaded = (await json(await request(env, `${ROOT}/saves/${saved.id}`, { cookie: a.cookie }), 200)).save;
  assert.deepEqual(downloaded.payload, input.payload);
  const list = (await json(await request(env, `${ROOT}/saves?app=omni`, { cookie: a.cookie }), 200)).saves;
  assert.deepEqual(list, [saved]);
});

test('save retries are idempotent across simultaneous requests; changed contents conflict without overwrite', async () => {
  const env = makeEnv(), user = await signIn(env.DB), input = snapshot();
  const responses = await Promise.all([save(env, user.cookie, input), save(env, user.cookie, input)]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 201]);
  const rows = await Promise.all(responses.map(r => r.json()));
  assert.equal(rows[0].save.id, rows[1].save.id);
  for (const changed of [{ name: 'different' }, { app: 'rise' }, { payload: { documents: ['changed'] } }]) {
    await json(await save(env, user.cookie, { ...input, ...changed }, { origin: changed.app === 'rise' ? RISE : OMNI }), 409);
  }
  const result = await json(await save(env, user.cookie, input), 200);
  assert.equal(result.save.id, rows[0].save.id);
  assert.equal((await json(await request(env, `${ROOT}/saves?app=omni`, { cookie: user.cookie }), 200)).saves.length, 1);
});

test('invalid snapshot schema, malformed JSON and bounded payload produce JSON errors', async () => {
  const env = makeEnv(), user = await signIn(env.DB);
  for (const override of [{ app: 'other' }, { app: ['omni'] }, { requestId: [randomUUID()] }, { name: '' }, { name: 'x'.repeat(101) }, { name: 3 }, { payload: null }, { payload: 'text' }, { requestId: 'not-a-uuid' }]) {
    await json(await save(env, user.cookie, snapshot(override)), 400);
  }
  await json(await save(env, user.cookie, snapshot(), { body: '{' }), 400);
  await json(await save(env, user.cookie, snapshot(), { body: 'null' }), 400);
  await json(await save(env, user.cookie, snapshot({ payload: { text: 'x'.repeat(1024 * 1024) } })), 413);
  for (const suffix of ['', '?app=other']) await json(await request(env, `${ROOT}/saves${suffix}`, { cookie: user.cookie }), 400);
  await json(await save(env, user.cookie, snapshot({ payload: [] })), 201);
});

test('count quota remains atomic when two saves compete for the last slot, independently per owner', async () => {
  const env = makeEnv(), user = await signIn(env.DB);
  const retry = snapshot({ name: 'Existing backup' });
  await json(await save(env, user.cookie, retry), 201);
  for (let i = 1; i < 49; i++) await json(await save(env, user.cookie, snapshot({ name: `Save ${i}` })), 201);
  const input = snapshot({ name: 'Last slot' });
  const responses = await Promise.all([save(env, user.cookie, input), save(env, user.cookie, snapshot())]);
  assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
  const list = await json(await request(env, `${ROOT}/saves?app=omni`, { cookie: user.cookie }), 200);
  assert.equal(list.saves.length, 50);
  await json(await save(env, user.cookie, retry), 200);
  const other = await signIn(env.DB);
  await json(await save(env, other.cookie), 201);
});

test('byte quota remains atomic across apps and concurrent saves, while download remains available', async () => {
  const env = makeEnv(), user = await signIn(env.DB);
  const payload = { text: 'x'.repeat(1024 * 1024 - 32) };
  let first;
  for (let i = 0; i < 9; i++) {
    const row = (await json(await save(env, user.cookie, snapshot({ payload })), 201)).save;
    first ??= row;
  }
  const responses = await Promise.all([save(env, user.cookie, snapshot({ payload })), save(env, user.cookie, snapshot({ app: 'rise', payload }), { origin: RISE })]);
  assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
  const downloaded = await json(await request(env, `${ROOT}/saves/${first.id}`, { cookie: user.cookie }), 200);
  assert.deepEqual(downloaded.save.payload, payload);
});

test('saved-things HTML escapes attacker-controlled snapshot names and does not embed payloads', async () => {
  const env = makeEnv(), user = await signIn(env.DB);
  const name = '<script>alert("name")</script>', secret = 'payload-only-canary';
  await json(await save(env, user.cookie, snapshot({ name, payload: { private: secret } })), 201);
  const res = await request(env, '/admin/saves', { cookie: user.cookie });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
  assert.equal(html.includes(secret), false);
});

test('outages answer JSON 503 and never leak internal error details', async () => {
  const env = makeEnv();
  const user = await signIn(env.DB);
  env.DB = brokenDb();
  const res = await request(env, `${ROOT}/account`, { cookie: user.cookie });
  const body = await json(res, 503);
  assert.equal(JSON.stringify(body).includes('D1_ERROR'), false);
});


test('consumer origins cannot read or write the other app snapshots, even for their owner', async () => {
  const env = makeEnv(), user = await signIn(env.DB);
  const omni = (await json(await save(env, user.cookie), 201)).save;
  const rise = (await json(await save(env, user.cookie, snapshot({ app: 'rise' }), { origin: RISE }), 201)).save;
  for (const [origin, foreign] of [[OMNI, rise], [RISE, omni]]) {
    await json(await request(env, `${ROOT}/saves?app=${foreign.app}`, { cookie: user.cookie, origin }), 403);
    await json(await request(env, `${ROOT}/saves/${foreign.id}`, { cookie: user.cookie, origin }), 404);
    await json(await save(env, user.cookie, snapshot({ app: foreign.app }), { origin }), 403);
  }
});

test('missing API configuration preserves versioned JSON error shape', async () => {
  await json(await request({}, `${ROOT}/account`), 503);
});


test('JSON body limit counts actual streamed bytes instead of trusting Content-Length', async () => {
  const env = makeEnv(), user = await signIn(env.DB);
  await json(await save(env, user.cookie, snapshot({ payload: { text: '🔥'.repeat(300000) } }), {
    headers: { 'Content-Type': 'application/json', 'X-SyberLabs-Account': 'v1', 'Content-Length': '1' },
  }), 413);
  const list = await json(await request(env, `${ROOT}/saves?app=omni`, { cookie: user.cookie }), 200);
  assert.deepEqual(list.saves, []);
});

test('app return accepts only canonical app roots and requires authentication', async () => {
  const env = makeEnv(), user = await signIn(env.DB);
  for (const [app, origin] of [['omni', OMNI], ['rise', RISE]]) {
    const res = await request(env, `/admin/return?app=${app}`, { cookie: user.cookie });
    assert.equal(res.status, 303);
    assert.equal(res.headers.get('Location'), `${origin}/`);
  }
  for (const app of ['unknown', 'https://evil.example', '//evil.example', 'omni/../evil']) {
    assert.equal((await request(env, `/admin/return?app=${encodeURIComponent(app)}`, { cookie: user.cookie })).status, 400);
  }
  const res = await request(env, '/admin/return?app=omni');
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), '/auth/signin?next=%2Fadmin%2Freturn%3Fapp%3Domni');
});

test('owned backup download is JSON attachment with fixed safe filename and literal untrusted payload', async () => {
  const env = makeEnv(), user = await signIn(env.DB);
  const input = snapshot({ name: '<img src=x onerror=alert(1)>"', payload: { html: '<script>alert(1)</script>', private: 'download-canary' } });
  const saved = (await json(await save(env, user.cookie, input), 201)).save;
  const res = await request(env, `/admin/saves/${saved.id}/download`, { cookie: user.cookie });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('Content-Type'), /application\/json/);
  assert.match(res.headers.get('Content-Disposition'), /^attachment; filename="omni-backup-[a-zA-Z0-9_-]+\.json"$/);
  assert.match(res.headers.get('Cache-Control'), /no-store/);
  const downloaded = await res.json();
  assert.equal(downloaded.version, 1);
  assert.deepEqual(downloaded.save.payload, input.payload);
  assert.equal(downloaded.save.name, input.name);
});
