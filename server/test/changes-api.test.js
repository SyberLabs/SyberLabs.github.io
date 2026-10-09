// Cases 2 and 3 for What changed through handle(): the page and JSON need site:changes.read, writes need
// site:changes.write, and a refused write leaves every row as it was.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { call, makeEnv, signIn } from './helpers.js';

function seedEntry(db, title = 'Private entry title') {
  db.sqlite.prepare(`INSERT INTO change_entries (id, date, project, state, title, text, href, created_at)
    VALUES (?, '2026-10-01', 'RISE', 'merged', ?, 'Private entry text', 'https://github.com/x/y/pull/1', 1)`).run(`c-${title.length}`, title);
}

const ENTRY = { date: '2026-10-09', project: 'RISE', state: 'merged', title: 'New entry', text: 'Body', href: '/plus/' };

test('case 3: no site:changes.read gets 403 on the page and the JSON, with no entry text', async () => {
  const env = makeEnv();
  seedEntry(env.DB);
  const { cookie } = await signIn(env.DB, { perms: ['id:audit.read'] });
  let res = await call(env, '/admin/changes', { cookie });
  assert.equal(res.status, 403);
  assert.doesNotMatch(await res.text(), /Private entry/);
  res = await call(env, '/api/admin/changes', { cookie });
  assert.equal(res.status, 403);
  const body = await res.text();
  assert.equal(JSON.parse(body).error.code, 'forbidden');
  assert.doesNotMatch(body, /Private entry/);
});

test('case 3: a reader sees entries but gets 403 on every write, and no row changes', async () => {
  const env = makeEnv();
  seedEntry(env.DB);
  const { cookie } = await signIn(env.DB, { roles: ['role_viewer'] });
  let res = await call(env, '/admin/changes', { cookie });
  assert.equal(res.status, 200);
  const page = await res.text();
  assert.match(page, /Private entry title/);
  assert.doesNotMatch(page, /action="\/admin\/changes\/delete"/);

  res = await call(env, '/api/admin/changes', { cookie });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.entries.length, 1);
  assert.equal(data.entries[0].title, 'Private entry title');

  const before = env.DB.totalChanges();
  for (const [path, form] of [['/admin/changes', ENTRY], ['/admin/changes', { ...ENTRY, id: 'c-19' }],
    ['/admin/changes/delete', { id: 'c-19' }]]) {
    res = await call(env, path, { cookie, form });
    assert.equal(res.status, 403, path);
  }
  assert.equal(env.DB.totalChanges(), before);
  assert.equal(env.DB.count('change_entries'), 1);
  assert.equal(env.DB.count('audit_events'), 0);
});

test('a writer can add an entry; it shows on the page and in the JSON, with an audit row', async () => {
  const env = makeEnv();
  const { cookie } = await signIn(env.DB, { perms: ['site:changes.read', 'site:changes.write'] });
  const res = await call(env, '/admin/changes', { cookie, form: ENTRY });
  assert.equal(res.status, 303);
  assert.equal(env.DB.count('change_entries'), 1);
  assert.equal(env.DB.sqlite.prepare("SELECT count(*) AS n FROM audit_events WHERE action = 'changes.create'").get().n, 1);
  const data = await (await call(env, '/api/admin/changes', { cookie })).json();
  assert.equal(data.entries[0].title, 'New entry');
});

test('case 13 (content): a revoked role closes What changed on the very next request', async () => {
  const env = makeEnv();
  const viewer = await signIn(env.DB, { roles: ['role_viewer'] });
  assert.equal((await call(env, '/api/admin/changes', { cookie: viewer.cookie })).status, 200);
  env.DB.sqlite.prepare('DELETE FROM user_roles WHERE user_id = ?').run(viewer.userId);
  assert.equal((await call(env, '/api/admin/changes', { cookie: viewer.cookie })).status, 403);
  assert.equal((await call(env, '/admin/changes', { cookie: viewer.cookie })).status, 403);
});
