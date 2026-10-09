// Views: every page renders inside the shared chrome with no script, every value is escaped, the nav
// follows permissions, invite links behave (RFC-0002 8.5 case 22), the changes form and href rule
// (case 17) and the import script round-trips.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeEnv, signIn, call, seedUser, HOUR } from './helpers.js';
import { freshDb } from './d1-shim.js';
import { randomToken, sha256Hex, newId } from '../crypto.js';
import { page, navItems, alert, field } from '../views/layout.js';
import { ERROR_COPY, signinBody } from '../views/signin.js';
import { forbiddenHtml, deniedHtml, notFoundHtml, errorHtml, unavailableHtml, CSRF_COPY } from '../views/forbidden.js';
import { confirmHtml, actingAs } from '../views/confirm.js';
import { changeRow, validHref, validateEntry } from '../views/changes.js';
import { HttpError } from '../http.js';

const XSS = `<script>alert(1)</script>'"><img src=x>`;
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ALL = ['site:changes.read', 'site:changes.write', 'id:users.read', 'id:audit.read'];

// A ctx for calling views directly.
function ctxFor({ perms = [], user = {}, path = '/admin/', method = 'GET' } = {}) {
  const url = new URL(path, 'https://syberlabs.io');
  return {
    env: { ORIGIN: 'https://syberlabs.io' }, url, now: Date.now(), request: new Request(url, { method }),
    form: new URLSearchParams(), perms: new Set(perms),
    user: { id: 'u1', identityId: 'i1', sessionHash: 'h', displayName: 'Test user', provider: 'github', login: 'test-user', email: null, expiresAt: Date.now() + HOUR, ...user },
  };
}

function assertShell(body) {
  assert.match(body, /^<!doctype html>/);
  assert.match(body, /<html lang="en" data-field="calm">/);
  assert.match(body, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(body, /<link rel="stylesheet" href="\/syberlabs\.css\?v=4">/);
  assert.match(body, /<link rel="stylesheet" href="\/staff\.css\?v=1">/);
  assert.match(body, /<!--email_off-->[\s\S]*<main id="main" class="staff sy-container">[\s\S]*<\/main>[\s\S]*<!--\/email_off-->/);
  assert.match(body, /<header class="sy-header/);
  assert.match(body, /<footer class="sy-footer">/);
  assert.doesNotMatch(body, /<script/i, 'admin pages load no script');
}

const noRawXss = body => {
  assert.ok(!body.includes('<script>alert(1)'), 'raw <script> leaked');
  assert.ok(!body.includes('<img src=x>'), 'raw <img> leaked');
  assert.ok(!body.includes(`'"><img`), 'attribute breakout leaked');
};

async function seedInvite(db, { token = randomToken(), provider = 'github', subject = 'gh-test-9', login = 'octo-test', email = null,
  roleId = 'role_viewer', userId = null, invitedBy = null, now = Date.now(), expiresAt = now + 7 * 24 * HOUR, redeemed = null, revoked = null } = {}) {
  db.sqlite.prepare(`INSERT INTO invites (id, token_hash, role_id, user_id, provider, subject, login_hint, email_normalized,
      invited_by, created_at, expires_at, redeemed_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(newId(), await sha256Hex(token), roleId, userId, provider, provider === 'github' ? subject : null,
      provider === 'github' ? login : null, provider === 'google' ? email : null, invitedBy, now, expiresAt, redeemed, revoked);
  return token;
}

// ---- layout and nav ------------------------------------------------------------------------------

test('nav is filtered by permissions and hidden when only Account would show', () => {
  assert.deepEqual(navItems(ctxFor()).map(i => i.id), ['account']);
  assert.deepEqual(navItems(ctxFor({ perms: ['site:changes.read'] })).map(i => i.id), ['changes', 'account']);
  assert.deepEqual(navItems(ctxFor({ perms: ['id:users.read', 'id:audit.read'] })).map(i => i.id), ['people', 'roles', 'audit', 'account']);

  const none = page(ctxFor(), { title: 'X', body: '' });
  assert.doesNotMatch(none, /class="staff-nav"/);
  const reader = page(ctxFor({ perms: ['site:changes.read'] }), { title: 'X', body: '', section: 'changes' });
  assert.match(reader, /<a href="\/admin\/changes" aria-current="page">What changed<\/a>/);
  assert.match(reader, /<a href="\/admin\/account">Account<\/a>/);
  assert.doesNotMatch(reader, /\/admin\/people|\/admin\/audit|\/admin\/roles/);
  assertShell(reader);
  assert.match(reader, /sy-badge sy-badge--private">Staff only</);
  assert.match(reader, /Test user · GitHub/);
  assert.match(reader, /<form method="post" action="\/auth\/signout">/);
});

test('bare pages (admin: false) carry no admin bar', () => {
  const html = page(ctxFor(), { title: 'Sign in', body: '<p>x</p>', admin: false });
  assertShell(html);
  assert.doesNotMatch(html, /staff-bar/);
  assert.match(html, /<title>Sign in · SyberLabs staff<\/title>/);
});

test('alert kinds and field markup follow RFC-0002 3.4', () => {
  assert.match(alert('danger', 'x'), /class="sy-alert sy-alert--danger staff-alert" role="alert"/);
  assert.match(alert('neutral', 'x'), /class="sy-alert staff-alert" role="status"/);
  const f = field({ name: 'date', label: 'Date', value: XSS, error: 'Use a date like 2026-10-09.' });
  assert.match(f, /class="sy-field staff-field is-invalid"/);
  assert.match(f, /<label class="sy-field__label" for="f-date">Date<\/label>/);
  assert.match(f, /aria-invalid="true" aria-describedby="f-date-err"/);
  assert.match(f, /<p class="sy-field__error" id="f-date-err">Use a date like 2026-10-09\.<\/p>/);
  noRawXss(f);
});

// ---- escaping of names everywhere a name appears -----------------------------------------------

test('display names and logins are escaped in every view that shows them', () => {
  const ctx = ctxFor({ user: { displayName: XSS, login: XSS }, perms: ALL });
  const pages = [
    page(ctx, { title: XSS, body: '' }),
    forbiddenHtml(ctx, 'id:audit.read'),
    deniedHtml(ctx, { provider: 'github', name: XSS, invite: XSS, next: XSS }),
    deniedHtml(ctx, { provider: 'google', name: XSS, emailMatch: true }),
    confirmHtml(ctx, { title: XSS, lines: [`${actingAs(ctx.user)} are granting admin.`], action: '/admin/people/roles/grant', fields: { user: XSS }, submitLabel: XSS }),
    errorHtml(ctx, new HttpError('bad_request', XSS)),
    notFoundHtml(ctx),
  ];
  for (const html of pages) {
    assertShell(html);
    noRawXss(html);
  }
  assert.ok(pages[0].includes('&lt;script&gt;alert(1)&lt;/script&gt;&#39;&quot;&gt;&lt;img src=x&gt;'));
});

test('changeRow escapes every field and the href attribute', () => {
  const row = changeRow({ id: XSS, date: '2026-10-09', project: XSS, state: 'in progress', title: XSS, text: XSS, href: 'https://x" autofocus x="' }, { write: true });
  noRawXss(row);
  assert.ok(row.includes('href="https://x&quot; autofocus x=&quot;"'));
  assert.match(row, /staff-change__state is-in-progress/);
});

// ---- the sign-in page -------------------------------------------------------------------------

test('sign-in page: chrome, both providers, sanitized next, privacy link', async () => {
  const env = makeEnv();
  const res = await call(env, '/auth/signin?next=//evil.com');
  assert.equal(res.status, 200);
  const body = await res.text();
  assertShell(body);
  assert.match(body, /<title>Sign in · SyberLabs staff<\/title>/);
  assert.match(body, /Sign in\.<\/h1>/);
  assert.match(body, /action="\/auth\/start\/github"[\s\S]*action="\/auth\/start\/google"/, 'GitHub first');
  assert.match(body, /<input type="hidden" name="next" value="\/admin\/">/);
  assert.doesNotMatch(body, /evil\.com/);
  assert.match(body, /href="\/privacy\/#staff"/);
  assert.match(body, /Continue with GitHub/);
  assert.match(body, /Continue with Google/);
  assert.match(body, /<svg class="staff-provider__mark"/);
});

test('every ?e= code renders its copy first after the h1, and unknown codes are ignored', async () => {
  const env = makeEnv();
  for (const [code, copy] of Object.entries(ERROR_COPY)) {
    const body = await (await call(env, `/auth/signin?e=${code}`)).text();
    const text = copy.html({ providers: ['github', 'google'], switching: false });
    assert.ok(body.includes(text), `${code} copy`);
    assert.match(body, new RegExp(`<title>${copy.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} · Sign in · SyberLabs staff</title>`));
    assert.match(body, /<\/h1>\s*<\/div>\s*<div class="sy-alert/, `${code}: alert right after the h1`);
    if (code === 'unconfigured') assert.doesNotMatch(body, /\/auth\/start\//);
    else assert.match(body, /\/auth\/start\/github/);
  }
  const unknown = await (await call(env, '/auth/signin?e=<b>nope')).text();
  assert.doesNotMatch(unknown, /sy-alert/);
  assert.doesNotMatch(unknown, /nope/);
});

test('signed out with switch=1: the copy changes and every button asks for the account picker', async () => {
  const body = await (await call(makeEnv(), '/auth/signin?e=signed_out&switch=1')).text();
  assert.ok(body.includes("You're signed out. Choose the account to use."));
  assert.equal(body.match(/name="switch" value="1"/g).length, 2);
  assert.equal(body.match(/name="prompt" value="select_account"/g).length, 2);
});

test('signed in without an invite: 303 to the sanitized next', async () => {
  const env = makeEnv();
  const { cookie } = await signIn(env.DB, { perms: [] });
  const res = await call(env, '/auth/signin?next=/admin/changes', { cookie });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), '/admin/changes');
});

test('case 22: invite link states', async () => {
  const env = makeEnv();
  const db = env.DB;
  const now = Date.now();

  // Malformed: never echoed, never looked up, invite_invalid copy, normal buttons.
  const bad = 'A'.repeat(42) + '"<x>';
  const r1 = await (await call(env, `/auth/signin?invite=${encodeURIComponent(bad)}`)).text();
  assert.ok(!r1.includes('AAAAAAAAAAAAAAAAAAAA'), 'malformed token echoed');
  assert.ok(r1.includes(ERROR_COPY.invite_invalid.html()));
  assert.match(r1, /\/auth\/start\/github[\s\S]*\/auth\/start\/google/);
  assert.doesNotMatch(r1, /name="invite"/);

  // Unknown, used, revoked, expired: copy + normal buttons, no write, token not carried.
  const dead = [
    randomToken(),
    await seedInvite(db, { subject: 'gh-test-21', redeemed: now - 1000 }),
    await seedInvite(db, { subject: 'gh-test-22', revoked: now - 1000 }),
    await seedInvite(db, { subject: 'gh-test-23', now: now - 9 * 24 * HOUR, expiresAt: now - 2 * 24 * HOUR }),
  ];
  for (const token of dead) {
    const before = db.totalChanges();
    const body = await (await call(env, `/auth/signin?invite=${token}`)).text();
    assert.equal(db.totalChanges(), before, 'the sign-in page writes nothing');
    assert.ok(body.includes(ERROR_COPY.invite_invalid.html()));
    assert.ok(!body.includes(token), 'dead token not carried');
    assert.match(body, /\/auth\/start\/github[\s\S]*\/auth\/start\/google/);
  }

  // Open GitHub invite: only the GitHub button, labelled with the login, plus "Not you?".
  const open = await seedInvite(db, { subject: 'gh-test-24', login: 'octo-test' });
  const before = db.totalChanges();
  const body = await (await call(env, `/auth/signin?invite=${open}&next=/admin/changes`)).text();
  assert.equal(db.totalChanges(), before);
  assert.match(body, /Continue with GitHub as @octo-test/);
  assert.doesNotMatch(body, /\/auth\/start\/google/);
  assert.match(body, new RegExp(`name="invite" value="${open}"`));
  assert.match(body, /Not you\? Sign in without this invite/);
  assert.match(body, /href="\/auth\/signin\?next=%2Fadmin%2Fchanges"/);
  assert.match(body, /You(?:&#39;|')re invited to SyberLabs as viewer\./);
  assert.doesNotMatch(body, /sy-alert/);
});

test('an open Google invite carries login_hint; an add-method invite greets the account; inviter names are escaped', async () => {
  const env = makeEnv();
  const inviter = seedUser(env.DB, { roles: ['role_admin'], displayName: XSS, login: 'admin-test' });
  const token = await seedInvite(env.DB, { provider: 'google', email: 'invitee@example.test', invitedBy: inviter.userId });
  const body = await (await call(env, `/auth/signin?invite=${token}`)).text();
  noRawXss(body);
  assert.match(body, /invited you to SyberLabs as viewer/);
  assert.match(body, /Continue with Google as invitee@example\.test/);
  assert.match(body, /name="login_hint" value="invitee@example\.test"/);
  assert.doesNotMatch(body, /\/auth\/start\/github/);

  const target = seedUser(env.DB, { roles: ['role_viewer'], login: 'target-test' });
  const add = await seedInvite(env.DB, { provider: 'google', email: 'target@example.test', roleId: null, userId: target.userId });
  const addBody = await (await call(env, `/auth/signin?invite=${add}&e=no_email`)).text();
  assert.match(addBody, /Add Google to your SyberLabs account\./);
  assert.ok(addBody.includes("That Google account isn't the one this invite was sent to. Continue with Google and choose target@example.test."));
});

test('unavailableHtml: the sign-in shell, the unconfigured alert, no buttons', () => {
  const body = unavailableHtml();
  assertShell(body);
  assert.ok(body.includes('Sign-in is unavailable right now.'));
  assert.doesNotMatch(body, /\/auth\/start\//);
  assert.match(body, /mailto:/);
  assert.equal(signinBody({ code: 'expired', next: '/admin/', providers: ['github'] }).match(/<form/g).length, 1);
});

// ---- admin pages through handle() --------------------------------------------------------------

test('admin home: no keys -> the empty state; keys -> tiles; welcome=1 -> success alert', async () => {
  const env = makeEnv();
  const nobody = await signIn(env.DB, { perms: [], login: XSS, displayName: XSS });
  const empty = await (await call(env, '/admin/?welcome=1', { cookie: nobody.cookie })).text();
  assertShell(empty);
  noRawXss(empty);
  assert.match(empty, /no pages are open to you yet/);
  assert.match(empty, /Welcome\. You(?:&#39;|')re signed in with GitHub as @&lt;script&gt;/);
  assert.doesNotMatch(empty, /staff-tile/);

  env.DB.sqlite.prepare(`INSERT INTO change_entries (id, date, project, state, title, text, href, created_at)
    VALUES ('c1', '2026-10-08', 'Site', 'merged', 't', '', '/plus/', 1)`).run();
  const reader = await signIn(env.DB, { perms: ['site:changes.read'] });
  const tiles = await (await call(env, '/admin/', { cookie: reader.cookie })).text();
  assert.match(tiles, /1 entry/);
  assert.match(tiles, /Newest 2026-10-08/);
  assert.match(tiles, /href="\/admin\/account"/);
  assert.doesNotMatch(tiles, /href="\/admin\/people"/);
});

test('account page lists sign-in methods and the session window', async () => {
  const env = makeEnv();
  const now = Date.now();
  const u = await signIn(env.DB, { perms: [], login: 'acct-test', now });
  const res = await call(env, '/admin/account?added=google', { cookie: u.cookie, now: now + HOUR });
  assert.equal(res.status, 200);
  const body = await res.text();
  assertShell(body);
  assert.match(body, /@acct-test/);
  assert.match(body, /This session started at <time datetime="/);
  assert.match(body, /\(in 11 h 0 min\)/);
  assert.match(body, /action="\/admin\/account\/signout-everywhere"/);
  assert.match(body, /Google is added\./);
});

test('a missing key renders the 403 page with switch-account sign-out', async () => {
  const env = makeEnv();
  const u = await signIn(env.DB, { perms: ['site:changes.read'], displayName: 'Reader test' });
  const res = await call(env, '/admin/audit', { cookie: u.cookie });
  assert.equal(res.status, 403);
  const body = await res.text();
  assertShell(body);
  assert.ok(body.includes("You're signed in as Reader test (GitHub). This page needs <em>Read the audit log</em>."));
  assert.match(body, /<input type="hidden" name="next" value="\/admin\/audit"><input type="hidden" name="switch" value="1">/);
});

test('404 and CSRF pages render in the chrome', async () => {
  const env = makeEnv();
  const u = await signIn(env.DB, { perms: [] });
  const nf = await call(env, '/admin/nope', { cookie: u.cookie });
  assert.equal(nf.status, 404);
  assertShell(await nf.text());
  const csrf = await call(env, '/admin/changes', { cookie: u.cookie, form: { a: 1 }, origin: 'https://sketch.syberlabs.io' });
  assert.equal(csrf.status, 403);
  assert.ok((await csrf.text()).includes(CSRF_COPY));
});

test('audit page: newest first, labels, names, filter, empty state', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { perms: ['id:audit.read'], displayName: XSS });
  const empty = await (await call(env, '/admin/audit', { cookie: admin.cookie })).text();
  assert.match(empty, /Nothing recorded yet\./);
  const ins = env.DB.sqlite.prepare('INSERT INTO audit_events (at, actor_user_id, action, target_type, target_id, detail_json, ip_prefix) VALUES (?, ?, ?, ?, ?, ?, ?)');
  ins.run(1000, admin.userId, 'user.disable', 'user', admin.userId, JSON.stringify({ note: XSS }), '203.0.113.0/24');
  ins.run(2000, null, 'changes.create', 'change_entry', 'c1', '{}', null);
  const body = await (await call(env, '/admin/audit', { cookie: admin.cookie })).text();
  assertShell(body);
  noRawXss(body);
  assert.match(body, /<div class="table-wrap">/);
  assert.ok(body.indexOf('<td>Entry added</td>') < body.indexOf('<td>Turned off</td>'), 'newest first');
  assert.match(body, /<td>user &lt;script&gt;/, 'target names resolved and escaped');
  assert.match(body, /203\.0\.113\.0\/24/);
  const filtered = await (await call(env, '/admin/audit?action=user.disable', { cookie: admin.cookie })).text();
  assert.doesNotMatch(filtered, /<td>Entry added<\/td>/);
  assert.match(filtered, /<option value="user.disable" selected>/);
  const junk = await (await call(env, '/admin/audit?action=%3Cx%3E', { cookie: admin.cookie })).text();
  assert.doesNotMatch(junk, /&lt;x&gt;|<x>/);
});

// ---- What changed -----------------------------------------------------------------------------

test('case 17: validHref and the CHECK refuse the same hrefs', () => {
  const db = freshDb();
  const ins = db.sqlite.prepare(`INSERT INTO change_entries (id, date, project, state, title, text, href, created_at)
    VALUES (?, '2026-10-09', 'Site', 'merged', 't', '', ?, 1)`);
  for (const href of ['javascript:alert(1)', 'https://x" autofocus x="', 'https://x y', '//evil.com', '/\\evil.com', 'http://x.test', "https://x'y", '']) {
    assert.equal(validHref(href), null, href);
    if (href) assert.throws(() => ins.run(newId(), href), /CHECK/, `CHECK accepts ${href}`);
  }
  for (const href of ['https://github.com/SyberLabs/x/pull/1', '/plus/', '/']) {
    assert.equal(validHref(href), href);
    ins.run(newId(), href);
  }
  assert.equal(validateEntry({ date: '2026-02-30', project: '', state: 'shipped', title: '', text: 'x'.repeat(1201), href: 'x' }).errors.date, 'Use a date like 2026-10-09.');
});

test('What changed: reader sees rows escaped, no form; writer gets the form; 422 re-render; audit with old rows', async () => {
  const env = makeEnv();
  const db = env.DB;
  const reader = await signIn(db, { perms: ['site:changes.read'] });
  const writer = await signIn(db, { perms: ['site:changes.read', 'site:changes.write'] });

  const r0 = await (await call(env, '/admin/changes', { cookie: reader.cookie })).text();
  assert.match(r0, /No entries yet\.</);
  const w0 = await (await call(env, '/admin/changes', { cookie: writer.cookie })).text();
  assert.match(w0, /No entries yet\. Add the first one above\./);
  assert.match(w0, /<form method="post" action="\/admin\/changes"/);

  // Create (XSS in title), then read back escaped.
  const form = { date: '2026-10-09', project: 'Site', state: 'merged', title: XSS, text: XSS, href: '/plus/' };
  const created = await call(env, '/admin/changes', { cookie: writer.cookie, form });
  assert.equal(created.status, 303);
  assert.equal(created.headers.get('Location'), '/admin/changes?done=added');
  const r1 = await (await call(env, '/admin/changes', { cookie: reader.cookie })).text();
  assertShell(r1);
  noRawXss(r1);
  assert.match(r1, /class="staff-change"/);
  assert.doesNotMatch(r1, /action="\/admin\/changes"/, 'readers get no form');
  const id = db.sqlite.prepare('SELECT id FROM change_entries').get().id;

  // Bad date and link: 422, values kept, both errors, the summary, the title.
  const bad = await call(env, '/admin/changes', { cookie: writer.cookie, form: { ...form, title: 'Kept title', date: '9 Oct', href: 'javascript:alert(1)' } });
  assert.equal(bad.status, 422);
  const badBody = await bad.text();
  assert.match(badBody, /<title>Fix 2 fields · What changed · SyberLabs staff<\/title>/);
  assert.match(badBody, /2 fields need attention:/);
  assert.match(badBody, /<li><a href="#f-date">Date<\/a><\/li><li><a href="#f-href">Link<\/a><\/li>/);
  assert.match(badBody, /id="f-date" name="date" type="text" value="9 Oct" aria-invalid="true" aria-describedby="f-date-hint f-date-err"/);
  assert.match(badBody, /value="Kept title"/);
  assert.match(badBody, /Links must start with https:\/\/ or a single \/\./);
  const one = await (await call(env, '/admin/changes', { cookie: writer.cookie, form: { ...form, title: '' } })).text();
  assert.match(one, /<title>Fix 1 field · /);
  assert.match(one, /1 field needs attention:/);

  // Edit page, update, delete: audit rows keep the old row.
  const edit = await (await call(env, `/admin/changes?edit=${id}`, { cookie: writer.cookie })).text();
  assert.match(edit, new RegExp(`name="id" value="${id}"`));
  assert.equal((await call(env, '/admin/changes', { cookie: writer.cookie, form: { ...form, id, title: 'New title' } })).status, 303);
  assert.equal(db.sqlite.prepare('SELECT title FROM change_entries WHERE id = ?').get(id).title, 'New title');
  assert.equal((await call(env, '/admin/changes/delete', { cookie: writer.cookie, form: { id } })).status, 303);
  assert.equal(db.count('change_entries'), 0);
  const audit = db.sqlite.prepare("SELECT action, detail_json FROM audit_events WHERE action LIKE 'changes.%' ORDER BY id").all();
  assert.deepEqual(audit.map(a => a.action), ['changes.create', 'changes.update', 'changes.delete']);
  assert.equal(JSON.parse(audit[1].detail_json).before.title, XSS);
  assert.equal(JSON.parse(audit[2].detail_json).before.title, 'New title');

  // Reader POST: 403 and no row.
  const before = db.totalChanges();
  assert.equal((await call(env, '/admin/changes', { cookie: reader.cookie, form })).status, 403);
  assert.equal(db.totalChanges(), before);
});

// ---- the import script ------------------------------------------------------------------------

test('changes-import.mjs: SQL with quotes round-trips; one bad entry refuses the run', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'views-test-'));
  try {
    const good = join(dir, 'good.js');
    writeFileSync(good, `export const latest = [
      { date: '2026-10-08', project: 'RISE', state: 'merged', title: "Reader's title", text: "It's done; DROP TABLE x; --", href: 'https://github.com/SyberLabs/x/pull/1' },
      { date: '2026-10-07', project: 'Site', state: 'in progress', title: 'Second', text: '', href: '/plus/' },
    ];\n`);
    const sql = execFileSync(process.execPath, ['scripts/changes-import.mjs', '--file', good], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(sql.split('\n')[0], '-- source good.js, 2 rows');
    const db = freshDb();
    db.sqlite.exec(sql);
    const rows = db.sqlite.prepare('SELECT title, text, state FROM change_entries ORDER BY date DESC, created_at DESC').all();
    assert.deepEqual(rows.map(r => ({ ...r })), [
      { title: "Reader's title", text: "It's done; DROP TABLE x; --", state: 'merged' },
      { title: 'Second', text: '', state: 'in progress' },
    ]);

    const bad = join(dir, 'bad.js');
    writeFileSync(bad, `export const latest = [
      { date: '2026-10-08', project: 'RISE', state: 'merged', title: 'ok', text: '', href: '/plus/' },
      { date: '2026-10-08', project: 'RISE', state: 'merged', title: 'bad', text: '', href: 'javascript:alert(1)' },
    ];\n`);
    const out = spawnSync(process.execPath, ['scripts/changes-import.mjs', '--file', bad], { cwd: ROOT, encoding: 'utf8' });
    assert.notEqual(out.status, 0);
    assert.equal(out.stdout, '');
    assert.match(out.stderr, /entry 2/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
