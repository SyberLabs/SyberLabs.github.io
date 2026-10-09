// The OAuth dance for both providers. In-flight state lives in an AES-GCM cookie bound to the provider (AAD),
// never in D1: an unauthenticated visitor writes nothing, and replay is stopped by single-use codes, the
// browser-held cookie, its 600 s life and its clearing on the first callback (RFC-0002 2.2).
import { stateKey, sealJson, openJson, newId, randomToken, sha256B64url, sha256Hex, timingSafeEqual } from './crypto.js';
import { AuthError, HttpError, clearCookie, cookie, html, readCookie, redirect, safeReturnTo } from './http.js';
import { auditStmt, findIdentity } from './authz.js';
import { SESSION_COOKIE, TOKEN_RE, clearSessionCookie, loadSession, mintSession } from './session.js';
import { deniedHtml } from './views/forbidden.js';
import * as github from './github.js';
import * as google from './google.js';
import { enabledProviders, googleEnabled } from './providers.js';

export { PROVIDERS, enabledProviders, googleEnabled } from './providers.js';

export const OAUTH_COOKIE = '__Host-sl_oauth';
export const STATE_TTL_MS = 600000; // GitHub's code lifetime is 10 minutes
export const ADD_GOOGLE_FRESH_MS = 600000; // Add Google needs a session that started under 10 minutes ago (RFC-0002 2.3)

const CLIENTS = { github, google };
const aad = provider => `sl_oauth|${provider}`;

function providerOf(ctx) {
  const p = ctx.params && ctx.params.provider;
  if (!enabledProviders(ctx.env).includes(p)) throw new HttpError('not_found');
  return p;
}

// payload: {v:1, p, s, cv, n?, l?, r, t}. n is Google's nonce; l is the user adding Google. Sealed as given, so
// tests can craft bad payloads.
export async function sealState(env, provider, payload) {
  return sealJson(await stateKey(env.APP_SECRET), payload, aad(provider));
}

// null for anything we did not seal for this provider within the last 600 s.
export async function openState(env, provider, sealed, now) {
  if (typeof sealed !== 'string' || !sealed || sealed.length > 4096) return null;
  const st = await openJson(await stateKey(env.APP_SECRET), sealed, aad(provider));
  if (!st || typeof st !== 'object' || st.v !== 1 || st.p !== provider) return null;
  if (!Number.isFinite(st.t) || now - st.t >= STATE_TTL_MS || st.t - now > 60000) return null;
  if (typeof st.s !== 'string' || !st.s || typeof st.cv !== 'string' || !st.cv) return null;
  if (provider === 'google' && (typeof st.n !== 'string' || !st.n)) return null;
  // Only Add Google links a method to a signed-in user.
  if (st.l !== undefined && (provider !== 'google' || typeof st.l !== 'string' || !st.l)) return null;
  return st;
}

// Seals st and sends the browser to the provider. No D1 access.
async function begin(env, st, selectAccount) {
  const challenge = await sha256B64url(st.cv);
  // github ignores nonce.
  const location = CLIENTS[st.p].authorizeUrl(env, { state: st.s, challenge, nonce: st.n, selectAccount });
  const sealed = await sealState(env, st.p, st);
  return redirect(location, { cookies: [cookie(OAUTH_COOKIE, sealed, STATE_TTL_MS / 1000)] });
}

const freshState = (provider, r, now) => ({
  v: 1, p: provider, s: randomToken(), cv: randomToken(), ...(provider === 'google' ? { n: randomToken() } : {}), r, t: now,
});

// POST /auth/start/:provider (CSRF already checked by app.js). No D1 read or write.
export async function startLogin(ctx) {
  const { env, form, now } = ctx;
  const provider = providerOf(ctx);
  const st = freshState(provider, safeReturnTo(form.get('next'), env.ORIGIN), now);
  return begin(env, st, form.get('switch') === '1');
}

// POST /admin/account/add-google (SIGNED_IN; the route exists only while Google is on). RFC-0002 2.5: from a
// session that started under 10 minutes ago, seal l = this user and send Google's account chooser. An older
// session, or a user who already has Google, goes back to the account page, which shows the way on.
export async function addGoogle(ctx) {
  const { env, user, now } = ctx;
  if (!googleEnabled(env)) throw new HttpError('not_found');
  if (!(now - user.createdAt < ADD_GOOGLE_FRESH_MS)) return redirect('/admin/account');
  const has = await env.DB.prepare("SELECT 1 AS x FROM identities WHERE user_id = ?1 AND provider = 'google'").bind(user.id).first();
  if (has) return redirect('/admin/account');
  return begin(env, { ...freshState('google', '/admin/account', now), l: user.id }, true);
}

// Back to the sign-in page. When the cookie decrypted, keep its return path and name the provider in p, so the
// copy can say "GitHub didn't finish the sign-in" (RFC-0002 2.2, 3.4). Built with URLSearchParams, so next is one
// encoded value and adds no e, p or switch of its own. Add Google goes back to the account page instead.
function backUrl(code, st) {
  const q = new URLSearchParams();
  if (st && st.l) {
    q.set('e', code);
    q.set('p', st.p);
    return `/admin/account?${q}`;
  }
  if (st && st.r) q.set('next', st.r);
  q.set('e', code);
  if (st && st.p) q.set('p', st.p);
  return `/auth/signin?${q}`;
}

// GET /auth/callback/:provider. The return path comes only from the sealed cookie, never the query.
export async function callback(ctx) {
  const { env, request, url, now } = ctx;
  const provider = providerOf(ctx);
  const cleared = clearCookie(OAUTH_COOKIE);
  const back = (code, st) => redirect(backUrl(code, st), { cookies: [cleared] });

  // Every state check happens before any provider call.
  const st = await openState(env, provider, readCookie(request, OAUTH_COOKIE), now);
  const state = url.searchParams.get('state');
  if (!st || typeof state !== 'string' || !timingSafeEqual(state, st.s)) return back('expired');
  st.r = st.l ? '/admin/account' : safeReturnTo(st.r, env.ORIGIN);

  const error = url.searchParams.get('error');
  if (error) return back(error === 'access_denied' ? 'cancelled' : 'provider', st);
  const code = url.searchParams.get('code');
  if (!code || code.length > 2048) return back('provider', st);

  let id;
  try {
    id = await CLIENTS[provider].fetchIdentity(env, { code, verifier: st.cv, nonce: st.n, now });
  } catch (err) {
    if (err instanceof AuthError) return back(err.code, st);
    throw err;
  }
  if (st.l) return linkGoogle(ctx, id, st, cleared);
  return resolve(ctx, provider, id, st, back, cleared);
}

// RFC-0002 2.2 callback outcomes a (known identity) and b (unknown). A person an admin added (views/people.js
// addPerson) already has their GitHub identity row, so their first sign-in is case a. Google is added from a
// signed-in session, never invited, so every unknown Google identity is case b, whatever its email.
async function resolve(ctx, provider, id, st, back, cleared) {
  const { env, request, now } = ctx;
  const db = env.DB;

  const known = await findIdentity(db, provider, id.subject);
  if (known) {
    if (known.disabledAt) return back('disabled');
    const s = await mintSession(env, { userId: known.userId, identityId: known.identityId, request, now });
    // GitHub's login follows renames (display only, and users.display_name with it); Google's verified email is
    // refreshed, and kept when Google sends none (display only).
    const refresh = provider === 'github'
      ? [db.prepare('UPDATE identities SET last_login_at = ?1, login = ?2 WHERE id = ?3').bind(now, id.login, known.identityId),
        db.prepare('UPDATE users SET display_name = ?1 WHERE id = ?2').bind(id.login, known.userId)]
      : [db.prepare('UPDATE identities SET last_login_at = ?1, email = COALESCE(?2, email) WHERE id = ?3').bind(now, id.email, known.identityId)];
    // Case a replaces the session this browser's previous cookie named, if any, and sweeps every expired
    // session, in the same batch (RFC-0002 2.2, 3.2).
    const previous = readCookie(request, SESSION_COOKIE);
    await db.batch([
      s.stmt,
      ...(previous && TOKEN_RE.test(previous)
        ? [db.prepare('DELETE FROM sessions WHERE id_hash = ?1').bind(await sha256Hex(previous))] : []),
      db.prepare('DELETE FROM sessions WHERE expires_at < ?1').bind(now),
      ...refresh,
      auditStmt(db, signinAudit(known.userId, known.identityId, provider, request, now)),
    ]);
    return redirect(st.r, { cookies: [s.cookie, cleared] });
  }

  // b. Unknown: nothing is written to D1, one log line with no subject (RFC-0002 2.2, section 0).
  console.log(JSON.stringify({ event: 'signin.denied', provider }));
  const name = provider === 'github' ? id.login : id.email;
  return html(deniedHtml(ctx, { provider, name, next: st.r }), { status: 403, cookies: [cleared] });
}

// RFC-0002 2.2 case c, 8.1: the session cookie must still resolve to user l, and (google, sub) must be on no
// user. The insert re-checks the session inside its own WHERE, and the audit row lands only if it took effect.
async function linkGoogle(ctx, id, st, cleared) {
  const { env, request, now } = ctx;
  const db = env.DB;
  const toAccount = query => redirect(`/admin/account?${query}`, { cookies: [cleared] });

  const session = await loadSession(env, request, now);
  if (!session.user || session.user.id !== st.l) {
    const q = new URLSearchParams({ e: 'expired_session', next: '/admin/account' });
    return redirect(`/auth/signin?${q}`, { cookies: session.stale ? [cleared, clearSessionCookie()] : [cleared] });
  }
  const existing = await findIdentity(db, 'google', id.subject);
  if (existing) return toAccount(existing.userId === st.l ? 'added=google' : 'e=google_taken');

  const identityId = newId();
  try {
    const results = await db.batch([
      db.prepare(`INSERT INTO identities (id, user_id, provider, subject, email, created_at)
        SELECT ?1, ?2, 'google', ?3, ?4, ?5
         WHERE EXISTS (SELECT 1 FROM sessions s JOIN users u ON u.id = s.user_id AND u.disabled_at IS NULL
                        WHERE s.id_hash = ?6 AND s.user_id = ?2 AND s.expires_at > ?5)
           AND NOT EXISTS (SELECT 1 FROM identities WHERE user_id = ?2 AND provider = 'google')`)
        .bind(identityId, st.l, id.subject, id.email, now, session.user.sessionHash),
      auditStmt(db, {
        at: now, actor: st.l, action: 'identity.add', targetType: 'user', targetId: st.l,
        detail: { provider: 'google', identity: identityId }, request,
        when: ['EXISTS (SELECT 1 FROM identities WHERE id = ?)', identityId],
      }),
    ]);
    // The session or another Add Google flow can change after the reads above.
    // Only show success when this transaction actually inserted the method.
    if (!results[0].meta.changes) return redirect('/admin/account', { cookies: [cleared] });
  } catch (err) {
    // UNIQUE (provider, subject): another request bound this sub in the meantime.
    if (/UNIQUE/.test(String(err && err.message))) return toAccount('e=google_taken');
    throw err;
  }
  return toAccount('added=google');
}

const signinAudit = (userId, identityId, provider, request, at) => ({
  at, actor: userId, action: 'signin.ok', targetType: 'identity', targetId: identityId, detail: { provider }, request,
});
