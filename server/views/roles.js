// /admin/roles: roles, their keys and holders; with id:roles.manage, create or edit a role.
// admin is the system role and is never edited here. Custom roles take non-privileged keys only
// (RFC-0002 2.4; a migration trigger refuses the rest), and only admin holds id:roles.manage.
import { esc, html, redirect } from '../http.js';
import { newId } from '../crypto.js';
import { CATALOGUE } from '../permissions.js';
import { GUARD_COPY, auditStmt, can, displayNames, removeRolePermStmt } from '../authz.js';
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

// Non-privileged keys, one <fieldset><legend> per namespace ("site", "id"), as RFC-0002 2.6 asks.
const NAMESPACES = { site: 'Site', id: 'People and access' };

function keyBoxes(selected) {
  const groups = {};
  for (const [key, meta] of Object.entries(CATALOGUE)) {
    if (meta.privileged) continue;
    (groups[key.split(':')[0]] ||= []).push([key, meta.label]);
  }
  return `<div class="staff-keys" id="f-perms">${Object.entries(groups).map(([ns, keys]) => `
      <fieldset class="staff-fieldset"><legend class="sy-field__label">${esc(NAMESPACES[ns] || ns)}</legend>${keys.map(([key, label]) => `
        <label class="staff-check"><input type="checkbox" name="perm" value="${esc(key)}"${selected.has(key) ? ' checked' : ''}> <span>${esc(label)} <code>${esc(key)}</code></span></label>`).join('')}
      </fieldset>`).join('')}
    </div>`;
}

export const NAME_COPY = 'Role names are 2 to 40 lowercase letters, digits or hyphens, starting with a letter, like editor.';

function roleForm(editing, values, errors) {
  const selected = new Set(values.perms || (editing ? editing.keys : []));
  return `<section class="staff-section" aria-labelledby="role-h">
    <h2 id="role-h" class="sy-h3">${editing ? `Edit ${esc(editing.name)}` : 'Create a role'}</h2>
    <form method="post" action="/admin/roles" class="staff-form" novalidate>
      ${editing ? `<input type="hidden" name="id" value="${esc(editing.id)}">` : ''}
      ${field({ name: 'name', label: LABELS.name, value: values.name ?? (editing ? editing.name : ''), error: errors.name, hint: NAME_COPY,
        attrs: ' required maxlength="40" autocomplete="off" spellcheck="false"' })}
      ${field({ name: 'description', label: LABELS.description, value: values.description ?? (editing ? editing.description : ''), error: errors.description, attrs: ' maxlength="200"' })}
      ${keyBoxes(selected)}
      <div class="staff-actions">
        <button class="sy-btn sy-btn--solid" type="submit">${editing ? 'Save role' : 'Create role'}</button>
        ${editing ? '<a class="sy-btn sy-btn--ghost" href="/admin/roles">Cancel</a>' : ''}
      </div>
    </form>
  </section>`;
}

// A list of roles, each with its description, keys and holders (RFC-0002 2.6; no tables on staff pages).
export async function renderRoles(ctx, { status = 200, notice = '', values = {}, errors = {}, editId } = {}) {
  const roles = await loadRoles(ctx.env.DB);
  const manage = can(ctx, 'id:roles.manage');
  const editing = manage ? roles.find(r => r.id === (editId ?? ctx.url.searchParams.get('edit')) && r.is_system !== 1) : null;
  const ok = ctx.url.searchParams.get('ok') === 'saved' ? alert('success', 'Role saved.') : '';
  const body = `${head('Staff', 'Roles.')}
  ${notice || ok}
  ${errorSummary(errors, LABELS)}
  <ul class="staff-roles">${roles.map(r => `<li class="staff-role">
      <h3 class="sy-h3 staff-role__name">${esc(r.name)}${r.is_system === 1 ? ' <span class="sy-badge">System role</span>' : ''}</h3>
      ${r.description ? `<p class="sy-small">${esc(r.description)}</p>` : ''}
      <dl class="staff-dl">
        <div><dt>Permissions</dt><dd>${r.keys.map(k => esc(CATALOGUE[k] ? CATALOGUE[k].label : k)).join('; ') || 'none'}</dd></div>
        <div><dt>Holders</dt><dd>${r.holders.length ? esc(r.holders.join(', ')) : 'nobody'}</dd></div>
      </dl>
      ${manage && r.is_system !== 1 ? `<a class="sy-btn sy-btn--line staff-person__btn" href="/admin/roles?edit=${esc(r.id)}#role-h">Edit ${esc(r.name)}</a>` : ''}
    </li>`).join('')}</ul>
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

  const errors = {};
  if (!NAME.test(name)) errors.name = NAME_COPY;
  if (description.length > 200) errors.description = 'Descriptions are up to 200 characters.';
  if (!errors.name) {
    const clash = await db.prepare('SELECT id FROM roles WHERE name = ? AND id <> ?').bind(name, id).first();
    if (clash) errors.name = `There is already a role called ${name}.`;
  }
  if (Object.keys(errors).length) return renderRoles(ctx, { status: 422, values, errors, editId: id || undefined });

  const before = existing ? (await db.prepare('SELECT permission_key FROM role_permissions WHERE role_id = ?').bind(id).all())
    .results.map(r => r.permission_key) : [];
  const added = wanted.filter(k => !before.includes(k));
  const removed = before.filter(k => !wanted.includes(k));

  const roleId = existing ? existing.id : `role_${newId().slice(0, 16)}`;
  const stmts = existing
    ? [db.prepare('UPDATE roles SET name = ?, description = ? WHERE id = ? AND is_system = 0').bind(name, description, roleId)]
    : [db.prepare('INSERT INTO roles (id, name, description, is_system, created_at) VALUES (?, ?, ?, 0, ?)')
      .bind(roleId, name, description, now)];
  for (const k of removed) stmts.push(removeRolePermStmt(db, { roleId, key: k }));
  for (const k of added) stmts.push(db.prepare('INSERT INTO role_permissions (role_id, permission_key) VALUES (?, ?)').bind(roleId, k));
  stmts.push(auditStmt(db, {
    at: now, actor: user.id, action: existing ? 'role.perms' : 'role.create', targetType: 'role', targetId: roleId,
    request: ctx.request, detail: { name, added, removed },
  }));
  try {
    await db.batch(stmts);
  } catch (err) {
    // A name taken between the check above and this write: the same 422, never the 503 (RFC-0002 3.4).
    if (!/UNIQUE/.test(String(err && err.message))) throw err;
    errors.name = `There is already a role called ${name}.`;
    return renderRoles(ctx, { status: 422, values, errors, editId: id || undefined });
  }
  return redirect('/admin/roles?ok=saved');
}
