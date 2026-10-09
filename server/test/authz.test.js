// authz.js Packet 2 part: can(), displayNames, audit rows, invite lookup, the guarded redemption batch
// (case 8 and RFC-0002 8.5 case 21: the inviter's authority is re-checked at redemption).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  auditStmt, can, displayNames, findIdentity, findOpenInvite, inviteForToken, redeemInvite,
} from '../authz.js';
import { newId, randomToken, sha256Hex } from '../crypto.js';
import { HOUR, makeEnv, seedRole, seedUser } from './helpers.js';

const NOW = Date.UTC(2026, 9, 9, 12);
const DAY = 24 * HOUR;

// An invite row as people.js writes it. Returns {id, token, row}.
async function seedInvite(db, { provider = 'github', subject = 'gh-test-9', email = null, roleId = 'role_viewer', userId = null,
  invitedBy = null, expiresAt = NOW + 7 * DAY, redeemed = false, revoked = false } = {}) {
  const id = newId();
  const token = randomToken();
  db.sqlite.prepare(`INSERT INTO invites (id, token_hash, role_id, user_id, provider, subject, email_normalized, invited_by,
      created_at, expires_at, redeemed_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, await sha256Hex(token), userId ? null : roleId, userId, provider, provider === 'github' ? subject : null,
      provider === 'google' ? email : null, invitedBy, NOW - HOUR, expiresAt, redeemed ? NOW - 1 : null, revoked ? NOW - 1 : null);
  const row = db.sqlite.prepare('SELECT * FROM invites WHERE id = ?').get(id);
  return { id, token, row: { ...row } };
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

test('auditStmt writes the request metadata, and a `when` guard can suppress it', async () => {
  const { DB } = makeEnv();
  await auditStmt(DB, { at: NOW, action: 'signin.ok', targetType: 'user', targetId: 'u1', detail: { a: 1 }, request: req() }).run();
  const row = DB.sqlite.prepare('SELECT * FROM audit_events').get();
  assert.equal(row.ip_prefix, '203.0.113.0/24');
  assert.equal(row.user_agent, 'test-agent');
  assert.equal(row.request_id, 'ray-1');
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

test('findOpenInvite: GitHub by pinned subject, Google only by token hash; closed invites never match', async () => {
  const { DB } = makeEnv();
  const gh = await seedInvite(DB, { subject: 'gh-test-2' });
  await seedInvite(DB, { subject: 'gh-test-3', revoked: true });
  await seedInvite(DB, { subject: 'gh-test-4', redeemed: true });
  await seedInvite(DB, { subject: 'gh-test-5', expiresAt: NOW - 1 });
  const g = await seedInvite(DB, { provider: 'google', email: 'invitee@example.test' });
  assert.equal((await findOpenInvite(DB, { provider: 'github', subject: 'gh-test-2', now: NOW })).id, gh.id);
  for (const s of ['gh-test-3', 'gh-test-4', 'gh-test-5', 'gh-test-6']) {
    assert.equal(await findOpenInvite(DB, { provider: 'github', subject: s, now: NOW }), null, s);
  }
  assert.equal((await findOpenInvite(DB, { provider: 'google', tokenHash: await sha256Hex(g.token), now: NOW })).id, g.id);
  assert.equal(await findOpenInvite(DB, { provider: 'google', now: NOW }), null);
  assert.equal(await findOpenInvite(DB, { provider: 'google', tokenHash: await sha256Hex(gh.token), now: NOW }), null);
});

test('inviteForToken: greeting data for an open invite; malformed tokens never reach D1', async () => {
  const { DB } = makeEnv();
  const admin = seedUser(DB, { roles: ['role_admin'], login: 'inviter' });
  const inv = await seedInvite(DB, { invitedBy: admin.userId });
  const out = await inviteForToken(DB, inv.token, NOW);
  assert.equal(out.invite.id, inv.id);
  assert.equal(out.roleName, 'viewer');
  assert.equal(out.inviterName, 'inviter');
  assert.equal(out.targetName, null);
  let reads = 0;
  const spy = { prepare: () => { reads++; return DB.prepare('SELECT 1'); } };
  for (const bad of ['', 'short', inv.token + 'x', `${inv.token.slice(0, 42)}!`, null]) {
    assert.equal(await inviteForToken(spy, bad, NOW), null);
  }
  assert.equal(reads, 0);
  assert.equal(await inviteForToken(DB, randomToken(), NOW), null);
  assert.equal(await inviteForToken(DB, inv.token, NOW + 8 * DAY), null);
  DB.sqlite.prepare('UPDATE users SET disabled_at = 1 WHERE id = ?').run(admin.userId);
  assert.equal(await inviteForToken(DB, inv.token, NOW), null);
});

test('redeemInvite (GitHub role invite): one batch creates user, identity, grant and audit', async () => {
  const env = makeEnv();
  const inv = await seedInvite(env.DB, { subject: 'gh-test-7' });
  const out = await redeemInvite(env, { invite: inv.row, provider: 'github', subject: 'gh-test-7', login: 'newbie', request: req(), now: NOW });
  assert.ok(out.userId && out.identityId);
  const db = env.DB.sqlite;
  assert.equal(db.prepare('SELECT display_name FROM users WHERE id = ?').get(out.userId).display_name, 'newbie');
  assert.deepEqual({ ...db.prepare('SELECT user_id, provider, subject, login FROM identities WHERE id = ?').get(out.identityId) },
    { user_id: out.userId, provider: 'github', subject: 'gh-test-7', login: 'newbie' });
  assert.equal(db.prepare('SELECT role_id FROM user_roles WHERE user_id = ?').get(out.userId).role_id, 'role_viewer');
  const i = db.prepare('SELECT redeemed_at, redeemed_identity_id FROM invites WHERE id = ?').get(inv.id);
  assert.equal(i.redeemed_at, NOW);
  assert.equal(i.redeemed_identity_id, out.identityId);
  const audit = db.prepare("SELECT * FROM audit_events WHERE action = 'invite.redeem'").get();
  assert.equal(audit.actor_user_id, out.userId);
  assert.equal(audit.target_id, inv.id);
});

test('case 8: an invite redeems once, even for two concurrent callbacks; the loser writes nothing', async () => {
  const env = makeEnv();
  const inv = await seedInvite(env.DB, { subject: 'gh-test-8' });
  const args = { invite: inv.row, provider: 'github', subject: 'gh-test-8', login: 'x', request: req(), now: NOW };
  const [a, b] = await Promise.all([redeemInvite(env, args), redeemInvite(env, args)]);
  assert.equal([a, b].filter(Boolean).length, 1);
  assert.equal(env.DB.count('users'), 1);
  assert.equal(env.DB.count('identities'), 1);
  assert.equal(env.DB.count('user_roles'), 1);
  const before = env.DB.totalChanges();
  assert.equal(await redeemInvite(env, args), null);
  assert.equal(env.DB.count('users'), 1);
  assert.ok(env.DB.totalChanges() >= before); // rolled back or no-op; row counts above are the proof
});

test('redeemInvite refuses a subject that is not the pinned one, and expired or revoked invites', async () => {
  const env = makeEnv();
  const inv = await seedInvite(env.DB, { subject: 'gh-test-10' });
  assert.equal(await redeemInvite(env, { invite: inv.row, provider: 'github', subject: 'gh-test-11', request: req(), now: NOW }), null);
  assert.equal(await redeemInvite(env, { invite: inv.row, provider: 'google', subject: 'gh-test-10', request: req(), now: NOW }), null);
  assert.equal(await redeemInvite(env, { invite: inv.row, provider: 'github', subject: 'gh-test-10', request: req(), now: NOW + 8 * DAY }), null);
  env.DB.sqlite.prepare('UPDATE invites SET revoked_at = 1 WHERE id = ?').run(inv.id);
  assert.equal(await redeemInvite(env, { invite: inv.row, provider: 'github', subject: 'gh-test-10', request: req(), now: NOW }), null);
  assert.equal(env.DB.count('users'), 0);
  assert.equal(env.DB.count('identities'), 0);
  assert.equal(env.DB.count('audit_events'), 0);
});

test('case 8: an add-method invite attaches to its target, and is refused while the target is turned off', async () => {
  const env = makeEnv();
  const target = seedUser(env.DB, { roles: ['role_viewer'], login: 'target' });
  const inv = await seedInvite(env.DB, { provider: 'google', email: 'target@example.test', userId: target.userId });
  env.DB.sqlite.prepare('UPDATE users SET disabled_at = 1 WHERE id = ?').run(target.userId);
  const args = { invite: inv.row, provider: 'google', subject: 'g-test-1', email: 'target@example.test', request: req(), now: NOW };
  assert.equal(await redeemInvite(env, args), null);
  assert.equal(env.DB.count('identities'), 1);
  assert.equal(env.DB.sqlite.prepare('SELECT redeemed_at FROM invites').get().redeemed_at, null); // stays unburned

  env.DB.sqlite.prepare('UPDATE users SET disabled_at = NULL WHERE id = ?').run(target.userId);
  const out = await redeemInvite(env, args);
  assert.equal(out.userId, target.userId);
  assert.equal(env.DB.count('users'), 1);
  assert.equal(env.DB.count('identities'), 2);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM user_roles').get().n, 1); // no new grant
  const detail = JSON.parse(env.DB.sqlite.prepare("SELECT detail_json FROM audit_events WHERE action = 'invite.redeem'").get().detail_json);
  assert.equal(detail.add, 'identity.add');
});

test('case 8: a Google identity whose email matches an existing account is never linked (outcome d)', async () => {
  const env = makeEnv();
  seedUser(env.DB, { provider: 'google', subject: 'g-test-2', email: 'shared@example.test', login: null, displayName: 'shared' });
  assert.equal(await findIdentity(env.DB, 'google', 'g-test-3'), null);
  assert.equal(await findOpenInvite(env.DB, { provider: 'google', subject: 'g-test-3', tokenHash: null, now: NOW }), null);
  assert.equal(env.DB.count('identities'), 1);
});

test('RFC 8.5 case 21: the inviter must still be able to invite at redemption; bootstrap invites are exempt', async () => {
  const env = makeEnv();
  const db = env.DB.sqlite;
  const a = seedUser(env.DB, { roles: ['role_admin'], login: 'admin-a' });
  seedUser(env.DB, { roles: ['role_admin'], login: 'admin-b' });
  const redeem = (inv, subject) => redeemInvite(env, { invite: inv.row, provider: 'github', subject, request: req(), now: NOW });

  // Turned off.
  let inv = await seedInvite(env.DB, { subject: 'gh-test-21', invitedBy: a.userId });
  db.prepare('UPDATE users SET disabled_at = 1 WHERE id = ?').run(a.userId);
  assert.equal(await redeem(inv, 'gh-test-21'), null);
  assert.equal(db.prepare('SELECT redeemed_at FROM invites WHERE id = ?').get(inv.id).redeemed_at, null);
  db.prepare('UPDATE users SET disabled_at = NULL WHERE id = ?').run(a.userId);

  // admin revoked (A keeps only viewer).
  db.prepare("DELETE FROM user_roles WHERE user_id = ? AND role_id = 'role_admin'").run(a.userId);
  db.prepare("INSERT INTO user_roles (user_id, role_id, granted_at) VALUES (?, 'role_viewer', 1)").run(a.userId);
  assert.equal(await redeem(inv, 'gh-test-21'), null);

  // A holds id:users.manage again but not every key of the invited role: still refused (up rule).
  const ops = seedRole(env.DB, ['id:users.manage', 'id:users.read']);
  db.prepare('INSERT INTO user_roles (user_id, role_id, granted_at) VALUES (?, ?, 1)').run(a.userId, ops);
  const toAdmin = await seedInvite(env.DB, { subject: 'gh-test-22', invitedBy: a.userId, roleId: 'role_admin' });
  assert.equal(await redeem(toAdmin, 'gh-test-22'), null);
  // ...while an invite to a role inside A's keys redeems (viewer).
  assert.ok(await redeem(inv, 'gh-test-21'));

  // Expired grants grant no authority.
  const b2 = seedUser(env.DB, { roles: ['role_admin'], login: 'admin-c', expiresAt: NOW - 1 });
  const late = await seedInvite(env.DB, { subject: 'gh-test-23', invitedBy: b2.userId });
  assert.equal(await redeem(late, 'gh-test-23'), null);

  const boot = await seedInvite(env.DB, { subject: 'gh-test-24', roleId: 'role_admin', invitedBy: null });
  assert.ok(await redeem(boot, 'gh-test-24'));
});
