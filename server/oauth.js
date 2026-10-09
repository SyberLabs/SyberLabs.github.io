// The OAuth dance for both providers. In-flight state lives in an AES-GCM cookie bound to the provider
// (AAD), never in D1: an unauthenticated visitor writes nothing, and replay is stopped by single-use
// codes, the browser-held cookie, its 600 s life and its clearing on the first callback (RFC-0002 2.2).
import { stateKey, sealJson, openJson, randomToken, sha256B64url, timingSafeEqual } from './crypto.js';
import { AuthError, HttpError, clearCookie, cookie, html, readCookie, redirect, safeReturnTo } from './http.js';
import { auditStmt, findIdentity, findOpenInvite, redeemInvite } from './authz.js';
import { mintSession } from './session.js';
import { deniedHtml } from './views/forbidden.js';
import * as github from './github.js';
import * as google from './google.js';

export const OAUTH_COOKIE = '__Host-sl_oauth';
export const STATE_TTL_MS = 600000; // GitHub's code lifetime is 10 minutes
export const PROVIDERS = ['github', 'google'];
// GitHub ships first (RFC-0002 packet order); Google is on only once both of its values are set.
export const enabledProviders = env => PROVIDERS.filter(p => p === 'github' || Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET));

const CLIENTS = { github, google };
const aad = provider => `sl_oauth|${provider}`;

function providerOf(ctx) {
  const p = ctx.params && ctx.params.provider;
  if (!enabledProviders(ctx.env).includes(p)) throw new HttpError('not_found');
  return p;
}

// payload: {v:1, p, s, cv, n?, r, t}. Sealed as given, so tests can craft bad payloads.
export async function sealState(env, provider, payload) {
  return sealJson(await stateKey(env.APP_SECRET), payload, aad(provider));
}

// null for anything we did not seal for this provider within the last 600 s.
export async function openState(env, provider, sealed, now) {
  if (typeof sealed !== 'string' || !sealed || sealed.length > 4096) return null;
  const st = await openJson(await stateKey(env.APP_SECRET), sealed, aad(provider));
  if (!st || typeof st !== 'object' || st.v !== 1 || st.p !== provider) return null;
  if (typeof st.t !== 'number' || now - st.t >= STATE_TTL_MS || st.t - now > 60000) return null;
  if (typeof st.s !== 'string' || !st.s || typeof st.cv !== 'string' || !st.cv) return null;
  return st;
}

// POST /auth/start/:provider (CSRF already checked by app.js). No D1 read or write.
export async function startLogin(ctx) {
  const { env, form, now } = ctx;
  const provider = providerOf(ctx);
  const selectAccount = form.get('switch') === '1' || form.get('prompt') === 'select_account';
  const st = { v: 1, p: provider, s: randomToken(), cv: randomToken(), r: safeReturnTo(form.get('next'), env.ORIGIN), t: now };
  if (provider === 'google') st.n = randomToken();

  const challenge = await sha256B64url(st.cv);
  let location;
  if (provider === 'github') {
    location = github.authorizeUrl(env, { state: st.s, challenge, selectAccount });
  } else {
    location = google.authorizeUrl(env, { state: st.s, challenge, nonce: st.n, selectAccount });
  }
  const sealed = await sealState(env, provider, st);
  return redirect(location, { cookies: [cookie(OAUTH_COOKIE, sealed, STATE_TTL_MS / 1000)] });
}

// Back to the sign-in page. When the cookie decrypted, keep its return path (RFC-0002 2.2).
function signinUrl(code, st) {
  const q = new URLSearchParams();
  if (st && st.r) q.set('next', st.r);
  q.set('e', code);
  return `/auth/signin?${q}`;
}

// GET /auth/callback/:provider. The return path comes only from the sealed cookie, never the query.
export async function callback(ctx) {
  const { env, request, url, now } = ctx;
  const provider = providerOf(ctx);
  const cleared = clearCookie(OAUTH_COOKIE);
  const back = (code, st) => redirect(signinUrl(code, st), { cookies: [cleared] });

  // Every state check happens before any provider call.
  const st = await openState(env, provider, readCookie(request, OAUTH_COOKIE), now);
  const state = url.searchParams.get('state');
  if (!st || typeof state !== 'string' || !timingSafeEqual(state, st.s)) return back('expired');
  st.r = safeReturnTo(st.r, env.ORIGIN);

  const error = url.searchParams.get('error');
  if (error) return back(error === 'access_denied' ? 'cancelled' : 'provider', st);
  const code = url.searchParams.get('code');
  if (!code || code.length > 2048) return back('provider', st);

  let id;
  try {
    id = await CLIENTS[provider].fetchIdentity(env, {
      code, verifier: st.cv, nonce: st.n, now, waitUntil: ctx.waitUntil,
    });
  } catch (err) {
    if (err instanceof AuthError) return back(err.code, st);
    throw err;
  }
  return resolve(ctx, provider, id, st, back, cleared);
}

const verifiedEmail = id => (id.emailVerified && typeof id.email === 'string' ? id.email.trim().toLowerCase() : null);

// RFC-0002 2.2 callback outcomes a, b and c. Google is added from a signed-in session (Packet 5), never
// invited, so an unknown Google identity is always case c.
async function resolve(ctx, provider, id, st, back, cleared) {
  const { env, request, now } = ctx;
  const db = env.DB;
  const email = provider === 'google' ? verifiedEmail(id) : null;

  // a. Known identity.
  const known = await findIdentity(db, provider, id.subject);
  if (known) {
    if (known.disabledAt) return back('disabled');
    const s = await mintSession(env, { userId: known.userId, identityId: known.identityId, request, now });
    await db.batch([
      s.stmt,
      db.prepare(`UPDATE identities SET last_login_at = ?1, login = COALESCE(?2, login), email = COALESCE(?3, email)
                   WHERE id = ?4`).bind(now, provider === 'github' ? id.login : null, email, known.identityId),
      auditStmt(db, signinAudit(known.userId, known.identityId, provider, request, now)),
    ]);
    return redirect(st.r, { cookies: [s.cookie, cleared] });
  }

  // b. An open GitHub invite pinned to this numeric id. If the guarded UPDATE changes 0 rows, it is case c.
  const invite = provider === 'github' ? await findOpenInvite(db, id.subject, now) : null;
  const r = invite && await redeemInvite(env, { invite, subject: id.subject, login: id.login, request, now });
  if (r) {
    const s = await mintSession(env, { userId: r.userId, identityId: r.identityId, request, now });
    await db.batch([s.stmt, auditStmt(db, signinAudit(r.userId, r.identityId, provider, request, now))]);
    return redirect('/admin/?welcome=1', { cookies: [s.cookie, cleared] });
  }

  // c. Uninvited: nothing is written to D1, one log line with no subject (RFC-0002 2.2, section 0).
  console.log(JSON.stringify({ event: 'signin.denied', provider }));
  const name = provider === 'github' ? id.login : id.email;
  return html(deniedHtml(ctx, { provider, name, next: st.r }), { status: 403, cookies: [cleared] });
}

const signinAudit = (userId, identityId, provider, request, at) => ({
  at, actor: userId, action: 'signin.ok', targetType: 'identity', targetId: identityId, detail: { provider }, request,
});
