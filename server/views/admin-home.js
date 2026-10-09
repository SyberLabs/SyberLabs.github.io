// /admin/ (RFC-0002 2.6, 3.3): no body. 303 to the first page in nav order that the user's keys open (What
// changed, People, Roles, Audit), else to /admin/account. The resolved session already holds the keys, so
// this costs no query, and a first sign-in, the Staff eyebrow and "Back to staff home" never land on an
// empty page.
import { redirect } from '../http.js';
import { navItems } from './chrome.js';

export async function adminHome(ctx) {
  const first = navItems(ctx)[0]; // Account is always last and always there
  return redirect(first.href);
}
