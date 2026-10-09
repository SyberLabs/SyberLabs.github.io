// Private launchpad. Permissions come from the resolved session, never from the browser.
import { esc, html } from '../http.js';
import { navItems, identityName } from './chrome.js';
import { page } from './layout.js';

const TOOLS = {
  saves: { label: 'Library', title: 'Saved things', copy: 'Your private Omni, RISE and Sketch backups, ready to pick up wherever you sign in.', icon: '<path d="M5 3h14v18l-7-4-7 4V3Z"/>' },
  changes: { label: 'Updates', title: 'What changed', copy: 'Keep the team in the loop. Read the latest changes and open their evidence.', icon: '<path d="M5 6h14M5 12h9M5 18h6"/><path d="m16 16 2 2 4-4"/>' },
  people: { label: 'Team', title: 'People', copy: 'Find staff accounts, review their access and manage your team.', icon: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5"/>' },
  roles: { label: 'Access', title: 'Roles', copy: 'Explore the permissions behind each role and how access is assigned.', icon: '<path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7l8-4Z"/><path d="m8 12 3 3 5-6"/>' },
  audit: { label: 'History', title: 'Audit', copy: 'Trace account and content changes through the staff activity log.', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
  account: { label: 'Personal', title: 'Your account', copy: 'Manage your sign-in methods and review your current session.', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>' },
};

export async function adminHome(ctx) {
  const tools = navItems(ctx).filter(item => item.id !== 'portal');
  const personal = tools.filter(item => item.key === null);
  const team = tools.filter(item => item.key !== null);
  const cards = (items, teamTools = false) => items.map(item => {
    const tool = TOOLS[item.id];
    return `<a class="portal-card${teamTools ? ' portal-card--team' : ''}" href="${item.href}">
      <div class="portal-card__top"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${tool.icon}</svg><span>${tool.label}</span></div>
      <h3>${tool.title}</h3><p>${tool.copy}</p><span class="portal-card__open">Open ${tool.title.toLowerCase()} <span aria-hidden="true">→</span></span>
    </a>`;
  }).join('');
  const body = `<div class="portal">
    <section class="portal-hero" aria-labelledby="portal-title">
      <div class="portal-hero__copy"><p class="portal-kicker"><span></span> SYBERLABS / PRIVATE WORKSPACE</p>
        <h1 id="portal-title">Your <em>launchpad.</em></h1>
        <p class="portal-intro">Welcome back, <strong>${esc(identityName(ctx.user))}</strong>.<br>Open a tool or find your saved things.</p>
      </div>
    </section>
    <section class="portal-app-section" aria-labelledby="apps-title"><div class="portal-section-head"><h2 id="apps-title">Open a tool</h2></div>
      <div class="portal-apps">
        <a href="https://rise.syberlabs.io/"><span class="portal-kicker">READ</span><strong>RISE Reader</strong><p>Give your words time, light and sound.</p><span class="portal-apps__arrow" aria-hidden="true">↗</span></a>
        <a href="https://sketch.syberlabs.io/"><span class="portal-kicker">DRAW</span><strong>RISE Sketch</strong><p>Make a mark with living ink.</p><span class="portal-apps__arrow" aria-hidden="true">↗</span></a>
        <a href="https://omni.syberlabs.io/"><span class="portal-kicker">EXPLORE</span><strong>FLYSPACE</strong><p>A spatial workspace. Opens as OmniOS.</p><span class="portal-apps__arrow" aria-hidden="true">↗</span></a>
      </div>
    </section>
    <section id="portal-tools" class="portal-tools" aria-labelledby="tools-title"><div class="portal-section-head"><h2 id="tools-title">Your workspace</h2></div><div class="portal-grid">${cards(personal)}</div></section>
    ${team.length ? `<section class="portal-team" aria-labelledby="team-title"><div class="portal-section-head"><h2 id="team-title">Team tools</h2></div><div class="portal-grid">${cards(team, true)}</div></section>` : '<p class="portal-access-note">Your tools, saved things and account are available. An admin can grant you a role if you need team tools.</p>'}
    <aside class="portal-outpost"><p>Explore the projects and research behind SyberLabs.</p><a href="/">Visit the public site <span aria-hidden="true">→</span></a></aside>
  </div>`;
  return html(page(ctx, { title: 'Launchpad', body, section: 'portal', compactFooter: true }));
}
