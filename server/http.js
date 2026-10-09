// HTTP helpers for the staff Function: escaping, the headers every response carries, response builders,
// cookies, the CSRF rule, return_to sanitizing and request metadata. Nothing here touches D1.

// Escapes & < > " ' (the template's esc skips '). Every attribute we write is double-quoted as well.
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = value => (value == null ? '' : String(value)).replace(/[&<>"']/g, c => ESC[c]);

// No script-src or connect-src: default-src 'none' blocks every script on staff pages (RFC-0002 8.2).
export const CSP = [
  "default-src 'none'",
  // 'unsafe-inline' is for styles only: the shared chrome writes style="--sy-accent:…".
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "img-src 'self' data:",
  // Browsers apply form-action to the 303 after POST /auth/start, so the providers are named.
  "form-action 'self' https://accounts.google.com https://github.com",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "object-src 'none'",
].join('; ');

export const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': CSP,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  // same-origin, not no-referrer: under no-referrer browsers send `Origin: null` on our own form POSTs (Fetch
  // spec, "append a request Origin header"), which the CSRF check refuses. Cross-site requests still carry no
  // Referer, so invite tokens in /auth/signin?invite= never leave the site.
  'Referrer-Policy': 'same-origin',
  'X-Robots-Tag': 'noindex, nofollow',
  'Strict-Transport-Security': 'max-age=31536000',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Returns a copy of res with every security header set and no CORS header. Idempotent; app.js runs it
// on every response it returns, including errors.
export function secure(res) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
  out.headers.delete('Access-Control-Allow-Origin');
  return out;
}

function build(body, { status = 200, headers = {}, cookies = [] } = {}, type) {
  const h = new Headers(headers);
  if (type) h.set('Content-Type', type);
  for (const c of cookies) h.append('Set-Cookie', c);
  return secure(new Response(body, { status, headers: h }));
}

export const html = (body, init) => build(body, init, 'text/html; charset=utf-8');
export const text = (body, init) => build(body, init, 'text/plain; charset=utf-8');

// Empty-body redirect, 303 unless told otherwise.
export function redirect(location, { status = 303, headers = {}, cookies = [] } = {}) {
  return build(null, { status, headers: { ...headers, Location: location }, cookies });
}

// [status, default message] per HttpError code. Every error renders as an HTML page: RFC-0002 R1-8
// removed /api/* and its JSON error shape.
export const ERRORS = {
  bad_request: [400, 'That request was not valid.'],
  forbidden: [403, "You don't have access to this."],
  csrf: [403, 'This request came from another site.'],
  not_found: [404, 'Not found.'],
  method_not_allowed: [405, 'Method not allowed.'],
  too_large: [413, 'That request was too large.'],
  unconfigured: [503, 'Sign-in is unavailable right now.'],
};

// Thrown by handlers or helpers; app.js turns it into an HTML error page.
export class HttpError extends Error {
  constructor(code, message) {
    super(message || (ERRORS[code] || [0, code])[1]);
    this.code = code;
    this.status = (ERRORS[code] || [500])[0];
  }
}

// Thrown inside the OAuth flow; oauth.js answers with 303 /auth/signin?e=<code>.
// Codes: cancelled, expired, provider, disabled.
export class AuthError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// Cookies: always __Host- names, Path=/, Secure, HttpOnly, SameSite=Lax and never a Domain.
export const cookie = (name, value, maxAge) =>
  `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
export const clearCookie = name => cookie(name, '', 0);

export function readCookie(request, name) {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim() || null;
  }
  return null;
}

// CSRF for every unsafe method: Origin must equal env.ORIGIN exactly (missing or "null" fails), and
// Sec-Fetch-Site, when sent, must be same-origin. Same-site subdomains (sketch., staging.) are untrusted.
export function checkCsrf(request, origin) {
  const o = request.headers.get('Origin');
  if (!o || o === 'null' || o !== origin) return false;
  const site = request.headers.get('Sec-Fetch-Site');
  return site === null || site === 'same-origin';
}

// return_to: only paths under /admin/ on our own origin survive; everything else becomes /admin/.
export function safeReturnTo(raw, origin) {
  if (typeof raw !== 'string' || raw.length > 512 || !raw.startsWith('/') ||
      raw.startsWith('//') || raw.includes('\\')) return '/admin/';
  let u; try { u = new URL(raw, origin); } catch { return '/admin/'; }
  if (u.origin !== origin) return '/admin/';
  return (u.pathname === '/admin/' || u.pathname.startsWith('/admin/')) ? u.pathname + u.search : '/admin/';
}

// /24 of an IPv4 address or /48 of an IPv6 one, from CF-Connecting-IP; null when absent or malformed.
export function ipPrefix(request) {
  const ip = (request.headers.get('CF-Connecting-IP') || '').trim();
  const v4 = ip.match(/(?:^|:)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const parts = v4.slice(1, 4).map(Number);
    return parts.every(n => n <= 255) && Number(v4[4]) <= 255 ? `${parts.join('.')}.0/24` : null;
  }
  if (!/^[0-9a-fA-F:]+$/.test(ip) || !ip.includes(':')) return null;
  const halves = ip.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  const groups = [...head, ...Array(Math.max(fill, 0)).fill('0'), ...tail];
  if (groups.length !== 8 || groups.some(g => !/^[0-9a-fA-F]{1,4}$/.test(g))) return null;
  return `${groups.slice(0, 3).map(g => parseInt(g, 16).toString(16)).join(':')}::/48`;
}

export function userAgent(request) {
  const ua = request.headers.get('User-Agent');
  return ua ? ua.slice(0, 200) : null;
}

// The body of a plain <form method="post">. Anything that is not urlencoded reads as empty.
export const MAX_FORM_BYTES = 16384;
export async function readForm(request) {
  const type = request.headers.get('Content-Type') || '';
  if (!type.toLowerCase().startsWith('application/x-www-form-urlencoded')) return new URLSearchParams();
  const body = await request.text();
  if (body.length > MAX_FORM_BYTES) throw new HttpError('too_large');
  return new URLSearchParams(body);
}
