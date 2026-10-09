// /admin/people: staff accounts, their sign-in methods and roles, GitHub invites, and every action on them.
// Every action here needs id:users.manage, which only admin holds, and admin holds every key, so no up or
// target rule applies (RFC-0002 2.4). The lockout rule lives inside each write (authz.js). Refusals change
// no row and answer 403.
import { esc, html, redirect } from '../http.js';
import { newId } from '../crypto.js';
import { GUARD_COPY, auditStmt, can, disableUserStmts, removeIdentityStmt, revokeRoleStmt } from '../authz.js';
import { lookupLogin } from '../github.js';
import { confirmHtml, confirmed, actingAs } from './confirm.js';
import {
  alert, errorSummary, field, fixPrefix, head, hidden, page, postButton, providerLabel, time,
} from './layout.js';

const DAY = 86400 * 1000;
export const INVITE_TTL_MS = 7 * DAY;
const GITHUB_ID = /^[1-9][0-9]{0,19}$/;

const NOTICES = {
  granted: 'Role granted.',
  revoked: 'Role revoked. It takes effect on their next request.',
  disabled: 'Account turned off. Their sessions have ended and their open invites are revoked.',
  enabled: 'Account turned on.',
  sessions: 'Their sessions have ended.',
  removed: 'Sign-in method removed. Its sessions have ended.',
  invite_revoked: 'Invite revoked.',
};

async function roleById(db, id) {
  if (!id) return null;
  return db.prepare('SELECT id, name, is_system FROM roles WHERE id = ?').bind(String(id)).first();
}

async function userById(db, id) {
  if (!id) return null;
  return db.prepare('SELECT id, display_name, disabled_at FROM users WHERE id = ?').bind(String(id)).first();
}

async function loadPeople(db, now) {
  const [users, identities, grants, roles, invites] = await Promise.all([
    db.prepare('SELECT id, display_name, disabled_at, created_at FROM users ORDER BY created_at, id').all(),
    db.prepare('SELECT id, user_id, provider, login, email, created_at, last_login_at FROM identities ORDER BY created_at, id').all(),
    db.prepare(`SELECT ur.user_id, ur.role_id, r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id
      ORDER BY r.is_system DESC, r.name`).all(),
    db.prepare('SELECT id, name, is_system FROM roles ORDER BY is_system DESC, name').all(),
    db.prepare(`SELECT i.id, i.login_hint, i.subject, i.created_at, i.expires_at, r.name AS role_name, inv.display_name AS inviter
      FROM invites i JOIN roles r ON r.id = i.role_id LEFT JOIN users inv ON inv.id = i.invited_by
      WHERE i.redeemed_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > ? ORDER BY i.created_at DESC`).bind(now).all(),
  ]);
  return { users: users.results, identities: identities.results, grants: grants.results, roles: roles.results, invites: invites.results };
}

const methodLabel = i => (i.provider === 'github' ? `GitHub @${i.login || '?'}` : `Google ${i.email || ''}`.trim());

function personRow(ctx, u, data, manage) {
  const ids = data.identities.filter(i => i.user_id === u.id);
  const grants = data.grants.filter(g => g.user_id === u.id);
  const last = Math.max(0, ...ids.map(i => i.last_login_at || 0));
  const self = u.id === ctx.user.id;
  const methods = ids.map(i => `<li>${esc(methodLabel(i))}${manage && ids.length > 1
    ? ' ' + postButton('/admin/people/identity/remove', 'Remove', { identity: i.id }, 'sy-btn sy-btn--ghost staff-btn--small') : ''}</li>`).join('');
  const roles = grants.map(g => `<li>${esc(g.name)}${manage
    ? ' ' + postButton('/admin/people/roles/revoke', 'Revoke', { user: u.id, role: g.role_id }, 'sy-btn sy-btn--ghost staff-btn--small') : ''}</li>`).join('');
  const grantable = data.roles.filter(r => !grants.some(g => g.role_id === r.id));
  const actions = !manage ? '' : `<td class="staff-actions">
      ${grantable.length ? `<form method="post" action="/admin/people/roles/grant" class="staff-inline">${hidden({ user: u.id })}
        <label class="sy-visually-hidden" for="grant-${esc(u.id)}">Role to grant</label>
        <select class="sy-input" id="grant-${esc(u.id)}" name="role">${grantable.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select>
        <button class="sy-btn sy-btn--line staff-btn--small" type="submit">Grant</button></form>` : ''}
      ${u.disabled_at ? postButton('/admin/people/enable', 'Turn on', { user: u.id }, 'sy-btn sy-btn--line staff-btn--small')
        : self ? '' : postButton('/admin/people/disable', 'Turn off', { user: u.id }, 'sy-btn sy-btn--line staff-btn--small')}
      ${postButton('/admin/people/sessions/revoke', 'End sessions', { user: u.id }, 'sy-btn sy-btn--ghost staff-btn--small')}
    </td>`;
  return `<tr>
      <th scope="row">${esc(u.display_name)}${self ? ' <span class="sy-small">(you)</span>' : ''}</th>
      <td><ul class="staff-list">${methods}</ul></td>
      <td><ul class="staff-list">${roles || '<li class="sy-small">none</li>'}</ul></td>
      <td>${last ? time(last) : '<span class="sy-small">never</span>'}</td>
      <td>${u.disabled_at ? 'Turned off' : 'Active'}</td>${actions}
    </tr>`;
}

const INVITE_LABELS = { role: 'Role', login: 'GitHub username', subject: 'GitHub numeric id' };

function inviteForm(data, values, errors) {
  const roles = data.roles.map(r => [r.id, r.name]);
  return `<section class="staff-section" aria-labelledby="invite-h">
    <h2 id="invite-h" class="sy-h3">Invite someone</h2>
    <form method="post" action="/admin/people/invite" class="staff-form" novalidate>
      ${field({ name: 'role', label: INVITE_LABELS.role, kind: 'select', options: roles, value: values.role || 'role_viewer', error: errors.role })}
      ${field({ name: 'login', label: INVITE_LABELS.login, value: values.login, error: errors.login, hint: 'Invites are pinned to the GitHub numeric id; we look it up. They sign in at /admin/ with that account.' })}
      ${field({ name: 'subject', label: INVITE_LABELS.subject, value: values.subject, error: errors.subject, hint: 'Only if the lookup fails: gh api users/<name> --jq .id' })}
      <button class="sy-btn sy-btn--primary" type="submit">Create invite</button>
    </form>
  </section>`;
}

function invitesList(data, manage) {
  if (!data.invites.length) return '';
  return `<section class="staff-section" aria-labelledby="open-h">
    <h2 id="open-h" class="sy-h3">Open invites</h2>
    <ul class="staff-list">${data.invites.map(i => {
      const who = `GitHub @${i.login_hint || '?'} (id ${i.subject})`;
      return `<li>${esc(who)} as ${esc(i.role_name)}, invited by ${esc(i.inviter || 'removed user')}, expires ${time(i.expires_at)}${manage
        ? ' ' + postButton('/admin/people/invite/revoke', 'Revoke', { invite: i.id }, 'sy-btn sy-btn--ghost staff-btn--small') : ''}</li>`;
    }).join('')}</ul>
  </section>`;
}

// The page, with an optional notice (trusted HTML) and the invite form's values and errors.
export async function renderPeople(ctx, { status = 200, notice = '', values = {}, errors = {} } = {}) {
  const data = await loadPeople(ctx.env.DB, ctx.now);
  const manage = can(ctx, 'id:users.manage');
  const ok = NOTICES[ctx.url.searchParams.get('ok')];
  const lonely = data.users.length <= 1 && manage;
  const body = `${head('Admin', 'People.')}
  ${notice || (ok ? alert('success', esc(ok)) : '')}
  ${errorSummary(errors, INVITE_LABELS)}
  ${lonely ? '<div class="sy-empty"><p>Only you so far. Invite someone below.</p></div>' : ''}
  <div class="table-wrap"><table class="staff-table">
    <thead><tr><th scope="col">Name</th><th scope="col">Sign-in methods</th><th scope="col">Roles</th>
      <th scope="col">Last sign-in</th><th scope="col">Status</th>${manage ? '<th scope="col">Actions</th>' : ''}</tr></thead>
    <tbody>${data.users.map(u => personRow(ctx, u, data, manage)).join('')}</tbody>
  </table></div>
  ${manage ? inviteForm(data, values, errors) : ''}
  ${invitesList(data, manage)}`;
  return html(page(ctx, { title: `${fixPrefix(errors)}People`, body, section: 'people' }), { status });
}

export const peoplePage = ctx => renderPeople(ctx);

const refuse = (ctx, copy) => renderPeople(ctx, { status: 403, notice: alert('danger', esc(copy)) });
const done = code => redirect(`/admin/people?ok=${code}`);
const confirmPage = (ctx, opts) => html(confirmHtml(ctx, { cancel: '/admin/people', section: 'people', ...opts }));

const ADMIN_LINE = 'Admin can invite people, grant and revoke roles, turn accounts off and on, and create roles.';

// ---- invites ---------------------------------------------------------------------------------

// GitHub only (RFC-0002 2.5): Google is added from a signed-in session, never invited, so a crafted
// provider=google POST is refused rather than creating an invite nobody could redeem.
export async function createInvite(ctx) {
  const { env, form, now, user } = ctx;
  const db = env.DB;
  const values = Object.fromEntries(['role', 'provider', 'login', 'subject'].map(k => [k, (form.get(k) || '').trim()]));
  const errors = {};
  const invalid = () => renderPeople(ctx, { status: 422, values, errors });
  if (values.provider && values.provider !== 'github') {
    return renderPeople(ctx, { status: 422, values, notice: alert('danger', 'Invites are for GitHub accounts. Google is added later, from a signed-in account.') });
  }

  const role = await roleById(db, values.role);
  if (!role) { errors.role = 'Choose a role.'; return invalid(); }

  let subject;
  let login;
  if (GITHUB_ID.test(values.subject)) {
    subject = values.subject;
    login = values.login.replace(/^@/, '') || null;
  } else if (values.login) {
    const found = await lookupLogin(values.login);
    if (!found) {
      errors.login = `That GitHub username was not found. Paste its numeric id instead: gh api users/${values.login.replace(/^@/, '')} --jq .id`;
      return invalid();
    }
    subject = found.id;
    login = found.login;
  } else {
    errors.login = 'Enter a GitHub username.';
    return invalid();
  }
  const name = `@${login || subject}`;
  // RFC-0002 2.5: refused if the id already has an open invite or a sign-in method.
  const [taken, open] = await Promise.all([
    db.prepare("SELECT 1 AS x FROM identities WHERE provider = 'github' AND subject = ?").bind(subject).first(),
    db.prepare('SELECT 1 AS x FROM invites WHERE subject = ? AND redeemed_at IS NULL AND revoked_at IS NULL AND expires_at > ?')
      .bind(subject, now).first(),
  ]);
  if (taken) { errors.login = `${name} already has a SyberLabs account.`; return invalid(); }
  if (open) { errors.login = `${name} already has an open invite.`; return invalid(); }

  // Every invite has one confirm page: the login and id, plus the admin warning for an invite to admin.
  const privileged = role.is_system === 1;
  if (!confirmed(ctx)) {
    return confirmPage(ctx, {
      title: 'Create invite',
      lines: [`<strong>Confirm.</strong> ${actingAs(ctx.user)} are inviting ${esc(`@${login || '?'}, GitHub id ${subject}`)} as <strong>${esc(role.name)}</strong>.`,
        ...(privileged ? [esc(ADMIN_LINE)] : [])],
      action: '/admin/people/invite',
      fields: { role: role.id, subject, login },
      submitLabel: `Invite ${name}`,
    });
  }

  const id = newId();
  await db.batch([
    db.prepare(`INSERT INTO invites (id, role_id, subject, login_hint, invited_by, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(id, role.id, subject, login, user.id, now, now + INVITE_TTL_MS),
    auditStmt(db, {
      at: now, actor: user.id, action: 'invite.create', targetType: 'invite', targetId: id, request: ctx.request,
      detail: { provider: 'github', role: role.id },
    }),
  ]);
  const notice = alert('success', `<p>Invite created for @${esc(login || '?')} (id ${esc(subject)}) as ${esc(role.name)}. Send them ${esc(env.ORIGIN)}/admin/ and they can sign in with GitHub. The invite works for 7 days.</p>`);
  return renderPeople(ctx, { notice });
}

export async function revokeInvite(ctx) {
  const { env, form, now, user } = ctx;
  const db = env.DB;
  const id = String(form.get('invite') || '');
  const [res] = await db.batch([
    db.prepare(`UPDATE invites SET revoked_at = ? WHERE id = ? AND redeemed_at IS NULL AND revoked_at IS NULL`).bind(now, id),
    auditStmt(db, { at: now, actor: user.id, action: 'invite.revoke', targetType: 'invite', targetId: id, request: ctx.request,
      when: ['EXISTS (SELECT 1 FROM invites WHERE id = ? AND revoked_at = ?)', id, now] }),
  ]);
  if (res.meta.changes !== 1) return renderPeople(ctx, { status: 409, notice: alert('warning', 'That invite was already used or revoked.') });
  return done('invite_revoked');
}

// ---- roles on people ---------------------------------------------------------------------------

async function personAndRole(ctx) {
  const db = ctx.env.DB;
  const [target, role] = await Promise.all([userById(db, ctx.form.get('user')), roleById(db, ctx.form.get('role'))]);
  return { target, role };
}

export async function grantRole(ctx) {
  const { env, now, user } = ctx;
  const db = env.DB;
  const { target, role } = await personAndRole(ctx);
  if (!target || !role) return renderPeople(ctx, { status: 404, notice: alert('warning', 'That person or role no longer exists.') });
  if (role.is_system === 1 && !confirmed(ctx)) {
    return confirmPage(ctx, {
      title: `Grant ${role.name}`,
      lines: [`<strong>Confirm.</strong> ${actingAs(ctx.user)} are granting <strong>${esc(role.name)}</strong> to ${esc(target.display_name)}.`, esc(ADMIN_LINE)],
      action: '/admin/people/roles/grant',
      fields: { user: target.id, role: role.id },
      submitLabel: `Grant ${role.name} to ${target.display_name}`,
    });
  }
  const grantedNow = 'EXISTS (SELECT 1 FROM user_roles WHERE user_id = ? AND role_id = ? AND granted_at = ? AND granted_by IS ?)';
  await db.batch([
    db.prepare(`INSERT INTO user_roles (user_id, role_id, granted_by, granted_at) SELECT ?1, ?2, ?3, ?4
       WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = ?1 AND role_id = ?2)`).bind(target.id, role.id, user.id, now),
    auditStmt(db, { at: now, actor: user.id, action: 'role.grant', targetType: 'user', targetId: target.id, request: ctx.request,
      detail: { role: role.id }, when: [grantedNow, target.id, role.id, now, user.id] }),
  ]);
  return done('granted');
}

export async function revokeRole(ctx) {
  const { env, now, user } = ctx;
  const db = env.DB;
  const { target, role } = await personAndRole(ctx);
  if (!target || !role) return renderPeople(ctx, { status: 404, notice: alert('warning', 'That person or role no longer exists.') });
  const held = await db.prepare('SELECT 1 AS x FROM user_roles WHERE user_id = ? AND role_id = ?').bind(target.id, role.id).first();
  if (!held) return done('revoked');
  if (role.is_system === 1 && !confirmed(ctx)) {
    return confirmPage(ctx, {
      title: `Revoke ${role.name}`,
      lines: [`<strong>Confirm.</strong> ${actingAs(ctx.user)} are revoking <strong>${esc(role.name)}</strong> from ${esc(target.display_name)}.`],
      action: '/admin/people/roles/revoke',
      fields: { user: target.id, role: role.id },
      submitLabel: `Revoke ${role.name} from ${target.display_name}`,
    });
  }
  const [res] = await db.batch([
    revokeRoleStmt(db, { userId: target.id, roleId: role.id }),
    auditStmt(db, { at: now, actor: user.id, action: 'role.revoke', targetType: 'user', targetId: target.id, request: ctx.request,
      detail: { role: role.id }, when: ['NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = ? AND role_id = ?)', target.id, role.id] }),
  ]);
  if (res.meta.changes !== 1) return refuse(ctx, GUARD_COPY.lockout);
  return done('revoked');
}

// ---- accounts ----------------------------------------------------------------------------------

export async function disableUser(ctx) {
  const { env, now, user } = ctx;
  const db = env.DB;
  const target = await userById(db, ctx.form.get('user'));
  if (!target) return renderPeople(ctx, { status: 404, notice: alert('warning', 'That person no longer exists.') });
  if (target.id === user.id) return refuse(ctx, GUARD_COPY.self);
  if (target.disabled_at) return done('disabled');
  if (!confirmed(ctx)) {
    return confirmPage(ctx, {
      title: `Turn off ${target.display_name}`,
      lines: [`<strong>Confirm.</strong> ${actingAs(ctx.user)} are turning off ${esc(target.display_name)}'s account. Their sessions end now and their open invites are revoked.`],
      action: '/admin/people/disable',
      fields: { user: target.id },
      submitLabel: `Turn off ${target.display_name}`,
    });
  }
  const [res] = await db.batch(disableUserStmts(db, { userId: target.id, actorId: user.id, now, request: ctx.request }));
  if (res.meta.changes !== 1) return refuse(ctx, GUARD_COPY.lockout);
  return done('disabled');
}

export async function enableUser(ctx) {
  const { env, now, user } = ctx;
  const db = env.DB;
  const target = await userById(db, ctx.form.get('user'));
  if (!target) return renderPeople(ctx, { status: 404, notice: alert('warning', 'That person no longer exists.') });
  if (!target.disabled_at) return done('enabled');
  // Turning admin back on restores full authority, so it confirms first (RFC-0002 2.4, 8.2 round 3).
  const admin = await db.prepare("SELECT 1 AS x FROM user_roles WHERE user_id = ? AND role_id = 'role_admin'").bind(target.id).first();
  if (admin && !confirmed(ctx)) {
    return confirmPage(ctx, {
      title: `Turn on ${target.display_name}`,
      lines: [`<strong>Confirm.</strong> ${actingAs(ctx.user)} are turning on ${esc(target.display_name)}, who holds admin.`, esc(ADMIN_LINE)],
      action: '/admin/people/enable',
      fields: { user: target.id },
      submitLabel: `Turn on ${target.display_name}`,
    });
  }
  await db.batch([
    db.prepare('UPDATE users SET disabled_at = NULL WHERE id = ? AND disabled_at = ?').bind(target.id, target.disabled_at),
    auditStmt(db, { at: now, actor: user.id, action: 'user.enable', targetType: 'user', targetId: target.id, request: ctx.request,
      when: ['EXISTS (SELECT 1 FROM users WHERE id = ? AND disabled_at IS NULL)', target.id] }),
  ]);
  return done('enabled');
}

export async function revokeUserSessions(ctx) {
  const { env, now, user } = ctx;
  const db = env.DB;
  const target = await userById(db, ctx.form.get('user'));
  if (!target) return renderPeople(ctx, { status: 404, notice: alert('warning', 'That person no longer exists.') });
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(target.id),
    auditStmt(db, { at: now, actor: user.id, action: 'session.revoke', targetType: 'user', targetId: target.id, request: ctx.request }),
  ]);
  return done('sessions');
}

export async function removeIdentity(ctx) {
  const { env, now, user } = ctx;
  const db = env.DB;
  const ident = await db.prepare(`SELECT i.id, i.user_id, i.provider, i.login, i.email, u.display_name
      FROM identities i JOIN users u ON u.id = i.user_id WHERE i.id = ?`).bind(String(ctx.form.get('identity') || '')).first();
  if (!ident) return renderPeople(ctx, { status: 404, notice: alert('warning', 'That sign-in method no longer exists.') });
  if (!confirmed(ctx)) {
    return confirmPage(ctx, {
      title: 'Remove sign-in method',
      lines: [`<strong>Confirm.</strong> ${actingAs(ctx.user)} are removing ${esc(methodLabel(ident))} from ${esc(ident.display_name)}'s account. Sessions started with it end now.`],
      action: '/admin/people/identity/remove',
      fields: { identity: ident.id },
      submitLabel: `Remove ${providerLabel(ident.provider)} from ${ident.display_name}`,
    });
  }
  const [res] = await db.batch([
    removeIdentityStmt(db, { identityId: ident.id, userId: ident.user_id }),
    auditStmt(db, { at: now, actor: user.id, action: 'identity.remove', targetType: 'user', targetId: ident.user_id, request: ctx.request,
      detail: { identity: ident.id, provider: ident.provider }, when: ['NOT EXISTS (SELECT 1 FROM identities WHERE id = ?)', ident.id] }),
  ]);
  if (res.meta.changes !== 1) return refuse(ctx, GUARD_COPY.lastMethod);
  return done('removed');
}
