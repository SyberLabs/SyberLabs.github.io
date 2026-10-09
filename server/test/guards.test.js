// Guards through handle() and on their own: privileged keys are admin-only (RFC-0002 2.4, so no up or
// target rule exists), and case 20 (lockout, system role, self). Every refusal changes no row.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GUARD_COPY, disableUserStmts, removeRolePermStmt, revokeRoleStmt } from '../authz.js';
import { TABLE, match } from '../routes.js';
import { call, makeEnv, seedRole, signIn } from './helpers.js';

const roles = (db, userId) => db.sqlite.prepare('SELECT role_id FROM user_roles WHERE user_id = ? ORDER BY role_id').all(userId).map(r => r.role_id);

// Runs fn, then asserts a 403 carrying `copy` and an unchanged database.
async function refused(env, copy, fn) {
  const before = env.DB.totalChanges();
  const res = await fn();
  assert.equal(res.status, 403);
  const body = await res.text();
  if (copy) assert.ok(body.includes(copy.replace(/'/g, '&#39;')), `expected copy: ${copy}`);
  assert.equal(env.DB.totalChanges(), before, 'no row changed');
}

// Review round 1, finding 5: the up and target rules were deleted because no custom role can hold a manage
// key. That premise is enforced in the schema, not only in the role editor.
test('case 19: no custom role can hold a manage key, so every manager is an admin', async () => {
  const env = makeEnv();
  for (const key of ['id:users.manage', 'id:roles.manage']) {
    assert.throws(() => seedRole(env.DB, ['id:users.read', key]), /admin only/, key);
  }
  const managers = env.DB.sqlite.prepare(`SELECT DISTINCT role_id FROM role_permissions
    WHERE permission_key IN ('id:users.manage', 'id:roles.manage')`).all().map(r => r.role_id);
  assert.deepEqual(managers, ['role_admin']);
  // The role editor refuses them too (403, nothing written).
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  await refused(env, GUARD_COPY.privileged, () => call(env, '/admin/roles', { cookie: admin.cookie,
    form: { name: 'ops', perm: 'id:users.manage' } }));
  // A role holder without id:users.manage is refused at the route, before any guard.
  const reader = await signIn(env.DB, { perms: ['id:users.read', 'site:changes.read'] });
  await refused(env, null, () => call(env, '/admin/people/roles/grant', { cookie: reader.cookie,
    form: { user: reader.userId, role: 'role_admin', confirm: '1' } }));
  assert.deepEqual(roles(env.DB, reader.userId).includes('role_admin'), false);
});

test('case 20: a turned-off admin does not count, so the last enabled admin stays', async () => {
  const env = makeEnv();
  const a = await signIn(env.DB, { roles: ['role_admin'], login: 'only' });
  await signIn(env.DB, { roles: ['role_admin'], login: 'off', disabled: true });
  await refused(env, GUARD_COPY.lockout, () => call(env, '/admin/people/roles/revoke', { cookie: a.cookie,
    form: { user: a.userId, role: 'role_admin', confirm: '1' } }));
  const [r] = await env.DB.batch(disableUserStmts(env.DB, { userId: a.userId, actorId: 'someone-else', now: Date.now() }));
  assert.equal(r.meta.changes, 0);
});

test('case 20: the last admin cannot revoke admin from themselves', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'], login: 'only' });
  await refused(env, GUARD_COPY.lockout, () => call(env, '/admin/people/roles/revoke', { cookie: admin.cookie,
    form: { user: admin.userId, role: 'role_admin', confirm: '1' } }));
  assert.deepEqual(roles(env.DB, admin.userId), ['role_admin']);
});

test('case 20: with two admins one may go; revocations between them leave one, even back to back', async () => {
  const env = makeEnv();
  const a = await signIn(env.DB, { roles: ['role_admin'], login: 'a' });
  const b = await signIn(env.DB, { roles: ['role_admin'], login: 'b' });
  const [ra, rb] = await Promise.all([
    call(env, '/admin/people/roles/revoke', { cookie: a.cookie, form: { user: b.userId, role: 'role_admin', confirm: '1' } }),
    call(env, '/admin/people/roles/revoke', { cookie: b.cookie, form: { user: a.userId, role: 'role_admin', confirm: '1' } }),
  ]);
  assert.deepEqual([ra.status, rb.status].sort(), [303, 403]);
  assert.equal(env.DB.sqlite.prepare("SELECT count(*) AS n FROM admins").get().n, 1);

  // The statement alone, run back to back, refuses the second.
  const env2 = makeEnv();
  const x = await signIn(env2.DB, { roles: ['role_admin'] });
  const y = await signIn(env2.DB, { roles: ['role_admin'] });
  const [r1, r2] = await env2.DB.batch([
    revokeRoleStmt(env2.DB, { userId: x.userId, roleId: 'role_admin' }),
    revokeRoleStmt(env2.DB, { userId: y.userId, roleId: 'role_admin' }),
  ]);
  assert.equal(r1.meta.changes + r2.meta.changes, 1);
});

test('case 20: admin cannot lose id:roles.manage or its name, and roles have no delete route', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  await refused(env, GUARD_COPY.system, () => call(env, '/admin/roles', { cookie: admin.cookie,
    form: { id: 'role_admin', name: 'admin', perm: 'site:changes.read' } }));
  await refused(env, GUARD_COPY.system, () => call(env, '/admin/roles', { cookie: admin.cookie,
    form: { id: 'role_admin', name: 'boss' } }));
  const [r] = await env.DB.batch([removeRolePermStmt(env.DB, { roleId: 'role_admin', key: 'id:roles.manage' })]);
  assert.equal(r.meta.changes, 0);
  assert.equal(env.DB.sqlite.prepare("SELECT count(*) AS n FROM role_permissions WHERE role_id = 'role_admin'").get().n, 6);
  assert.equal(env.DB.sqlite.prepare("SELECT name FROM roles WHERE id = 'role_admin'").get().name, 'admin');
  assert.equal(match(TABLE, 'POST', '/admin/roles/delete'), null);
  assert.equal((await call(env, '/admin/roles/delete', { cookie: admin.cookie, form: { id: 'role_admin' } })).status, 404);
});

test('case 20: nobody can turn themselves off', async () => {
  const env = makeEnv();
  const a = await signIn(env.DB, { roles: ['role_admin'] });
  await signIn(env.DB, { roles: ['role_admin'] });
  await refused(env, GUARD_COPY.self, () => call(env, '/admin/people/disable', { cookie: a.cookie, form: { user: a.userId, confirm: '1' } }));
  // The statement refuses it too, whatever the caller checked.
  const [r, , audit] = await env.DB.batch(disableUserStmts(env.DB, { userId: a.userId, actorId: a.userId, now: Date.now() }));
  assert.equal(r.meta.changes, 0);
  assert.equal(audit.meta.changes, 0);
  assert.equal(env.DB.count('sessions'), 2);
});

test('case 20: a refused turn-off changes no row in any table (sessions, audit)', async () => {
  const env = makeEnv();
  const a = await signIn(env.DB, { roles: ['role_admin'] });
  const before = env.DB.totalChanges();
  // a is the only admin; another actor id (not a) asks, so only the lockout clause can refuse.
  const results = await env.DB.batch(disableUserStmts(env.DB, { userId: a.userId, actorId: 'someone-else', now: Date.now() }));
  assert.deepEqual(results.map(r => r.meta.changes), [0, 0, 0]);
  assert.equal(env.DB.totalChanges(), before);
});
