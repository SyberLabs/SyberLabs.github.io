// Private launchpad. Permissions come from the resolved session, never from the browser.
import { esc, html } from '../http.js';
import { navItems, identityName } from './chrome.js';
import { page, duration } from './layout.js';

const TOOLS = {
  changes: { label: 'Updates', title: 'What changed', copy: 'Keep the team in the loop. Read the latest changes and open their evidence.', icon: '<path d="M5 6h14M5 12h9M5 18h6"/><path d="m16 16 2 2 4-4"/>' },
  people: { label: 'Team', title: 'People', copy: 'Find staff accounts, review their access and manage your team.', icon: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5"/>' },
  roles: { label: 'Access', title: 'Roles', copy: 'Explore the permissions behind each role and how access is assigned.', icon: '<path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7l8-4Z"/><path d="m8 12 3 3 5-6"/>' },
  audit: { label: 'History', title: 'Audit', copy: 'Trace account and content changes through the staff activity log.', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
  account: { label: 'Personal', title: 'Your account', copy: 'Manage your sign-in methods and review your current session.', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>' },
};

export async function adminHome(ctx) {
  const tools = navItems(ctx).filter(item => item.id !== 'portal');
  const cards = tools.map((item, i) => {
    const tool = TOOLS[item.id];
    return `<a class="portal-card" href="${item.href}">
      <div class="portal-card__top"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${tool.icon}</svg><span>${String(i + 1).padStart(2, '0')} / ${tool.label}</span></div>
      <h3>${tool.title}</h3><p>${tool.copy}</p><span class="portal-card__open">Open ${tool.title.toLowerCase()} <span aria-hidden="true">↗</span></span>
    </a>`;
  }).join('');
  const body = `<div class="portal">
    <section class="portal-hero" aria-labelledby="portal-title">
      <div class="portal-hero__copy"><p class="portal-kicker"><span></span> SYBERLABS / PRIVATE WORKSPACE</p>
        <h1 id="portal-title">Your <br><em>launchpad.</em></h1>
        <p class="portal-intro">Welcome back, <strong>${esc(identityName(ctx.user))}</strong>.<br>Your team. Your tools. One place to move things forward.</p>
        <a class="sy-btn sy-btn--solid" href="#portal-tools">Explore your tools <span aria-hidden="true">↓</span></a>
      </div>
      <div class="portal-orbit" aria-hidden="true"><div class="portal-orbit__ring portal-orbit__ring--one"></div><div class="portal-orbit__ring portal-orbit__ring--two"></div><div class="portal-orbit__ring portal-orbit__ring--three"></div><div class="portal-orbit__core"><img src="/syber-logo.png" alt="" width="120" height="120"></div><span class="portal-orbit__label">CONNECTED / SYBERLABS</span><span class="portal-orbit__point"></span></div>
    </section>
    <div class="portal-strip"><div><span class="portal-strip__label">Workspace</span><strong>Staff portal</strong></div><div><span class="portal-strip__label">Available to you</span><strong>${tools.length} ${tools.length === 1 ? 'tool' : 'tools'}</strong></div><div><span class="portal-strip__label">Session remaining</span><strong>${esc(duration(ctx.user.expiresAt - ctx.now))}</strong></div></div>
    <section id="portal-tools" class="portal-tools" aria-labelledby="tools-title"><div class="portal-section-head"><div><p class="portal-kicker">TAKE THE NEXT STEP</p><h2 id="tools-title">Mission control</h2></div><p>Everything your account can access.</p></div>
      ${ctx.perms.size === 0 ? '<p class="portal-access-note">Your account is ready. Ask an admin for a role to unlock team tools.</p>' : ''}
      <div class="portal-grid">${cards}</div>
    </section>
    <aside class="portal-outpost"><div><p class="portal-kicker">BEYOND THE WORKSPACE</p><h2>See what we’re building.</h2><p>Explore the public projects, research and ideas behind SyberLabs.</p></div><a class="sy-btn sy-btn--ghost" href="/">Visit SyberLabs <span aria-hidden="true">↗</span></a></aside>
  </div>`;
  return html(page(ctx, { title: 'Portal', body, section: 'portal', compactFooter: true }));
}
