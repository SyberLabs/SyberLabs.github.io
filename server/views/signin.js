// /auth/signin (RFC-0002 3.2, 3.4): one POST form per enabled provider and the ?e= alert. It never reads D1 and
// never redirects, signed in or not (RFC-0002 R3-1); pressing a button just signs in again.
// "Unavailable" is not a ?e= code: app.js renders it in place, with 503, on the path that failed (error.js).
import { esc, html, safeReturnTo } from '../http.js';
import { CONTACT } from '../../projects/site-data.js';
import { page, head, alert, hidden } from './layout.js';
import { GITHUB_MARK, GOOGLE_BUTTON, PROVIDER_LABEL } from './chrome.js';
import { enabledProviders } from '../providers.js';

export const contact = text => `<a href="${esc(CONTACT)}">${esc(text)}</a>`;

// The provider ?p= names (oauth.js sets it whenever the state cookie decrypted). Anything else, or a provider that
// is off, is ignored, and the copy says "The sign-in provider" (RFC-0002 3.4).
const providerName = p => (Object.hasOwn(PROVIDER_LABEL, p || '') ? PROVIDER_LABEL[p] : 'The sign-in provider');

// RFC-0002 3.4. Each entry: alert kind, the <title> lead, and the copy (v = {switching, provider}).
// Unknown codes are ignored.
export const ERROR_COPY = {
  cancelled: { kind: 'neutral', title: () => 'Sign-in was cancelled',
    html: () => 'Sign-in was cancelled. Try again.' },
  expired: { kind: 'warning', title: () => 'That sign-in couldn’t be finished',
    html: () => "That sign-in couldn't be finished. Try again. If this keeps happening, allow cookies for syberlabs.io." },
  provider: { kind: 'danger', title: v => `${providerName(v.provider)} didn’t finish the sign-in`,
    html: v => `${esc(providerName(v.provider))} didn't finish the sign-in. Try again, or ${contact('email SyberLabs')}.` },
  disabled: { kind: 'danger', title: () => 'This account has been turned off',
    html: () => `This account has been turned off. ${contact('Email SyberLabs')} if you think that's a mistake.` },
  expired_session: { kind: 'neutral', title: () => 'Your session ended',
    html: () => 'Your session ended. Sign in again.' },
  signed_out: { kind: 'success', title: () => 'You’re signed out',
    html: v => (v.switching ? "You're signed out. Choose the account to use." : "You're signed out.") },
  signed_out_all: { kind: 'success', title: () => 'You’re signed out on every device',
    html: () => "You're signed out on every device." },
};

// The 503 copy on this page (RFC-0002 3.4): shown in place, with the buttons hidden.
export const UNAVAILABLE_HTML = `Sign-in is unavailable right now. Reload in a minute, or ${contact('email SyberLabs')}.`;

// The GitHub POST form: full width, 48 px, solid, because it is the only way in (RFC-0002 3.2). switch=1 asks
// GitHub for its account picker.
export function githubForm({ next, switching } = {}) {
  const fields = hidden([['next', next], ['switch', switching ? '1' : '']]);
  const button = `<button class="sy-btn sy-btn--solid staff-provider" type="submit">${GITHUB_MARK}<span>Continue with GitHub</span></button>`;
  return `<form method="post" action="/auth/start/github">${fields}${button}</form>`;
}

// Google's button, under GitHub's and centred (RFC-0002 3.2). staff.css resets the <button> so the focus ring
// hugs the image.
export function googleForm({ next, switching } = {}) {
  const fields = hidden([['next', next], ['switch', switching ? '1' : '']]);
  return `<form method="post" action="/auth/start/google" class="staff-signin__google">${fields}<button class="staff-google" type="submit">${GOOGLE_BUTTON}</button></form>`;
}

// The page body, shared with the sign-in 503. opts: {code, next, switching, provider, providers, unavailable}
export function signinBody(opts) {
  const { code, next, switching, provider, providers = ['github'], unavailable = false } = opts;
  const copy = ERROR_COPY[code];
  const alertHtml = unavailable ? alert('danger', UNAVAILABLE_HTML)
    : copy ? alert(copy.kind, copy.html({ switching, provider })) : '';
  const buttons = unavailable ? ''
    : `<div class="sy-plate sy-plate--card staff-signin__providers">${githubForm({ next, switching })}${
      providers.includes('google') ? googleForm({ next, switching }) : ''}</div>`;
  return `${head('Staff', 'Sign in.')}
  ${alertHtml}
  ${buttons}
  <p class="sy-small staff-signin__note">Only people SyberLabs has added can sign in. Signing in sets a cookie on syberlabs.io and nothing on our other sites. <a href="/privacy/#staff">Privacy</a></p>`;
}

// "Sign-in was cancelled · Sign in", so a screen reader announces the alert on load.
export function signinTitle(code, provider) {
  const copy = ERROR_COPY[code];
  return copy ? `${copy.title({ provider })} · Sign in` : 'Sign in';
}

// GET /auth/signin
export async function signinPage(ctx) {
  const q = ctx.url.searchParams;
  const next = safeReturnTo(q.get('next') || '/admin/', ctx.env.ORIGIN);
  let code = q.get('e');
  if (!Object.hasOwn(ERROR_COPY, code || '')) code = null;
  const providers = enabledProviders(ctx.env);
  const provider = providers.includes(q.get('p')) ? q.get('p') : null;
  const body = signinBody({ code, next, switching: q.get('switch') === '1', provider, providers });
  return html(page(ctx, { title: signinTitle(code, provider), body, admin: false }));
}
