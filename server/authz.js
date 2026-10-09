// Authorization: can(), display names, audit rows, identity lookup and the lockout-safe writes.
// A guarded write is one D1 batch whose first statement re-checks the rule in its WHERE, and every later
// statement checks that the preceding one took effect via SQLite changes() in the same transaction.
// No invites: RFC-0002 R3-4 replaced them with Add person (views/people.js addPerson).
import { ipPrefix } from './http.js';

export const can = (ctx, key) => Boolean(ctx.perms && ctx.perms.has(key));

// The name an identity shows everywhere (RFC-0002 2.6, 3.3): "@login", or "GitHub id N" for a person added by id
// who has not signed in yet, the email for Google, or "a removed account". A hex id is never shown.
export function identityName(i) {
  if (i && i.provider === 'google') return i.email || 'a Google account';
  if (i && i.login) return `@${i.login}`;
  if (i && i.subject) return `GitHub id ${i.subject}`;
  return 'a removed account';
}

// Content tables hold only opaque ids; names come from here (data boundary rule), from each user's first
// sign-in method. Ids with no identity are left out, so callers show "a removed account".
export async function displayNames(db, ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  const out = new Map();
  if (!unique.length) return out;
  const { results } = await db.prepare(`SELECT user_id, provider, subject, login, email FROM identities
    WHERE user_id IN (SELECT value FROM json_each(?1)) ORDER BY created_at, id`).bind(JSON.stringify(unique)).all();
  for (const r of results) if (!out.has(r.user_id)) out.set(r.user_id, identityName(r));
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

// --- Packet 4: guards
// Privileged keys sit only on admin (migration triggers), so nobody can grant upward or act on a stronger
// user (RFC-0002 2.4). What is left is lockout: every write that could shrink `admins` re-checks it in
// its own WHERE.

// RFC-0002 3.5 copy.
export const GUARD_COPY = {
  lockout: 'That would leave no admin. Grant admin to someone else first.',
  system: 'admin is the system role. It keeps every permission and its name.',
  self: "You can't turn off your own account.",
  privileged: 'Add people and Create roles belong to admin only.',
};

// RFC-0002 8.1, lockout-safe revoke (?1 user, ?2 role).
export const revokeRoleStmt = (db, { userId, roleId }) => db.prepare(
  `DELETE FROM user_roles WHERE user_id = ?1 AND role_id = ?2
     AND (?2 <> 'role_admin' OR EXISTS (SELECT 1 FROM admins WHERE user_id <> ?1))`).bind(userId, roleId);

// Turning a user off: one batch (RFC-0002 8.1). Step 1 refuses self, already-off and the last admin; ending
// the audit row then their sessions run only when the preceding statement changed exactly one row.
export function disableUserStmts(db, { userId, actorId, now, request }) {
  return [
    db.prepare(`UPDATE users SET disabled_at = ?3
       WHERE id = ?1 AND id <> ?2 AND disabled_at IS NULL
         AND (?1 NOT IN (SELECT user_id FROM admins) OR EXISTS (SELECT 1 FROM admins WHERE user_id <> ?1))`)
      .bind(userId, actorId, now),
    auditStmt(db, { at: now, actor: actorId, action: 'user.disable', targetType: 'user', targetId: userId, request,
      when: ['changes() = 1'] }),
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND changes() = 1').bind(userId),
  ];
}

// admin's keys never change here (the role_perms_admin_keeps_all trigger would refuse it anyway).
export const removeRolePermStmt = (db, { roleId, key }) => db.prepare(
  "DELETE FROM role_permissions WHERE role_id = ?1 AND permission_key = ?2 AND role_id <> 'role_admin'").bind(roleId, key);
