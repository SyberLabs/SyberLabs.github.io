// Opaque server sessions: a random 32-byte token in a __Host- cookie, only sha256(token) in D1.
// 12 hours absolute, no idle timer, so a signed-in page view reads once and writes nothing.
import { randomToken, sha256Hex } from './crypto.js';
import { cookie, clearCookie, readCookie, redirect, safeReturnTo, ipPrefix, userAgent } from './http.js';
import { auditStmt } from './authz.js';

export const SESSION_COOKIE = '__Host-sl_session';
export const SESSION_TTL_MS = 12 * 3600 * 1000;

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

// RFC-0002 8.1, plus the two columns this migration has and the RFC's does not: time-boxed grants
// (user_roles.expires_at) and retired keys (permissions.deprecated_at) grant nothing.
const SESSION_SQL = `
SELECT s.user_id, s.identity_id, s.created_at, s.expires_at,
       u.display_name, i.provider, i.login, i.email,
       (SELECT json_group_array(DISTINCT rp.permission_key)
          FROM user_roles ur
          JOIN role_permissions rp ON rp.role_id = ur.role_id
          JOIN permissions p ON p.key = rp.permission_key AND p.deprecated_at IS NULL
         WHERE ur.user_id = s.user_id AND (ur.expires_at IS NULL OR ur.expires_at > ?2)) AS perms
  FROM sessions s
  JOIN users u      ON u.id = s.user_id AND u.disabled_at IS NULL
  JOIN identities i ON i.id = s.identity_id AND i.user_id = s.user_id
 WHERE s.id_hash = ?1 AND s.expires_at > ?2`;

const signedOut = stale => ({ user: null, perms: new Set(), stale });

// One read, no writes. stale = a cookie was sent but no live session matches it.
export async function loadSession(env, request, now) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return signedOut(false);
  if (!TOKEN_RE.test(token)) return signedOut(true); // not one we minted; skip the read
  const sessionHash = await sha256Hex(token);
  const row = await env.DB.prepare(SESSION_SQL).bind(sessionHash, now).first();
  if (!row) return signedOut(true);
  let perms = [];
  try { perms = JSON.parse(row.perms || '[]'); } catch { perms = []; }
  return {
    user: {
      id: row.user_id,
      identityId: row.identity_id,
      sessionHash,
      displayName: row.display_name,
      provider: row.provider,
      login: row.login,
      email: row.email,
      createdAt: row.created_at, // account page: "This session started at …" (RFC-0002 3.5)
      expiresAt: row.expires_at,
    },
    perms: new Set(perms.filter(p => typeof p === 'string')),
    stale: false,
  };
}

export const sessionCookie = token => cookie(SESSION_COOKIE, token, SESSION_TTL_MS / 1000);
export const clearSessionCookie = () => clearCookie(SESSION_COOKIE);

// The caller batches stmt with its other writes (last_login_at, audit), so a sign-in is one transaction.
export async function mintSession(env, { userId, identityId, request, now }) {
  const token = randomToken();
  const stmt = env.DB.prepare(
    `INSERT INTO sessions (id_hash, user_id, identity_id, created_at, expires_at, ip_prefix, user_agent)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`)
    .bind(await sha256Hex(token), userId, identityId, now, now + SESSION_TTL_MS,
      ipPrefix(request), userAgent(request));
  return { token, cookie: sessionCookie(token), stmt };
}

export const deleteUserSessionsStmt = (db, userId) =>
  db.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(userId);

// After sign-out the browser lands on the sign-in page (RFC-0002 2.2), keeping a sanitized next and
// switch=1 so "Sign out and switch account" reaches the provider's account picker.
function signedOutLocation(form, origin) {
  const q = new URLSearchParams({ e: 'signed_out' });
  if (form.get('next')) q.set('next', safeReturnTo(form.get('next'), origin));
  if (form.get('switch') === '1') q.set('switch', '1');
  return `/auth/signin?${q}`;
}

// POST /auth/signout. Never sends Clear-Site-Data: "cookies" would wipe rise.syberlabs.io's rise_plus.
export async function signout(ctx) {
  await ctx.env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?1').bind(ctx.user.sessionHash).run();
  return redirect(signedOutLocation(ctx.form, ctx.env.ORIGIN), { cookies: [clearSessionCookie()] });
}

// POST /admin/account/signout-everywhere. RFC-0002 2.3: ends every session of the user, this one
// included, and lands on "You're signed out." (supersedes the contract's ?ended=<n> on the account page).
export async function revokeOwnSessions(ctx) {
  const { env, user, now, request } = ctx;
  await env.DB.batch([
    deleteUserSessionsStmt(env.DB, user.id),
    auditStmt(env.DB, {
      at: now, actor: user.id, action: 'session.revoke_all', targetType: 'user', targetId: user.id,
      detail: {}, request,
    }),
  ]);
  return redirect(signedOutLocation(ctx.form, env.ORIGIN), { cookies: [clearSessionCookie()] });
}
