// The confirm step (RFC-0002 2.4, 3.5): a page that re-posts every field plus confirm=1. Cancel is a link
// back to the page that sent the form, not a POST. No JavaScript.
import { esc } from '../http.js';
import { page, head, hidden, providerLabel } from './layout.js';

// A confirm route acts only on the second POST.
export const confirmed = ctx => ctx.form.get('confirm') === '1';

// "You, Ada via GitHub," (escaped): the acting identity, named on every confirm page.
export const actingAs = user => `You, ${esc(user.displayName)} via ${esc(providerLabel(user.provider))},`;

// lines: trusted HTML strings (callers escape every value). fields: object or [name, value] pairs.
// cancel: where Cancel goes. section: the nav item to mark.
export function confirmHtml(ctx, { title, lines = [], action, fields = {}, submitLabel, cancel = '/admin/', section = '' }) {
  const pairs = (Array.isArray(fields) ? fields : Object.entries(fields)).filter(([k]) => k !== 'confirm');
  const body = `${head('Admin / Confirm', `${title}?`)}
  <div class="sy-plate sy-plate--card staff-confirm">
    ${lines.map(l => `<p class="sy-body">${l}</p>`).join('\n    ')}
    <form method="post" action="${esc(action)}" class="staff-actions">
      ${hidden([...pairs, ['confirm', '1']])}
      <button class="sy-btn sy-btn--solid" type="submit">${esc(submitLabel)}</button>
      <a class="sy-btn sy-btn--ghost" href="${esc(cancel)}">Cancel</a>
    </form>
  </div>`;
  return page(ctx, { title: `Confirm · ${title}`, body, section });
}
