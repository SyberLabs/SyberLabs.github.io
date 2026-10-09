// Views: every page renders inside the shared chrome with no script, every value is escaped, the nav
// follows permissions, the sign-in page reads no D1 and never redirects, the changes form and href
// rule (case 17) and the import script round-trips.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeEnv, signIn, call, seedUser, HOUR } from './helpers.js';
import { freshDb } from './d1-shim.js';
import { page, navItems, alert, field } from '../views/layout.js';
import { ERROR_COPY, signinBody } from '../views/signin.js';
import { forbiddenHtml, deniedHtml, notFoundHtml, errorHtml, unavailableHtml, CSRF_COPY } from '../views/forbidden.js';
import { confirmHtml, actingAs } from '../views/confirm.js';
import { changeRow, validHref, validateEntry } from '../views/changes.js';
import { HttpError } from '../http.js';
import { newId } from '../crypto.js';

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
  assert.match(body, /<link rel="stylesheet" href="\/staff\.css\?v=4">/);
  assert.match(body, /<!--email_off-->[\s\S]*<main id="main" class="staff sy-container">[\s\S]*<\/main>[\s\S]*<!--\/email_off-->/);
  // RFC-0002 2.6 and test 10: the staff header, never the public one, its Atlas or remote fonts.
  assert.match(body, /<a class="sy-skip" href="#main">Skip to content<\/a>\n<div class="sy-field-host" aria-hidden="true"><\/div>\n<header class="staff-header">/);
  assert.match(body, /<a class="sy-lockup" href="\/"/);
  assert.match(body, /<footer class="sy-footer">/);
  assert.doesNotMatch(body, /<script/i, 'staff pages load no script');
  for (const banned of ['<details', 'sy-atlas', 'sy-nav', 'sy-header', 'sy-menu', 'fonts.googleapis.com', 'fonts.gstatic.com']) {
    assert.ok(!body.includes(banned), banned);
  }
}

const noRawXss = body => {
  assert.ok(!body.includes('<script>alert(1)'), 'raw <script> leaked');
  assert.ok(!body.includes('<img src=x>'), 'raw <img> leaked');
  assert.ok(!body.includes(`'"><img`), 'attribute breakout leaked');
};

// ---- layout and nav ------------------------------------------------------------------------------

test('nav is filtered by permissions and always includes Portal and Account (RFC-0002 3.3, test 10)', () => {
  assert.deepEqual(navItems(ctxFor()).map(i => i.id), ['portal', 'account']);
  assert.deepEqual(navItems(ctxFor({ perms: ['site:changes.read'] })).map(i => i.id), ['portal', 'changes', 'account']);
  assert.deepEqual(navItems(ctxFor({ perms: ['id:users.read', 'id:audit.read'] })).map(i => i.id), ['portal', 'people', 'roles', 'audit', 'account']);

  const none = page(ctxFor(), { title: 'X', body: '', section: 'account' });
  assertShell(none);
  assert.match(none, /<nav class="staff-nav" aria-label="Staff"><ul><li><a href="\/admin\/">Portal<\/a><\/li><li><a href="\/admin\/account" aria-current="page">Account<\/a><\/li><\/ul><\/nav>/);
  const reader = page(ctxFor({ perms: ['site:changes.read'] }), { title: 'X', body: '', section: 'changes' });
  assert.match(reader, /<a href="\/admin\/changes" aria-current="page">What changed<\/a>/);
  assert.match(reader, /<a href="\/admin\/account">Account<\/a>/);
  assert.doesNotMatch(reader, /\/admin\/people|\/admin\/audit|\/admin\/roles/);
  assertShell(reader);
  assert.doesNotMatch(reader, /sy-badge--private|Staff only/, 'no Private badge (RFC-0002 2.6)');
});

// RFC-0002 2.6: three rows, each a wrapping flex row, in this order. The live bug this replaces: the public
// header's single 64 px row pushed "sdcarlson · GitHub" and Sign out past the right edge at 1000 px.
test('the staff header: lockup and Sign out, then Staff and the account line, then the nav', () => {
  const html = page(ctxFor({ perms: ['site:changes.read'], user: { login: 'sdcarlson' } }), { title: 'X', body: '', section: 'changes' });
  const header = html.slice(html.indexOf('<header class="staff-header">'), html.indexOf('</header>'));
  const rows = header.split('<div class="staff-header__row">').slice(1);
  assert.equal(rows.length, 3);
  assert.match(rows[0], /class="sy-lockup"[\s\S]*<form method="post" action="\/auth\/signout" class="staff-inline"><button class="sy-btn sy-btn--ghost staff-btn--small" type="submit">Sign out<\/button><\/form>/);
  assert.match(rows[1], /<a class="sy-eyebrow staff-header__home" href="\/admin\/">Staff<\/a>/);
  assert.match(rows[1], /<p class="staff-header__account">Signed in as @sdcarlson \(GitHub\)<\/p>/);
  assert.match(rows[2], /<nav class="staff-nav" aria-label="Staff">/);
  // A person added by id who has not signed in yet has no login: the line names the id.
  const byId = page(ctxFor({ user: { login: null, subject: '4242' } }), { title: 'X', body: '' });
  assert.match(byId, /Signed in as GitHub id 4242 \(GitHub\)/);

  // The CSS that keeps it on screen: every row wraps, and nothing in the header uses the fixed 64 px row.
  const css = readFileSync(join(ROOT, 'staff.css'), 'utf8');
  assert.match(css, /\.staff-header__row \{ display: flex; flex-wrap: wrap;/);
  assert.match(css, /\.staff-header__account \{[^}]*overflow-wrap: anywhere/);
  assert.match(css, /\.staff-nav ul \{ display: flex; flex-wrap: wrap;/);
  assert.doesNotMatch(css, /--sy-header-h|sy-header__in/);
});

test('bare pages (admin: false): the lockup only, no Sign out, account line or nav; signOut: true keeps Sign out', () => {
  const html = page(ctxFor(), { title: 'Sign in', body: '<p>x</p>', admin: false });
  assertShell(html);
  const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  assert.equal(header.split('staff-header__row').length - 1, 1);
  assert.doesNotMatch(header, /auth\/signout|staff-nav|Signed in as/);
  assert.match(html, /<title>Sign in · SyberLabs staff<\/title>/);
  const gated503 = page(null, { title: 'Unavailable', body: '', admin: false, signOut: true });
  assert.match(gated503, /action="\/auth\/signout"/);
  assert.doesNotMatch(gated503, /staff-nav|Signed in as/);
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
    deniedHtml(ctx, { provider: 'github', name: XSS, next: XSS }),
    deniedHtml(ctx, { provider: 'google', name: XSS }),
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

test('sign-in page: chrome, the GitHub button only while Google is off, sanitized next, privacy link', async () => {
  const env = makeEnv();
  const res = await call(env, '/auth/signin?next=//evil.com');
  assert.equal(res.status, 200);
  const body = await res.text();
  assertShell(body);
  assert.match(body, /<title>Sign in · SyberLabs staff<\/title>/);
  assert.match(body, /Sign in\.<\/h1>/);
  assert.equal(body.match(/action="\/auth\/start\//g).length, 1);
  assert.match(body, /action="\/auth\/start\/github"/);
  assert.match(body, /<input type="hidden" name="next" value="\/admin\/">/);
  assert.doesNotMatch(body, /evil\.com/);
  assert.match(body, /href="\/privacy\/#staff"/);
  assert.match(body, /Continue with GitHub/);
  assert.doesNotMatch(body, /Google|staff-google/);
  assert.match(body, /Only people SyberLabs has added can sign in\./);
  assert.match(body, /<svg class="staff-provider__mark"/);
});

test('every ?e= code renders its RFC-0002 3.4 copy first after the h1, in the title too; unknown codes are ignored', async () => {
  const env = makeEnv();
  const expected = {
    cancelled: ['Sign-in was cancelled. Try again.', 'Sign-in was cancelled'],
    expired: ["That sign-in couldn&#39;t be finished. Try again. If this keeps happening, allow cookies for syberlabs.io.", 'That sign-in couldn’t be finished'],
    provider: ["GitHub didn&#39;t finish the sign-in. Try again, or <a href=\"mailto:", 'GitHub didn’t finish the sign-in'],
    disabled: ['This account has been turned off. <a href="mailto:', 'This account has been turned off'],
    expired_session: ['Your session ended. Sign in again.', 'Your session ended'],
    signed_out: ["You&#39;re signed out.", 'You’re signed out'],
    signed_out_all: ["You&#39;re signed out on every device.", 'You’re signed out on every device'],
  };
  assert.deepEqual(Object.keys(ERROR_COPY).sort(), Object.keys(expected).sort());
  for (const [code, [text, title]] of Object.entries(expected)) {
    const body = await (await call(env, `/auth/signin?e=${code}&p=github`)).text();
    assert.ok(body.replace(/'/g, '&#39;').includes(text), `${code} copy`);
    assert.ok(body.includes(`<title>${title} · Sign in · SyberLabs staff</title>`), `${code} title`);
    assert.match(body, /<\/h1>\s*<\/div>\s*<div class="sy-alert/, `${code}: alert right after the h1`);
    assert.match(body, /\/auth\/start\/github/);
  }
  // "Unavailable" is not a code: ?e=unconfigured means nothing, and good config always shows the buttons.
  for (const junk of ['<b>nope', 'unconfigured']) {
    const body = await (await call(env, `/auth/signin?e=${encodeURIComponent(junk)}`)).text();
    assert.doesNotMatch(body, /sy-alert/, junk);
    assert.doesNotMatch(body, /nope|unavailable/, junk);
    assert.match(body, /\/auth\/start\/github/, junk);
  }
});

test('e=provider names the provider from p, and any other p says "The sign-in provider"', async () => {
  const env = makeEnv();
  const named = await (await call(env, '/auth/signin?e=provider&p=github')).text();
  assert.match(named, /GitHub didn't finish the sign-in\./);
  for (const p of ['', '&p=gitlab', '&p=%3Cb%3E', '&p=constructor']) {
    const body = await (await call(env, `/auth/signin?e=provider${p}`)).text();
    assert.match(body, /The sign-in provider didn't finish the sign-in\. Try again, or <a href="mailto:[^"]+">email SyberLabs<\/a>\./, p);
    assert.doesNotMatch(body, /gitlab|<b>/, p);
  }
});

test('the GitHub button is solid, full width and the only way in (RFC-0002 3.2)', async () => {
  const body = await (await call(makeEnv(), '/auth/signin')).text();
  assert.match(body, /<button class="sy-btn sy-btn--solid staff-provider" type="submit"><svg class="staff-provider__mark"[^>]*>[\s\S]*?<\/svg><span>Continue with GitHub<\/span><\/button>/);
  assert.match(body, /<p class="sy-eyebrow">Staff<\/p>\s*<h1 class="sy-display">Sign in\.<\/h1>/);
});

test('signed out with switch=1: the copy changes and every button asks for the account picker', async () => {
  const body = await (await call(makeEnv(), '/auth/signin?e=signed_out&switch=1')).text();
  assert.ok(body.includes("You're signed out. Choose the account to use."));
  assert.equal(body.match(/name="switch" value="1"/g).length, 1);
  assert.doesNotMatch(body, /name="prompt"/);
});

// Review round 3, finding 2 (RFC-0002 R3-1, 3.2, test 3 and 8): the sign-in page never reads D1 and never
// redirects, with no cookie, a live session cookie or a dead one, so it cannot loop with a gated page.
test('the sign-in page makes zero D1 calls and answers 200 with no cookie, a valid one and a dead one', async () => {
  const env = makeEnv();
  const live = await signIn(env.DB, { perms: [] });
  const dead = await signIn(env.DB, { perms: [], now: Date.now() - 13 * HOUR });
  let calls = 0;
  const real = env.DB;
  env.DB = { prepare: (...a) => { calls++; return real.prepare(...a); }, batch: (...a) => { calls++; return real.batch(...a); } };
  for (const cookie of [undefined, live.cookie, dead.cookie]) {
    const res = await call(env, `/auth/signin?next=/admin/changes&invite=${'A'.repeat(43)}`, { cookie });
    assert.equal(res.status, 200, String(cookie));
    assert.equal(res.headers.get('Location'), null);
    assert.equal(res.headers.getSetCookie().length, 0, 'not even an expiry: no D1 read, so nothing is known');
    const body = await res.text();
    assert.match(body, /name="next" value="\/admin\/changes"/);
    assert.match(body, /action="\/auth\/start\/github"/);
    assert.doesNotMatch(body, /AAAAAAAAAA|name="invite"|sy-alert/);
  }
  assert.equal(calls, 0);

  // The dead cookie's loop, end to end: /admin/ expires it and sends it here, and here renders the page.
  env.DB = real;
  const gated = await call(env, '/admin/', { cookie: dead.cookie });
  assert.equal(gated.headers.get('Location'), '/auth/signin?next=%2Fadmin%2F&e=expired_session');
  const signin = await call(env, gated.headers.get('Location'), { cookie: dead.cookie });
  assert.equal(signin.status, 200);
  assert.match(await signin.text(), /Your session ended\. Sign in again\./);
});

// RFC-0002 3.4: 503 in place, never a redirect or a code. The sign-in page hides its buttons; a gated page
// keeps the lockup and Sign out but not the account line or nav, because the session was not resolved.
test('503 renders in place: sign-in unavailable on /auth/, staff pages unavailable under /admin/', async () => {
  const signin = unavailableHtml('/auth/signin');
  assertShell(signin);
  assert.ok(signin.includes('Sign-in is unavailable right now. Reload in a minute, or <a href="mailto:'));
  assert.doesNotMatch(signin, /\/auth\/start\//);
  assert.doesNotMatch(signin, /action="\/auth\/signout"/);
  assert.equal(signinBody({ code: 'expired', next: '/admin/' }).match(/<form/g).length, 1);

  const gated = unavailableHtml('/admin/people');
  assertShell(gated);
  assert.ok(gated.includes('Staff pages are unavailable right now. Reload in a minute, or <a href="mailto:'));
  assert.match(gated, /action="\/auth\/signout"/);
  assert.doesNotMatch(gated, /staff-nav|Signed in as|\/auth\/start\//);

  for (const [path, copy] of [['/auth/signin', 'Sign-in is unavailable'], ['/admin/people', 'Staff pages are unavailable']]) {
    const res = await call(makeEnv({ APP_SECRET: '' }), path);
    assert.equal(res.status, 503, path);
    assert.equal(res.headers.get('Location'), null, path);
    assert.ok((await res.text()).includes(copy), path);
  }
});

// ---- admin pages through handle() --------------------------------------------------------------

test('no keys at all: the portal offers Account and the account page explains access', async () => {
  const env = makeEnv();
  const nobody = await signIn(env.DB, { perms: [], login: XSS });
  const home = await call(env, '/admin/', { cookie: nobody.cookie });
  assert.equal(home.status, 200);
  const portal = await home.text();
  noRawXss(portal);
  assert.match(portal, /<a\b(?=[^>]*class="[^"]*\bportal-card\b)(?=[^>]*href="\/admin\/account")[^>]*>/);
  assert.doesNotMatch(portal, /href="\/admin\/(?:changes|people|roles|audit)"/);
  assert.match(portal, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  const empty = await (await call(env, '/admin/account', { cookie: nobody.cookie })).text();
  assertShell(empty);
  noRawXss(empty);
  assert.match(empty, /<div class="sy-empty staff-empty"><p>You're signed in, but only this account page is open to you\. Ask an admin for a role: <a href="mailto:[^"]+">Email SyberLabs<\/a>\.<\/p><\/div>/);
  assert.ok(empty.indexOf('sy-empty') < empty.indexOf('Sign-in methods'), 'above everything else');

  const reader = await signIn(env.DB, { perms: ['site:changes.read'] });
  const page = await (await call(env, '/admin/account', { cookie: reader.cookie })).text();
  assert.doesNotMatch(page, /only this account page is open to you/);
});

test('account page: methods with date added, the session line, the "Don\'t recognise" line', async () => {
  const env = makeEnv();
  const now = Date.UTC(2026, 9, 9, 14, 2);
  const u = await signIn(env.DB, { perms: [], login: 'acct-test', now });
  const res = await call(env, '/admin/account?added=google', { cookie: u.cookie, now: now + 20 * 60000 });
  assert.equal(res.status, 200);
  const body = await res.text();
  assertShell(body);
  assert.match(body, /@acct-test <span class="sy-small">\(this session\)<\/span>/);
  assert.match(body, /Added <time datetime="2026-10-09T14:02:00.000Z">2026-10-09 14:02 UTC<\/time>/);
  assert.match(body, /This session ends in 11 h 40 min, at <time datetime="2026-10-10T02:02:00.000Z">02:02 UTC<\/time>\. It started at <time datetime="2026-10-09T14:02:00.000Z">2026-10-09 14:02 UTC<\/time>\./);
  assert.match(body, /Don't recognise one of these\? Press Sign out everywhere, then <a href="mailto:[^"]+">email SyberLabs<\/a> and we'll remove it\./);
  assert.match(body, /action="\/admin\/account\/signout-everywhere"/);
  assert.doesNotMatch(body, /is added\.|Add Google|add-google/, 'Google is off in makeEnv(): nothing about it renders');
});

test('a missing key renders the 403 page with switch-account sign-out', async () => {
  const env = makeEnv();
  const u = await signIn(env.DB, { perms: ['site:changes.read'], login: 'reader-test' });
  const res = await call(env, '/admin/audit', { cookie: u.cookie });
  assert.equal(res.status, 403);
  const body = await res.text();
  assertShell(body);
  assert.match(body, /You're signed in as @reader-test \(GitHub\)\. This page is for people who can read the audit log\./);
  assert.match(body, /<a class="sy-btn sy-btn--line" href="\/admin\/">Back to staff home<\/a>/);
  assert.match(body, /<input type="hidden" name="next" value="\/admin\/audit"><input type="hidden" name="switch" value="1"><button[^>]*>Sign out and switch account</);
});

test('the denied page (case b): solid Try another account, Ask for access as a text link', () => {
  const body = deniedHtml(ctxFor(), { provider: 'github', name: 'stranger', next: '/admin/changes' });
  assertShell(body);
  assert.match(body, /<strong>This GitHub account \(@stranger\) doesn't have access to SyberLabs\.<\/strong>/);
  assert.match(body, /Only people SyberLabs has added can sign in\. If you were added, you may be signed in to GitHub as a different account\./);
  assert.match(body, /action="\/auth\/start\/github"[^>]*><input type="hidden" name="next" value="\/admin\/changes"><input type="hidden" name="switch" value="1"><button class="sy-btn sy-btn--solid" type="submit">Try another account<\/button>/);
  assert.match(body, /<a class="staff-link" href="mailto:[^"]+">Ask for access<\/a>/);
  assert.match(body, /<title>No access · Sign in · SyberLabs staff<\/title>/);
  assert.doesNotMatch(body, /Signed in as|staff-nav/);
});

test('404 and CSRF pages render in the chrome', async () => {
  const env = makeEnv();
  const u = await signIn(env.DB, { perms: [] });
  const nf = await call(env, '/admin/nope', { cookie: u.cookie });
  assert.equal(nf.status, 404);
  const nfBody = await nf.text();
  assertShell(nfBody);
  assert.match(nfBody, /<title>Not found · SyberLabs staff<\/title>/);
  assert.match(nfBody, /There's no staff page here\./);
  assert.match(nfBody, /href="\/admin\/">Back to staff home</);
  assert.match(nfBody, /<nav class="staff-nav" aria-label="Staff">/);
  const csrf = await call(env, '/admin/changes', { cookie: u.cookie, form: { a: 1 }, origin: 'https://sketch.syberlabs.io' });
  assert.equal(csrf.status, 403);
  assert.ok((await csrf.text()).includes(CSRF_COPY.replace(/'/g, '&#39;')));
});

test('audit page: an ordered list of one-line sentences, newest first, names never hex, empty state', async () => {
  const env = makeEnv();
  const admin = await signIn(env.DB, { perms: ['id:audit.read'], login: 'sdcarlson' });
  const empty = await (await call(env, '/admin/audit', { cookie: admin.cookie })).text();
  assert.match(empty, /Nothing recorded yet\./);
  const byId = seedUser(env.DB, { login: null, subject: '4242' });
  const ins = env.DB.sqlite.prepare('INSERT INTO audit_events (at, actor_user_id, action, target_type, target_id, detail_json, ip_prefix) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const at = Date.UTC(2026, 9, 9, 14, 2);
  ins.run(at, admin.userId, 'user.disable', 'user', byId.userId, '{}', '203.0.113.0/24');
  ins.run(at + 1000, null, 'changes.create', 'change_entry', 'c1', JSON.stringify({ title: XSS }), null);
  ins.run(at + 2000, admin.userId, 'role.grant', 'user', 'ffffffffffffffffffffffffffffffff', JSON.stringify({ role: 'role_viewer' }), null);
  ins.run(at + 3000, admin.userId, 'user.add', 'user', byId.userId, JSON.stringify({ role: 'role_admin' }), null);
  const body = await (await call(env, '/admin/audit', { cookie: admin.cookie })).text();
  assertShell(body);
  noRawXss(body);
  assert.match(body, /<ol class="staff-audit">/);
  assert.doesNotMatch(body, /<table/);
  assert.ok(body.includes('<li><time datetime="2026-10-09T14:02:00.000Z">2026-10-09 14:02 UTC</time>, @sdcarlson turned off GitHub id 4242.</li>'));
  assert.ok(body.includes('the terminal added the What changed entry "&lt;script&gt;'));
  assert.ok(body.includes('@sdcarlson granted viewer to a removed account.'));
  assert.ok(body.includes('@sdcarlson added GitHub id 4242 as admin.'));
  assert.ok(body.indexOf('added GitHub id 4242') < body.indexOf('turned off GitHub id 4242'), 'newest first');
  assert.doesNotMatch(body, /ffffffff|203\.0\.113/, 'no hex ids, no IP prefixes');
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
  const { errors } = validateEntry({ date: '2026-02-30', project: '', state: 'shipped', title: '', text: 'x'.repeat(1201), href: 'x' });
  // RFC-0002 3.4, word for word.
  assert.deepEqual(errors, {
    date: 'Use a date like 2026-10-09.',
    project: 'Projects are 1 to 60 characters.',
    state: 'Choose a state.',
    title: 'Titles are 1 to 160 characters.',
    text: 'Text is at most 1,200 characters (you have 1,201).',
    href: 'Links must start with https:// or a single /.',
  });
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
  // RFC-0002 2.6, 3.4: the date is type="date", every field carries required/maxlength, and the summary
  // is the fixed .staff-errors markup.
  assert.match(badBody, /id="f-date" name="date" type="date" value="9 Oct" aria-invalid="true" aria-describedby="f-date-err" required>/);
  assert.match(badBody, /<div class="sy-alert sy-alert--danger staff-errors" role="alert"><p>2 fields need attention:<\/p>/);
  assert.match(badBody, /id="f-title" name="title" type="text" value="Kept title" required maxlength="160">/);
  assert.match(badBody, /<select class="sy-input staff-select" id="f-state" name="state" required>/);
  assert.match(badBody, /value="Kept title"/);
  assert.match(badBody, /Links must start with https:\/\/ or a single \/\./);
  const one = await (await call(env, '/admin/changes', { cookie: writer.cookie, form: { ...form, title: '' } })).text();
  assert.match(one, /<title>Fix 1 field · /);
  assert.match(one, /1 field needs attention:/);

  // Edit page, update, delete: audit rows keep the old row.
  assert.match(r1, /class="staff-change"/);
  const w1 = await (await call(env, '/admin/changes', { cookie: writer.cookie })).text();
  assert.ok(w1.includes(`href="/admin/changes?edit=${id}#f-entry">Edit</a>`));
  const edit = await (await call(env, `/admin/changes?edit=${id}`, { cookie: writer.cookie })).text();
  assert.match(edit, new RegExp(`name="id" value="${id}"`));
  assert.match(edit, /<section class="staff-section" id="f-entry"/);
  assert.match(edit, />Save changes<\/button>/);
  assert.match(edit, /<a class="staff-link" href="\/admin\/changes">Cancel edit<\/a>/);
  assert.equal((await call(env, '/admin/changes', { cookie: writer.cookie, form: { ...form, id, title: 'New title' } })).status, 303);
  assert.equal(db.sqlite.prepare('SELECT title FROM change_entries WHERE id = ?').get(id).title, 'New title');
  // RFC-0002 8.5 case 15: delete without confirm=1 renders the confirm page and changes nothing.
  const changesBefore = db.totalChanges();
  const ask = await call(env, '/admin/changes/delete', { cookie: writer.cookie, form: { id } });
  assert.equal(ask.status, 200);
  const askBody = await ask.text();
  assertShell(askBody);
  assert.match(askBody, /Delete "New title"\? The audit log keeps a copy\./);
  assert.match(askBody, /name="confirm" value="1"/);
  assert.match(askBody, new RegExp(`name="id" value="${id}"`));
  assert.match(askBody, /href="\/admin\/changes">Cancel</);
  assert.equal(db.totalChanges(), changesBefore);
  assert.equal(db.count('change_entries'), 1);
  const del = await call(env, '/admin/changes/delete', { cookie: writer.cookie, form: { id, confirm: '1' } });
  assert.equal(del.status, 303);
  assert.equal(del.headers.get('Location'), '/admin/changes?done=deleted');
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

// Packet 5: display and freshness agree with the Add Google route, including the exact ten-minute boundary.
test('Google account UI: fresh sessions can add it, older sessions reauthenticate, existing methods show success', async () => {
  const env = makeEnv({ GOOGLE_CLIENT_ID: 'google-test', GOOGLE_CLIENT_SECRET: 'google-secret' });
  const now = Date.UTC(2026, 9, 9, 14, 2);
  const user = await signIn(env.DB, { roles: ['role_viewer'], now });
  const render = async (path, at) => (await call(env, path, { cookie: user.cookie, now: at })).text();
  const fresh = await render('/admin/account?added=google', now + 599999);
  assert.match(fresh, /action="\/admin\/account\/add-google"/);
  assert.doesNotMatch(fresh, /Google is added/);
  const boundary = await render('/admin/account', now + 600000);
  assert.doesNotMatch(boundary, /action="\/admin\/account\/add-google"/);
  assert.match(boundary, /To add Google, continue with GitHub again first/);
  assert.match(boundary, /action="\/auth\/start\/github"/);
  assert.match(boundary, /name="next" value="\/admin\/account"/);
  env.DB.sqlite.prepare("INSERT INTO identities (id, user_id, provider, subject, email, created_at) VALUES (?, ?, 'google', ?, ?, ?)")
    .run(newId(), user.userId, 'google-test-sub', 'test@example.test', now + 1000);
  const added = await render('/admin/account?added=google', now + 600000);
  assert.match(added, /Google is added\. You can now sign in with GitHub or Google\./);
  assert.match(added, /test@example\.test/);
  assert.doesNotMatch(added, /action="\/admin\/account\/add-google"|To add Google, continue/);
});

test('Google sign-in uses local branded assets, retains switch and next, and names Google failures', async () => {
  const env = makeEnv({ GOOGLE_CLIENT_ID: 'google-test', GOOGLE_CLIENT_SECRET: 'google-secret' });
  const body = await (await call(env, '/auth/signin?next=%2Fadmin%2Faccount&switch=1&e=provider&p=google')).text();
  assertShell(body);
  assert.match(body, /Google didn't finish the sign-in/);
  assert.match(body, /action="\/auth\/start\/google"[^>]*><input type="hidden" name="next" value="\/admin\/account"><input type="hidden" name="switch" value="1">/);
  assert.match(body, /src="\/staff\/google-signin-dark-360\.png"/);
  assert.match(body, /alt="Sign in with Google"/);
});

// Hold both requests after reading the original row, so they race with the same before snapshot.
test('concurrent change deletions audit only the one deletion that actually took effect', async () => {
  const env = makeEnv();
  const user = await signIn(env.DB, { roles: ['role_admin'] });
  const id = newId();
  env.DB.sqlite.prepare('INSERT INTO change_entries (id, date, project, state, title, text, href, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, '2026-10-09', 'site', 'deployed', 'Race entry', 'Test entry', '/projects/', Date.now());
  const real = env.DB;
  let waiting = 0;
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  env.DB = {
    prepare(sql) {
      const statement = real.prepare(sql);
      if (!sql.startsWith('SELECT ') || !sql.includes('FROM change_entries WHERE id = ?')) return statement;
      const originalBind = statement.bind.bind(statement);
      statement.bind = (...params) => {
        const bound = originalBind(...params);
        const originalFirst = bound.first.bind(bound);
        bound.first = async () => {
          const row = await originalFirst();
          if (++waiting === 2) release();
          await barrier;
          return row;
        };
        return bound;
      };
      return statement;
    },
    batch: rows => real.batch(rows),
  };
  const responses = await Promise.all([1, 2].map(() => call(env, '/admin/changes/delete', {
    cookie: user.cookie, form: { id, confirm: '1' },
  })));
  assert.deepEqual(responses.map(r => r.status), [303, 303]);
  assert.equal(real.count('change_entries'), 0);
  assert.equal(real.sqlite.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action = 'changes.delete'").get().n, 1);
});
