// 403 pages (RFC-0002 3.4): signed in without the route's key, and an identity nobody invited.
// Both return HTML strings; app.js and oauth.js set the status. The error pages live in error.js and are
// re-exported here, where the contract names them.
import { esc } from '../http.js';
import { CATALOGUE } from '../permissions.js';
import { CONTACT } from '../../projects/site-data.js';
import { page, head, hidden, providerLabel } from './layout.js';

export { notFoundHtml, errorHtml, unavailableHtml, CSRF_COPY } from './error.js';

// "You're signed in as Ada (GitHub). This page needs See staff accounts."
export function forbiddenHtml(ctx, key) {
  const label = CATALOGUE[key]?.label || 'a permission you do not have';
  // Back to the page that was refused once the other account signs in (GETs only; a POST goes home).
  const next = ctx.request?.method === 'GET' ? ctx.url.pathname + ctx.url.search : '/admin/';
  const body = `${head('Admin', 'Not open to you.')}
  <p class="sy-body-lg staff-lede">You're signed in as ${esc(ctx.user.displayName)} (${esc(providerLabel(ctx.user.provider))}). This page needs <em>${esc(label)}</em>.</p>
  <div class="staff-actions">
    <a class="sy-btn sy-btn--line" href="/admin/">Back to admin home</a>
    <form method="post" action="/auth/signout" class="staff-inline">${hidden([['next', next], ['switch', '1']])}<button class="sy-btn sy-btn--ghost" type="submit">Sign out and switch account</button></form>
  </div>`;
  return page(ctx, { title: 'Not open to you', body });
}

// Cases c and d of the callback. invite and next come from the state cookie so "Try another account"
// keeps them; switch=1 (and the contract's prompt=select_account) makes the provider show its picker.
export function deniedHtml(ctx, { provider, name, emailMatch = false, invite = '', next = '' } = {}) {
  const p = providerLabel(provider);
  const who = provider === 'github' ? `@${name}` : name;
  const fields = hidden([['invite', invite], ['next', next], ['switch', '1'], ['prompt', 'select_account']]);
  const body = `${head('Staff / SyberLabs', 'No access.')}
  <p class="sy-body-lg staff-lede"><strong>This ${esc(p)} account${name ? ` (${esc(who)})` : ''} doesn't have access to SyberLabs.</strong></p>
  <p class="sy-body">SyberLabs staff sign-in is by invite only.</p>${emailMatch ? `
  <p class="sy-body">Already have access another way? Sign in with that, or ask an admin to add this sign-in method.</p>` : ''}
  <div class="staff-actions">
    <form method="post" action="/auth/start/${esc(provider)}" class="staff-inline">${fields}<button class="sy-btn sy-btn--line" type="submit">Try another account</button></form>
    <a class="sy-btn sy-btn--ghost" href="${esc(CONTACT)}">Ask for access</a>
  </div>`;
  return page(ctx, { title: 'No access · Sign in', body, admin: false });
}
