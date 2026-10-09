// Cases 2 and 3 for What changed through handle(): the page needs site:changes.read, writes need
// site:changes.write, and a refused write leaves every row as it was. There is no JSON API (RFC-0002 R1-8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { call, makeEnv, signIn } from './helpers.js';

function seedEntry(db, title = 'Private entry title') {
  db.sqlite.prepare(`INSERT INTO change_entries (id, date, project, state, title, text, href, created_at)
    VALUES (?, '2026-10-01', 'RISE', 'merged', ?, 'Private entry text', 'https://github.com/x/y/pull/1', 1)`).run(`c-${title.length}`, title);
}

const ENTRY = { date: '2026-10-09', project: 'RISE', state: 'merged', title: 'New entry', text: 'Body', href: '/plus/' };

test('case 3: no site:changes.read gets 403 on the page, with no entry text; /api/ paths do not exist', async () => {
  const env = makeEnv();
  seedEntry(env.DB);
  const { cookie } = await signIn(env.DB, { perms: ['id:audit.read'] });
  let res = await call(env, '/admin/changes', { cookie });
  assert.equal(res.status, 403);
  assert.doesNotMatch(await res.text(), /Private entry/);
  const viewer = await signIn(env.DB, { roles: ['role_viewer'] });
  for (const p of ['/api/admin/changes', '/api/me']) {
    res = await call(env, p, { cookie: viewer.cookie });
    assert.equal(res.status, 404, p);
    assert.match(res.headers.get('Content-Type'), /^text\/html/, p);
    assert.doesNotMatch(await res.text(), /Private entry/);
  }
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

test('a writer can add an entry; it shows on the page, with an audit row', async () => {
  const env = makeEnv();
  const { cookie } = await signIn(env.DB, { perms: ['site:changes.read', 'site:changes.write'] });
  const res = await call(env, '/admin/changes', { cookie, form: ENTRY });
  assert.equal(res.status, 303);
  assert.equal(env.DB.count('change_entries'), 1);
  assert.equal(env.DB.sqlite.prepare("SELECT count(*) AS n FROM audit_events WHERE action = 'changes.create'").get().n, 1);
  assert.match(await (await call(env, '/admin/changes', { cookie })).text(), /New entry/);
});

test('case 13 (content): a revoked role closes What changed on the very next request', async () => {
  const env = makeEnv();
  const viewer = await signIn(env.DB, { roles: ['role_viewer'] });
  assert.equal((await call(env, '/admin/changes', { cookie: viewer.cookie })).status, 200);
  env.DB.sqlite.prepare('DELETE FROM user_roles WHERE user_id = ?').run(viewer.userId);
  assert.equal((await call(env, '/admin/changes', { cookie: viewer.cookie })).status, 403);
});
