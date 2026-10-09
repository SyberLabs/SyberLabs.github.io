// The OAuth dance for both providers. In-flight state lives in an AES-GCM cookie bound to the provider
// (AAD), never in D1: an unauthenticated visitor writes nothing, and replay is stopped by single-use
// codes, the browser-held cookie, its 600 s life and its clearing on the first callback (RFC-0002 2.2).
import { deriveKeys, sealJson, openJson, randomToken, sha256B64url, sha256Hex, timingSafeEqual } from './crypto.js';
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
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/; // randomToken(): 32 bytes, base64url
const EMAIL_RE = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}$/;
const aad = provider => `sl_oauth|${provider}`;

function providerOf(ctx) {
  const p = ctx.params && ctx.params.provider;
  if (!enabledProviders(ctx.env).includes(p)) throw new HttpError('not_found');
  return p;
}

// payload: {v:1, p, s, cv, n?, inv?, r, t}. Sealed as given, so tests can craft bad payloads.
export async function sealState(env, provider, payload) {
  const { stateKey } = await deriveKeys(env.APP_SECRET);
  return sealJson(stateKey, payload, aad(provider));
}

// null for anything we did not seal for this provider within the last 600 s.
export async function openState(env, provider, sealed, now) {
  if (typeof sealed !== 'string' || !sealed || sealed.length > 4096) return null;
  const { stateKey } = await deriveKeys(env.APP_SECRET);
  const st = await openJson(stateKey, sealed, aad(provider));
  if (!st || typeof st !== 'object' || st.v !== 1 || st.p !== provider) return null;
  if (typeof st.t !== 'number' || now - st.t >= STATE_TTL_MS || st.t - now > 60000) return null;
  if (typeof st.s !== 'string' || !st.s || typeof st.cv !== 'string' || !st.cv) return null;
  return st;
}

// POST /auth/start/:provider (CSRF already checked by app.js). No D1 read or write.
export async function startLogin(ctx) {
  const { env, form, now } = ctx;
  const provider = providerOf(ctx);
  const raw = form.get('invite');
  const inv = typeof raw === 'string' && TOKEN_RE.test(raw) ? raw : null; // malformed is never echoed
  const selectAccount = form.get('switch') === '1' || form.get('prompt') === 'select_account';
  const st = { v: 1, p: provider, s: randomToken(), cv: randomToken(), r: safeReturnTo(form.get('next'), env.ORIGIN), t: now };
  if (inv) st.inv = inv;
  if (provider === 'google') st.n = randomToken();

  const challenge = await sha256B64url(st.cv);
  let location;
  if (provider === 'github') {
    location = github.authorizeUrl(env, { state: st.s, challenge, selectAccount });
  } else {
    // The sign-in page renders the invited address as a hidden login_hint, so start needs no D1 read.
    const hint = form.get('login_hint');
    const loginHint = inv && typeof hint === 'string' && hint.length <= 254 && EMAIL_RE.test(hint) ? hint : null;
    location = google.authorizeUrl(env, { state: st.s, challenge, nonce: st.n, loginHint, selectAccount });
  }
  const sealed = await sealState(env, provider, st);
  return redirect(location, { cookies: [cookie(OAUTH_COOKIE, sealed, STATE_TTL_MS / 1000)] });
}

// Back to the sign-in page. When the cookie decrypted, keep its invite and return path (RFC-0002 2.2).
function signinUrl(code, st) {
  const q = new URLSearchParams();
  if (st && st.inv) q.set('invite', st.inv);
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

// RFC-0002 2.2 callback outcomes a, b, b', c, d.
async function resolve(ctx, provider, id, st, back, cleared) {
  const { env, request, now } = ctx;
  const db = env.DB;
  const email = provider === 'google' ? verifiedEmail(id) : null;
  const tokenHash = st.inv ? await sha256Hex(st.inv) : null;

  // b'. The cookie carries an open invite for the other provider: send them to the right button.
  if (tokenHash) {
    const other = await db.prepare(
      `SELECT provider FROM invites WHERE token_hash = ?1 AND redeemed_at IS NULL AND revoked_at IS NULL
          AND expires_at > ?2`).bind(tokenHash, now).first('provider');
    if (other && other !== provider) return back('wrong_provider', st);
  }

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

  // b. Open invite: GitHub by pinned numeric id (no link needed); Google only by the link's token.
  let invite = null;
  if (provider === 'github') invite = await findOpenInvite(db, { provider, subject: id.subject, now });
  else if (tokenHash) invite = await findOpenInvite(db, { provider, tokenHash, now });

  if (invite && provider === 'google' &&
      !(email && email === invite.email_normalized && google.googleAuthoritative(email, id.hd))) {
    return back('no_email', st);
  }

  if (invite) {
    const r = await redeemInvite(env, {
      invite, provider, subject: id.subject, email, login: provider === 'github' ? id.login : null, request, now,
    });
    if (!r) return back('invite_invalid', { r: st.r }); // the guarded UPDATE changed 0 rows; invite unburned
    const s = await mintSession(env, { userId: r.userId, identityId: r.identityId, request, now });
    await db.batch([s.stmt, auditStmt(db, signinAudit(r.userId, r.identityId, provider, request, now))]);
    const to = invite.user_id ? `/admin/account?added=${provider}` : '/admin/?welcome=1';
    return redirect(to, { cookies: [s.cookie, cleared] });
  }

  // c / d. Uninvited: nothing is written to D1, one log line with no subject (RFC-0002 2.2, section 0).
  let emailMatch = false;
  if (email) {
    emailMatch = Boolean(await db.prepare('SELECT 1 AS hit FROM identities WHERE lower(email) = ?1 LIMIT 1')
      .bind(email).first('hit'));
  }
  console.log(JSON.stringify({ event: 'signin.denied', provider, emailMatch }));
  const name = provider === 'github' ? id.login : id.email;
  return html(deniedHtml(ctx, { provider, name, emailMatch, invite: st.inv || null, next: st.r }),
    { status: 403, cookies: [cleared] });
}

const signinAudit = (userId, identityId, provider, request, at) => ({
  at, actor: userId, action: 'signin.ok', targetType: 'identity', targetId: identityId, detail: { provider }, request,
});
