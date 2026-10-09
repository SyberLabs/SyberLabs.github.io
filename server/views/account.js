// /admin/account (RFC-0002 2.6, 3.5): your sign-in methods, this session's start and end, and
// Sign out everywhere. Plus `me`: who the session is, as JSON.
import { esc, html, json } from '../http.js';
import { page, head, alert, time, utc, duration, postButton, providerLabel } from './layout.js';

const methodName = m => (m.provider === 'github' ? (m.login ? `@${m.login}` : 'GitHub account') : (m.email || 'Google account'));

export async function accountPage(ctx) {
  const db = ctx.env.DB;
  const methods = await db.prepare('SELECT id, provider, login, email, created_at FROM identities WHERE user_id = ? ORDER BY created_at')
    .bind(ctx.user.id).all();

  const q = ctx.url.searchParams;
  const notices = [];
  const added = q.get('added');
  if (added === 'google' || added === 'github') {
    notices.push(alert('success', `${esc(providerLabel(added))} is added. You can now sign in with ${methods.results.map(m => esc(providerLabel(m.provider))).filter((p, i, a) => a.indexOf(p) === i).join(' or ')}.`));
  }

  const rows = methods.results.map(m => `<li class="staff-method">
      <span class="staff-method__provider">${esc(providerLabel(m.provider))}</span>
      <span>${esc(methodName(m))}${m.id === ctx.user.identityId ? ' <span class="sy-small">(this session)</span>' : ''}</span>
      <span class="sy-small">Added ${time(m.created_at)}</span>
    </li>`).join('');

  const expires = ctx.user.expiresAt;
  const started = ctx.user.createdAt; // loadSession carries it (CONTRACT.md, Contract changes)
  const endTime = utc(expires).slice(11); // "02:02 UTC"
  const sessionLine = `${started != null ? `This session started at ${time(started)} and ends` : 'This session ends'} at <time datetime="${new Date(expires).toISOString()}">${endTime}</time> (in ${duration(expires - ctx.now)}).`;

  const body = `${head('Account', `${ctx.user.displayName}.`)}
  ${notices.join('\n  ')}
  <section class="staff-section" aria-labelledby="methods-h">
    <h2 class="sy-heading" id="methods-h">Sign-in methods</h2>
    <ul class="staff-methods">${rows}</ul>
  </section>
  <section class="staff-section" aria-labelledby="session-h">
    <h2 class="sy-heading" id="session-h">This session</h2>
    <p class="sy-body">${sessionLine}</p>
    <p class="sy-small">Sign out everywhere ends your sessions in every browser and on every device.</p>
    ${postButton('/admin/account/signout-everywhere', 'Sign out everywhere')}
  </section>`;
  return html(page(ctx, { title: 'Account', body, section: 'account' }));
}

// Who the session is, for scripts and future dashboards.
export function me(ctx) {
  return json({ name: ctx.user.displayName, provider: ctx.user.provider, permissions: [...ctx.perms].sort() });
}
