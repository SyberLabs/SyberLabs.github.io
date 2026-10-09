// authz.js Packet 2 part: can(), displayNames, audit rows and the identity lookup. Invites and their
// redemption tests are gone with them (RFC-0002 R3-4); Add person is covered in people.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditStmt, can, disableUserStmts, displayNames, findIdentity } from '../authz.js';
import { makeEnv, seedUser } from './helpers.js';

const NOW = Date.UTC(2026, 9, 9, 12);

const req = () => new Request('https://syberlabs.io/auth/callback/github', {
  headers: { 'CF-Connecting-IP': '203.0.113.7', 'User-Agent': 'test-agent', 'CF-Ray': 'ray-1' },
});

test('can() reads ctx.perms only', () => {
  assert.equal(can({ perms: new Set(['a:b.c']) }, 'a:b.c'), true);
  assert.equal(can({ perms: new Set() }, 'a:b.c'), false);
  assert.equal(can({}, 'a:b.c'), false);
});

test('displayNames maps ids to identity names (@login, else GitHub id N) and ignores unknown ids', async () => {
  const { DB } = makeEnv();
  const a = seedUser(DB, { login: 'alpha' });
  const b = seedUser(DB, { login: 'beta' });
  const names = await displayNames(DB, [a.userId, b.userId, a.userId, 'nope', null]);
  assert.deepEqual([...names.entries()].sort(), [[a.userId, '@alpha'], [b.userId, '@beta']].sort());
  const byId = seedUser(DB, { login: null, subject: '4242' });
  assert.equal((await displayNames(DB, [byId.userId])).get(byId.userId), 'GitHub id 4242');
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

// A retried request can carry the same millisecond stamp after another request already turned it off.
test('turn-off batch audits only its own transition, even on same-time retries and with no sessions', async () => {
  const { DB } = makeEnv();
  const actor = seedUser(DB, { roles: ['role_admin'] });
  const target = seedUser(DB, { roles: ['role_viewer'] });
  const args = { userId: target.userId, actorId: actor.userId, now: NOW };
  const first = await DB.batch(disableUserStmts(DB, args));
  assert.deepEqual(first.map(r => r.meta.changes), [1, 1, 0]);
  const before = DB.totalChanges();
  const repeat = await DB.batch(disableUserStmts(DB, args));
  assert.deepEqual(repeat.map(r => r.meta.changes), [0, 0, 0]);
  assert.equal(DB.totalChanges(), before);
  assert.equal(DB.count('audit_events'), 1);
});
