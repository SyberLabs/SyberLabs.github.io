// /admin/people through handle(): revocation and turning off (RFC-0002 8.5 test 17), confirm pages (19)
// and Add person (20), which replaced invites (RFC-0002 R3-4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sha256Hex } from '../crypto.js';
import { call, makeEnv, seedSession, signIn, stubFetch } from './helpers.js';

const q = (db, sql, ...a) => db.sqlite.prepare(sql).get(...a);
const roles = (db, userId) => db.sqlite.prepare('SELECT role_id FROM user_roles WHERE user_id = ? ORDER BY role_id').all(userId).map(r => r.role_id);

test('people page: one list item per person (no table); readers get no actions; managers get the forms', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'], login: 'boss' });
  const reader = await signIn(env.DB, { perms: ['id:users.read'], login: '<b>reader</b>' });
  let res = await call(env, '/admin/people', { cookie: reader.cookie });
  assert.equal(res.status, 200);
  let page = await res.text();
  assert.match(page, /boss/);
  assert.match(page, /&lt;b&gt;reader&lt;\/b&gt;/);
  assert.doesNotMatch(page, /<b>reader/);
  assert.doesNotMatch(page, /action="\/admin\/people\/add"/);
  assert.doesNotMatch(page, /<table/, 'no tables on staff pages (RFC-0002 2.6)');
  assert.equal(page.match(/<li class="staff-person">/g).length, 2);
  assert.match(page, /<h3 class="sy-h3 staff-person__name">@boss<\/h3>/);
  assert.match(page, /<dt>Sign-in methods<\/dt><dd>GitHub @boss<\/dd>/);
  assert.match(page, /<dt>Last sign-in<\/dt><dd>never signed in<\/dd>/);
  assert.doesNotMatch(page, /staff-person__actions/);
  page = await (await call(env, '/admin/people', { cookie: admin.cookie })).text();
  assert.match(page, /action="\/admin\/people\/add"/);
  assert.match(page, /Added people sign in at https:\/\/syberlabs\.io\/admin\/ with GitHub\./);
  // GitHub only until Packet 5: one method each, so no Remove button.
  assert.doesNotMatch(page, /identity\/remove|>Remove</);
  assert.match(page, /action="\/admin\/people\/roles\/grant"/);
  assert.doesNotMatch(page, /<script/);
  // Your own item has no Turn off; the other one does. Every action is a full-width button.
  const items = page.split('<li class="staff-person">').slice(1);
  const mine = items.find(i => i.includes('(you)'));
  assert.doesNotMatch(mine, /people\/disable/);
  assert.match(items.find(i => !i.includes('(you)')), /action="\/admin\/people\/disable"[\s\S]*staff-person__btn" type="submit">Turn off</);
  assert.doesNotMatch(page, /sessions\/revoke|End sessions/, 'RFC-0002 8.2 has no end-sessions route');
});

test('case 21: granting admin needs the confirm page, which names the acting identity; confirm=1 grants', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'], login: 'seth-test' });
  const target = await signIn(env.DB, { roles: ['role_viewer'], login: 'mateo-test' });
  const before = env.DB.totalChanges();
  let res = await call(env, '/admin/people/roles/grant', { cookie: admin.cookie, form: { user: target.userId, role: 'role_admin' } });
  assert.equal(res.status, 200);
  const page = await res.text();
  // RFC-0002 3.5: the acting identity, then the target as "@login (GitHub id N)".
  assert.match(page, new RegExp(`You, @seth-test \\(GitHub\\), are granting <strong>admin</strong> to @mateo-test \\(GitHub id ${target.subject}\\)\\.`));
  assert.match(page, /Admin can add people, grant and revoke roles, turn accounts off and on, and create roles\./);
  assert.match(page, /href="\/admin\/people">Cancel<\/a>/);
  assert.match(page, /name="confirm" value="1"/);
  assert.match(page, new RegExp(`name="user" value="${target.userId}"`));
  assert.match(page, />Grant admin to @mateo-test</);
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

// RFC-0002 2.4, test 19: every grant confirms, not only admin.
test('granting a non-privileged role confirms first too, with no admin warning', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  const target = await signIn(env.DB, { roles: [] });
  const before = env.DB.totalChanges();
  let res = await call(env, '/admin/people/roles/grant', { cookie: admin.cookie, form: { user: target.userId, role: 'role_viewer' } });
  assert.equal(res.status, 200);
  const ask = await res.text();
  assert.match(ask, /are granting <strong>viewer<\/strong> to @test-user/);
  assert.doesNotMatch(ask, /Admin can add people/);
  assert.equal(env.DB.totalChanges(), before);
  res = await call(env, '/admin/people/roles/grant', { cookie: admin.cookie, form: { user: target.userId, role: 'role_viewer', confirm: '1' } });
  assert.equal(res.status, 303);
  assert.deepEqual(roles(env.DB, target.userId), ['role_viewer']);
  assert.equal((await call(env, '/admin/changes', { cookie: target.cookie })).status, 200);
});

test('case 13: a revoked role gives 403 on the target\'s next request', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  const target = await signIn(env.DB, { roles: ['role_viewer'] });
  assert.equal((await call(env, '/admin/changes', { cookie: target.cookie })).status, 200);
  let res = await call(env, '/admin/people/roles/revoke', { cookie: admin.cookie, form: { user: target.userId, role: 'role_viewer' } });
  assert.equal(res.status, 200, 'the confirm page first');
  assert.equal((await call(env, '/admin/changes', { cookie: target.cookie })).status, 200);
  res = await call(env, '/admin/people/roles/revoke', { cookie: admin.cookie, form: { user: target.userId, role: 'role_viewer', confirm: '1' } });
  assert.equal(res.status, 303);
  assert.equal((await call(env, '/admin/changes', { cookie: target.cookie })).status, 403);
  assert.equal(q(env.DB, "SELECT count(*) AS n FROM audit_events WHERE action = 'role.revoke'").n, 1);
});

test('case 13: turning a user off (confirmed) deletes their sessions', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'], login: 'boss' });
  const other = await signIn(env.DB, { roles: ['role_admin'], login: 'other' });
  await seedSession(env.DB, other);
  const before = env.DB.totalChanges();
  let res = await call(env, '/admin/people/disable', { cookie: admin.cookie, form: { user: other.userId } });
  assert.equal(res.status, 200);
  const ask = await res.text();
  assert.match(ask, new RegExp(`You, @boss \\(GitHub\\), are turning off @other \\(GitHub id ${other.subject}\\)'s account\\. Their sessions end now\\.`));
  // other holds admin, so the page lists who stays admin (RFC-0002 2.4, 3.5).
  assert.match(ask, /Admins left after this: @boss \(never signed in\)\./);
  assert.match(ask, />Turn off @other</);
  assert.equal(env.DB.totalChanges(), before);

  res = await call(env, '/admin/people/disable', { cookie: admin.cookie, form: { user: other.userId, confirm: '1' } });
  assert.equal(res.status, 303);
  assert.equal(q(env.DB, 'SELECT count(*) AS n FROM sessions WHERE user_id = ?', other.userId).n, 0);
  assert.ok(q(env.DB, 'SELECT disabled_at FROM users WHERE id = ?', other.userId).disabled_at);
  assert.equal(q(env.DB, "SELECT count(*) AS n FROM audit_events WHERE action = 'user.disable'").n, 1);
  res = await call(env, '/admin/', { cookie: other.cookie });
  assert.equal(res.status, 303);

  // Turn back on: other holds admin, so it confirms first (RFC-0002 2.4, 8.5 case 19). Sessions stay gone.
  const offAt = q(env.DB, 'SELECT disabled_at FROM users WHERE id = ?', other.userId).disabled_at;
  const beforeOn = env.DB.totalChanges();
  res = await call(env, '/admin/people/enable', { cookie: admin.cookie, form: { user: other.userId } });
  assert.equal(res.status, 200);
  const askOn = await res.text();
  assert.match(askOn, /You, @boss \(GitHub\), are turning on @other \(GitHub id [^)]+\)'s account, which holds <strong>admin<\/strong>\./);
  assert.match(askOn, /name="confirm" value="1"/);
  assert.equal(env.DB.totalChanges(), beforeOn);
  assert.equal(q(env.DB, 'SELECT disabled_at FROM users WHERE id = ?', other.userId).disabled_at, offAt);
  res = await call(env, '/admin/people/enable', { cookie: admin.cookie, form: { user: other.userId, confirm: '1' } });
  assert.equal(res.status, 303);
  assert.equal(q(env.DB, 'SELECT disabled_at FROM users WHERE id = ?', other.userId).disabled_at, null);
  assert.equal((await call(env, '/admin/', { cookie: other.cookie })).status, 303);
  assert.equal(q(env.DB, "SELECT count(*) AS n FROM audit_events WHERE action = 'user.enable'").n, 1);
});

test('case 19: turning on an account without admin confirms too, with no admin warning', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  const other = await signIn(env.DB, { roles: ['role_viewer'], login: 'reader' });
  env.DB.sqlite.prepare('UPDATE users SET disabled_at = 1 WHERE id = ?').run(other.userId);
  let res = await call(env, '/admin/people/enable', { cookie: admin.cookie, form: { user: other.userId } });
  assert.equal(res.status, 200);
  const ask = await res.text();
  assert.match(ask, /are turning on @reader \(GitHub id [^)]+\)'s account\./);
  assert.doesNotMatch(ask, /holds <strong>admin|Admin can/);
  assert.equal(q(env.DB, 'SELECT disabled_at FROM users WHERE id = ?', other.userId).disabled_at, 1);
  res = await call(env, '/admin/people/enable', { cookie: admin.cookie, form: { user: other.userId, confirm: '1' } });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), '/admin/people?ok=enabled');
  assert.equal(q(env.DB, 'SELECT disabled_at FROM users WHERE id = ?', other.userId).disabled_at, null);
  assert.equal(q(env.DB, "SELECT count(*) AS n FROM audit_events WHERE action = 'user.enable'").n, 1);
});

// RFC-0002 3.5: the admins-left line marks an admin who never signed in, because the admins view counts them.
test('revoking admin lists the admins who would remain, marking one who never signed in', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'], login: 'boss' });
  const other = await signIn(env.DB, { roles: ['role_admin'], login: 'other' });
  env.DB.sqlite.prepare('UPDATE identities SET last_login_at = 1 WHERE user_id = ?').run(admin.userId);
  const page = await (await call(env, '/admin/people/roles/revoke', { cookie: admin.cookie, form: { user: admin.userId, role: 'role_admin' } })).text();
  assert.match(page, /Admins left after this: @other \(never signed in\)\./);
  const none = await (await call(env, '/admin/people/disable', { cookie: admin.cookie, form: { user: other.userId } })).text();
  assert.match(none, /Admins left after this: @boss\./);
});

// ---- Add person (RFC-0002 2.5, 8.1; test 20) -----------------------------------------------------------

const tablesOf = env => ['users', 'identities', 'user_roles', 'audit_events'].map(t => env.DB.count(t));
const add = (env, cookie, form) => call(env, '/admin/people/add', { cookie, form });

function githubUsers(routes) {
  return stubFetch(req => {
    const u = new URL(req.url);
    if (u.origin === 'https://api.github.com' && u.pathname.startsWith('/users/')) {
      const out = routes[decodeURIComponent(u.pathname.slice(7))];
      return typeof out === 'number' ? new Response('{}', { status: out }) : out || new Response('{}', { status: 404 });
    }
    return undefined;
  });
}

test('add person: a username is looked up once, the confirm page names login and id, confirm adds them', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'], login: 'boss' });
  const stub = githubUsers({ 'new-person': { id: 4242, login: 'New-Person' } });
  try {
    const before = env.DB.totalChanges();
    let res = await add(env, admin.cookie, { role: 'role_viewer', account: 'new-person' });
    assert.equal(res.status, 200);
    const page = await res.text();
    assert.match(page, /Add @New-Person, GitHub id 4242, as viewer\?/);
    assert.match(page, /You, @boss \(GitHub\), are adding @New-Person \(GitHub id 4242\) as <strong>viewer<\/strong>/);
    assert.match(page, />Add @New-Person</);
    assert.match(page, /name="account" value="4242"/);
    assert.match(page, /href="\/admin\/people">Cancel/);
    assert.equal(stub.calls.length, 1);
    assert.equal(stub.calls[0].url, 'https://api.github.com/users/new-person');
    assert.equal(env.DB.totalChanges(), before, 'the confirm page writes nothing');

    res = await add(env, admin.cookie, { role: 'role_viewer', account: '4242', login: 'New-Person', confirm: '1' });
    assert.equal(res.status, 303);
    assert.equal(res.headers.get('Location'), '/admin/people?ok=added');
    assert.equal(stub.calls.length, 1, 'confirming makes no second lookup');
    const ident = q(env.DB, "SELECT * FROM identities WHERE subject = '4242'");
    assert.deepEqual([ident.provider, ident.login, ident.last_login_at], ['github', 'New-Person', null]);
    assert.deepEqual({ ...q(env.DB, 'SELECT role_id, granted_by FROM user_roles WHERE user_id = ?', ident.user_id) },
      { role_id: 'role_viewer', granted_by: admin.userId });
    const audit = q(env.DB, "SELECT * FROM audit_events WHERE action = 'user.add'");
    assert.deepEqual([audit.actor_user_id, audit.target_type, audit.target_id, audit.detail_json],
      [admin.userId, 'user', ident.user_id, '{"role":"role_viewer"}']);
    const people = await (await call(env, '/admin/people?ok=added', { cookie: admin.cookie })).text();
    assert.match(people, /never signed in/);
  } finally { stub.restore(); }
});

test('add person: a numeric id is taken without a fetch and shows "username not checked"', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  const stub = stubFetch();
  try {
    let res = await add(env, admin.cookie, { role: 'role_viewer', account: '132' });
    assert.equal(res.status, 200);
    assert.match(await res.text(), /GitHub id 132 \(username not checked\)/);
    // A login on the first POST is ignored: only the confirm page's own re-post may carry one.
    res = await add(env, admin.cookie, { role: 'role_viewer', account: '132', login: 'made-up' });
    assert.match(await res.text(), /GitHub id 132 \(username not checked\)/);
    res = await add(env, admin.cookie, { role: 'role_viewer', account: '132', login: '', confirm: '1' });
    assert.equal(res.status, 303);
    assert.deepEqual({ ...q(env.DB, "SELECT u.display_name, i.login FROM identities i JOIN users u ON u.id = i.user_id WHERE i.subject = '132'") },
      { display_name: 'GitHub id 132', login: null });
  } finally { stub.restore(); }
  assert.equal(stub.calls.length, 0);
});

test('add person: malformed values are refused without any fetch; the login sent is encoded', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  const stub = githubUsers({});
  try {
    const before = tablesOf(env);
    for (const account of ['../repos/x/y', 'x'.repeat(40), '0123', '', 'a b', '"><x', '1'.repeat(21)]) {
      const res = await add(env, admin.cookie, { role: 'role_viewer', account, confirm: '1' });
      assert.equal(res.status, 422, account);
      const page = await res.text();
      assert.match(page, /Enter a GitHub username \(1 to 39 letters, digits or hyphens\) or a numeric GitHub id\./, account);
      assert.match(page, /<title>Fix 1 field · People/);
      assert.match(page, /aria-invalid="true"/);
      assert.doesNotMatch(page, /"><x/);
    }
    assert.equal(stub.calls.length, 0);
    assert.deepEqual(tablesOf(env), before);
    // A bad role is refused before any lookup.
    assert.equal((await add(env, admin.cookie, { role: 'nope', account: 'someone' })).status, 422);
    assert.equal(stub.calls.length, 0);
    // A valid username reaches GitHub percent-encoded under /users/.
    await add(env, admin.cookie, { role: 'role_viewer', account: '@a-b' });
    assert.equal(stub.calls[0].url, 'https://api.github.com/users/a-b');
  } finally { stub.restore(); }
});

test('add person: a 404 says no such account; 403, 429, 500 or a timeout asks for the id', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  const stub = githubUsers({ ghost: 404, limited: 403, slow: 429, broken: 500 });
  try {
    let res = await add(env, admin.cookie, { role: 'role_viewer', account: 'ghost' });
    assert.equal(res.status, 422);
    assert.match(await res.text(), /No GitHub account is called @ghost\. Check the spelling\./);
    for (const account of ['limited', 'slow', 'broken']) {
      res = await add(env, admin.cookie, { role: 'role_viewer', account });
      assert.equal(res.status, 422, account);
      const page = await res.text();
      // RFC-0002 3.4: the API URL as a link, then the gh command on a second line.
      assert.ok(page.includes(`GitHub didn't answer the username lookup. Open <a href="https://api.github.com/users/${account}">https://api.github.com/users/${account}</a> and enter the "id" it shows instead.<br>Or run <code>gh api users/${account} --jq .id</code>.`), account);
      assert.match(page, /<li><a href="#f-account">GitHub username or id<\/a><\/li>/);
      assert.match(page, /<title>Fix 1 field · People/);
    }
  } finally { stub.restore(); }
  const down = stubFetch(() => { throw new DOMException('timed out', 'TimeoutError'); });
  try {
    const res = await add(env, admin.cookie, { role: 'role_viewer', account: 'anyone' });
    assert.match(await res.text(), /and enter the "id" it shows instead/);
  } finally { down.restore(); }
});

test('add person: an id that already has an account is refused by UNIQUE, and no table changes', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'], login: 'boss', subject: '6006' });
  const before = tablesOf(env);
  let res = await add(env, admin.cookie, { role: 'role_viewer', account: '6006', confirm: '1' });
  assert.equal(res.status, 422);
  assert.match(await res.text(), /GitHub id 6006 already has a SyberLabs account\./);
  res = await add(env, admin.cookie, { role: 'role_viewer', account: '6006', login: 'boss', confirm: '1' });
  assert.match(await res.text(), /@boss already has a SyberLabs account\./);
  assert.deepEqual(tablesOf(env), before, 'the batch rolled back: no user, grant or audit row');
});

test('add person to admin: the confirm page carries the admin warning; a reader cannot add', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  let res = await add(env, admin.cookie, { role: 'role_admin', account: '7777' });
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Admin can add people, grant and revoke roles/);
  assert.equal(env.DB.count('identities'), 1);
  res = await add(env, admin.cookie, { role: 'role_admin', account: '7777', confirm: '1' });
  assert.equal(res.status, 303);
  assert.equal(q(env.DB, "SELECT count(*) AS n FROM user_roles WHERE role_id = 'role_admin'").n, 2);

  const reader = await signIn(env.DB, { perms: ['id:users.read'] });
  const before = tablesOf(env);
  res = await add(env, reader.cookie, { role: 'role_admin', account: '8888', confirm: '1' });
  assert.equal(res.status, 403);
  assert.deepEqual(tablesOf(env), before);
});

test('add person end to end: the added id signs in through case a after a rename', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  await add(env, admin.cookie, { role: 'role_viewer', account: '9191', confirm: '1' });
  const { startLogin, callback, OAUTH_COOKIE } = await import('../oauth.js');
  const ctx = (path, extra) => ({ env, url: new URL(path, env.ORIGIN), now: Date.now(), params: { provider: 'github' },
    form: new URLSearchParams(), user: null, perms: new Set(), ...extra });
  const started = await startLogin({ ...ctx('/auth/start/github'), request: new Request(`${env.ORIGIN}/auth/start/github`, { method: 'POST' }) });
  const sealed = started.headers.getSetCookie()[0].split(';')[0];
  const state = new URL(started.headers.get('Location')).searchParams.get('state');
  const stub = stubFetch(req => {
    if (req.url === 'https://github.com/login/oauth/access_token') return { access_token: 'gho_x' };
    if (req.url === 'https://api.github.com/user') return { id: 9191, login: 'renamed' };
    return undefined;
  });
  try {
    const path = `/auth/callback/github?code=c&state=${state}`;
    const res = await callback({ ...ctx(path), request: new Request(`${env.ORIGIN}${path}`, { headers: { Cookie: sealed } }) });
    assert.equal(res.status, 303);
    assert.equal(res.headers.get('Location'), '/admin/');
    assert.ok(sealed.startsWith(`${OAUTH_COOKIE}=`));
  } finally { stub.restore(); }
  const row = q(env.DB, "SELECT login, last_login_at FROM identities WHERE subject = '9191'");
  assert.equal(row.login, 'renamed');
  assert.ok(row.last_login_at);
  const page = await (await call(env, '/admin/people', { cookie: admin.cookie })).text();
  assert.match(page, /GitHub @renamed/);
});

test('concurrent confirmed people transitions write one audit row for each actual change', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  const target = await signIn(env.DB, { roles: [] });
  const now = Date.now();
  const twice = async (path, fields) => Promise.all([0, 1].map(() => call(env, path, {
    cookie: admin.cookie, now, form: { user: target.userId, confirm: '1', ...fields },
  })));
  await twice('/admin/people/roles/grant', { role: 'role_viewer' });
  await twice('/admin/people/roles/revoke', { role: 'role_viewer' });
  await twice('/admin/people/disable', {});
  await twice('/admin/people/enable', {});
  for (const action of ['role.grant', 'role.revoke', 'user.disable', 'user.enable']) {
    assert.equal(q(env.DB, 'SELECT count(*) AS n FROM audit_events WHERE action = ?', action).n, 1, action);
  }
  assert.equal(q(env.DB, 'SELECT disabled_at FROM users WHERE id = ?', target.userId).disabled_at, null);
  assert.deepEqual(roles(env.DB, target.userId), []);
  assert.equal(q(env.DB, 'SELECT count(*) AS n FROM sessions WHERE user_id = ?', target.userId).n, 0);
});
