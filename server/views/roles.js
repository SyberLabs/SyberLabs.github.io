// /admin/roles: roles, their keys and holders; with id:roles.manage, create or edit a role.
// admin is the system role and is never edited here. Custom roles take non-privileged keys only
// (RFC-0002 2.4), and never a key the editor lacks (up rule).
import { esc, html, redirect } from '../http.js';
import { newId } from '../crypto.js';
import { CATALOGUE } from '../permissions.js';
import { GUARD_COPY, MANAGE_KEYS, auditStmt, can, displayNames, removeRolePermStmt } from '../authz.js';
import { alert, errorSummary, field, fixPrefix, head, page } from './layout.js';

const NAME = /^[a-z][a-z0-9-]{1,39}$/;
const LABELS = { name: 'Name', description: 'Description', perms: 'Permissions' };

async function loadRoles(db) {
  const [roles, perms, holders] = await Promise.all([
    db.prepare('SELECT id, name, description, is_system FROM roles ORDER BY is_system DESC, name').all(),
    db.prepare('SELECT role_id, permission_key FROM role_permissions ORDER BY permission_key').all(),
    db.prepare('SELECT role_id, user_id FROM user_roles').all(),
  ]);
  const names = await displayNames(db, holders.results.map(h => h.user_id));
  return roles.results.map(r => ({
    ...r,
    keys: perms.results.filter(p => p.role_id === r.id).map(p => p.permission_key),
    holders: holders.results.filter(h => h.role_id === r.id).map(h => names.get(h.user_id)).filter(Boolean).sort(),
  }));
}

// Non-privileged keys, grouped by namespace ("site", "id").
function keyBoxes(selected, errors) {
  const groups = {};
  for (const [key, meta] of Object.entries(CATALOGUE)) {
    if (meta.privileged) continue;
    (groups[key.split(':')[0]] ||= []).push([key, meta.label]);
  }
  return `<fieldset class="staff-field${errors.perms ? ' is-invalid' : ''}" id="f-perms"><legend class="sy-field__label">${LABELS.perms}</legend>
    ${Object.entries(groups).map(([ns, keys]) => `<p class="sy-eyebrow">${esc(ns)}</p>${keys.map(([key, label]) => `
      <label class="staff-check"><input type="checkbox" name="perm" value="${esc(key)}"${selected.has(key) ? ' checked' : ''}> ${esc(label)} <code>${esc(key)}</code></label>`).join('')}`).join('')}
    ${errors.perms ? `<p class="sy-field__error" id="f-perms-err">${esc(errors.perms)}</p>` : ''}
  </fieldset>`;
}

function roleForm(editing, values, errors) {
  const selected = new Set(values.perms || (editing ? editing.keys : []));
  return `<section class="staff-section" aria-labelledby="role-h">
    <h2 id="role-h" class="sy-h3">${editing ? `Edit ${esc(editing.name)}` : 'Create a role'}</h2>
    <form method="post" action="/admin/roles" class="staff-form" novalidate>
      ${editing ? `<input type="hidden" name="id" value="${esc(editing.id)}">` : ''}
      ${field({ name: 'name', label: LABELS.name, value: values.name ?? (editing ? editing.name : ''), error: errors.name, hint: '2 to 40 characters: a-z, 0-9 and -, starting with a letter.' })}
      ${field({ name: 'description', label: LABELS.description, value: values.description ?? (editing ? editing.description : ''), error: errors.description })}
      ${keyBoxes(selected, errors)}
      <button class="sy-btn sy-btn--primary" type="submit">${editing ? 'Save role' : 'Create role'}</button>
      ${editing ? '<a class="sy-btn sy-btn--ghost" href="/admin/roles">Cancel</a>' : ''}
    </form>
  </section>`;
}

export async function renderRoles(ctx, { status = 200, notice = '', values = {}, errors = {}, editId } = {}) {
  const roles = await loadRoles(ctx.env.DB);
  const manage = can(ctx, 'id:roles.manage');
  const editing = manage ? roles.find(r => r.id === (editId ?? ctx.url.searchParams.get('edit')) && r.is_system !== 1) : null;
  const ok = ctx.url.searchParams.get('ok') === 'saved' ? alert('success', 'Role saved.') : '';
  const body = `${head('Admin', 'Roles.')}
  ${notice || ok}
  ${errorSummary(errors, LABELS)}
  <div class="table-wrap"><table class="staff-table">
    <thead><tr><th scope="col">Role</th><th scope="col">Permissions</th><th scope="col">Holders</th>${manage ? '<th scope="col"></th>' : ''}</tr></thead>
    <tbody>${roles.map(r => `<tr>
      <th scope="row">${esc(r.name)}${r.is_system === 1 ? ' <span class="sy-badge">System role</span>' : ''}<br><span class="sy-small">${esc(r.description)}</span></th>
      <td><ul class="staff-list">${r.keys.map(k => `<li>${esc(CATALOGUE[k] ? CATALOGUE[k].label : k)}</li>`).join('')}</ul></td>
      <td>${r.holders.length ? esc(r.holders.join(', ')) : '<span class="sy-small">nobody</span>'}</td>
      ${manage ? `<td>${r.is_system === 1 ? '' : `<a class="sy-btn sy-btn--ghost staff-btn--small" href="/admin/roles?edit=${esc(r.id)}">Edit</a>`}</td>` : ''}
    </tr>`).join('')}</tbody>
  </table></div>
  ${manage ? roleForm(editing, values, errors) : ''}`;
  return html(page(ctx, { title: `${fixPrefix(errors)}Roles`, body, section: 'roles' }), { status });
}

export const rolesPage = ctx => renderRoles(ctx);

const refuse = (ctx, copy) => renderRoles(ctx, { status: 403, notice: alert('danger', esc(copy)) });

export async function saveRole(ctx) {
  const { env, form, now, user } = ctx;
  const db = env.DB;
  const id = (form.get('id') || '').trim();
  const name = (form.get('name') || '').trim();
  const description = (form.get('description') || '').trim();
  const wanted = [...new Set(form.getAll('perm'))];
  const values = { name, description, perms: wanted };

  const existing = id ? await db.prepare('SELECT id, name, is_system FROM roles WHERE id = ?').bind(id).first() : null;
  if (id && !existing) return renderRoles(ctx, { status: 404, notice: alert('warning', 'That role no longer exists.') });
  if (existing && existing.is_system === 1) return refuse(ctx, GUARD_COPY.system);
  if (wanted.some(k => !(k in CATALOGUE))) return renderRoles(ctx, { status: 400, notice: alert('danger', 'That permission does not exist.') });
  if (wanted.some(k => CATALOGUE[k].privileged)) return refuse(ctx, GUARD_COPY.privileged); // RFC-0002 2.4
  if (wanted.some(k => !ctx.perms.has(k))) return refuse(ctx, GUARD_COPY.up);

  const errors = {};
  if (!NAME.test(name)) errors.name = '2 to 40 characters: a-z, 0-9 and -, starting with a letter.';
  if (description.length > 200) errors.description = 'Descriptions are up to 200 characters.';
  if (!errors.name) {
    const clash = await db.prepare('SELECT id FROM roles WHERE name = ? AND id <> ?').bind(name, id).first();
    if (clash) errors.name = 'Another role already has that name.';
  }
  if (Object.keys(errors).length) return renderRoles(ctx, { status: 422, values, errors, editId: id || undefined });

  const before = existing ? (await db.prepare('SELECT permission_key FROM role_permissions WHERE role_id = ?').bind(id).all())
    .results.map(r => r.permission_key) : [];
  const added = wanted.filter(k => !before.includes(k));
  const removed = before.filter(k => !wanted.includes(k));
  // A removed manage key (only on roles seeded outside this editor) must not shrink full_admins.
  if (removed.some(k => MANAGE_KEYS.includes(k))) {
    const dependent = await db.prepare(`SELECT 1 AS x WHERE NOT EXISTS (SELECT 1 FROM full_admins
      WHERE user_id NOT IN (SELECT user_id FROM user_roles WHERE role_id = ?))`).bind(id).first();
    if (dependent) return refuse(ctx, GUARD_COPY.lockout);
  }

  const roleId = existing ? existing.id : `role_${newId().slice(0, 16)}`;
  const stmts = existing
    ? [db.prepare('UPDATE roles SET name = ?, description = ? WHERE id = ? AND is_system = 0').bind(name, description, roleId)]
    : [db.prepare('INSERT INTO roles (id, name, description, is_system, created_by, created_at) VALUES (?, ?, ?, 0, ?, ?)')
      .bind(roleId, name, description, user.id, now)];
  for (const k of removed) stmts.push(removeRolePermStmt(db, { roleId, key: k }));
  for (const k of added) stmts.push(db.prepare('INSERT INTO role_permissions (role_id, permission_key) VALUES (?, ?)').bind(roleId, k));
  stmts.push(auditStmt(db, {
    at: now, actor: user.id, action: existing ? 'role.perms' : 'role.create', targetType: 'role', targetId: roleId,
    request: ctx.request, detail: { name, added, removed },
  }));
  await db.batch(stmts);
  return redirect('/admin/roles?ok=saved');
}
