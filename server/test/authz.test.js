// authz.js Packet 2 part: can(), displayNames, audit rows, invite lookup, the guarded redemption batch
// (case 8 and RFC-0002 8.5 case 21: the inviter must still be an enabled admin at redemption).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditStmt, can, displayNames, findIdentity, findOpenInvite, redeemInvite } from '../authz.js';
import { newId } from '../crypto.js';
import { HOUR, makeEnv, seedUser } from './helpers.js';

const NOW = Date.UTC(2026, 9, 9, 12);
const DAY = 24 * HOUR;

// An invite row as people.js writes it: GitHub only, pinned to a numeric id. Returns {id, row}.
function seedInvite(db, { subject = '9009', roleId = 'role_viewer', invitedBy, expiresAt = NOW + 7 * DAY, redeemed = false,
  revoked = false } = {}) {
  const by = invitedBy || seedUser(db, { roles: ['role_admin'], login: `inviter-${newId().slice(0, 4)}` }).userId;
  const id = newId();
  db.sqlite.prepare(`INSERT INTO invites (id, role_id, subject, login_hint, invited_by, created_at, expires_at, redeemed_at, revoked_at)
      VALUES (?, ?, ?, 'octo-test', ?, ?, ?, ?, ?)`)
    .run(id, roleId, subject, by, NOW - HOUR, expiresAt, redeemed ? NOW - 1 : null, revoked ? NOW - 1 : null);
  return { id, invitedBy: by, row: { ...db.sqlite.prepare('SELECT id, role_id, invited_by FROM invites WHERE id = ?').get(id) } };
}

const req = () => new Request('https://syberlabs.io/auth/callback/github', {
  headers: { 'CF-Connecting-IP': '203.0.113.7', 'User-Agent': 'test-agent', 'CF-Ray': 'ray-1' },
});

test('can() reads ctx.perms only', () => {
  assert.equal(can({ perms: new Set(['a:b.c']) }, 'a:b.c'), true);
  assert.equal(can({ perms: new Set() }, 'a:b.c'), false);
  assert.equal(can({}, 'a:b.c'), false);
});

test('displayNames maps ids to names and ignores unknown ids', async () => {
  const { DB } = makeEnv();
  const a = seedUser(DB, { login: 'alpha' });
  const b = seedUser(DB, { login: 'beta' });
  const names = await displayNames(DB, [a.userId, b.userId, a.userId, 'nope', null]);
  assert.deepEqual([...names.entries()].sort(), [[a.userId, 'alpha'], [b.userId, 'beta']].sort());
  assert.equal((await displayNames(DB, [])).size, 0);
});

test('auditStmt writes the IP prefix, and a `when` guard can suppress it', async () => {
  const { DB } = makeEnv();
  await auditStmt(DB, { at: NOW, action: 'signin.ok', targetType: 'user', targetId: 'u1', detail: { a: 1 }, request: req() }).run();
  const row = DB.sqlite.prepare('SELECT * FROM audit_events').get();
  assert.equal(row.ip_prefix, '203.0.113.0/24');
  assert.equal('user_agent' in row || 'request_id' in row, false);
  assert.equal(row.detail_json, '{"a":1}');
  await auditStmt(DB, { at: NOW, action: 'x.y', when: ['1 = ?', 2] }).run();
  assert.equal(DB.count('audit_events'), 1);
});

test('findIdentity keys on (provider, subject) and never on email or login', async () => {
  const { DB } = makeEnv();
  const u = seedUser(DB, { subject: 'gh-test-1', login: 'old-name', email: 'shared@example.test' });
  const found = await findIdentity(DB, 'github', 'gh-test-1');
  assert.deepEqual(found, { identityId: u.identityId, userId: u.userId, displayName: 'old-name', disabledAt: null });
  assert.equal(await findIdentity(DB, 'google', 'gh-test-1'), null);
  assert.equal(await findIdentity(DB, 'github', 'old-name'), null);
});

test('findOpenInvite: by pinned subject only; closed invites never match', async () => {
  const { DB } = makeEnv();
  const gh = seedInvite(DB, { subject: '2002' });
  seedInvite(DB, { subject: '3003', revoked: true });
  seedInvite(DB, { subject: '4004', redeemed: true });
  seedInvite(DB, { subject: '5005', expiresAt: NOW - 1 });
  assert.deepEqual(await findOpenInvite(DB, '2002', NOW), gh.row);
  for (const s of ['3003', '4004', '5005', '6006', null]) assert.equal(await findOpenInvite(DB, s, NOW), null, String(s));
});

test('redeemInvite: one batch creates user, identity, grant and audit', async () => {
  const env = makeEnv();
  const inv = seedInvite(env.DB, { subject: '7007' });
  const out = await redeemInvite(env, { invite: inv.row, subject: '7007', login: 'newbie', request: req(), now: NOW });
  assert.ok(out.userId && out.identityId);
  const db = env.DB.sqlite;
  assert.equal(db.prepare('SELECT display_name FROM users WHERE id = ?').get(out.userId).display_name, 'newbie');
  assert.deepEqual({ ...db.prepare('SELECT user_id, provider, subject, login FROM identities WHERE id = ?').get(out.identityId) },
    { user_id: out.userId, provider: 'github', subject: '7007', login: 'newbie' });
  assert.deepEqual({ ...db.prepare('SELECT role_id, granted_by FROM user_roles WHERE user_id = ?').get(out.userId) },
    { role_id: 'role_viewer', granted_by: inv.invitedBy });
  const i = db.prepare('SELECT redeemed_at, redeemed_identity_id FROM invites WHERE id = ?').get(inv.id);
  assert.equal(i.redeemed_at, NOW);
  assert.equal(i.redeemed_identity_id, out.identityId);
  const audit = db.prepare("SELECT * FROM audit_events WHERE action = 'invite.redeem'").get();
  assert.equal(audit.actor_user_id, out.userId);
  assert.equal(audit.target_id, inv.id);
});

test('case 8: an invite redeems once, even for two concurrent callbacks; the loser writes nothing', async () => {
  const env = makeEnv();
  const inv = seedInvite(env.DB, { subject: '8008' });
  const users = env.DB.count('users');
  const args = { invite: inv.row, subject: '8008', login: 'x', request: req(), now: NOW };
  const [a, b] = await Promise.all([redeemInvite(env, args), redeemInvite(env, args)]);
  assert.equal([a, b].filter(Boolean).length, 1);
  assert.equal(env.DB.count('users'), users + 1);
  assert.equal(env.DB.count('identities'), users + 1);
  assert.equal(await redeemInvite(env, args), null);
  assert.equal(env.DB.count('users'), users + 1);
});

test('redeemInvite refuses a subject that is not the pinned one, and expired or revoked invites', async () => {
  const env = makeEnv();
  const inv = seedInvite(env.DB, { subject: '1010' });
  const before = env.DB.totalChanges();
  assert.equal(await redeemInvite(env, { invite: inv.row, subject: '1011', request: req(), now: NOW }), null);
  assert.equal(await redeemInvite(env, { invite: inv.row, subject: '1010', request: req(), now: NOW + 8 * DAY }), null);
  env.DB.sqlite.prepare('UPDATE invites SET revoked_at = 1 WHERE id = ?').run(inv.id);
  const afterRevoke = env.DB.totalChanges();
  assert.equal(await redeemInvite(env, { invite: inv.row, subject: '1010', request: req(), now: NOW }), null);
  assert.equal(afterRevoke - before, 1, 'only the revoke itself changed a row');
  assert.equal(env.DB.totalChanges(), afterRevoke);
});

test('RFC 8.5 case 21: the inviter must still be an enabled admin at redemption', async () => {
  const env = makeEnv();
  const db = env.DB.sqlite;
  const redeem = (inv, subject) => redeemInvite(env, { invite: inv.row, subject, request: req(), now: NOW });

  // Turned off: refused, and the invite stays unburned.
  const inv = seedInvite(env.DB, { subject: '2121' });
  db.prepare('UPDATE users SET disabled_at = 1 WHERE id = ?').run(inv.invitedBy);
  assert.equal(await redeem(inv, '2121'), null);
  assert.equal(db.prepare('SELECT redeemed_at FROM invites WHERE id = ?').get(inv.id).redeemed_at, null);
  db.prepare('UPDATE users SET disabled_at = NULL WHERE id = ?').run(inv.invitedBy);

  // admin revoked (the inviter keeps only viewer): refused.
  db.prepare("DELETE FROM user_roles WHERE user_id = ? AND role_id = 'role_admin'").run(inv.invitedBy);
  db.prepare("INSERT INTO user_roles (user_id, role_id, granted_at) VALUES (?, 'role_viewer', 1)").run(inv.invitedBy);
  assert.equal(await redeem(inv, '2121'), null);

  // admin again: redeems.
  db.prepare("INSERT INTO user_roles (user_id, role_id, granted_at) VALUES (?, 'role_admin', 1)").run(inv.invitedBy);
  assert.ok(await redeem(inv, '2121'));
});
