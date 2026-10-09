// /admin/people through handle(): cases 13 (revocation ends access), 21 (confirm pages) and the invite
// flow (GitHub only, the lookup pinned to the numeric id, no link).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sha256Hex } from '../crypto.js';
import { call, makeEnv, seedSession, signIn, stubFetch } from './helpers.js';

const q = (db, sql, ...a) => db.sqlite.prepare(sql).get(...a);
const roles = (db, userId) => db.sqlite.prepare('SELECT role_id FROM user_roles WHERE user_id = ? ORDER BY role_id').all(userId).map(r => r.role_id);

test('people page: readers see the table without actions; managers get the forms', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'], login: 'boss' });
  const reader = await signIn(env.DB, { perms: ['id:users.read'], login: '<b>reader</b>' });
  let res = await call(env, '/admin/people', { cookie: reader.cookie });
  assert.equal(res.status, 200);
  let page = await res.text();
  assert.match(page, /boss/);
  assert.match(page, /&lt;b&gt;reader&lt;\/b&gt;/);
  assert.doesNotMatch(page, /<b>reader/);
  assert.doesNotMatch(page, /action="\/admin\/people\/invite"/);
  page = await (await call(env, '/admin/people', { cookie: admin.cookie })).text();
  assert.match(page, /action="\/admin\/people\/invite"/);
  assert.match(page, /action="\/admin\/people\/roles\/grant"/);
  assert.doesNotMatch(page, /<script/);
});

test('case 21: granting admin needs the confirm page, which names the acting identity; confirm=1 grants', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'], login: 'seth-test' });
  const target = await signIn(env.DB, { roles: ['role_viewer'], login: 'mateo-test' });
  const before = env.DB.totalChanges();
  let res = await call(env, '/admin/people/roles/grant', { cookie: admin.cookie, form: { user: target.userId, role: 'role_admin' } });
  assert.equal(res.status, 200);
  const page = await res.text();
  assert.match(page, /You, seth-test via GitHub, are granting <strong>admin<\/strong> to mateo-test/);
  assert.match(page, /name="confirm" value="1"/);
  assert.match(page, new RegExp(`name="user" value="${target.userId}"`));
  assert.match(page, /Grant admin to mateo-test/);
  assert.equal(env.DB.totalChanges(), before);
  assert.deepEqual(roles(env.DB, target.userId), ['role_viewer']);

  res = await call(env, '/admin/people/roles/grant', { cookie: admin.cookie, form: { user: target.userId, role: 'role_admin', confirm: '1' } });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), '/admin/people?ok=granted');
  assert.deepEqual(roles(env.DB, target.userId), ['role_admin', 'role_viewer']);
  const audit = q(env.DB, "SELECT * FROM audit_events WHERE action = 'role.grant'");
  assert.equal(audit.actor_user_id, admin.userId);
  assert.equal(audit.target_id, target.userId);
  // Granting again changes nothing and writes no second audit row.
  await call(env, '/admin/people/roles/grant', { cookie: admin.cookie, form: { user: target.userId, role: 'role_admin', confirm: '1' } });
  assert.equal(q(env.DB, "SELECT count(*) AS n FROM audit_events WHERE action = 'role.grant'").n, 1);
});

test('granting a non-privileged role acts at once', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  const target = await signIn(env.DB, { roles: [] });
  const res = await call(env, '/admin/people/roles/grant', { cookie: admin.cookie, form: { user: target.userId, role: 'role_viewer' } });
  assert.equal(res.status, 303);
  assert.deepEqual(roles(env.DB, target.userId), ['role_viewer']);
  assert.equal((await call(env, '/admin/changes', { cookie: target.cookie })).status, 200);
});

test('case 13: a revoked role gives 403 on the target\'s next request', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  const target = await signIn(env.DB, { roles: ['role_viewer'] });
  assert.equal((await call(env, '/admin/changes', { cookie: target.cookie })).status, 200);
  const res = await call(env, '/admin/people/roles/revoke', { cookie: admin.cookie, form: { user: target.userId, role: 'role_viewer' } });
  assert.equal(res.status, 303);
  assert.equal((await call(env, '/admin/changes', { cookie: target.cookie })).status, 403);
  assert.equal(q(env.DB, "SELECT count(*) AS n FROM audit_events WHERE action = 'role.revoke'").n, 1);
});

test('case 13: turning a user off (confirmed) deletes their sessions and revokes their open invites', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'], login: 'boss' });
  const other = await signIn(env.DB, { roles: ['role_admin'], login: 'other' });
  await seedSession(env.DB, other);
  env.DB.sqlite.prepare(`INSERT INTO invites (id, role_id, subject, invited_by, created_at, expires_at)
    VALUES ('inv1', 'role_viewer', '5050', ?, 1, ?)`).run(other.userId, Date.now() + 1e9);
  const before = env.DB.totalChanges();
  let res = await call(env, '/admin/people/disable', { cookie: admin.cookie, form: { user: other.userId } });
  assert.equal(res.status, 200);
  assert.match(await res.text(), /You, boss via GitHub, are turning off other/);
  assert.equal(env.DB.totalChanges(), before);

  res = await call(env, '/admin/people/disable', { cookie: admin.cookie, form: { user: other.userId, confirm: '1' } });
  assert.equal(res.status, 303);
  assert.equal(q(env.DB, 'SELECT count(*) AS n FROM sessions WHERE user_id = ?', other.userId).n, 0);
  assert.ok(q(env.DB, 'SELECT disabled_at FROM users WHERE id = ?', other.userId).disabled_at);
  assert.ok(q(env.DB, "SELECT revoked_at FROM invites WHERE id = 'inv1'").revoked_at);
  assert.equal(q(env.DB, "SELECT count(*) AS n FROM audit_events WHERE action = 'user.disable'").n, 1);
  res = await call(env, '/admin/', { cookie: other.cookie });
  assert.equal(res.status, 303);

  // Turn back on: no confirm (RFC-0002 8.2), sessions stay gone.
  res = await call(env, '/admin/people/enable', { cookie: admin.cookie, form: { user: other.userId } });
  assert.equal(res.status, 303);
  assert.equal(q(env.DB, 'SELECT disabled_at FROM users WHERE id = ?', other.userId).disabled_at, null);
  assert.equal((await call(env, '/admin/', { cookie: other.cookie })).status, 303);
  assert.equal(q(env.DB, "SELECT count(*) AS n FROM audit_events WHERE action = 'user.enable'").n, 1);
});

test('case 13: removing a sign-in method deletes its sessions; the last method cannot be removed', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  const target = await signIn(env.DB, { roles: ['role_viewer'], login: 'two-methods' });
  env.DB.sqlite.prepare(`INSERT INTO identities (id, user_id, provider, subject, email, created_at)
    VALUES ('ident-g', ?, 'google', 'g-test-60', 'two@example.test', 1)`).run(target.userId);
  const gSession = await seedSession(env.DB, { userId: target.userId, identityId: 'ident-g' });
  assert.equal(q(env.DB, 'SELECT count(*) AS n FROM sessions WHERE user_id = ?', target.userId).n, 2);

  let res = await call(env, '/admin/people/identity/remove', { cookie: admin.cookie, form: { identity: 'ident-g' } });
  assert.equal(res.status, 200);
  assert.match(await res.text(), /name="confirm" value="1"/);
  res = await call(env, '/admin/people/identity/remove', { cookie: admin.cookie, form: { identity: 'ident-g', confirm: '1' } });
  assert.equal(res.status, 303);
  assert.equal(q(env.DB, "SELECT count(*) AS n FROM identities WHERE id = 'ident-g'").n, 0);
  assert.equal(q(env.DB, 'SELECT count(*) AS n FROM sessions WHERE id_hash = ?', await sha256Hex(gSession)).n, 0);
  assert.equal((await call(env, '/admin/changes', { cookie: target.cookie })).status, 200); // GitHub session lives

  const before = env.DB.totalChanges();
  res = await call(env, '/admin/people/identity/remove', { cookie: admin.cookie, form: { identity: target.identityId, confirm: '1' } });
  assert.equal(res.status, 403);
  assert.match(await res.text(), /only sign-in method/);
  assert.equal(env.DB.totalChanges(), before);
});

test('end sessions: an admin ends another user\'s sessions', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  const target = await signIn(env.DB, { roles: ['role_viewer'] });
  const res = await call(env, '/admin/people/sessions/revoke', { cookie: admin.cookie, form: { user: target.userId } });
  assert.equal(res.status, 303);
  assert.equal((await call(env, '/admin/changes', { cookie: target.cookie })).status, 303);
  assert.equal((await call(env, '/admin/changes', { cookie: admin.cookie })).status, 200);
});

test('GitHub invite: the username is looked up once, the confirm page shows login and id, confirm creates it', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'], login: 'boss', subject: '6006' });
  const fetchStub = stubFetch(req => {
    if (req.url === 'https://api.github.com/users/new-person') return { id: 4242, login: 'New-Person' };
    if (req.url.startsWith('https://api.github.com/users/')) return new Response('{}', { status: 404 });
  });
  try {
    const before = env.DB.totalChanges();
    let res = await call(env, '/admin/people/invite', { cookie: admin.cookie, form: { role: 'role_viewer', login: 'new-person' } });
    assert.equal(res.status, 200);
    let page = await res.text();
    assert.match(page, /@New-Person, GitHub id 4242/);
    assert.match(page, /name="subject" value="4242"/);
    assert.equal(fetchStub.calls.length, 1);
    assert.equal(env.DB.totalChanges(), before);

    res = await call(env, '/admin/people/invite', { cookie: admin.cookie,
      form: { role: 'role_viewer', login: 'New-Person', subject: '4242', confirm: '1' } });
    assert.equal(res.status, 200);
    page = await res.text();
    assert.match(page, /Invite created for @New-Person \(id 4242\) as viewer/);
    assert.equal(fetchStub.calls.length, 1); // no second lookup
    const inv = q(env.DB, 'SELECT * FROM invites');
    assert.equal(inv.subject, '4242');
    assert.equal(inv.login_hint, 'New-Person');
    assert.equal(inv.invited_by, admin.userId);
    assert.equal(inv.expires_at - inv.created_at, 7 * 86400 * 1000);
    assert.equal(q(env.DB, "SELECT count(*) AS n FROM audit_events WHERE action = 'invite.create'").n, 1);
    assert.doesNotMatch(page, /\/auth\/signin\?invite=/, 'no invite link');

    // RFC-0002 2.5: a second invite for an id with an open one, or one that can already sign in, is refused.
    const after = env.DB.totalChanges();
    res = await call(env, '/admin/people/invite', { cookie: admin.cookie, form: { role: 'role_viewer', login: 'New-Person', subject: '4242', confirm: '1' } });
    assert.equal(res.status, 422);
    assert.match(await res.text(), /@New-Person already has an open invite\./);
    res = await call(env, '/admin/people/invite', { cookie: admin.cookie, form: { role: 'role_viewer', login: 'boss', subject: admin.subject, confirm: '1' } });
    assert.equal(res.status, 422);
    assert.match(await res.text(), /@boss already has a SyberLabs account\./);
    assert.equal(env.DB.totalChanges(), after);

    // Unknown username: 422 with the gh api hint, nothing written.
    const mid = env.DB.totalChanges();
    res = await call(env, '/admin/people/invite', { cookie: admin.cookie, form: { role: 'role_viewer', login: 'ghost-user' } });
    assert.equal(res.status, 422);
    assert.match(await res.text(), /gh api users\/ghost-user --jq \.id/);
    assert.equal(env.DB.totalChanges(), mid);
  } finally {
    fetchStub.restore();
  }
});

// Review round 1, finding 1: an invite nobody could redeem must not be created. Google is never invited
// (RFC-0002 2.5), so provider=google is refused whether or not Google sign-in is turned on.
test('a provider=google invite is refused with 422 and writes no row, with Google off or on', async () => {
  for (const env of [makeEnv({ GOOGLE_CLIENT_ID: undefined }), makeEnv()]) {
    const admin = await signIn(env.DB, { roles: ['role_admin'] });
    const stub = stubFetch();
    try {
      const before = env.DB.totalChanges();
      for (const confirm of ['', '1']) {
        const res = await call(env, '/admin/people/invite', { cookie: admin.cookie,
          form: { role: 'role_viewer', provider: 'google', email: 'invitee@gmail.com', login: 'someone', confirm } });
        assert.equal(res.status, 422);
        assert.match(await res.text(), /Invites are for GitHub accounts/);
      }
      assert.equal(env.DB.count('invites'), 0);
      assert.equal(env.DB.totalChanges(), before);
      assert.equal(stub.calls.length, 0);
    } finally {
      stub.restore();
    }
    // The page offers no Google invite or add-method form.
    const page = await (await call(env, '/admin/people', { cookie: admin.cookie })).text();
    assert.doesNotMatch(page, /name="provider"|value="google"|Add sign-in method|type="email"/);
  }
});

test('an invite to admin renders the confirm page with the admin warning first', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'], login: 'boss' });
  let res = await call(env, '/admin/people/invite', { cookie: admin.cookie, form: { role: 'role_admin', subject: '7777', login: 'x' } });
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Admin can invite people/);
  assert.equal(env.DB.count('invites'), 0);
  res = await call(env, '/admin/people/invite', { cookie: admin.cookie, form: { role: 'role_admin', subject: '7777', login: 'x', confirm: '1' } });
  assert.equal(res.status, 200);
  assert.equal(env.DB.count('invites'), 1);
});

test('invite form validation: 422 with the fixed field markup and values kept', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  const res = await call(env, '/admin/people/invite', { cookie: admin.cookie, form: { role: 'role_viewer', login: '' } });
  assert.equal(res.status, 422);
  const page = await res.text();
  assert.match(page, /<title>Fix 1 field · People/);
  assert.match(page, /aria-invalid="true"/);
  assert.match(page, /Enter a GitHub username\./);
  const bad = await call(env, '/admin/people/invite', { cookie: admin.cookie, form: { role: 'nope', login: '"><x' } });
  assert.equal(bad.status, 422);
  assert.doesNotMatch(await bad.text(), /"><x/);
  assert.equal(env.DB.count('invites'), 0);
});
