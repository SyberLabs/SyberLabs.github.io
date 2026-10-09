// /admin/audit (RFC-0002 2.6): the last 200 events, newest first, filterable by action. Read only.
import { esc, html } from '../http.js';
import { displayNames } from '../authz.js';
import { page, head, time } from './layout.js';

const LIMIT = 200;

// Every action the app writes, with the label the page shows ("turn off", never "disable": RFC-0002 3.5).
export const ACTION_LABELS = {
  'signin.ok': 'Signed in',
  'invite.create': 'Invite created',
  'invite.revoke': 'Invite revoked',
  'invite.redeem': 'Invite redeemed',
  bootstrap: 'Bootstrap',
  'role.grant': 'Role granted',
  'role.revoke': 'Role revoked',
  'role.create': 'Role created',
  'role.update': 'Role changed',
  'role.perms': 'Role permissions changed',
  'user.disable': 'Turned off',
  'user.enable': 'Turned on',
  'identity.remove': 'Sign-in method removed',
  'session.revoke': 'Session ended',
  'session.revoke_all': 'Sessions ended',
  'changes.create': 'Entry added',
  'changes.update': 'Entry edited',
  'changes.delete': 'Entry deleted',
};

// Detail JSON shown as text, shortened; it never holds tokens or secrets (the writers' rule).
function detailText(raw) {
  if (!raw || raw === '{}') return '';
  return raw.length > 300 ? `${raw.slice(0, 299)}…` : raw;
}

export async function auditPage(ctx) {
  const db = ctx.env.DB;
  const asked = ctx.url.searchParams.get('action');
  const action = Object.hasOwn(ACTION_LABELS, asked || '') ? asked : '';
  const sql = `SELECT id, at, actor_user_id, action, target_type, target_id, detail_json, ip_prefix FROM audit_events
    ${action ? 'WHERE action = ?' : ''} ORDER BY at DESC, id DESC LIMIT ${LIMIT}`;
  const stmt = db.prepare(sql);
  const { results } = await (action ? stmt.bind(action) : stmt).all();

  const ids = new Set();
  for (const r of results) {
    if (r.actor_user_id) ids.add(r.actor_user_id);
    if (r.target_type === 'user' && r.target_id) ids.add(r.target_id);
  }
  const names = ids.size ? await displayNames(db, [...ids]) : new Map();
  const who = id => (id ? esc(names.get(id) || 'removed user') : '<span class="sy-small">system</span>');
  const target = r => {
    if (!r.target_type) return '';
    if (r.target_type === 'user') return `user ${who(r.target_id)}`;
    return `${esc(r.target_type)} <code>${esc((r.target_id || '').slice(0, 12))}</code>`;
  };

  const filter = `<form method="get" action="/admin/audit" class="staff-filter">
    <div class="sy-field staff-field">
      <label class="sy-field__label" for="f-action">Action</label>
      <select class="sy-input" id="f-action" name="action"><option value="">Every action</option>${Object.entries(ACTION_LABELS).map(([k, l]) =>
        `<option value="${esc(k)}"${k === action ? ' selected' : ''}>${esc(l)} (${esc(k)})</option>`).join('')}</select>
    </div>
    <button class="sy-btn sy-btn--line" type="submit">Filter</button>
  </form>`;

  const table = results.length ? `<div class="table-wrap"><table class="staff-table">
    <caption class="sy-visually-hidden">${action ? `Events: ${esc(ACTION_LABELS[action])}` : 'Every event'}, newest first</caption>
    <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Action</th><th scope="col">Target</th><th scope="col">Detail</th><th scope="col">IP prefix</th></tr></thead>
    <tbody>${results.map(r => `<tr>
      <td>${time(r.at)}</td>
      <td>${who(r.actor_user_id)}</td>
      <td>${esc(ACTION_LABELS[r.action] || r.action)}</td>
      <td>${target(r)}</td>
      <td class="staff-table__detail">${esc(detailText(r.detail_json))}</td>
      <td>${esc(r.ip_prefix || '')}</td>
    </tr>`).join('')}</tbody>
  </table></div>` : `<div class="sy-empty staff-empty"><p>${action ? 'No events of this kind.' : 'Nothing recorded yet.'}</p></div>`;

  const body = `${head('Admin / Audit', 'Audit log.')}
  <p class="sy-small staff-lede">The last ${LIMIT} events, newest first. The log is append-only.</p>
  ${filter}
  ${table}`;
  return html(page(ctx, { title: 'Audit', body, section: 'audit' }));
}
