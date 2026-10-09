// /admin/roles through handle(): listing, create and edit with non-privileged keys only (RFC-0002 2.4),
// name validation, and the audit rows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GUARD_COPY } from '../authz.js';
import { call, makeEnv, seedRole, signIn } from './helpers.js';

const form = pairs => new URLSearchParams(pairs);
const keysOf = (db, roleId) => db.sqlite.prepare('SELECT permission_key FROM role_permissions WHERE role_id = ? ORDER BY 1')
  .all(roleId).map(r => r.permission_key);

test('readers see roles and holders, with no editor; managers get the editor without privileged keys', async () => {
  const env = makeEnv();
  await signIn(env.DB, { roles: ['role_viewer'], login: '<i>holder</i>' });
  const reader = await signIn(env.DB, { perms: ['id:users.read'] });
  let page = await (await call(env, '/admin/roles', { cookie: reader.cookie })).text();
  assert.match(page, /viewer/);
  assert.match(page, /&lt;i&gt;holder&lt;\/i&gt;/);
  assert.match(page, /System role/);
  assert.doesNotMatch(page, /<form method="post" action="\/admin\/roles"/);

  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  page = await (await call(env, '/admin/roles', { cookie: admin.cookie })).text();
  assert.match(page, /action="\/admin\/roles"/);
  assert.match(page, /value="site:changes.write"/);
  assert.doesNotMatch(page, /name="perm" value="id:users.manage"/);
  assert.doesNotMatch(page, /name="perm" value="id:roles.manage"/);
  assert.doesNotMatch(page, /href="\/admin\/roles\?edit=role_admin"/);
  // ?edit=role_admin never opens the editor on the system role.
  page = await (await call(env, '/admin/roles?edit=role_admin', { cookie: admin.cookie })).text();
  assert.doesNotMatch(page, /name="id" value="role_admin"/);
});

test('create a role, then edit its keys; both are audited', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  let res = await call(env, '/admin/roles', { cookie: admin.cookie,
    form: form([['name', 'analyst'], ['description', 'Reads things'], ['perm', 'site:changes.read'], ['perm', 'id:audit.read']]) });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), '/admin/roles?ok=saved');
  const role = env.DB.sqlite.prepare("SELECT * FROM roles WHERE name = 'analyst'").get();
  assert.equal(role.is_system, 0);
  assert.equal(role.created_by, admin.userId);
  assert.deepEqual(keysOf(env.DB, role.id), ['id:audit.read', 'site:changes.read']);

  res = await call(env, '/admin/roles', { cookie: admin.cookie,
    form: form([['id', role.id], ['name', 'analyst-2'], ['perm', 'site:changes.read'], ['perm', 'site:changes.write']]) });
  assert.equal(res.status, 303);
  assert.deepEqual(keysOf(env.DB, role.id), ['site:changes.read', 'site:changes.write']);
  assert.equal(env.DB.sqlite.prepare('SELECT name FROM roles WHERE id = ?').get(role.id).name, 'analyst-2');
  const audits = env.DB.sqlite.prepare("SELECT action, detail_json FROM audit_events WHERE action LIKE 'role.%' ORDER BY id").all();
  assert.deepEqual(audits.map(a => a.action), ['role.create', 'role.perms']);
  const detail = JSON.parse(audits[1].detail_json);
  assert.deepEqual(detail.added, ['site:changes.write']);
  assert.deepEqual(detail.removed, ['id:audit.read']);
});

test('RFC-0002 2.4: a crafted POST with a privileged key gets 403 and changes no row', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  const role = seedRole(env.DB, ['site:changes.read'], 'helpers');
  for (const f of [
    form([['name', 'sneaky'], ['perm', 'id:users.manage']]),
    form([['id', role], ['name', 'helpers'], ['perm', 'site:changes.read'], ['perm', 'id:roles.manage']]),
  ]) {
    const before = env.DB.totalChanges();
    const res = await call(env, '/admin/roles', { cookie: admin.cookie, form: f });
    assert.equal(res.status, 403);
    assert.match(await res.text(), new RegExp(GUARD_COPY.privileged));
    assert.equal(env.DB.totalChanges(), before);
  }
  assert.deepEqual(keysOf(env.DB, role), ['site:changes.read']);
});

test('names are validated (422, values kept) and unknown keys are refused', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  for (const name of ['A', 'Ops', 'ops team', '-x', 'viewer', '"><b>']) {
    const res = await call(env, '/admin/roles', { cookie: admin.cookie, form: { name, perm: 'site:changes.read' } });
    assert.equal(res.status, 422, name);
    const page = await res.text();
    assert.match(page, /<title>Fix 1 field · Roles/);
    assert.doesNotMatch(page, /"><b>/);
  }
  const res = await call(env, '/admin/roles', { cookie: admin.cookie, form: { name: 'ok-name', perm: 'site:nope.read' } });
  assert.equal(res.status, 400);
  assert.equal(env.DB.count('roles'), 2);
});

test('id:users.read alone cannot save a role', async () => {
  const env = makeEnv();
  const reader = await signIn(env.DB, { perms: ['id:users.read'] });
  const before = env.DB.totalChanges();
  const res = await call(env, '/admin/roles', { cookie: reader.cookie, form: { name: 'x-role' } });
  assert.equal(res.status, 403);
  assert.equal(env.DB.totalChanges(), before);
});
