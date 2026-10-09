// The Function's front door. Order matters: ORIGIN -> canonical host -> config -> method rules -> /admin
// -> CSRF -> session -> route -> access -> form -> handler. Every response leaves through secure().
import { AuthError, HttpError, checkCsrf, clearCookie, html, readForm, redirect, secure } from './http.js';
import { secretKeyBytes } from './crypto.js';
import { PUBLIC, SIGNED_IN } from './permissions.js';
import { TABLE, match, ownerPage } from './routes.js';
import { SESSION_COOKIE, loadSession } from './session.js';
import { errorHtml, forbiddenHtml, notFoundHtml, unavailableHtml } from './views/forbidden.js';

// Google is optional (oauth.js enabledProviders); GitHub and the app secret are not.
const REQUIRED = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'APP_SECRET'];

const configured = env => REQUIRED.every(k => typeof env[k] === 'string' && env[k].length > 0) &&
  Boolean(secretKeyBytes(env.APP_SECRET)) && Boolean(env.DB);

const isAdminPath = p => p === '/admin' || p.startsWith('/admin/');
const noHead = p => p.startsWith('/auth/start/') || p.startsWith('/auth/callback/');

const unavailable = () => html(unavailableHtml(), { status: 503 });

// Every error is an HTML page (RFC-0002 R1-8: no /api/*, so no JSON error shape).
function fail(ctx, code) {
  const err = code instanceof HttpError ? code : new HttpError(code);
  if (err.code === 'not_found') return html(notFoundHtml(ctx), { status: 404 });
  return html(errorHtml(ctx, err), { status: err.status });
}

function methodNotAllowed(ctx, allow) {
  const res = fail(ctx, 'method_not_allowed');
  res.headers.set('Allow', allow.join(', '));
  return res;
}

// Signed out on a gated route: 303 to sign-in with the page to come back to.
function signinRequired(ctx, stale) {
  const { pathname, search } = ctx.url;
  const cookies = stale ? [clearCookie(SESSION_COOKIE)] : [];
  if (!isAdminPath(pathname)) return redirect('/auth/signin?e=signed_out', { cookies });
  const next = ctx.request.method === 'POST' ? ownerPage(TABLE, pathname) : pathname + search;
  return redirect(`/auth/signin?next=${encodeURIComponent(next)}${stale ? '&e=expired_session' : ''}`, { cookies });
}

async function route(request, env, now) {
  const url = new URL(request.url);
  const ctx = {
    request, env, url, now, params: {}, form: new URLSearchParams(), user: null, perms: new Set(),
  };
  const { pathname } = url;
  if (!configured(env)) return unavailable();

  const method = request.method;
  if (method !== 'GET' && method !== 'HEAD' && method !== 'POST') return methodNotAllowed(ctx, ['GET', 'HEAD', 'POST']);
  if (method === 'HEAD' && noHead(pathname)) return methodNotAllowed(ctx, pathname.startsWith('/auth/start/') ? ['POST'] : ['GET']);
  if (pathname === '/admin' && method !== 'POST') return redirect('/admin/' + url.search, { status: 308 });
  if (method === 'POST' && !checkCsrf(request, env.ORIGIN)) return fail(ctx, 'csrf');

  const session = await loadSession(env, request, now);
  ctx.user = session.user || null;
  ctx.perms = session.perms || new Set();

  const found = match(TABLE, method, pathname);
  if (!found) {
    if (!ctx.user && isAdminPath(pathname)) return signinRequired(ctx, session.stale);
    return fail(ctx, 'not_found');
  }
  if (found.methods) return methodNotAllowed(ctx, found.methods.includes('GET') ? [...found.methods, 'HEAD'] : found.methods);

  ctx.params = found.params;
  const { access } = found.route;
  if (access !== PUBLIC) {
    if (!ctx.user) return signinRequired(ctx, session.stale);
    if (access !== SIGNED_IN && !ctx.perms.has(access)) return html(forbiddenHtml(ctx, access), { status: 403 });
  }
  try {
    if (method === 'POST') ctx.form = await readForm(request);
    return await found.route.handler(ctx);
  } catch (err) {
    if (err instanceof HttpError) return fail(ctx, err);
    if (err instanceof AuthError) return redirect(`/auth/signin?e=${encodeURIComponent(err.code)}`);
    throw err;
  }
}

export async function handle(request, env, now = Date.now()) {
  const url = new URL(request.url);
  let res;
  if (!env || typeof env.ORIGIN !== 'string' || !env.ORIGIN) {
    res = unavailable();
  } else if (url.origin !== env.ORIGIN) {
    // pages.dev and preview hosts never serve the app; same path on the canonical origin.
    res = redirect(env.ORIGIN + url.pathname + url.search, { status: 308 });
  } else {
    try {
      res = await route(request, env, now);
    } catch (err) {
      // Fail closed (D1 down, a bug). The message may hold data, so only its class is logged.
      console.error(`staff: unhandled ${err && err.name ? err.name : 'error'}`);
      res = unavailable();
    }
  }
  res = secure(res);
  if (request.method === 'HEAD') return new Response(null, { status: res.status, statusText: res.statusText, headers: res.headers });
  return res;
}
