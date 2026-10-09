// The staff header (RFC-0002 2.6, 3.3). Staff pages never use the public header(): its single 64 px row
// and its Atlas menu (a <details> that only script can close) cut the account line and Sign out off the
// right edge, and the Atlas lists only public pages. This one is in normal flow, needs no script, and
// every row is a flex row that wraps at every width, so at 375 px nothing is pushed past the site
// layer's `body { overflow-x: clip }`.
import { esc } from '../http.js';
import { identityName } from '../authz.js';

export { identityName };

export const PROVIDER_LABEL = { github: 'GitHub', google: 'Google' };
export const providerLabel = p => PROVIDER_LABEL[p] || 'the provider';

// "@sdcarlson (GitHub)", or "you@example.com (Google)"
export const signedInAs = user => `${identityName(user)} (${providerLabel(user.provider)})`;

// The section nav (RFC-0002 3.3), in this order. Account is open to every session, the rest need their key.
export const NAV = [
  { id: 'portal', label: 'Launchpad', href: '/admin/', key: null },
  { id: 'changes', label: 'What changed', href: '/admin/changes', key: 'site:changes.read' },
  { id: 'people', label: 'People', href: '/admin/people', key: 'id:users.read' },
  { id: 'roles', label: 'Roles', href: '/admin/roles', key: 'id:users.read' },
  { id: 'audit', label: 'Audit', href: '/admin/audit', key: 'id:audit.read' },
  { id: 'saves', label: 'Saved things', href: '/admin/saves', key: null },
  { id: 'account', label: 'Account', href: '/admin/account', key: null },
];

export const navItems = ctx => NAV.filter(item => item.key === null || Boolean(ctx && ctx.perms && ctx.perms.has(item.key)));

// GitHub's mark (Octicons mark-github), drawn in currentColor. The public ICONS has no GitHub mark, and
// nothing is added to the public template for staff pages (RFC-0002 2.1).
export const GITHUB_MARK = '<svg class="staff-provider__mark" width="20" height="20" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>';

// Google's own dark pill button as its PNG asset (staff/, from Google's sign-in branding download), never its SVG,
// which needs the Google Sans font installed (RFC-0002 3.2). 48 px tall with the aspect ratio kept. The alt text
// is the image's own words, so the accessible name matches what is shown.
export const GOOGLE_BUTTON = '<img class="staff-google__img" src="/staff/google-signin-dark-360.png" srcset="/staff/google-signin-dark-360.png 360w, /staff/google-signin-dark-540.png 540w, /staff/google-signin-dark-720.png 720w" sizes="216px" width="216" height="48" alt="Sign in with Google">';

const SIGN_OUT = '<form method="post" action="/auth/signout" class="staff-inline"><button class="sy-btn sy-btn--ghost staff-btn--small" type="submit">Sign out</button></form>';

function staffNav(ctx, section) {
  // Always shown, also when it holds only Account (RFC-0002 3.3): it says where you are.
  return `<nav class="staff-nav" aria-label="Staff"><ul>${navItems(ctx).map(item =>
    `<li><a href="${item.href}"${item.id === section ? ' aria-current="page"' : ''}>${esc(item.label)}</a></li>`).join('')}</ul></nav>`;
}

// The skip link, the decorative star-field host (its CSS gradient shows with no script; there is no
// canvas, because nothing would draw on it), then the header:
//   row 1: the SYBERLABS lockup, and Sign out when `signOut`;
//   row 2 (signed in): the Staff eyebrow, linking to /admin/, and the account line;
//   row 3 (signed in): the section nav.
// /auth/signin passes no user and no signOut (lockup only). The gated 503 passes signOut alone, because the
// session could not be resolved (RFC-0002 3.4).
export function staffHeader(ctx, { section = '', user = ctx && ctx.user, signOut = Boolean(user) } = {}) {
  const rows = [`<div class="staff-header__row">
      <a class="sy-lockup" href="/" aria-label="SyberLabs home"><img src="/syber-logo-96.png" alt="" width="22" height="24">SYBERLABS</a>${signOut ? `
      ${SIGN_OUT}` : ''}
    </div>`];
  if (user) {
    rows.push(`<div class="staff-header__row">
      <a class="sy-eyebrow staff-header__home" href="/admin/">Staff</a>
      <p class="staff-header__account"><a class="staff-profile" href="/admin/account" aria-label="Profile: ${esc(identityName(user))}"><span class="staff-profile__avatar" aria-hidden="true">${esc(Array.from(identityName(user).replace(/^@/, ''))[0]?.toLocaleUpperCase() || '•')}</span><span>Signed in as ${esc(signedInAs(user))}</span></a></p>
    </div>`, `<div class="staff-header__row">
      ${staffNav(ctx, section)}
    </div>`);
  }
  return `<a class="sy-skip" href="#main">Skip to content</a>
<div class="sy-field-host" aria-hidden="true"></div>
<header class="staff-header"><div class="staff-header__in">
    ${rows.join('\n    ')}
  </div></header>`;
}
