// The shell every Function page shares: the privacy page's <head>, the real site header and footer (no
// script: admin pages run none), and for signed-in pages the admin bar and a nav filtered by permission.
// Every helper here takes raw values and escapes them; only arguments named *Html are trusted markup.
import { header, footer } from '../../projects/project-template.js';
import { esc } from '../http.js';

export const PROVIDER_LABEL = { github: 'GitHub', google: 'Google' };
export const providerLabel = p => PROVIDER_LABEL[p] || 'the provider';

// The section nav (RFC-0002 3.3): Account is open to every session, the rest need their key.
const NAV = [
  { id: 'changes', label: 'What changed', href: '/admin/changes', key: 'site:changes.read' },
  { id: 'people', label: 'People', href: '/admin/people', key: 'id:users.read' },
  { id: 'roles', label: 'Roles', href: '/admin/roles', key: 'id:users.read' },
  { id: 'audit', label: 'Audit', href: '/admin/audit', key: 'id:audit.read' },
  { id: 'account', label: 'Account', href: '/admin/account', key: null },
];

const has = (ctx, key) => Boolean(ctx && ctx.perms && ctx.perms.has(key));

export function navItems(ctx) {
  return NAV.filter(item => item.key === null || has(ctx, item.key));
}

// "Ada · GitHub"
export const accountLine = user => `${user.displayName} · ${providerLabel(user.provider)}`;

function adminBar(ctx, section) {
  const items = navItems(ctx);
  // One item (Account alone) is no navigation at all, so the nav is hidden (RFC-0002 3.3).
  const nav = items.length > 1 ? `
  <nav class="staff-nav" aria-label="Admin"><ul>${items.map(item =>
    `<li><a href="${item.href}"${item.id === section ? ' aria-current="page"' : ''}>${esc(item.label)}</a></li>`).join('')}</ul></nav>` : '';
  return `<div class="staff-bar">
    <p class="staff-bar__title"><a class="sy-eyebrow" href="/admin/">Admin</a> <span class="sy-badge sy-badge--private">Staff only</span></p>
    <div class="staff-bar__account">
      <span class="sy-small">${esc(accountLine(ctx.user))}</span>
      <form method="post" action="/auth/signout"><button class="sy-btn sy-btn--ghost staff-btn--small" type="submit">Sign out</button></form>
    </div>
  </div>${nav}`;
}

// The page head: eyebrow over a serif h1 (the privacy page's .site-head).
export const head = (eyebrow, h1) => `<div class="site-head">
    <p class="sy-eyebrow">${esc(eyebrow)}</p>
    <h1 class="sy-display">${esc(h1)}</h1>
  </div>`;

// One alert. kind: neutral | success | warning | danger. danger and warning interrupt (role=alert);
// the rest are announced politely.
export function alert(kind, html) {
  const cls = kind && kind !== 'neutral' ? ` sy-alert--${kind}` : '';
  const role = kind === 'danger' || kind === 'warning' ? 'alert' : 'status';
  return `<div class="sy-alert${cls} staff-alert" role="${role}"><div>${html}</div></div>`;
}

// A full document. `title` is the page's own part; " · SyberLabs staff" is added here.
// admin: false renders the bare shell (sign-in, denied, unavailable); otherwise ctx.user must be set.
export function page(ctx, { title, body, section = '', admin = true }) {
  const showAdmin = admin && ctx && ctx.user;
  return `<!doctype html>
<html lang="en" data-field="calm">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#06051a">
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="/favicon-32x32.png?v=prism" type="image/png" sizes="32x32">
  <title>${esc(title)} · SyberLabs staff</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap">
  <link rel="stylesheet" href="/syberlabs.css?v=4">
  <link rel="stylesheet" href="/staff.css?v=1">
</head>
<body>
<!--email_off-->
${header('', { script: false })}
  <main id="main" class="staff sy-container">
  ${showAdmin ? adminBar(ctx, section) : ''}
  ${body}
  </main>
${footer()}
<!--/email_off-->
</body>
</html>
`;
}

// ---- small shared pieces -----------------------------------------------------------------------

// "2026-10-09 14:02 UTC" in a <time>.
export const utc = ms => new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
export const time = ms => (ms == null ? '' : `<time datetime="${new Date(ms).toISOString()}">${utc(ms)}</time>`);

// "11 h 40 min" (rounded down to the minute; never negative).
export function duration(ms) {
  const min = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(min / 60);
  return h ? `${h} h ${min % 60} min` : `${min} min`;
}

// Hidden inputs from [name, value] pairs or an object.
export function hidden(fields) {
  const pairs = Array.isArray(fields) ? fields : Object.entries(fields || {});
  return pairs.filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join('');
}

// A one-button POST form; `fields` become hidden inputs.
export function postButton(action, label, fields = {}, cls = 'sy-btn sy-btn--line') {
  return `<form method="post" action="${esc(action)}" class="staff-inline">${hidden(fields)}<button class="${cls}" type="submit">${esc(label)}</button></form>`;
}

// The error summary RFC-0002 3.4 fixes: "2 fields need attention:" linking each field.
export function errorSummary(errors, labels) {
  const ids = Object.keys(errors);
  if (!ids.length) return '';
  const n = ids.length;
  return `<div class="sy-alert sy-alert--danger staff-alert" role="alert"><div><p>${n} ${n === 1 ? 'field needs' : 'fields need'} attention:</p>
    <ul>${ids.map(name => `<li><a href="#f-${esc(name)}">${esc(labels[name] || name)}</a></li>`).join('')}</ul></div></div>`;
}

// "Fix 2 fields · " for the <title>, so a screen reader hears it on load.
export const fixPrefix = errors => {
  const n = Object.keys(errors).length;
  return n ? `Fix ${n} ${n === 1 ? 'field' : 'fields'} · ` : '';
};

// One form field in the RFC-0002 3.4 markup. kind: input (default) | textarea | select.
// options for select: [[value, label]].
export function field({ name, label, value = '', error = '', kind = 'input', type = 'text', hint = '', options = [], attrs = '' }) {
  const id = `f-${name}`;
  const described = [hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ');
  const aria = `${error ? ' aria-invalid="true"' : ''}${described ? ` aria-describedby="${described}"` : ''}`;
  let control;
  if (kind === 'textarea') {
    control = `<textarea class="sy-input" id="${id}" name="${esc(name)}"${aria}${attrs}>${esc(value)}</textarea>`;
  } else if (kind === 'select') {
    control = `<select class="sy-input" id="${id}" name="${esc(name)}"${aria}${attrs}>${options.map(([v, l]) =>
      `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  } else {
    control = `<input class="sy-input" id="${id}" name="${esc(name)}" type="${esc(type)}" value="${esc(value)}"${aria}${attrs}>`;
  }
  return `<div class="sy-field staff-field${error ? ' is-invalid' : ''}">
      <label class="sy-field__label" for="${id}">${esc(label)}</label>
      ${control}${hint ? `
      <p class="sy-field__hint" id="${id}-hint">${esc(hint)}</p>` : ''}${error ? `
      <p class="sy-field__error" id="${id}-err">${esc(error)}</p>` : ''}
    </div>`;
}
