// Authorization: can(), display names, audit rows, invite lookup and the guarded redemption batch.
// Every write that grants access is one D1 batch whose first statement re-checks authority in its WHERE,
// and every later statement checks that the first one took effect (batch statements can't see row counts).
import { newId, sha256Hex } from './crypto.js';
import { ipPrefix, requestId, userAgent } from './http.js';


export const can = (ctx, key) => Boolean(ctx.perms && ctx.perms.has(key));

// Effective permission keys of the user named by `u` at time `n` (both SQL expressions). Expired grants
// and deprecated keys grant nothing, exactly like the per-request resolution query.
export const permsOfSql = (u, n) => `SELECT rp.permission_key FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.key = rp.permission_key AND p.deprecated_at IS NULL
   WHERE ur.user_id = ${u} AND (ur.expires_at IS NULL OR ur.expires_at > ${n})`;

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
  const values = [at, actor, action, targetType, targetId, JSON.stringify(detail || {}),
    request ? ipPrefix(request) : null, request ? userAgent(request) : null, request ? requestId(request) : null];
  const cols = 'INSERT INTO audit_events (at, actor_user_id, action, target_type, target_id, detail_json, ip_prefix, user_agent, request_id)';
  if (!when) return db.prepare(`${cols} VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(...values);
  const [cond, ...params] = when;
  return db.prepare(`${cols} SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${cond}`).bind(...values, ...params);
}

export async function findIdentity(db, provider, subject) {
  return db.prepare(`SELECT i.id AS identityId, i.user_id AS userId, u.display_name AS displayName,
      u.disabled_at AS disabledAt
    FROM identities i JOIN users u ON u.id = i.user_id
   WHERE i.provider = ?1 AND i.subject = ?2`).bind(provider, String(subject)).first();
}

const OPEN = 'redeemed_at IS NULL AND revoked_at IS NULL AND expires_at > ?';

// GitHub invites are pinned to the numeric id (no link needed); Google ones need the link's token hash.
export async function findOpenInvite(db, { provider, subject, tokenHash, now }) {
  if (provider === 'github') {
    if (subject == null) return null;
    return db.prepare(`SELECT * FROM invites WHERE provider = 'github' AND subject = ? AND ${OPEN}
      ORDER BY created_at DESC LIMIT 1`).bind(String(subject), now).first();
  }
  if (!tokenHash) return null;
  return db.prepare(`SELECT * FROM invites WHERE provider = ? AND token_hash = ? AND ${OPEN}`)
    .bind(provider, tokenHash, now).first();
}

export const INVITE_TOKEN = /^[A-Za-z0-9_-]{43}$/;

// For the sign-in greeting. Malformed tokens never reach D1.
export async function inviteForToken(db, token, now) {
  if (typeof token !== 'string' || !INVITE_TOKEN.test(token)) return null;
  const row = await db.prepare(`SELECT i.*, r.name AS role_name, inv.display_name AS inviter_name,
      t.display_name AS target_name
    FROM invites i
    LEFT JOIN roles r ON r.id = i.role_id
    LEFT JOIN users inv ON inv.id = i.invited_by
    LEFT JOIN users t ON t.id = i.user_id
   WHERE i.token_hash = ?1 AND i.redeemed_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > ?2
     AND (i.invited_by IS NULL OR inv.disabled_at IS NULL)
     AND (i.user_id IS NULL OR t.disabled_at IS NULL)`).bind(await sha256Hex(token), now).first();
  if (!row) return null;
  const { role_name: roleName, inviter_name: inviterName, target_name: targetName, ...invite } = row;
  return { invite, roleName, inviterName, targetName };
}

// The inviter's authority, re-checked at redemption (RFC-0002 8.1): enabled, still holds id:users.manage,
// still holds every key of the role, and (add-method invites) every key of the target.
const INVITER_OK = `(invited_by IS NULL OR (
      EXISTS (SELECT 1 FROM users WHERE id = invites.invited_by AND disabled_at IS NULL)
  AND 'id:users.manage' IN (${permsOfSql('invites.invited_by', '?1')})
  AND NOT EXISTS (SELECT 1 FROM role_permissions rq JOIN permissions pq ON pq.key = rq.permission_key AND pq.deprecated_at IS NULL
                   WHERE rq.role_id = invites.role_id
                     AND rq.permission_key NOT IN (${permsOfSql('invites.invited_by', '?1')}))
  AND NOT EXISTS (SELECT 1 FROM (${permsOfSql('invites.user_id', '?1')}) tp
                   WHERE tp.permission_key NOT IN (${permsOfSql('invites.invited_by', '?1')}))))`;

// One guarded batch. Returns {userId, identityId}, or null when the invite was not redeemable (it stays
// unburned). Every insert is INSERT … SELECT … WHERE the UPDATE stamped our new identity id.
export async function redeemInvite(env, { invite, provider, subject, email = null, login = null, request, now }) {
  const db = env.DB;
  const identityId = newId();
  const userId = invite.user_id || newId();
  const stamped = 'EXISTS (SELECT 1 FROM invites WHERE id = ? AND redeemed_identity_id = ?)';
  const stmts = [
    db.prepare(`UPDATE invites SET redeemed_at = ?1, redeemed_identity_id = ?2
       WHERE id = ?3 AND provider = ?4 AND (subject IS NULL OR subject = ?5)
         AND redeemed_at IS NULL AND revoked_at IS NULL AND expires_at > ?1
         AND ${INVITER_OK}
         AND (user_id IS NULL OR EXISTS (SELECT 1 FROM users WHERE id = invites.user_id AND disabled_at IS NULL))`)
      .bind(now, identityId, invite.id, provider, String(subject)),
  ];
  if (!invite.user_id) {
    stmts.push(db.prepare(`INSERT INTO users (id, display_name, primary_email, created_at)
      SELECT ?, ?, ?, ? WHERE ${stamped}`).bind(userId, login || email || provider, email, now, invite.id, identityId));
  }
  stmts.push(db.prepare(`INSERT INTO identities (id, user_id, provider, subject, email, login, created_at, last_login_at)
    SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE ${stamped}`)
    .bind(identityId, userId, provider, String(subject), email, login, now, now, invite.id, identityId));
  if (!invite.user_id) {
    stmts.push(db.prepare(`INSERT INTO user_roles (user_id, role_id, granted_by, granted_at)
      SELECT ?, role_id, invited_by, ? FROM invites WHERE id = ? AND redeemed_identity_id = ? AND role_id IS NOT NULL`)
      .bind(userId, now, invite.id, identityId));
  }
  stmts.push(auditStmt(db, {
    at: now, actor: userId, action: 'invite.redeem', targetType: 'invite', targetId: invite.id, request,
    detail: invite.user_id ? { provider, add: 'identity.add', identity: identityId } : { provider, role: invite.role_id },
    when: [stamped, invite.id, identityId],
  }));
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
// Up rule: you grant or invite only to roles whose keys you hold. Target rule: you act only on users whose
// keys you hold. Lockout: every write that could shrink full_admins re-checks the view in its own WHERE.

export async function permsOfUser(db, userId, now) {
  const { results } = await db.prepare(permsOfSql('?1', '?2')).bind(userId, now).all();
  return new Set(results.map(r => r.permission_key));
}

export async function permsOfRole(db, roleId) {
  const { results } = await db.prepare(`SELECT rp.permission_key FROM role_permissions rp
    JOIN permissions p ON p.key = rp.permission_key AND p.deprecated_at IS NULL WHERE rp.role_id = ?`).bind(roleId).all();
  return new Set(results.map(r => r.permission_key));
}

export const subset = (a, b) => [...a].every(k => b.has(k));

export const MANAGE_KEYS = ['id:users.manage', 'id:roles.manage'];

// RFC-0002 3.5 copy.
export const GUARD_COPY = {
  up: 'You can only grant or invite to a role whose permissions you hold yourself.',
  target: 'You can only change accounts whose permissions you hold yourself.',
  lockout: 'That would leave no admin. Grant admin to someone else first.',
  system: 'admin is the system role. It keeps every permission and its name.',
  self: "You can't turn off your own account.",
  privileged: 'Invite people and Create roles belong to admin only.',
  lastMethod: "That is this person's only sign-in method. Add another one before removing it.",
};

// True when user ?1 stays a full admin without role ?2, or another full admin exists.
const STILL_ADMIN_WITHOUT_ROLE = `(?1 NOT IN (SELECT user_id FROM full_admins)
  OR EXISTS (SELECT 1 FROM full_admins WHERE user_id <> ?1)
  OR (SELECT count(DISTINCT rp.permission_key) FROM user_roles ur JOIN role_permissions rp ON rp.role_id = ur.role_id
       WHERE ur.user_id = ?1 AND ur.role_id <> ?2 AND ur.expires_at IS NULL
         AND rp.permission_key IN ('id:users.manage','id:roles.manage')) = 2)`;

export const revokeRoleStmt = (db, { userId, roleId }) => db.prepare(
  `DELETE FROM user_roles WHERE user_id = ?1 AND role_id = ?2 AND ${STILL_ADMIN_WITHOUT_ROLE}`).bind(userId, roleId);

// Turning a user off: one batch. Step 1 refuses self, already-off and the last full admin; the rest run
// only if step 1 stamped disabled_at = now. Also ends their sessions and revokes their open invites.
export function disableUserStmts(db, { userId, actorId, now, reason = null, request }) {
  const took = 'EXISTS (SELECT 1 FROM users WHERE id = ? AND disabled_at = ?)';
  return [
    db.prepare(`UPDATE users SET disabled_at = ?3, disabled_reason = ?4
       WHERE id = ?1 AND id <> ?2 AND disabled_at IS NULL
         AND (?1 NOT IN (SELECT user_id FROM full_admins) OR EXISTS (SELECT 1 FROM full_admins WHERE user_id <> ?1))`)
      .bind(userId, actorId, now, reason),
    db.prepare(`DELETE FROM sessions WHERE user_id = ? AND ${took}`).bind(userId, userId, now),
    db.prepare(`UPDATE invites SET revoked_at = ? WHERE invited_by = ? AND redeemed_at IS NULL AND revoked_at IS NULL
       AND ${took}`).bind(now, userId, userId, now),
    auditStmt(db, { at: now, actor: actorId, action: 'user.disable', targetType: 'user', targetId: userId, request,
      when: [took, userId, now] }),
  ];
}

// Removing a manage key from a custom role is refused while some full admin depends on that role.
export const removeRolePermStmt = (db, { roleId, key }) => db.prepare(
  `DELETE FROM role_permissions WHERE role_id = ?1 AND permission_key = ?2 AND role_id <> 'role_admin'
     AND (?2 NOT IN ('id:users.manage','id:roles.manage')
          OR EXISTS (SELECT 1 FROM full_admins fa WHERE fa.user_id NOT IN (SELECT user_id FROM user_roles WHERE role_id = ?1)))`)
  .bind(roleId, key);

// Refuses the last sign-in method; the identity's sessions go with it (FK cascade).
export const removeIdentityStmt = (db, { identityId, userId }) => db.prepare(
  `DELETE FROM identities WHERE id = ?1 AND user_id = ?2
     AND (SELECT count(*) FROM identities WHERE user_id = ?2) > 1`).bind(identityId, userId);

export async function isFullAdmin(db, userId) {
  return Boolean(await db.prepare('SELECT 1 AS x FROM full_admins WHERE user_id = ?').bind(userId).first());
}
