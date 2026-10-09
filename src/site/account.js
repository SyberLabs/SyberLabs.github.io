// Public HTML stays cacheable; the server's HttpOnly session remains the authority.
// Recheck restored pages because the browser can return to pre-login HTML through its back cache.
const mounted = new WeakMap();
const ACCOUNT_URL = '/admin/api/v1/account';

export function account(root = document) {
  const host = root.querySelector('.sy-account');
  if (!host || mounted.has(host)) return mounted.get(host);
  const guest = host.querySelector('.sy-account-link');
  const guestLabel = host.querySelector('.sy-account-label');
  const member = host.querySelector('.sy-account-member');
  const avatar = host.querySelector('.sy-account-avatar');
  const initial = host.querySelector('.sy-account-initial');
  if (!guest || !member || !avatar || !initial) return;
  const doc = host.ownerDocument || root;
  const win = doc.defaultView || window;
  let generation = 0;
  let pending;

  // Unknown is distinct from signed out: the session check may be slow or offline.
  host.dataset.accountState = 'checking';
  if (guestLabel) guestLabel.textContent = 'Account';

  const render = user => {
    const signedIn = Boolean(user);
    guest.hidden = signedIn;
    member.hidden = !signedIn;
    host.dataset.accountState = signedIn ? 'signed-in' : 'signed-out';
    if (signedIn) {
      const label = user.label.trim();
      initial.textContent = Array.from(label.replace(/^@/, ''))[0]?.toLocaleUpperCase() || '•';
      avatar.setAttribute('aria-label', `Profile: ${label}`);
      avatar.setAttribute('title', `Profile: ${label}`);
    } else {
      if (guestLabel) guestLabel.textContent = 'Sign in';
      initial.textContent = '';
      avatar.setAttribute('aria-label', 'Profile');
      avatar.removeAttribute('title');
    }
  };

  const refresh = async () => {
    if (doc.visibilityState === 'hidden') return;
    const current = ++generation;
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    const timer = win.setTimeout(() => controller.abort(), 6000);
    try {
      const response = await win.fetch(ACCOUNT_URL, {
        credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (current !== generation || controller.signal.aborted) return;
      if (response.status === 401) { render(null); return; }
      if (!response.ok) return;
      const data = await response.json();
      if (current !== generation || controller.signal.aborted) return;
      if (data.version === 1 && data.user && typeof data.user.label === 'string' && data.user.label.trim()) render(data.user);
    } catch {
      // A failed connection says nothing about authentication; keep the last validated state.
    } finally {
      win.clearTimeout(timer);
      if (current === generation) pending = null;
    }
  };

  mounted.set(host, refresh);
  win.addEventListener('pageshow', refresh);
  win.addEventListener('focus', refresh);
  doc.addEventListener('visibilitychange', refresh);
  void refresh();
  return refresh;
}
