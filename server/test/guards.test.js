// Cases 14 (target rule), 19 (escalation up) and 20 (lockout, system role, self) through handle(), plus
// the lockout statements on their own. Every refusal is a 403 that changes no row.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GUARD_COPY, disableUserStmts, permsOfRole, permsOfUser, removeRolePermStmt, revokeRoleStmt, subset } from '../authz.js';
import { TABLE, match } from '../routes.js';
import { HOUR, call, makeEnv, seedRole, signIn, stubFetch } from './helpers.js';

const OPS = ['id:users.manage', 'id:users.read'];
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

test('subset and the permission readers', async () => {
  const env = makeEnv();
  assert.equal(subset(new Set(['a']), new Set(['a', 'b'])), true);
  assert.equal(subset(new Set(['a', 'c']), new Set(['a', 'b'])), false);
  const all = await permsOfRole(env.DB, 'role_admin');
  assert.equal(all.size, 6);
  const u = await signIn(env.DB, { roles: ['role_admin'], expiresAt: Date.now() - 1 });
  assert.equal((await permsOfUser(env.DB, u.userId, Date.now())).size, 0); // expired grants grant nothing
});

test('case 14: an ops role cannot revoke, turn off, end sessions for, remove a method of, or add a method to an admin', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin', 'role_viewer'], login: 'boss' });
  const ops = await signIn(env.DB, { perms: OPS, login: 'ops' });
  const c = ops.cookie;
  const T = GUARD_COPY.target;
  const mine = seedRole(env.DB, ['id:users.read'], 'staff-dir');
  env.DB.sqlite.prepare('INSERT INTO user_roles (user_id, role_id, granted_at) VALUES (?, ?, 1)').run(admin.userId, mine);
  await refused(env, T, () => call(env, '/admin/people/roles/revoke', { cookie: c, form: { user: admin.userId, role: mine, confirm: '1' } }));
  await refused(env, null, () => call(env, '/admin/people/roles/revoke', { cookie: c, form: { user: admin.userId, role: 'role_viewer', confirm: '1' } }));
  await refused(env, null, () => call(env, '/admin/people/roles/revoke', { cookie: c, form: { user: admin.userId, role: 'role_admin', confirm: '1' } }));
  await refused(env, T, () => call(env, '/admin/people/disable', { cookie: c, form: { user: admin.userId, confirm: '1' } }));
  await refused(env, T, () => call(env, '/admin/people/sessions/revoke', { cookie: c, form: { user: admin.userId } }));
  await refused(env, T, () => call(env, '/admin/people/identity/remove', { cookie: c, form: { identity: admin.identityId, confirm: '1' } }));
  await refused(env, T, () => call(env, '/admin/people/invite', { cookie: c, form: { user: admin.userId, provider: 'google', email: 'x@gmail.com', confirm: '1' } }));
  // Turning an admin back on is a target-rule action too (turned off out of band here).
  env.DB.sqlite.prepare('UPDATE users SET disabled_at = 1 WHERE id = ?').run(admin.userId);
  await refused(env, T, () => call(env, '/admin/people/enable', { cookie: c, form: { user: admin.userId } }));
  assert.equal(env.DB.sqlite.prepare('SELECT disabled_at FROM users WHERE id = ?').get(admin.userId).disabled_at, 1);
  assert.equal(roles(env.DB, admin.userId).length, 3);
  assert.equal(env.DB.count('invites'), 0);

  // ...but ops can act on someone whose keys it holds, and not on a viewer (ops lacks site:changes.read).
  const weaker = await signIn(env.DB, { perms: ['id:users.read'] });
  assert.equal((await call(env, '/admin/people/sessions/revoke', { cookie: c, form: { user: weaker.userId } })).status, 303);
  const viewer = await signIn(env.DB, { roles: ['role_viewer'] });
  await refused(env, T, () => call(env, '/admin/people/sessions/revoke', { cookie: c, form: { user: viewer.userId } }));
});

test('case 19: id:users.manage without id:roles.manage cannot grant or invite to admin', async () => {
  const env = makeEnv();
  const ops = await signIn(env.DB, { perms: OPS, login: 'ops' });
  const viewer = await signIn(env.DB, { roles: ['role_viewer'] });
  const U = GUARD_COPY.up;
  await refused(env, U, () => call(env, '/admin/people/roles/grant', { cookie: ops.cookie, form: { user: viewer.userId, role: 'role_admin', confirm: '1' } }));
  await refused(env, U, () => call(env, '/admin/people/roles/grant', { cookie: ops.cookie, form: { user: ops.userId, role: 'role_admin', confirm: '1' } }));
  await refused(env, U, () => call(env, '/admin/people/invite', { cookie: ops.cookie, form: { role: 'role_admin', provider: 'google', email: 'x@gmail.com', confirm: '1' } }));
  const stub = stubFetch(() => ({ id: 777, login: 'someone' }));
  try {
    await refused(env, U, () => call(env, '/admin/people/invite', { cookie: ops.cookie, form: { role: 'role_admin', provider: 'github', login: 'someone', confirm: '1' } }));
    assert.equal(stub.calls.length, 0); // refused before any lookup
  } finally {
    stub.restore();
  }
  // viewer's key is one ops lacks too: site:changes.read.
  await refused(env, U, () => call(env, '/admin/people/roles/grant', { cookie: ops.cookie, form: { user: viewer.userId, role: 'role_viewer' } }));
});

test('case 19: a role edit cannot add a key the editor lacks', async () => {
  const env = makeEnv();
  const editor = await signIn(env.DB, { perms: ['id:roles.manage', 'id:users.read', 'site:changes.read'] });
  const role = seedRole(env.DB, ['site:changes.read'], 'readers');
  await refused(env, GUARD_COPY.up, () => call(env, '/admin/roles', { cookie: editor.cookie,
    form: { id: role, name: 'readers', perm: 'site:changes.write' } }));
  await refused(env, GUARD_COPY.up, () => call(env, '/admin/roles', { cookie: editor.cookie,
    form: new URLSearchParams([['name', 'new-role'], ['perm', 'site:changes.read'], ['perm', 'id:audit.read']]) }));
  const ok = await call(env, '/admin/roles', { cookie: editor.cookie, form: { name: 'new-role', perm: 'site:changes.read' } });
  assert.equal(ok.status, 303);
});

test('case 20: the last full admin cannot revoke admin from themselves', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'], login: 'only' });
  await refused(env, GUARD_COPY.lockout, () => call(env, '/admin/people/roles/revoke', { cookie: admin.cookie,
    form: { user: admin.userId, role: 'role_admin', confirm: '1' } }));
  assert.deepEqual(roles(env.DB, admin.userId), ['role_admin']);
});

test('case 20: an admin on an expiring grant cannot remove or turn off the last full admin', async () => {
  const env = makeEnv();
  const full = await signIn(env.DB, { roles: ['role_admin'], login: 'full' });
  const temp = await signIn(env.DB, { roles: ['role_admin'], login: 'temp', expiresAt: Date.now() + HOUR });
  await refused(env, GUARD_COPY.lockout, () => call(env, '/admin/people/roles/revoke', { cookie: temp.cookie,
    form: { user: full.userId, role: 'role_admin', confirm: '1' } }));
  await refused(env, GUARD_COPY.lockout, () => call(env, '/admin/people/disable', { cookie: temp.cookie,
    form: { user: full.userId, confirm: '1' } }));
  assert.equal(env.DB.sqlite.prepare('SELECT disabled_at FROM users WHERE id = ?').get(full.userId).disabled_at, null);
});

test('case 20: with two full admins one may go; revocations between them leave one, even back to back', async () => {
  const env = makeEnv();
  const a = await signIn(env.DB, { roles: ['role_admin'], login: 'a' });
  const b = await signIn(env.DB, { roles: ['role_admin'], login: 'b' });
  const [ra, rb] = await Promise.all([
    call(env, '/admin/people/roles/revoke', { cookie: a.cookie, form: { user: b.userId, role: 'role_admin', confirm: '1' } }),
    call(env, '/admin/people/roles/revoke', { cookie: b.cookie, form: { user: a.userId, role: 'role_admin', confirm: '1' } }),
  ]);
  assert.deepEqual([ra.status, rb.status].sort(), [303, 403]);
  assert.equal(env.DB.sqlite.prepare("SELECT count(*) AS n FROM full_admins").get().n, 1);

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

test('case 20: a full admin with another path to both manage keys may drop admin', async () => {
  const env = makeEnv();
  const both = seedRole(env.DB, ['id:users.manage', 'id:roles.manage', 'id:users.read'], 'superops');
  const a = await signIn(env.DB, { roles: ['role_admin', both], login: 'a' });
  const [r] = await env.DB.batch([revokeRoleStmt(env.DB, { userId: a.userId, roleId: 'role_admin' })]);
  assert.equal(r.meta.changes, 1);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM full_admins').get().n, 1);
  // ...but now superops cannot lose a manage key while a is the only full admin.
  const [rm] = await env.DB.batch([removeRolePermStmt(env.DB, { roleId: both, key: 'id:roles.manage' })]);
  assert.equal(rm.meta.changes, 0);
  const [rmOk] = await env.DB.batch([removeRolePermStmt(env.DB, { roleId: both, key: 'id:users.read' })]);
  assert.equal(rmOk.meta.changes, 1);
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
  assert.equal((await permsOfRole(env.DB, 'role_admin')).size, 6);
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
  const [r, , , audit] = await env.DB.batch(disableUserStmts(env.DB, { userId: a.userId, actorId: a.userId, now: Date.now() }));
  assert.equal(r.meta.changes, 0);
  assert.equal(audit.meta.changes, 0);
  assert.equal(env.DB.count('sessions'), 2);
});

test('case 20: a refused turn-off changes no row in any table (sessions, invites, audit)', async () => {
  const env = makeEnv();
  const a = await signIn(env.DB, { roles: ['role_admin'] });
  env.DB.sqlite.prepare(`INSERT INTO invites (id, token_hash, role_id, provider, subject, invited_by, created_at, expires_at)
    VALUES ('inv2', 'h2', 'role_viewer', 'github', 'gh-test-90', ?, 1, ?)`).run(a.userId, Date.now() + 1e9);
  const before = env.DB.totalChanges();
  // a is the only full admin; another actor id (not a) asks, so only the lockout clause can refuse.
  const results = await env.DB.batch(disableUserStmts(env.DB, { userId: a.userId, actorId: 'someone-else', now: Date.now() }));
  assert.deepEqual(results.map(r => r.meta.changes), [0, 0, 0, 0]);
  assert.equal(env.DB.totalChanges(), before);
});
