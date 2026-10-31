// The Function's front door. Order matters: ORIGIN -> canonical host -> config -> method rules -> /admin
// -> CSRF -> session -> route -> access -> form -> handler. Every response leaves through secure(), and is
// then counted once as a site.request data point (telemetry.v1) that cannot change it.
import { CSP, CSP_WITH_GOOGLE, HttpError, checkCsrf, clearCookie, html, readForm, redirect, secure } from './http.js';
import { secretKeyBytes } from './crypto.js';
import { PUBLIC, SIGNED_IN } from './permissions.js';
import { TABLE, match, ownerPage, tableFor, template } from './routes.js';
import { googleEnabled } from './providers.js';
import { SESSION_COOKIE, loadSession } from './session.js';
import { APP_ORIGINS, accountApi, accountCors, accountRoute, isAccountApi } from './account-api.js';
import { codeOf, sitePoint, tag } from './telemetry.js';
import { RELEASE } from './release.js';
import { errorHtml, forbiddenHtml, notFoundHtml, unavailableHtml } from './views/forbidden.js';

const REQUIRED = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'APP_SECRET'];

const configured = env => REQUIRED.every(k => typeof env[k] === 'string' && env[k].length > 0) &&
  Boolean(secretKeyBytes(env.APP_SECRET)) && Boolean(env.DB);

const isAdminPath = p => p === '/admin' || p.startsWith('/admin/');
const noHead = p => p.startsWith('/auth/start/') || p.startsWith('/auth/callback/');

// RFC-0002 2.1, 3.4: rendered in place on the path that failed, so a reload retries. The account API answers
// the same failure in its own JSON shape. Each keeps its code beside it for site.request (telemetry.js tag).
const unavailable = pathname => tag(html(unavailableHtml(pathname), { status: 503 }), 'unavailable');
const down = pathname => (isAccountApi(pathname)
  ? tag(Response.json({ version: 1, error: 'unavailable' }, { status: 503 }), 'unavailable')
  : unavailable(pathname));

// Every error is an HTML page (RFC-0002 R1-8: no /api/*, so no JSON error shape).
function fail(ctx, code) {
  const err = code instanceof HttpError ? code : new HttpError(code);
  if (err.code === 'not_found') return tag(html(notFoundHtml(ctx), { status: 404 }), 'not_found');
  return tag(html(errorHtml(ctx, err), { status: err.status }), err.code);
}

function methodNotAllowed(ctx, allow) {
  const res = fail(ctx, 'method_not_allowed');
  res.headers.set('Allow', allow.join(', '));
  return res;
}

// Signed out on a gated route (every one is under /admin/): 303 to sign-in with the page to come back to.
function signinRequired(ctx, stale) {
  const { pathname, search } = ctx.url;
  const cookies = stale ? [clearCookie(SESSION_COOKIE)] : [];
  const next = ctx.request.method === 'POST' ? ownerPage(TABLE, pathname) : pathname + search;
  return redirect(`/auth/signin?next=${encodeURIComponent(next)}${stale ? '&e=expired_session' : ''}`, { cookies });
}

async function route(request, env, now) {
  const url = new URL(request.url);
  const ctx = {
    request, env, url, now, params: {}, form: new URLSearchParams(), user: null, perms: new Set(),
  };
  const { pathname } = url;
  if (!configured(env)) return unavailable(pathname);

  const method = request.method;
  if (method !== 'GET' && method !== 'HEAD' && method !== 'POST') return methodNotAllowed(ctx, ['GET', 'HEAD', 'POST']);
  if (method === 'HEAD' && noHead(pathname)) return methodNotAllowed(ctx, pathname.startsWith('/auth/start/') ? ['POST'] : ['GET']);
  if (pathname === '/admin' && method !== 'POST') return redirect('/admin/' + url.search, { status: 308 });
  if (method === 'POST' && !checkCsrf(request, env.ORIGIN)) return fail(ctx, 'csrf');

  // Only /admin* reads the session. Every /auth/ route is PUBLIC: the sign-in page never reads D1 or
  // redirects, with or without a cookie, and sign-out reads its own cookie (RFC-0002 R3-1, 2.2).
  const session = isAdminPath(pathname) ? await loadSession(env, request, now) : { user: null, perms: null, stale: false };
  ctx.user = session.user || null;
  ctx.perms = session.perms || new Set();

  const found = match(tableFor(env), method, pathname);
  if (!found) {
    if (!ctx.user && isAdminPath(pathname)) return signinRequired(ctx, session.stale);
    return fail(ctx, 'not_found');
  }
  if (found.methods) return methodNotAllowed(ctx, found.methods.includes('GET') ? [...found.methods, 'HEAD'] : found.methods);

  ctx.params = found.params;
  const { access } = found.route;
  if (access !== PUBLIC) {
    if (!ctx.user) return signinRequired(ctx, session.stale);
    if (access !== SIGNED_IN && !ctx.perms.has(access)) return tag(html(forbiddenHtml(ctx, access), { status: 403 }), 'forbidden');
  }
  try {
    if (method === 'POST') ctx.form = await readForm(request);
    return await found.route.handler(ctx);
  } catch (err) {
    if (err instanceof HttpError) return fail(ctx, err);
    throw err;
  }
}

export async function handle(request, env, now = Date.now()) {
  const started = Date.now();
  const url = new URL(request.url);
  let res;
  if (!env || typeof env.ORIGIN !== 'string' || !env.ORIGIN) {
    res = down(url.pathname);
  } else if (url.origin !== env.ORIGIN) {
    // pages.dev and preview hosts never serve the app; same path on the canonical origin.
    res = redirect(env.ORIGIN + url.pathname + url.search, { status: 308 });
  } else {
    try {
      res = isAccountApi(url.pathname) ? await accountApi(request, env, now) : await route(request, env, now);
    } catch (err) {
      // Fail closed (D1 down, a bug). The message may hold data, so only its class is logged.
      console.error(`staff: unhandled ${err && err.name ? err.name : 'error'}`);
      res = down(url.pathname);
    }
  }
  const code = codeOf(res);
  res = secure(res, googleEnabled(env) ? CSP_WITH_GOOGLE : CSP);
  if (isAccountApi(url.pathname) && url.origin === env?.ORIGIN) res = accountCors(res, request, env);
  if (request.method === 'HEAD') res = new Response(null, { status: res.status, statusText: res.statusText, headers: res.headers });
  count(request, env, url, res, code, started);
  return res;
}

const METHODS = ['GET', 'HEAD', 'POST', 'OPTIONS'];

// The request's Origin against the account API's allowlist. Browsers send no Origin on a same-origin GET (the
// site's own account check among them), so `site` counts the site's own form posts, and `none` the rest.
function appOf(request, env) {
  const origin = request.headers.get('Origin');
  if (origin && origin === env.ORIGIN) return 'site';
  return Object.keys(APP_ORIGINS).find(app => APP_ORIGINS[app] === origin) || 'none';
}

// One site.request data point per response, written once the response is final (telemetry.v1 producer rules
// 1 and 2): never awaited and inside a try, so an absent, broken or throwing binding cannot change a byte of it.
// Only production declares the EVENTS binding (wrangler.toml): preview deployments skip all of this, and
// wrangler's local binding discards what it is given.
function count(request, env, url, res, code, started) {
  if (!env?.EVENTS) return;
  try {
    const route = (isAccountApi(url.pathname) ? accountRoute(url.pathname) : template(tableFor(env), url.pathname)) || 'unmatched';
    const point = sitePoint({
      release: RELEASE,
      route,
      method: METHODS.includes(request.method) ? request.method : 'other',
      status: `${Math.floor(res.status / 100)}xx`,
      code,
      app: appOf(request, env),
      ms: Math.max(0, Date.now() - started),
    });
    if (point) env.EVENTS.writeDataPoint(point);
  } catch {
    // A failed write costs one data point, never a response.
  }
}
