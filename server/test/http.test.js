import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  esc, CSP, SECURITY_HEADERS, secure, html, json, redirect, apiError, HttpError, AuthError, cookie, clearCookie,
  readCookie, checkCsrf, safeReturnTo, isApiPath, ipPrefix, userAgent, readForm, MAX_FORM_BYTES,
} from '../http.js';

const ORIGIN = 'https://syberlabs.io';
const post = (headers = {}) => new Request(`${ORIGIN}/auth/signout`, { method: 'POST', headers });

test('esc escapes & < > " \' and renders null as empty', () => {
  assert.equal(esc(`<script>alert(1)</script>`), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(esc(`'"><img src=x>`), '&#39;&quot;&gt;&lt;img src=x&gt;');
  assert.equal(esc('a & b'), 'a &amp; b');
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
  assert.equal(esc(42), '42');
});

test('security headers are exactly the RFC set', () => {
  assert.equal(CSP, "default-src 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; img-src 'self' data:; " +
    "form-action 'self' https://accounts.google.com https://github.com; frame-ancestors 'none'; base-uri 'none'; object-src 'none'");
  assert.deepEqual(Object.keys(SECURITY_HEADERS).sort(), [
    'Cache-Control', 'Content-Security-Policy', 'Cross-Origin-Opener-Policy', 'Permissions-Policy', 'Referrer-Policy',
    'Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options', 'X-Robots-Tag',
  ]);
  assert.equal(SECURITY_HEADERS['Cache-Control'], 'no-store');
  assert.equal(SECURITY_HEADERS['Referrer-Policy'], 'no-referrer');
  assert.equal(SECURITY_HEADERS['X-Robots-Tag'], 'noindex, nofollow');
});

test('every builder sets the headers; secure() strips CORS', async () => {
  const responses = [
    html('<p>x</p>'), json({ a: 1 }), redirect('/admin/'), apiError('signin_required'),
    secure(new Response('x', { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public' } })),
  ];
  for (const res of responses) {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) assert.equal(res.headers.get(k), v, k);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
  }
  assert.equal(responses[0].headers.get('Content-Type'), 'text/html; charset=utf-8');
  assert.equal(responses[1].headers.get('Content-Type'), 'application/json; charset=utf-8');
});

test('redirect: 303 by default, empty body, Location as given, cookies appended', async () => {
  const res = redirect('/auth/signin?next=%2Fadmin%2F', { cookies: [clearCookie('__Host-sl_oauth'), 'b=1'] });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), '/auth/signin?next=%2Fadmin%2F');
  assert.equal(await res.text(), '');
  assert.equal(res.headers.getSetCookie().length, 2);
  assert.equal(redirect('/admin/', { status: 308 }).status, 308);
});

test('apiError uses the one error shape', async () => {
  const res = apiError('signin_required');
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: { code: 'signin_required', message: 'Sign in to continue.' } });
  assert.equal(apiError('csrf').status, 403);
  assert.equal(apiError('unconfigured').status, 503);
  assert.equal(apiError('method_not_allowed').status, 405);
  assert.deepEqual((await apiError('forbidden', 'Needs id:users.read').json()).error.message, 'Needs id:users.read');
  const e = new HttpError('not_found');
  assert.equal(e.status, 404);
  assert.equal(e.code, 'not_found');
  assert.equal(new AuthError('expired').code, 'expired');
});

test('cookies: __Host- shape, no Domain; readCookie finds the exact name', () => {
  const c = cookie('__Host-sl_session', 'tok', 43200);
  assert.equal(c, '__Host-sl_session=tok; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=43200');
  assert.doesNotMatch(c, /domain/i);
  assert.equal(clearCookie('__Host-sl_oauth'), '__Host-sl_oauth=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0');
  const req = new Request(ORIGIN, { headers: { Cookie: 'x__Host-sl_session=bad; __Host-sl_session=good; rise_plus=1' } });
  assert.equal(readCookie(req, '__Host-sl_session'), 'good');
  assert.equal(readCookie(req, '__Host-sl_oauth'), null);
  assert.equal(readCookie(new Request(ORIGIN), '__Host-sl_session'), null);
  assert.equal(readCookie(new Request(ORIGIN, { headers: { Cookie: '__Host-sl_session=' } }), '__Host-sl_session'), null);
});

test('CSRF (case 10): exact Origin, Sec-Fetch-Site same-origin when present', () => {
  assert.equal(checkCsrf(post({ Origin: ORIGIN }), ORIGIN), true);
  assert.equal(checkCsrf(post({ Origin: ORIGIN, 'Sec-Fetch-Site': 'same-origin' }), ORIGIN), true);
  assert.equal(checkCsrf(post(), ORIGIN), false);
  assert.equal(checkCsrf(post({ Origin: 'null' }), ORIGIN), false);
  assert.equal(checkCsrf(post({ Origin: 'https://sketch.syberlabs.io' }), ORIGIN), false);
  assert.equal(checkCsrf(post({ Origin: 'https://staging.syberlabs.io' }), ORIGIN), false);
  assert.equal(checkCsrf(post({ Origin: ORIGIN + '/' }), ORIGIN), false);
  assert.equal(checkCsrf(post({ Origin: 'http://syberlabs.io' }), ORIGIN), false);
  assert.equal(checkCsrf(post({ Origin: ORIGIN, 'Sec-Fetch-Site': 'same-site' }), ORIGIN), false);
  assert.equal(checkCsrf(post({ Origin: ORIGIN, 'Sec-Fetch-Site': 'cross-site' }), ORIGIN), false);
  assert.equal(checkCsrf(post({ Origin: ORIGIN, 'Sec-Fetch-Site': 'none' }), ORIGIN), false);
  assert.equal(checkCsrf(post({ Origin: 'https://staging.syberlabs.io' }), 'https://staging.syberlabs.io'), true);
});

test('safeReturnTo (case 9): everything outside /admin/ on our origin becomes /admin/', () => {
  const bad = ['//evil.com', '/\\evil.com', 'https://evil.com', '/%2F%2Fevil.com', '/plus/', 'javascript:alert(1)',
    '/' + 'a'.repeat(599), '', '/admin', '/administrator', '/admin/../plus/', '/%2e%2e/plus', null, undefined, 42,
    'admin/', ' /admin/', '/\t/evil.com', '/admin\\..\\x'];
  for (const raw of bad) assert.equal(safeReturnTo(raw, ORIGIN), '/admin/', String(raw));
  assert.equal(safeReturnTo('/admin/', ORIGIN), '/admin/');
  assert.equal(safeReturnTo('/admin/changes', ORIGIN), '/admin/changes');
  assert.equal(safeReturnTo('/admin/changes?edit=abc', ORIGIN), '/admin/changes?edit=abc');
  assert.equal(safeReturnTo('/admin/changes#frag', ORIGIN), '/admin/changes');
  assert.equal(safeReturnTo('/admin/a/../people', ORIGIN), '/admin/people');
  assert.equal(safeReturnTo('/admin/' + 'a'.repeat(505), ORIGIN), '/admin/' + 'a'.repeat(505));
});

test('isApiPath', () => {
  assert.equal(isApiPath('/api/me'), true);
  assert.equal(isApiPath('/api'), true);
  assert.equal(isApiPath('/apis'), false);
  assert.equal(isApiPath('/admin/'), false);
});

test('ipPrefix: /24 for IPv4, /48 for IPv6, null otherwise', () => {
  const ip = v => ipPrefix(new Request(ORIGIN, { headers: v ? { 'CF-Connecting-IP': v } : {} }));
  assert.equal(ip('203.0.113.77'), '203.0.113.0/24');
  assert.equal(ip('2001:db8:abcd:12::1'), '2001:db8:abcd::/48');
  assert.equal(ip('2001:0db8:0000:0012:0000:0000:0000:0001'), '2001:db8:0::/48');
  assert.equal(ip('::1'), '0:0:0::/48');
  assert.equal(ip('::ffff:198.51.100.9'), '198.51.100.0/24');
  for (const bad of [null, 'nope', '300.1.1.1', '1:2:3:4:5:6:7:8:9', '1::2::3', 'g::1']) assert.equal(ip(bad), null, bad);
});

test('userAgent is truncated to 200 chars', () => {
  assert.equal(userAgent(new Request(ORIGIN, { headers: { 'User-Agent': 'x'.repeat(300) } })).length, 200);
  assert.equal(userAgent(new Request(ORIGIN)), null);
});

test('readForm reads urlencoded bodies only, keeps repeats, caps size', async () => {
  const form = await readForm(new Request(ORIGIN, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'next=%2Fadmin%2F&perm=a&perm=b',
  }));
  assert.equal(form.get('next'), '/admin/');
  assert.deepEqual(form.getAll('perm'), ['a', 'b']);
  const jsonBody = await readForm(new Request(ORIGIN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"a":1}' }));
  assert.equal([...jsonBody].length, 0);
  await assert.rejects(readForm(new Request(ORIGIN, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'a=' + 'x'.repeat(MAX_FORM_BYTES),
  })), e => e instanceof HttpError && e.status === 413);
});
