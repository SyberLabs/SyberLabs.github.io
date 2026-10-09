// Shared script-free application navigation, filtered by the resolved session permissions.
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

const NAV_ICONS = {
  portal: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  saves: '<path d="M5 3h14v18l-7-4-7 4V3Z"/>',
  account: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  changes: '<path d="M5 6h14M5 12h14M5 18h9"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5"/>',
  roles: '<path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7l8-4Z"/><path d="m8 12 3 3 5-6"/>',
  audit: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};

export function workspaceNavigation(ctx, section) {
  const items = navItems(ctx);
  const group = (label, entries) => entries.length ? `<div class="workspace-nav-block"><p class="workspace-nav-label">${label}</p><nav class="staff-nav" aria-label="${label}"><ul>${entries.map(item => `<li><a href="${item.href}"${item.id === section ? ' aria-current="page"' : ''}><svg class="workspace-nav-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NAV_ICONS[item.id]}</svg><span>${esc(item.label)}</span></a></li>`).join('')}</ul></nav></div>` : '';
  return `${group('Workspace', items.filter(item => item.key === null))}${group('Team', items.filter(item => item.key !== null))}<div class="workspace-nav-footer"><a href="/">Public site ↗</a><a href="/privacy/#staff">Privacy</a>${SIGN_OUT}</div>`;
}

// Native disclosure keeps mobile navigation usable under the script-free staff CSP.
export function staffHeader(ctx, { section = '', user = ctx && ctx.user, signOut = Boolean(user) } = {}) {
  const name = user ? identityName(user) : '';
  const controls = user ? `<span class="workspace-page-name">${esc(NAV.find(item => item.id === section)?.label || 'Workspace')}</span><div class="staff-header__controls"><a class="staff-profile" href="/admin/account" aria-label="Profile: ${esc(name)} (${esc(providerLabel(user.provider))})"><span class="staff-profile__avatar" aria-hidden="true">${esc(Array.from(name.replace(/^@/, ''))[0]?.toLocaleUpperCase() || '•')}</span><span class="staff-profile__label">${esc(name)}<small>${esc(providerLabel(user.provider))}</small></span></a><details class="workspace-mobile-nav"><summary>Navigate</summary><div class="workspace-mobile-nav__panel">${workspaceNavigation(ctx, section)}</div></details></div>` : signOut ? SIGN_OUT : '';
  return `<a class="sy-skip" href="#main">Skip to content</a>
<div class="sy-field-host" aria-hidden="true"></div>
<header class="staff-header"><div class="staff-header__in"><div class="staff-header__row"><a class="sy-lockup" href="/" aria-label="SyberLabs home"><img src="/syber-logo-96.png" alt="" width="22" height="24">SYBERLABS</a>${controls}</div></div></header>`;
}
