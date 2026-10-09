// /auth/signin (RFC-0002 3.2, 3.4): one POST form per enabled provider, the ?e= alert, and the invite
// greeting. Its only D1 access is the one indexed invite read, and only for a well-formed token.
import { esc, html, redirect, safeReturnTo } from '../http.js';
import { CONTACT } from '../../projects/site-data.js';
import { inviteForToken } from '../authz.js';
import { enabledProviders } from '../oauth.js';
import { page, head, alert, hidden, PROVIDER_LABEL, providerLabel } from './layout.js';

// 32 random bytes in base64url. Anything else is never looked up, echoed or carried on.
export const INVITE_RE = /^[A-Za-z0-9_-]{43}$/;

const contact = text => `<a href="${esc(CONTACT)}">${esc(text)}</a>`;
const names = list => list.map(p => PROVIDER_LABEL[p]).join(' or ');

// RFC-0002 3.4. Each entry: alert kind, the <title> lead, and the copy (v = what the page knows:
// providers, provider, invite). Unknown codes are ignored.
export const ERROR_COPY = {
  cancelled: { kind: 'neutral', title: 'Sign-in was cancelled',
    html: v => `Sign-in was cancelled. Choose ${esc(names(v.providers))} to try again.` },
  expired: { kind: 'warning', title: 'That sign-in took too long',
    html: () => 'That sign-in took too long or was finished in another tab. Try again. If you came from an invite link, open it again.' },
  provider: { kind: 'danger', title: 'The provider didn’t answer',
    // oauth.js may add &p=<provider> so the page can name it; without it the copy stays generic.
    html: v => `${esc(v.provider ? providerLabel(v.provider) : 'The sign-in provider')} didn't answer. Try again in a minute.` },
  no_email: { kind: 'danger', title: 'That Google account isn’t the invited one',
    html: v => `That Google account isn't the one this invite was sent to. Continue with Google and choose ${esc(v.invite?.email_normalized || 'the invited address')}.` },
  wrong_provider: { kind: 'warning', title: 'This invite is for another provider',
    html: v => {
      const p = esc(providerLabel(v.invite?.provider));
      return `This invite is for ${p}. Continue with ${p}.`;
    } },
  invite_invalid: { kind: 'warning', title: 'This invite link has expired or was used',
    html: () => 'This invite link has expired or was already used. Ask the person who invited you for a new one.' },
  disabled: { kind: 'danger', title: 'This account has been turned off',
    html: () => `This account has been turned off. ${contact('Email SyberLabs')} if you think that's a mistake.` },
  expired_session: { kind: 'neutral', title: 'Your session ended',
    html: () => 'Your session ended. Sign in again.' },
  signed_out: { kind: 'success', title: 'You’re signed out',
    html: v => (v.switching ? "You're signed out. Choose the account to use." : "You're signed out.") },
  unconfigured: { kind: 'danger', title: 'Sign-in is unavailable',
    html: () => `Sign-in is unavailable right now. Try again later, or ${contact('email SyberLabs')}.` },
};

// GitHub's mark (Octicons mark-github), drawn in currentColor so it sits in vellum on the line button.
const GITHUB_MARK = '<svg class="staff-provider__mark" width="20" height="20" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>';

// Google's standard-colour G on its white backing, as on Google's dark-theme button.
const GOOGLE_MARK = '<span class="staff-google__g" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 48 48" focusable="false"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg></span>';

// One provider's POST form. `as` labels it with the invited account ("as @name").
// The switch flag is sent both as RFC-0002's switch=1 and the contract's prompt=select_account.
// loginHint (Google invites) lets /auth/start send login_hint without a D1 read.
export function providerForm(provider, { next, invite, switching, as, loginHint } = {}) {
  const label = `Continue with ${PROVIDER_LABEL[provider]}${as ? ` as ${as}` : ''}`;
  const fields = hidden([['next', next], ['invite', invite], ['login_hint', loginHint],
    ['switch', switching ? '1' : ''], ['prompt', switching ? 'select_account' : '']]);
  const button = provider === 'google'
    ? `<button class="staff-google" type="submit">${GOOGLE_MARK}<span>${esc(label)}</span></button>`
    : `<button class="sy-btn sy-btn--line staff-provider" type="submit">${GITHUB_MARK}<span>${esc(label)}</span></button>`;
  return `<form method="post" action="/auth/start/${esc(provider)}">${fields}${button}</form>`;
}

// What the open invite says, and who it is for ("@name" or an address).
function inviteAccount(invite) {
  if (invite.provider === 'github') return invite.login_hint ? `@${invite.login_hint}` : '';
  return invite.email_normalized || '';
}

function greeting(found) {
  const { invite, roleName, inviterName } = found;
  if (invite.user_id) return `<p class="sy-body-lg staff-greeting"><strong>Add ${esc(providerLabel(invite.provider))} to your SyberLabs account.</strong></p>`;
  const who = inviterName ? `${esc(inviterName)} invited you` : "You're invited";
  return `<p class="sy-body-lg staff-greeting"><strong>${who} to SyberLabs as ${esc(roleName || 'staff')}.</strong></p>`;
}

// The page body, shared with unavailableHtml(). opts: {code, next, invite (raw token, valid), found,
// switching, provider, providers, showButtons}
export function signinBody(opts) {
  const { code, next, found, switching, providers } = opts;
  const copy = ERROR_COPY[code];
  const v = { providers, provider: opts.provider, invite: found?.invite, switching };
  const alertHtml = copy ? alert(copy.kind, copy.html(v)) : '';
  let buttons = '';
  if (opts.showButtons !== false) {
    if (found) {
      // On an invite only its provider shows, labelled with the invited account (RFC-0002 3.2).
      const as = inviteAccount(found.invite);
      const loginHint = found.invite.provider === 'google' ? found.invite.email_normalized : '';
      buttons = providerForm(found.invite.provider, { next, invite: opts.invite, switching, as: as || undefined, loginHint }) +
        `<p class="sy-small staff-notyou"><a href="/auth/signin?next=${encodeURIComponent(next)}">Not you? Sign in without this invite</a></p>`;
    } else {
      buttons = providers.map(p => providerForm(p, { next, switching })).join('');
    }
    buttons = `<div class="sy-plate sy-plate--card staff-signin__providers">${buttons}</div>`;
  }
  return `${head('Staff / SyberLabs', 'Sign in.')}
  ${alertHtml}
  ${found ? greeting(found) : ''}
  ${buttons}
  <p class="sy-small staff-signin__note">Only people SyberLabs has invited can sign in. Signing in sets a cookie on syberlabs.io and nothing on our other sites. <a href="/privacy/#staff">Privacy →</a></p>`;
}

export function signinTitle(code) {
  const copy = ERROR_COPY[code];
  return copy ? `${copy.title} · Sign in` : 'Sign in';
}

// GET /auth/signin
export async function signinPage(ctx) {
  const q = ctx.url.searchParams;
  const next = safeReturnTo(q.get('next') || '/admin/', ctx.env.ORIGIN);
  const raw = q.get('invite');
  let code = q.get('e');
  if (!Object.hasOwn(ERROR_COPY, code || '')) code = null;

  let found = null;
  let token = null;
  if (raw != null) {
    if (INVITE_RE.test(raw)) {
      found = await inviteForToken(ctx.env.DB, raw, ctx.now);
      if (found) token = raw;
    }
    // A bad or dead invite is the one thing worth saying (it is never echoed).
    if (!found) code = 'invite_invalid';
  }

  // Signed in without an invite: there is nothing to do here.
  if (ctx.user && !found) return redirect(next);

  const p = q.get('p');
  const body = signinBody({
    code, next, found, invite: token,
    switching: q.get('switch') === '1',
    provider: enabledProviders(ctx.env).includes(p) ? p : null,
    providers: enabledProviders(ctx.env),
    showButtons: code !== 'unconfigured',
  });
  return html(page(ctx, { title: signinTitle(code), body, admin: false }));
}
