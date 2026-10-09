// /admin/account (RFC-0002 2.6, 3.3, 3.5): your sign-in methods with the date each was added, when this
// session ends and started, Sign out everywhere, and the "Don't recognise one of these?" line. A user who
// holds no keys at all sees guidance to their personal workspace first. While Google is on (Packet 5): Add Google, or
// Continue with GitHub first when the session is over 10 minutes old, and the Add Google outcomes.
import { esc, html } from '../http.js';
import { ADD_GOOGLE_FRESH_MS, googleEnabled } from '../oauth.js';
import { page, head, alert, hidden, time, utc, duration, postButton, providerLabel, identityName } from './layout.js';
import { GITHUB_MARK } from './chrome.js';
import { contact } from './signin.js';

// RFC-0002 3.4: the codes the Add Google callback sends back here (oauth.js), with the account page's copy.
export const ADD_GOOGLE_COPY = {
  cancelled: ['neutral', () => 'Adding Google was cancelled.'],
  expired: ['warning', () => "Adding Google couldn't be finished. Try again."],
  provider: ['danger', () => `Google didn't finish the sign-in. Try again, or ${contact('email SyberLabs')}.`],
  google_taken: ['warning', () => 'That Google account is already on another SyberLabs account. Choose a different one.'],
};
export const GOOGLE_ADDED = 'Google is added. You can now sign in with GitHub or Google.';

// The notice from ?added=google or ?e=. "added" shows only when Google really is among the methods, so a
// crafted link cannot show it (RFC-0002 3.3).
function addGoogleNotice(q, hasGoogle) {
  if (q.get('added') === 'google') return hasGoogle ? alert('success', esc(GOOGLE_ADDED)) : '';
  const code = q.get('e') || '';
  if (!Object.hasOwn(ADD_GOOGLE_COPY, code)) return '';
  const [kind, copy] = ADD_GOOGLE_COPY[code];
  return alert(kind, copy());
}

// RFC-0002 3.5: "Google: not added. [Add Google]", or, for a session over 10 minutes old, a fresh sign-in first.
// That button is a POST to /auth/start/<this session's provider> with next=/admin/account.
function addGoogleBlock(ctx) {
  if (ctx.now - ctx.user.createdAt < ADD_GOOGLE_FRESH_MS) {
    return `<div class="staff-add-google">
      <p class="sy-body">Google: not added.</p>
      ${postButton('/admin/account/add-google', 'Add Google')}
    </div>`;
  }
  const p = ctx.user.provider;
  const mark = p === 'github' ? GITHUB_MARK : '';
  return `<div class="staff-add-google">
      <p class="sy-body">To add Google, continue with ${esc(providerLabel(p))} again first. This keeps the step safe if someone else has your session.</p>
      <form method="post" action="/auth/start/${esc(p)}" class="staff-inline">${hidden({ next: '/admin/account' })}<button class="sy-btn sy-btn--solid" type="submit">${mark}<span>Continue with ${esc(providerLabel(p))}</span></button></form>
    </div>`;
}

export async function accountPage(ctx) {
  const db = ctx.env.DB;
  const methods = await db.prepare('SELECT id, provider, subject, login, email, created_at FROM identities WHERE user_id = ? ORDER BY created_at, id')
    .bind(ctx.user.id).all();
  const google = googleEnabled(ctx.env);
  const hasGoogle = methods.results.some(m => m.provider === 'google');

  const rows = methods.results.map(m => `<li class="staff-method">
      <span class="staff-method__provider">${esc(providerLabel(m.provider))}</span>
      <span>${esc(identityName(m))}${m.id === ctx.user.identityId ? ' <span class="sy-small">(this session)</span>' : ''}</span>
      <span class="sy-small">Added ${time(m.created_at)}</span>
    </li>`).join('');

  const expires = ctx.user.expiresAt;
  const started = ctx.user.createdAt;
  // "This session ends in 11 h 40 min, at 02:02 UTC. It started at 2026-10-09 14:02 UTC." (RFC-0002 3.5)
  const sessionLine = `This session ends in ${duration(expires - ctx.now)}, at <time datetime="${new Date(expires).toISOString()}">${utc(expires).slice(11)}</time>.${
    started != null ? ` It started at ${time(started)}.` : ''}`;
  // Personal pages are available to every session; roles unlock team tools.
  const empty = ctx.perms.size === 0
    ? `<aside class="account-guidance"><p>Your account is ready. Open your <a href="/admin/">launchpad</a> or view your <a href="/admin/saves">saved things</a>. If you need team tools, ask an admin for a role: ${contact('Email SyberLabs')}.</p></aside>`
    : '';

  const body = `${head('Your workspace', 'Your account.')}
  ${google ? addGoogleNotice(ctx.url.searchParams, hasGoogle) : ''}
  <section class="staff-section account-panel" aria-labelledby="methods-h">
    <h2 class="sy-heading" id="methods-h">Sign-in methods</h2>
    <ul class="staff-methods">${rows}</ul>
    ${google && !hasGoogle ? addGoogleBlock(ctx) : ''}
    <p class="sy-small">Don't recognise one of these? Press Sign out everywhere, then ${contact('email SyberLabs')} and we'll remove it.</p>
  </section>
  <section class="staff-section account-panel" aria-labelledby="session-h">
    <h2 class="sy-heading" id="session-h">This session</h2>
    <p class="sy-body">${sessionLine}</p>
    <div class="account-signout"><p class="sy-small">Sign out everywhere ends this session and every other one, in every browser and on every device.</p>
    ${postButton('/admin/account/signout-everywhere', 'Sign out everywhere')}</div>
  </section>
  ${empty}`;
  return html(page(ctx, { title: 'Account', body, section: 'account', compactFooter: true }));
}
