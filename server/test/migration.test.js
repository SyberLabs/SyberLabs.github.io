import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { freshDb, brokenDb } from './d1-shim.js';
import { seedUser } from './helpers.js';
import { CATALOGUE } from '../permissions.js';

const DAY = 86400 * 1000;
const raw = db => db.sqlite;

test('the schema applies with foreign keys on, and every table and view exists', async () => {
  const db = freshDb();
  assert.equal(await db.prepare('PRAGMA foreign_keys').first('foreign_keys'), 1);
  const names = (await db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name").all())
    .results.map(r => r.name);
  assert.deepEqual(names, ['audit_events', 'change_entries', 'full_admins', 'identities', 'invites', 'permissions',
    'role_permissions', 'roles', 'sessions', 'user_roles', 'users']);
  await assert.rejects(db.prepare("INSERT INTO identities (id, user_id, provider, subject, created_at) VALUES ('i','nope','github','1',1)").run(),
    /FOREIGN KEY/);
});

test('migrations hold no people, emails or content (the CI grep, run here too)', () => {
  const dir = new URL('../../migrations/', import.meta.url);
  for (const f of readdirSync(dir).filter(n => n.endsWith('.sql'))) {
    const sql = readFileSync(new URL(f, dir), 'utf8');
    assert.doesNotMatch(sql, /@/, f);
    assert.doesNotMatch(sql, /INSERT INTO "?(users|identities|invites|user_roles|sessions|change_entries)/i, f);
  }
});

test('catalogue (case 18): CATALOGUE matches the permissions rows exactly', async () => {
  const rows = (await freshDb().prepare('SELECT key, description, privileged, deprecated_at FROM permissions ORDER BY key').all()).results;
  assert.deepEqual(rows.map(r => r.key), Object.keys(CATALOGUE).sort());
  for (const r of rows) {
    assert.equal(r.description, CATALOGUE[r.key].label, r.key);
    assert.equal(r.privileged === 1, CATALOGUE[r.key].privileged, r.key);
    assert.equal(r.deprecated_at, null);
  }
});

test('catalogue (case 18): admin holds every non-deprecated key; viewer holds only site:changes.read', async () => {
  const db = freshDb();
  const missing = await db.prepare(`SELECT key FROM permissions WHERE deprecated_at IS NULL AND key NOT IN
    (SELECT permission_key FROM role_permissions WHERE role_id = 'role_admin')`).all();
  assert.deepEqual(missing.results, []);
  const viewer = await db.prepare("SELECT permission_key FROM role_permissions WHERE role_id = 'role_viewer'").all();
  assert.deepEqual(viewer.results, [{ permission_key: 'site:changes.read' }]);
  assert.deepEqual(await db.prepare("SELECT name, is_system FROM roles WHERE id = 'role_admin'").first(), { name: 'admin', is_system: 1 });
  assert.equal(await db.prepare("SELECT is_system FROM roles WHERE id = 'role_viewer'").first('is_system'), 0);
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

test('invites need exactly one target and a provider-shaped key', async () => {
  const db = freshDb();
  const { userId } = seedUser(db);
  const ins = (vals) => db.prepare(`INSERT INTO invites (id, token_hash, role_id, user_id, provider, subject, email_normalized,
    created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 2)`).bind(...vals).run();
  await ins(['i1', 'h1', 'role_viewer', null, 'github', 'gh-test-1', null]);
  await ins(['i2', 'h2', null, userId, 'google', null, 'test-user.example']);
  await assert.rejects(ins(['i3', 'h3', 'role_viewer', userId, 'github', 'gh-test-2', null]), /CHECK/);
  await assert.rejects(ins(['i4', 'h4', null, null, 'github', 'gh-test-2', null]), /CHECK/);
  await assert.rejects(ins(['i5', 'h5', 'role_viewer', null, 'github', null, null]), /CHECK/);
  await assert.rejects(ins(['i6', 'h6', 'role_viewer', null, 'google', 'gh-test-3', 'x.example']), /CHECK/);
  await assert.rejects(ins(['i7', 'h1', 'role_viewer', null, 'github', 'gh-test-4', null]), /UNIQUE/);
});

test('audit (case 15): UPDATE raises; recent DELETE raises; retention DELETE succeeds', async () => {
  const db = freshDb();
  const now = Date.now();
  const add = (action, at) => raw(db).prepare('INSERT INTO audit_events (at, action) VALUES (?, ?)').run(at, action).lastInsertRowid;
  const recent = add('signin.ok', now);
  const deniedOld = add('signin.denied', now - 91 * DAY);
  const okAt91 = add('signin.ok', now - 91 * DAY);
  const okOld = add('role.grant', now - 401 * DAY);
  const deniedRecent = add('signin.denied', now - 89 * DAY);

  await assert.rejects(db.prepare("UPDATE audit_events SET action = 'x' WHERE id = ?").bind(recent).run(), /append-only/);
  await assert.rejects(db.prepare("UPDATE audit_events SET at = 0 WHERE id = ?").bind(okOld).run(), /append-only/);
  for (const id of [recent, okAt91, deniedRecent]) {
    await assert.rejects(db.prepare('DELETE FROM audit_events WHERE id = ?').bind(id).run(), /kept until retention/, String(id));
  }
  for (const id of [deniedOld, okOld]) {
    assert.equal((await db.prepare('DELETE FROM audit_events WHERE id = ?').bind(id).run()).meta.changes, 1);
  }
  // The retention statement the callback runs in waitUntil deletes only expired rows.
  const r = await db.prepare(`DELETE FROM audit_events WHERE (action = 'signin.denied' AND at < ?1) OR at < ?2`)
    .bind(now - 90 * DAY, now - 400 * DAY).run();
  assert.equal(r.meta.changes, 0);
  assert.equal(db.count('audit_events'), 3);
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

test('full_admins: enabled users with non-expiring grants of both manage keys', async () => {
  const db = freshDb();
  const admin = seedUser(db, { roles: ['role_admin'] });
  seedUser(db, { roles: ['role_admin'], disabled: true });
  seedUser(db, { roles: ['role_admin'], expiresAt: Date.now() + DAY });
  seedUser(db, { perms: ['id:users.manage', 'id:users.read'] });
  const split = seedUser(db, { perms: ['id:users.manage'] });
  raw(db).prepare('INSERT INTO user_roles (user_id, role_id, granted_at) VALUES (?, ?, 1)')
    .run(split.userId, (await db.prepare("INSERT INTO roles (id, name, created_at) VALUES ('r-rm', 'roles-only', 1) RETURNING id").first('id')));
  raw(db).prepare("INSERT INTO role_permissions VALUES ('r-rm', 'id:roles.manage')").run();
  const ids = (await db.prepare('SELECT user_id FROM full_admins ORDER BY user_id').all()).results.map(r => r.user_id);
  assert.deepEqual(ids, [admin.userId, split.userId].sort());
});

test('the lockout-safe revoke (RFC-0002 5.3) refuses to remove the last full admin', async () => {
  const db = freshDb();
  const a = seedUser(db, { roles: ['role_admin'] });
  const b = seedUser(db, { roles: ['role_admin'] });
  const revoke = user => db.prepare(`DELETE FROM user_roles
     WHERE user_id = ?1 AND role_id = ?2
       AND (?1 NOT IN (SELECT user_id FROM full_admins)
            OR EXISTS (SELECT 1 FROM full_admins WHERE user_id <> ?1))`).bind(user, 'role_admin');
  const [first, second] = await db.batch([revoke(a.userId), revoke(b.userId)]);
  assert.equal(first.meta.changes, 1);
  assert.equal(second.meta.changes, 0);
  assert.equal(await db.prepare('SELECT count(*) AS n FROM full_admins').first('n'), 1);
});

test('the per-request read (RFC-0002 8.1) resolves a live session and its keys in one query', async () => {
  const db = freshDb();
  const now = Date.now();
  const u = seedUser(db, { roles: ['role_viewer'], perms: ['site:changes.read', 'id:audit.read'] });
  raw(db).prepare('INSERT INTO sessions (id_hash, user_id, identity_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
    .run('h1', u.userId, u.identityId, now, now + 1000);
  const q = `SELECT s.user_id, s.identity_id, s.expires_at,
       u.display_name, i.provider, i.login, i.email,
       (SELECT json_group_array(DISTINCT rp.permission_key)
          FROM user_roles ur
          JOIN role_permissions rp ON rp.role_id = ur.role_id
          JOIN permissions p ON p.key = rp.permission_key AND p.deprecated_at IS NULL
         WHERE ur.user_id = s.user_id AND (ur.expires_at IS NULL OR ur.expires_at > ?2)) AS perms
  FROM sessions s
  JOIN users u      ON u.id = s.user_id AND u.disabled_at IS NULL
  JOIN identities i ON i.id = s.identity_id
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
