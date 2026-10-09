// 403 pages (RFC-0002 3.4): signed in without the route's key, and an identity nobody added.
// Both return HTML strings; app.js and oauth.js set the status. The error pages live in error.js and are
// re-exported here, where the contract names them.
import { esc } from '../http.js';
import { CATALOGUE } from '../permissions.js';
import { CONTACT } from '../../projects/site-data.js';
import { page, head, hidden, providerLabel, signedInAs } from './layout.js';
import { GITHUB_MARK } from './chrome.js';
import { contact } from './signin.js';

export { notFoundHtml, errorHtml, unavailableHtml, CSRF_COPY } from './error.js';

// "people who can " + the key's label with its first letter lowercased, so copy and catalogue cannot drift.
const peopleWhoCan = label => `people who can ${label.charAt(0).toLowerCase()}${label.slice(1)}`;

// "You're signed in as @sykosyber (GitHub). This page is for people who can read the audit log. Ask an admin
// for access: Email SyberLabs." ("an admin" keeps names out of the repo.)
export function forbiddenHtml(ctx, key) {
  const label = CATALOGUE[key]?.label;
  const forWhom = label ? `This page is for ${esc(peopleWhoCan(label))}.` : 'This page is not open to you.';
  // Back to the page that was refused once the other account signs in (GETs only; a POST goes home).
  const next = ctx.request?.method === 'GET' ? ctx.url.pathname + ctx.url.search : '/admin/';
  const body = `${head('Staff', 'No access.')}
  <p class="sy-body-lg staff-lede">You're signed in as ${esc(signedInAs(ctx.user))}. ${forWhom} Ask an admin for access: ${contact('Email SyberLabs')}.</p>
  <div class="staff-actions">
    <a class="sy-btn sy-btn--line" href="/admin/">Back to staff home</a>
    <form method="post" action="/auth/signout" class="staff-inline">${hidden([['next', next], ['switch', '1']])}<button class="sy-btn sy-btn--ghost" type="submit">Sign out and switch account</button></form>
  </div>`;
  return page(ctx, { title: 'No access', body });
}

// Case b of the callback (unknown identity). next comes from the state cookie so "Try another account"
// keeps it; switch=1 makes the provider show its picker. Rendered at the callback, so it can name the
// account, which is the clue a person on the wrong account needs.
export function deniedHtml(ctx, { provider, name, next = '' } = {}) {
  const retry = `<form method="post" action="/auth/start/${esc(provider)}" class="staff-inline">${hidden([['next', next], ['switch', '1']])}`;
  const ask = `<a class="staff-link" href="${esc(CONTACT)}">Ask for access</a>`;
  // Google is added from a signed-in session, never invited, so most unknown Google identities belong to people
  // SyberLabs never added, and a founder who pressed the wrong provider sees the way forward first (RFC-0002 3.4).
  if (provider === 'google') {
    const body = `${head('Staff', 'No access.')}
  <p class="sy-body-lg staff-lede"><strong>This Google account${name ? ` (${esc(name)})` : ''} isn't on a SyberLabs account.</strong></p>
  <p class="sy-body">Only people SyberLabs has added can sign in. If you were added, continue with GitHub, then add Google from your account page.</p>
  <div class="staff-actions">
    <form method="post" action="/auth/start/github" class="staff-inline">${hidden([['next', next]])}<button class="sy-btn sy-btn--solid" type="submit">${GITHUB_MARK}<span>Continue with GitHub</span></button></form>
    ${retry}<button class="sy-btn sy-btn--line" type="submit">Try another account</button></form>
    ${ask}
  </div>`;
    return page(ctx, { title: 'No access · Sign in', body, admin: false });
  }
  const body = `${head('Staff', 'No access.')}
  <p class="sy-body-lg staff-lede"><strong>This ${esc(providerLabel(provider))} account${name ? ` (@${esc(name)})` : ''} doesn't have access to SyberLabs.</strong></p>
  <p class="sy-body">Only people SyberLabs has added can sign in. If you were added, you may be signed in to GitHub as a different account.</p>
  <div class="staff-actions">
    ${retry}<button class="sy-btn sy-btn--solid" type="submit">Try another account</button></form>
    ${ask}
  </div>`;
  return page(ctx, { title: 'No access · Sign in', body, admin: false });
}
