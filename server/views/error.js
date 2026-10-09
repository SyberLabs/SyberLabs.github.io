// Error pages app.js renders: 404, any HttpError on an HTML path (CSRF has its own copy, RFC-0002 3.4),
// and the 503 page, which is the sign-in page with the unconfigured alert and no buttons.
// Each returns an HTML string; app.js sets the status. Messages come from ERRORS or a handler's own
// HttpError copy, never from an exception.
import { esc } from '../http.js';
import { page, head, alert } from './layout.js';
import { signinBody, signinTitle } from './signin.js';

const homeLink = ctx => (ctx && ctx.user
  ? '<p><a class="sy-btn sy-btn--line" href="/admin/">Back to admin home</a></p>'
  : '<p><a class="sy-btn sy-btn--line" href="/">Go to syberlabs.io</a></p>');

export function notFoundHtml(ctx) {
  const body = `${head('Not found', 'Nothing here.')}
  <p class="sy-body staff-lede">There is no page at this address.</p>
  ${homeLink(ctx)}`;
  return page(ctx, { title: 'Not found', body });
}

export const CSRF_COPY = 'This form was sent from another site or an old tab. Go back, reload the page and try again.';

export function errorHtml(ctx, err) {
  const code = err && err.code;
  const message = code === 'csrf' ? CSRF_COPY : (err && err.message) || 'Something went wrong.';
  const title = code === 'csrf' ? 'Form refused' : code === 'too_large' ? 'Too large' : 'Request refused';
  const body = `${head('Error', `${title}.`)}
  ${alert(code === 'csrf' ? 'warning' : 'danger', esc(message))}
  ${homeLink(ctx)}`;
  return page(ctx, { title, body });
}

// No ctx: this renders when config or D1 is missing, so it touches neither.
export function unavailableHtml() {
  const body = signinBody({ code: 'unconfigured', next: '/admin/', providers: [], showButtons: false });
  return page(null, { title: signinTitle('unconfigured'), body, admin: false });
}
