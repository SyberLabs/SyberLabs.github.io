// Authorization: can(), display names, audit rows, invite lookup, the guarded redemption batch and the
// lockout-safe writes.
// Every write that grants access is one D1 batch whose first statement re-checks authority in its WHERE,
// and every later statement checks that the first one took effect (batch statements can't see row counts).
import { newId } from './crypto.js';
import { ipPrefix } from './http.js';

export const can = (ctx, key) => Boolean(ctx.perms && ctx.perms.has(key));

// Content tables hold only opaque ids; names come from here (data boundary rule).
export async function displayNames(db, ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  const out = new Map();
  if (!unique.length) return out;
  const { results } = await db.prepare(
    'SELECT id, display_name FROM users WHERE id IN (SELECT value FROM json_each(?1))').bind(JSON.stringify(unique)).all();
  for (const r of results) out.set(r.id, r.display_name);
  return out;
}

// An unexecuted audit INSERT. `when` = [sqlCondition, ...params] makes it INSERT … SELECT … WHERE <cond>,
// so a batch can write the row only if its guarded first statement took effect.
export function auditStmt(db, { at, actor = null, action, targetType = null, targetId = null, detail = {}, request, when }) {
  const values = [at, actor, action, targetType, targetId, JSON.stringify(detail || {}), request ? ipPrefix(request) : null];
  const cols = 'INSERT INTO audit_events (at, actor_user_id, action, target_type, target_id, detail_json, ip_prefix)';
  if (!when) return db.prepare(`${cols} VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(...values);
  const [cond, ...params] = when;
  return db.prepare(`${cols} SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${cond}`).bind(...values, ...params);
}

export async function findIdentity(db, provider, subject) {
  return db.prepare(`SELECT i.id AS identityId, i.user_id AS userId, u.display_name AS displayName,
      u.disabled_at AS disabledAt
    FROM identities i JOIN users u ON u.id = i.user_id
   WHERE i.provider = ?1 AND i.subject = ?2`).bind(provider, String(subject)).first();
}

// Invites are GitHub only and pinned to the numeric id (RFC-0002 2.5); creation refuses a second open
// invite for an id, so there is at most one.
export async function findOpenInvite(db, subject, now) {
  if (subject == null) return null;
  return db.prepare(`SELECT id, role_id, invited_by FROM invites
    WHERE subject = ?1 AND redeemed_at IS NULL AND revoked_at IS NULL AND expires_at > ?2`).bind(String(subject), now).first();
}

// One guarded batch (RFC-0002 8.1). Returns {userId, identityId}, or null when the invite was not
// redeemable (it stays unburned). Only admin holds id:users.manage and admin holds every key, so "the
// inviter is still an enabled admin" is the whole authority re-check. Every insert is INSERT … SELECT …
// WHERE the UPDATE stamped our new identity id.
export async function redeemInvite(env, { invite, subject, login, request, now }) {
  const db = env.DB;
  const identityId = newId();
  const userId = newId();
  const stamped = 'EXISTS (SELECT 1 FROM invites WHERE id = ? AND redeemed_identity_id = ?)';
  const stmts = [
    db.prepare(`UPDATE invites SET redeemed_at = ?1, redeemed_identity_id = ?2
       WHERE id = ?3 AND subject = ?4 AND redeemed_at IS NULL AND revoked_at IS NULL AND expires_at > ?1
         AND invited_by IN (SELECT user_id FROM admins)`)
      .bind(now, identityId, invite.id, String(subject)),
    db.prepare(`INSERT INTO users (id, display_name, created_at) SELECT ?, ?, ? WHERE ${stamped}`)
      .bind(userId, login || 'GitHub user', now, invite.id, identityId),
    db.prepare(`INSERT INTO identities (id, user_id, provider, subject, login, created_at, last_login_at)
      SELECT ?, ?, 'github', ?, ?, ?, ? WHERE ${stamped}`)
      .bind(identityId, userId, String(subject), login || null, now, now, invite.id, identityId),
    db.prepare(`INSERT INTO user_roles (user_id, role_id, granted_by, granted_at)
      SELECT ?, role_id, invited_by, ? FROM invites WHERE id = ? AND redeemed_identity_id = ?`)
      .bind(userId, now, invite.id, identityId),
    auditStmt(db, {
      at: now, actor: userId, action: 'invite.redeem', targetType: 'invite', targetId: invite.id, request,
      detail: { provider: 'github', role: invite.role_id }, when: [stamped, invite.id, identityId],
    }),
  ];
  let results;
  try {
    results = await db.batch(stmts);
  } catch (err) {
    // Another callback created this (provider, subject) first: deny, the batch rolled back.
    if (/UNIQUE/.test(String(err && err.message))) return null;
    throw err;
  }
  return results[0].meta.changes === 1 ? { userId, identityId } : null;
}

// --- Packet 4: guards
// Privileged keys sit only on admin (migration triggers), so nobody can grant upward or act on a stronger
// user (RFC-0002 2.4). What is left is lockout: every write that could shrink `admins` re-checks it in
// its own WHERE.

// RFC-0002 3.5 copy.
export const GUARD_COPY = {
  lockout: 'That would leave no admin. Grant admin to someone else first.',
  system: 'admin is the system role. It keeps every permission and its name.',
  self: "You can't turn off your own account.",
  privileged: 'Invite people and Create roles belong to admin only.',
  lastMethod: "That is this person's only sign-in method. Add another one before removing it.",
};

// RFC-0002 8.1, lockout-safe revoke (?1 user, ?2 role).
export const revokeRoleStmt = (db, { userId, roleId }) => db.prepare(
  `DELETE FROM user_roles WHERE user_id = ?1 AND role_id = ?2
     AND (?2 <> 'role_admin' OR EXISTS (SELECT 1 FROM admins WHERE user_id <> ?1))`).bind(userId, roleId);

// Turning a user off: one batch. Step 1 refuses self, already-off and the last admin; the rest run only
// if step 1 stamped disabled_at = now. Also ends their sessions and revokes their open invites.
export function disableUserStmts(db, { userId, actorId, now, request }) {
  const took = 'EXISTS (SELECT 1 FROM users WHERE id = ? AND disabled_at = ?)';
  return [
    db.prepare(`UPDATE users SET disabled_at = ?3
       WHERE id = ?1 AND id <> ?2 AND disabled_at IS NULL
         AND (?1 NOT IN (SELECT user_id FROM admins) OR EXISTS (SELECT 1 FROM admins WHERE user_id <> ?1))`)
      .bind(userId, actorId, now),
    db.prepare(`DELETE FROM sessions WHERE user_id = ? AND ${took}`).bind(userId, userId, now),
    db.prepare(`UPDATE invites SET revoked_at = ? WHERE invited_by = ? AND redeemed_at IS NULL AND revoked_at IS NULL
       AND ${took}`).bind(now, userId, userId, now),
    auditStmt(db, { at: now, actor: actorId, action: 'user.disable', targetType: 'user', targetId: userId, request,
      when: [took, userId, now] }),
  ];
}

// admin's keys never change here (the role_perms_admin_keeps_all trigger would refuse it anyway).
export const removeRolePermStmt = (db, { roleId, key }) => db.prepare(
  "DELETE FROM role_permissions WHERE role_id = ?1 AND permission_key = ?2 AND role_id <> 'role_admin'").bind(roleId, key);

// Refuses the last sign-in method; the identity's sessions go with it (FK cascade).
export const removeIdentityStmt = (db, { identityId, userId }) => db.prepare(
  `DELETE FROM identities WHERE id = ?1 AND user_id = ?2
     AND (SELECT count(*) FROM identities WHERE user_id = ?2) > 1`).bind(identityId, userId);
