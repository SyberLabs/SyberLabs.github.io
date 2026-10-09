// /admin/ (RFC-0002 2.6, 3.3): one tile per page the user's keys open, or the no-pages empty state.
import { esc, html } from '../http.js';
import { CONTACT } from '../../projects/site-data.js';
import { page, head, alert, postButton, providerLabel } from './layout.js';

const tile = (href, label, value, note) => `<li><a class="sy-card staff-tile" href="${href}">
      <span class="sy-eyebrow">${esc(label)}</span>
      <span class="staff-tile__value">${esc(value)}</span>
      <span class="sy-small">${esc(note)}</span>
    </a></li>`;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// "Welcome. You're signed in with GitHub as @name."
export function welcomeHtml(user) {
  const who = user.provider === 'github' && user.login ? `@${user.login}` : (user.email || user.displayName);
  return `Welcome. You're signed in with ${esc(providerLabel(user.provider))} as ${esc(who)}.`;
}

export async function adminHome(ctx) {
  const can = key => ctx.perms.has(key);
  const tiles = [];
  if (can('site:changes.read')) {
    const row = await ctx.env.DB.prepare('SELECT count(*) AS n, max(date) AS newest FROM change_entries').first();
    const n = Number(row?.n || 0);
    tiles.push(tile('/admin/changes', 'What changed', plural(n, 'entry', 'entries'), n ? `Newest ${row.newest}` : 'Nothing yet'));
  }
  if (can('id:users.read')) {
    tiles.push(tile('/admin/people', 'People', 'Staff accounts', 'Roles, sign-in methods, invites'));
    tiles.push(tile('/admin/roles', 'Roles', 'Roles and permissions', 'Who holds what'));
  }
  if (can('id:audit.read')) tiles.push(tile('/admin/audit', 'Audit', 'Audit log', 'The last 200 events'));

  const welcome = ctx.url.searchParams.get('welcome') === '1' ? alert('success', welcomeHtml(ctx.user)) : '';
  let content;
  if (!tiles.length) {
    // No keys at all: say so, and how to get one (RFC-0002 3.3; "an admin" keeps names out of the repo).
    content = `<div class="sy-empty staff-empty">
      <p>You're signed in, but no pages are open to you yet. Ask an admin for a role: <a href="${esc(CONTACT)}">Email SyberLabs</a>.</p>
      ${postButton('/auth/signout', 'Sign out')}
    </div>`;
  } else {
    tiles.push(tile('/admin/account', 'Account', 'Your account', 'Sign-in methods and this session'));
    content = `<ul class="staff-tiles">${tiles.join('')}</ul>`;
  }
  const body = `${head('Admin', 'Staff home.')}
  ${welcome}
  ${content}`;
  return html(page(ctx, { title: 'Admin', body, section: 'home' }));
}
