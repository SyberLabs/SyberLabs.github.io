// /admin/audit (RFC-0002 2.6): the last 200 events, newest first, as an <ol> of one-line sentences:
// "2026-10-09 14:02 UTC, @sdcarlson turned off @x." Actor and target render from the identity join as
// @login, else "GitHub id N", else "a removed account"; a hex id is never printed. Read only.
import { esc, html } from '../http.js';
import { displayNames } from '../authz.js';
import { page, head, time, PROVIDER_LABEL } from './layout.js';

const LIMIT = 200;

// Every action the app writes (and session.revoke, which older rows hold), with the verb phrase the page
// shows: "turn off", never "disable" (RFC-0002 3.5). t = the target's name, role = a role name, title = an
// entry title, all already escaped; provider = "Google" (a fixed label) for identity.add.
export const ACTION_SENTENCES = {
  'signin.ok': () => 'signed in',
  'user.add': v => `added ${v.t}${v.role ? ` as ${v.role}` : ''}`,
  bootstrap: () => 'bootstrapped the first accounts',
  'role.grant': v => `granted ${v.role || 'a role'} to ${v.t}`,
  'role.revoke': v => `revoked ${v.role || 'a role'} from ${v.t}`,
  'role.create': v => `created the role ${v.role || v.name || ''}`.trim(),
  'role.update': v => `changed the role ${v.role || v.name || ''}`.trim(),
  'role.perms': v => `changed the permissions of the role ${v.role || v.name || ''}`.trim(),
  'user.disable': v => `turned off ${v.t}`,
  'user.enable': v => `turned on ${v.t}`,
  'identity.add': v => `added ${v.provider || 'a sign-in method'} to their sign-in methods`,
  'identity.remove': v => `removed a sign-in method from ${v.t}`,
  'session.revoke': v => `ended the sessions of ${v.t}`,
  'session.revoke_all': () => 'signed out everywhere',
  'changes.create': v => `added the What changed entry ${v.title}`,
  'changes.update': v => `edited the What changed entry ${v.title}`,
  'changes.delete': v => `deleted the What changed entry ${v.title}`,
};

const parse = raw => { try { const d = JSON.parse(raw || '{}'); return d && typeof d === 'object' ? d : {}; } catch { return {}; } };

export async function auditPage(ctx) {
  const db = ctx.env.DB;
  const [{ results }, roles] = await Promise.all([
    db.prepare(`SELECT id, at, actor_user_id, action, target_type, target_id, detail_json FROM audit_events
      ORDER BY at DESC, id DESC LIMIT ${LIMIT}`).all(),
    db.prepare('SELECT id, name FROM roles').all(),
  ]);
  const roleName = new Map(roles.results.map(r => [r.id, r.name]));

  const ids = new Set();
  for (const r of results) {
    if (r.actor_user_id) ids.add(r.actor_user_id);
    if (r.target_type === 'user' && r.target_id) ids.add(r.target_id);
  }
  const names = ids.size ? await displayNames(db, [...ids]) : new Map();
  // A NULL actor is Seth's terminal: bootstrap or break-glass (RFC-0002 8.1).
  const who = id => (id ? names.get(id) || 'a removed account' : 'the terminal');

  const sentence = r => {
    const d = parse(r.detail_json);
    const role = d.role ? roleName.get(d.role) || 'a removed role' : d.name || '';
    const entryTitle = (d.before && d.before.title) || d.title;
    const v = {
      t: esc(r.target_type === 'user' ? who(r.target_id) : 'a removed account'),
      role: esc(role),
      name: esc(d.name || ''),
      provider: Object.hasOwn(PROVIDER_LABEL, d.provider || '') ? PROVIDER_LABEL[d.provider] : '',
      title: entryTitle ? `"${esc(entryTitle)}"` : '',
    };
    const phrase = Object.hasOwn(ACTION_SENTENCES, r.action) ? ACTION_SENTENCES[r.action](v) : `recorded ${esc(r.action)}`;
    return `<li>${time(r.at)}, ${esc(who(r.actor_user_id))} ${phrase}.</li>`;
  };

  const list = results.length
    ? `<ol class="staff-audit">${results.map(sentence).join('')}</ol>`
    : '<div class="sy-empty staff-empty"><p>Nothing recorded yet.</p></div>';

  const body = `${head('Staff', 'Audit log.')}
  <p class="sy-small staff-lede">The last ${LIMIT} events, newest first. The log is append-only.</p>
  ${list}`;
  return html(page(ctx, { title: 'Audit', body, section: 'audit' }));
}
