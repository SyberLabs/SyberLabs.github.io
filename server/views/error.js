// Error pages app.js renders: 404, any HttpError on an HTML path (CSRF has its own copy, RFC-0002 3.4),
// and the 503 pages, rendered in place on the path that failed so a reload retries (never a redirect or
// a ?e= code). Each returns an HTML string; app.js sets the status. Messages come from a handler's own
// HttpError copy, never from an exception.
import { esc } from '../http.js';
import { page, head, alert } from './layout.js';
import { contact, signinBody } from './signin.js';

const homeLink = ctx => (ctx && ctx.user
  ? '<p><a class="sy-btn sy-btn--line" href="/admin/">Back to staff home</a></p>'
  : '<p><a class="sy-btn sy-btn--line" href="/">Go to syberlabs.io</a></p>');

// Signed in: the staff shell with the nav (RFC-0002 3.4). Signed out it is only ever an /auth/ path.
export function notFoundHtml(ctx) {
  const body = `${head('Staff', 'Not found.')}
  <p class="sy-body staff-lede">${ctx && ctx.user ? "There's no staff page here." : 'There is no page at this address.'}</p>
  ${homeLink(ctx)}`;
  return page(ctx, { title: 'Not found', body });
}

export const CSRF_COPY = "This form was refused because the request didn't say it came from syberlabs.io. Reload the page and try again. If it keeps happening, turn off extensions that remove request headers.";

export function errorHtml(ctx, err) {
  const code = err && err.code;
  const message = code === 'csrf' ? CSRF_COPY : (err && err.message) || 'Something went wrong.';
  const title = code === 'csrf' ? 'Form refused' : code === 'too_large' ? 'Too large' : 'Request refused';
  const body = `${head('Staff', `${title}.`)}
  ${alert(code === 'csrf' ? 'warning' : 'danger', esc(message))}
  ${homeLink(ctx)}`;
  return page(ctx, { title, body });
}

export const STAFF_UNAVAILABLE_HTML = `Staff pages are unavailable right now. Reload in a minute, or ${contact('email SyberLabs')}.`;

// No ctx: this renders when config or D1 is missing, so it touches neither (RFC-0002 2.1, 3.4).
// Under /admin: "Staff pages are unavailable", with the lockup and Sign out but no account line or nav,
// because the session could not be resolved. Anywhere else (the /auth/ paths): the sign-in page with
// "Sign-in is unavailable" and its buttons hidden.
export function unavailableHtml(pathname = '/auth/signin') {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const body = `${head('Staff', 'Unavailable.')}
  ${alert('danger', STAFF_UNAVAILABLE_HTML)}`;
    return page(null, { title: 'Staff pages are unavailable', body, admin: false, signOut: true });
  }
  const body = signinBody({ next: '/admin/', unavailable: true });
  return page(null, { title: 'Sign-in is unavailable · Sign in', body, admin: false });
}
