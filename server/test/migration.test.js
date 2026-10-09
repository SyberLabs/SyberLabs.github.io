import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { freshDb, brokenDb, migrate, MIGRATION_FILES } from './d1-shim.js';
import { seedUser } from './helpers.js';
import { CATALOGUE } from '../permissions.js';

const DAY = 86400 * 1000;
const raw = db => db.sqlite;

// 0001 is applied to production D1 and is never edited; every change after it is a new numbered file.
test('migrations apply in order: 0001_accounts, then 0002_add_person', () => {
  assert.deepEqual(MIGRATION_FILES, ['0001_accounts.sql', '0002_add_person.sql']);
});

test('the schema applies (0001 then 0002) with foreign keys on, and every table and view exists', async () => {
  const db = freshDb();
  assert.equal(await db.prepare('PRAGMA foreign_keys').first('foreign_keys'), 1);
  const names = (await db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name").all())
    .results.map(r => r.name);
  // No invites table: RFC-0002 R3-4.
  assert.deepEqual(names, ['admins', 'audit_events', 'change_entries', 'identities', 'permissions',
    'role_permissions', 'roles', 'sessions', 'user_roles', 'users']);
  await assert.rejects(db.prepare("INSERT INTO identities (id, user_id, provider, subject, created_at) VALUES ('i','nope','github','1',1)").run(),
    /FOREIGN KEY/);
});

// RFC-0002 8.3 G5 and G6, as CI greps them.
const G5 = /(INSERT|REPLACE)(\s+OR\s+[A-Z]+)?\s+INTO\s+["`[]?(main\.)?(users|identities|invites|user_roles|sessions|change_entries)/i;
const G6 = /@|[0-9]{6,}/;

test('migrations hold no people, emails, provider ids or content (the CI greps, run here too)', () => {
  const dir = new URL('../../migrations/', import.meta.url);
  for (const f of readdirSync(dir).filter(n => n.endsWith('.sql'))) {
    const sql = readFileSync(new URL(f, dir), 'utf8');
    assert.doesNotMatch(sql, G6, f);
    assert.doesNotMatch(sql, G5, f);
  }
  // The forms the old guard missed.
  for (const sql of ['INSERT OR IGNORE INTO users', 'replace into identities', 'INSERT INTO `invites`', 'INSERT INTO [sessions]',
    'INSERT INTO main.user_roles', 'INSERT INTO "change_entries"']) assert.match(sql, G5, sql);
  assert.match("VALUES ('gh', '132870419')", G6);
});

test('catalogue (case 18): after 0001 and 0002, CATALOGUE matches the permissions rows exactly', async () => {
  const rows = (await freshDb().prepare('SELECT key, description, privileged FROM permissions ORDER BY key').all()).results;
  assert.deepEqual(rows.map(r => r.key), Object.keys(CATALOGUE).sort());
  for (const r of rows) {
    assert.equal(r.description, CATALOGUE[r.key].label, r.key);
    assert.equal(r.privileged === 1, CATALOGUE[r.key].privileged, r.key);
  }
});

test('catalogue (case 18): admin holds every key; viewer holds only site:changes.read', async () => {
  const db = freshDb();
  const missing = await db.prepare(`SELECT key FROM permissions WHERE key NOT IN
    (SELECT permission_key FROM role_permissions WHERE role_id = 'role_admin')`).all();
  assert.deepEqual(missing.results, []);
  const viewer = await db.prepare("SELECT permission_key FROM role_permissions WHERE role_id = 'role_viewer'").all();
  assert.deepEqual(viewer.results, [{ permission_key: 'site:changes.read' }]);
  assert.deepEqual(await db.prepare("SELECT name, is_system FROM roles WHERE id = 'role_admin'").first(), { name: 'admin', is_system: 1 });
  assert.equal(await db.prepare("SELECT is_system FROM roles WHERE id = 'role_viewer'").first('is_system'), 0);
});

// The live database when 0002 was written: 0001 applied, 2 users with 2 GitHub identities and 2 admin grants,
// 11 change entries, the seeded catalogue and roles, an empty invites table. Fake ids, as everywhere here.
test('0002 on a database shaped like production: drops the empty invites table, rewords one label, keeps every row', async () => {
  const db = freshDb({ upTo: 1 });
  const now = Date.now();
  const founders = [seedUser(db, { roles: ['role_admin'], login: 'founder-a' }), seedUser(db, { roles: ['role_admin'], login: 'founder-b' })];
  for (let i = 0; i < 11; i++) {
    raw(db).prepare(`INSERT INTO change_entries (id, date, project, state, title, text, href, created_at)
      VALUES (?, '2026-10-08', 'RISE', 'merged', ?, '', '/', ?)`).run(`c${i}`, `Entry ${i}`, now + i);
  }
  raw(db).prepare("INSERT INTO audit_events (at, actor_user_id, action) VALUES (?, ?, 'signin.ok')").run(now, founders[0].userId);
  assert.equal(db.count('invites'), 0);
  assert.equal(await db.prepare("SELECT description FROM permissions WHERE key = 'id:users.manage'").first('description'),
    'Invite people, grant and revoke roles, disable accounts, end sessions');
  const snapshot = () => Object.fromEntries(['users', 'identities', 'user_roles', 'roles', 'role_permissions', 'permissions',
    'change_entries', 'audit_events', 'sessions'].map(t => [t, raw(db).prepare(`SELECT * FROM ${t} ORDER BY 1, 2`).all().map(r => ({ ...r }))]));
  const before = snapshot();

  migrate(db, ['0002_add_person.sql']);
  const after = snapshot();
  assert.equal(await db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name = 'invites'").first('n'), 0);
  assert.equal(await db.prepare("SELECT description FROM permissions WHERE key = 'id:users.manage'").first('description'),
    CATALOGUE['id:users.manage'].label);
  // Only that one description changed.
  before.permissions = before.permissions.map(p => (p.key === 'id:users.manage' ? { ...p, description: CATALOGUE[p.key].label } : p));
  assert.deepEqual(after, before);
  assert.equal(await db.prepare('SELECT count(*) AS n FROM admins').first('n'), 2);
  // Re-running it is harmless (IF EXISTS, IF NOT EXISTS, an idempotent UPDATE).
  migrate(db, ['0002_add_person.sql']);
  assert.deepEqual(snapshot(), after);
});

test('0002 triggers: the admin role row is fixed, and grants change by delete and insert only', async () => {
  const db = freshDb();
  await assert.rejects(db.prepare("UPDATE roles SET name = 'root' WHERE id = 'role_admin'").run(), /system role/);
  await assert.rejects(db.prepare("UPDATE roles SET description = 'x' WHERE id = 'role_admin'").run(), /system role/);
  assert.equal((await db.prepare("UPDATE roles SET description = 'x' WHERE id = 'role_viewer'").run()).meta.changes, 1);
  await assert.rejects(db.prepare("UPDATE role_permissions SET permission_key = 'id:audit.read' WHERE role_id = 'role_viewer'").run(),
    /delete and insert/);
  // The role editor's own UPDATE skips the system row, so it never fires the trigger.
  assert.equal((await db.prepare("UPDATE roles SET name = ?, description = ? WHERE id = ? AND is_system = 0")
    .bind('admin2', '', 'role_admin').run()).meta.changes, 0);
});

test('permission keys and role names are constrained', async () => {
  const db = freshDb();
  await assert.rejects(db.prepare("INSERT INTO permissions (key, description) VALUES ('Bad', 'x')").run(), /CHECK/);
  await assert.rejects(db.prepare("INSERT INTO permissions (key, description) VALUES ('site:changes', 'x')").run(), /CHECK/);
  for (const bad of ['a', 'Ops', '-ops', '1ops', 'ops team', 'x'.repeat(41)]) {
    await assert.rejects(db.prepare("INSERT INTO roles (id, name, created_at) VALUES (?, ?, 1)").bind('r-' + bad, bad).run(), /CHECK/, bad);
  }
  await db.prepare("INSERT INTO roles (id, name, created_at) VALUES ('r1', 'ops-2', 1)").run();
});

test('privileged keys sit only on admin, and admin keeps every key (RFC-0002 2.4 triggers)', async () => {
  const db = freshDb();
  await db.prepare("INSERT INTO roles (id, name, created_at) VALUES ('r-ops', 'ops', 1)").run();
  for (const key of ['id:users.manage', 'id:roles.manage']) {
    await assert.rejects(db.prepare('INSERT INTO role_permissions VALUES (?, ?)').bind('r-ops', key).run(), /admin only/, key);
    await assert.rejects(db.prepare('INSERT INTO role_permissions VALUES (?, ?)').bind('role_viewer', key).run(), /admin only/, key);
  }
  await db.prepare("INSERT INTO role_permissions VALUES ('r-ops', 'id:users.read')").run();
  await assert.rejects(db.prepare("DELETE FROM role_permissions WHERE role_id = 'role_admin'").run(), /every key/);
  assert.equal(await db.prepare("SELECT count(*) AS n FROM role_permissions WHERE role_id = 'role_admin'").first('n'), 6);
  assert.equal((await db.prepare("DELETE FROM role_permissions WHERE role_id = 'r-ops'").run()).meta.changes, 1);
});

test('audit (case 15): UPDATE raises; recent DELETE raises; retention DELETE succeeds', async () => {
  const db = freshDb();
  const now = Date.now();
  const add = (action, at) => raw(db).prepare('INSERT INTO audit_events (at, action) VALUES (?, ?)').run(at, action).lastInsertRowid;
  const recent = add('signin.ok', now);
  const at399 = add('signin.ok', now - 399 * DAY);
  const okOld = add('role.grant', now - 401 * DAY);

  await assert.rejects(db.prepare("UPDATE audit_events SET action = 'x' WHERE id = ?").bind(recent).run(), /append-only/);
  await assert.rejects(db.prepare("UPDATE audit_events SET at = 0 WHERE id = ?").bind(okOld).run(), /append-only/);
  for (const id of [recent, at399]) {
    await assert.rejects(db.prepare('DELETE FROM audit_events WHERE id = ?').bind(id).run(), /kept until retention/, String(id));
  }
  assert.equal((await db.prepare('DELETE FROM audit_events WHERE id = ?').bind(okOld).run()).meta.changes, 1);
  // The retention statement deletes only expired rows.
  assert.equal((await db.prepare('DELETE FROM audit_events WHERE at < ?').bind(now - 400 * DAY).run()).meta.changes, 0);
  assert.equal(db.count('audit_events'), 2);
  const cols = (await db.prepare('PRAGMA table_info(audit_events)').all()).results.map(c => c.name);
  assert.deepEqual(cols, ['id', 'at', 'actor_user_id', 'action', 'target_type', 'target_id', 'detail_json', 'ip_prefix']);
});

test('change_entries href CHECK (case 12) refuses unsafe links on a direct INSERT', async () => {
  const db = freshDb();
  const ins = href => db.prepare(`INSERT INTO change_entries (id, date, project, state, title, text, href, created_at)
    VALUES (?, '2026-10-08', 'RISE', 'merged', 'Title', 'Text', ?, 1)`).bind(crypto.randomUUID(), href).run();
  for (const bad of ['javascript:alert(1)', 'https://x" autofocus x="', 'https://x y', '//evil.com', '/\\evil.com',
    'http://example.test/', "https://x'y", 'https://x<y', 'https://x>y', 'https://x`y', 'https://x\ty', 'https://é.test',
    'data:text/html,x', '', 'https://' + 'a'.repeat(493)]) {
    await assert.rejects(ins(bad), /CHECK/, bad);
  }
  for (const good of ['https://github.com/SyberLabs/syberlabs-site/pull/1', '/projects/rise/', '/', 'https://' + 'a'.repeat(492)]) {
    assert.equal((await ins(good)).meta.changes, 1, good);
  }
  // The other columns are constrained too.
  await assert.rejects(db.prepare(`INSERT INTO change_entries (id, date, project, state, title, text, href, created_at)
    VALUES ('c1', '2026-1-08', 'RISE', 'merged', 'T', '', '/', 1)`).run(), /CHECK/);
  await assert.rejects(db.prepare(`INSERT INTO change_entries (id, date, project, state, title, text, href, created_at)
    VALUES ('c2', '2026-10-08', 'RISE', 'shipped', 'T', '', '/', 1)`).run(), /CHECK/);
  await assert.rejects(db.prepare(`INSERT INTO change_entries (id, date, project, state, title, text, href, created_at)
    VALUES ('c3', '2026-10-08', 'RISE', 'merged', '', '', '/', 1)`).run(), /CHECK/);
});

test('admins: the enabled holders of role_admin', async () => {
  const db = freshDb();
  const admin = seedUser(db, { roles: ['role_admin'] });
  seedUser(db, { roles: ['role_admin'], disabled: true });
  seedUser(db, { roles: ['role_viewer'], perms: ['id:users.read'] });
  const ids = (await db.prepare('SELECT user_id FROM admins').all()).results.map(r => r.user_id);
  assert.deepEqual(ids, [admin.userId]);
});

test('the lockout-safe revoke (RFC-0002 8.1) refuses to remove the last admin', async () => {
  const db = freshDb();
  const a = seedUser(db, { roles: ['role_admin', 'role_viewer'] });
  const b = seedUser(db, { roles: ['role_admin'] });
  const revoke = (user, role = 'role_admin') => db.prepare(`DELETE FROM user_roles
     WHERE user_id = ?1 AND role_id = ?2
       AND (?2 <> 'role_admin' OR EXISTS (SELECT 1 FROM admins WHERE user_id <> ?1))`).bind(user, role);
  const [first, second] = await db.batch([revoke(a.userId), revoke(b.userId)]);
  assert.equal(first.meta.changes, 1);
  assert.equal(second.meta.changes, 0);
  assert.equal(await db.prepare('SELECT count(*) AS n FROM admins').first('n'), 1);
  assert.equal((await revoke(a.userId, 'role_viewer').run()).meta.changes, 1); // other roles are never guarded
});

test('no speculative columns: what nothing reads or writes is not in the schema (RFC-0002 rev 3)', async () => {
  const db = freshDb();
  const cols = async t => (await db.prepare(`PRAGMA table_info(${t})`).all()).results.map(c => c.name);
  assert.ok(!(await cols('users')).includes('disabled_reason'));
  assert.ok(!(await cols('roles')).includes('created_by'));
  assert.ok(!(await cols('user_roles')).includes('expires_at'));
  assert.ok(!(await cols('permissions')).includes('deprecated_at'));
  assert.deepEqual(await cols('change_entries'), ['id', 'date', 'project', 'state', 'title', 'text', 'href', 'created_at']);
  const idx = await db.prepare("SELECT sql FROM sqlite_master WHERE name = 'change_entries_order'").first('sql');
  assert.match(idx, /ON change_entries\(date DESC, created_at DESC\)$/);
});

test('the per-request read (RFC-0002 8.1) resolves a live session and its keys in one query', async () => {
  const db = freshDb();
  const now = Date.now();
  const u = seedUser(db, { roles: ['role_viewer'], perms: ['site:changes.read', 'id:audit.read'] });
  raw(db).prepare('INSERT INTO sessions (id_hash, user_id, identity_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
    .run('h1', u.userId, u.identityId, now, now + 1000);
  const q = `SELECT s.user_id, s.identity_id, s.created_at, s.expires_at,
       u.display_name, i.provider, i.login, i.email,
       (SELECT json_group_array(DISTINCT rp.permission_key)
          FROM user_roles ur
          JOIN role_permissions rp ON rp.role_id = ur.role_id
         WHERE ur.user_id = s.user_id) AS perms
  FROM sessions s
  JOIN users u      ON u.id = s.user_id AND u.disabled_at IS NULL
  JOIN identities i ON i.id = s.identity_id AND i.user_id = s.user_id
 WHERE s.id_hash = ?1 AND s.expires_at > ?2`;
  const row = await db.prepare(q).bind('h1', now).first();
  assert.deepEqual(JSON.parse(row.perms).sort(), ['id:audit.read', 'site:changes.read']);
  assert.equal(await db.prepare(q).bind('h1', now + 1000).first(), null);
  // Removing the sign-in method ends its sessions (FK cascade).
  await db.prepare('DELETE FROM identities WHERE id = ?').bind(u.identityId).run();
  assert.equal(db.count('sessions'), 0);
});

test('d1 shim: D1 result shapes, binding rules, atomic batch, broken binding', async () => {
  const db = freshDb();
  const r = await db.prepare("INSERT INTO users (id, display_name, created_at) VALUES ('u1', 'A', 1)").run();
  assert.equal(r.success, true);
  assert.equal(r.meta.changes, 1);
  assert.equal(typeof r.meta.last_row_id, 'number');
  assert.deepEqual(r.results, []);
  assert.deepEqual(await db.prepare('SELECT id, display_name FROM users').all(),
    { results: [{ id: 'u1', display_name: 'A' }], success: true, meta: { changes: 0, last_row_id: 0, changed_db: false, rows_read: 1 } });
  assert.equal(await db.prepare('SELECT display_name FROM users WHERE id = ?').bind('u1').first('display_name'), 'A');
  assert.equal(await db.prepare('SELECT * FROM users WHERE id = ?').bind('none').first(), null);
  assert.deepEqual(await db.prepare('SELECT id FROM users').raw(), [['u1']]);
  assert.equal(await db.prepare('SELECT ?1 AS t, ?1 + ?2 AS s').bind(true, 2).first('s'), 3);
  assert.throws(() => db.prepare('SELECT ?').bind(undefined), /D1_TYPE_ERROR/);
  const ret = await db.prepare("UPDATE users SET display_name = 'B' WHERE id = 'u1' RETURNING id").all();
  assert.equal(ret.meta.changes, 1);
  assert.deepEqual(ret.results, [{ id: 'u1' }]);

  await assert.rejects(db.batch([
    db.prepare("INSERT INTO users (id, display_name, created_at) VALUES ('u2', 'C', 1)"),
    db.prepare("INSERT INTO users (id, display_name, created_at) VALUES ('u1', 'dup', 1)"),
  ]), /UNIQUE/);
  assert.equal(db.count('users'), 1);
  const before = db.totalChanges();
  const out = await db.batch([
    db.prepare("INSERT INTO users (id, display_name, created_at) VALUES ('u3', 'D', 1)"),
    db.prepare('SELECT count(*) AS n FROM users'),
  ]);
  assert.equal(out[0].meta.changes, 1);
  assert.deepEqual(out[1].results, [{ n: 2 }]);
  assert.equal(db.totalChanges() - before, 1);

  const broken = brokenDb();
  await assert.rejects(broken.prepare('SELECT 1').bind(1).first(), /D1_ERROR/);
  await assert.rejects(broken.batch([]), /D1_ERROR/);
});

test('0002 refuses populated invites and rolls back without losing any row', async () => {
  const db = freshDb({ upTo: 1 });
  const admin = seedUser(db, { roles: ['role_admin'] });
  db.sqlite.prepare(`INSERT INTO invites (id, role_id, subject, invited_by, created_at, expires_at)
    VALUES ('test-invite', 'role_viewer', '4242', ?, 1, 2)`).run(admin.userId);
  const before = { ...db.sqlite.prepare('SELECT * FROM invites').get() };
  assert.throws(() => migrate(db, ['0002_add_person.sql']), /invites must be empty/);
  assert.deepEqual({ ...db.sqlite.prepare('SELECT * FROM invites').get() }, before);
  assert.equal(await db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name = 'invites_must_be_empty'").first('n'), 0);
  assert.equal(await db.prepare("SELECT description FROM permissions WHERE key = 'id:users.manage'").first('description'),
    'Invite people, grant and revoke roles, disable accounts, end sessions');
});
