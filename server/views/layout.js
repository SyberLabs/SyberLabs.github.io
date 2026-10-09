// The shell every Function page shares (RFC-0002 2.6): the privacy page's <head> without its Google Fonts
// links (the staff CSP allows no remote style or font, so staff pages use the kit's fallback stacks), the
// staff header from chrome.js (never the public header(): its Atlas cannot be closed without script) and
// the public footer(). No page loads script.
// Every helper here takes raw values and escapes them; only arguments named *Html are trusted markup.
import { footer } from '../../projects/project-template.js';
import { esc } from '../http.js';
import { staffHeader } from './chrome.js';

export { PROVIDER_LABEL, providerLabel, identityName, signedInAs, navItems } from './chrome.js';

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
// admin: false renders the bare header (sign-in, denied, the sign-in 503); otherwise the header shows
// ctx.user's account line and nav. signOut: true keeps Sign out on a bare header (the gated 503).
export function page(ctx, { title, body, section = '', admin = true, signOut, compactFooter = false }) {
  const user = admin && ctx && ctx.user ? ctx.user : null;
  return `<!doctype html>
<html lang="en" data-field="calm">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#06051a">
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="/favicon-32x32.png?v=prism" type="image/png" sizes="32x32">
  <title>${esc(title)} · SyberLabs staff</title>
  <link rel="stylesheet" href="/syberlabs.css?v=4">
  <link rel="stylesheet" href="/staff.css?v=4">
</head>
<body>
<!--email_off-->
${staffHeader(ctx, { section, user, signOut: signOut ?? Boolean(user) })}
  <main id="main" class="staff sy-container">
  ${body}
  </main>
${compactFooter ? '<footer class="portal-footer sy-container"><span>SYBERLABS / STAFF</span><a href="/">Public site ↗</a><a href="/privacy/#staff">Privacy</a></footer>' : footer()}
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

// The error summary RFC-0002 3.4 fixes: "2 fields need attention:" linking each field. staff.css stacks it
// (.sy-alert is a flex row).
export function errorSummary(errors, labels) {
  const ids = Object.keys(errors);
  if (!ids.length) return '';
  const n = ids.length;
  return `<div class="sy-alert sy-alert--danger staff-errors" role="alert"><p>${n} ${n === 1 ? 'field needs' : 'fields need'} attention:</p>
    <ul>${ids.map(name => `<li><a href="#f-${esc(name)}">${esc(labels[name] || name)}</a></li>`).join('')}</ul></div>`;
}

// "Fix 2 fields · " for the <title>, so a screen reader hears it on load.
export const fixPrefix = errors => {
  const n = Object.keys(errors).length;
  return n ? `Fix ${n} ${n === 1 ? 'field' : 'fields'} · ` : '';
};

// One form field in the RFC-0002 3.4 markup. kind: input (default) | textarea | select.
// options for select: [[value, label]]. error is plain text; errorHtml (trusted markup) wins over it, for
// a message that carries a link. attrs is trusted markup (required, maxlength, ...).
export function field({ name, label, value = '', error = '', errorHtml = '', kind = 'input', type = 'text', hint = '', options = [], attrs = '' }) {
  const id = `f-${name}`;
  const err = errorHtml || (error ? esc(error) : '');
  const described = [hint ? `${id}-hint` : '', err ? `${id}-err` : ''].filter(Boolean).join(' ');
  const aria = `${err ? ' aria-invalid="true"' : ''}${described ? ` aria-describedby="${described}"` : ''}`;
  let control;
  if (kind === 'textarea') {
    control = `<textarea class="sy-input" id="${id}" name="${esc(name)}"${aria}${attrs}>${esc(value)}</textarea>`;
  } else if (kind === 'select') {
    control = `<select class="sy-input staff-select" id="${id}" name="${esc(name)}"${aria}${attrs}>${options.map(([v, l]) =>
      `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  } else {
    control = `<input class="sy-input" id="${id}" name="${esc(name)}" type="${esc(type)}" value="${esc(value)}"${aria}${attrs}>`;
  }
  return `<div class="sy-field staff-field${err ? ' is-invalid' : ''}">
      <label class="sy-field__label" for="${id}">${esc(label)}</label>
      ${control}${hint ? `
      <p class="sy-field__hint" id="${id}-hint">${esc(hint)}</p>` : ''}${err ? `
      <p class="sy-field__error" id="${id}-err">${err}</p>` : ''}
    </div>`;
}
