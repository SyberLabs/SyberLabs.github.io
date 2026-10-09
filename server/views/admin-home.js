// Private launchpad. Permissions come from the resolved session, never from the browser.
import { esc, html } from '../http.js';
import { navItems, identityName } from './chrome.js';
import { page } from './layout.js';

const TOOLS = {
  saves: { label: 'Library', title: 'Saved things', copy: 'Your private app backups, ready to pick up wherever you sign in.', icon: '<path d="M5 3h14v18l-7-4-7 4V3Z"/>' },
  changes: { label: 'Updates', title: 'What changed', copy: 'Keep the team in the loop. Read the latest changes and open their evidence.', icon: '<path d="M5 6h14M5 12h9M5 18h6"/><path d="m16 16 2 2 4-4"/>' },
  people: { label: 'Team', title: 'People', copy: 'View staff accounts and their access.', icon: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5"/>' },
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
        <a href="https://rise.syberlabs.io/"><svg class="portal-app-art portal-app-art--reader" viewBox="0 0 360 146" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor"><ellipse cx="180" cy="75" rx="105" ry="42"/><ellipse cx="180" cy="75" rx="78" ry="31"/><ellipse cx="180" cy="75" rx="52" ry="21"/></g><text x="180" y="81" text-anchor="middle" fill="currentColor" font-size="20" letter-spacing="5">READ</text></svg><div class="portal-app-copy"><span class="portal-kicker">READ</span><strong>RISE Reader</strong><p>Give your words time, light and sound.</p><span class="portal-apps__arrow" aria-hidden="true">↗</span></div></a>
        <a href="https://sketch.syberlabs.io/"><svg class="portal-app-art portal-app-art--sketch" viewBox="0 0 360 146" aria-hidden="true" focusable="false"><path d="M55 104C105 5 100 143 150 44S184 132 225 48 259 121 307 41" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M55 115C105 16 100 154 150 55S184 143 225 59 259 132 307 52" fill="none" stroke="currentColor" opacity=".25" stroke-width="3"/></svg><div class="portal-app-copy"><span class="portal-kicker">DRAW</span><strong>RISE Sketch</strong><p>Make a mark with living ink.</p><span class="portal-apps__arrow" aria-hidden="true">↗</span></div></a>
        <a href="https://omni.syberlabs.io/"><svg class="portal-app-art portal-app-art--flyspace" viewBox="0 0 360 146" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor"><path d="m180 20 92 52-92 53-92-53 92-52Z M180 20v105 M88 72l92 0 92 0 M134 46l92 53 M226 46l-92 53"/><circle cx="180" cy="72" r="62" opacity=".35"/></g></svg><div class="portal-app-copy"><span class="portal-kicker">EXPLORE</span><strong>FLYSPACE</strong><p>A spatial workspace for your ideas.</p><span class="portal-apps__arrow" aria-hidden="true">↗</span></div></a>
      </div>
    </section>
    <section id="portal-tools" class="portal-tools" aria-labelledby="tools-title"><div class="portal-section-head"><h2 id="tools-title">Your workspace</h2></div><div class="portal-grid">${cards(personal)}</div></section>
    ${team.length ? `<section class="portal-team" aria-labelledby="team-title"><div class="portal-section-head"><h2 id="team-title">Team tools</h2></div><div class="portal-grid">${cards(team, true)}</div></section>` : '<p class="portal-access-note">Your tools, saved things and account are available. An admin can grant you a role if you need team tools.</p>'}
    <aside class="portal-outpost"><p>Explore the projects and research behind SyberLabs.</p><a href="/">Visit the public site <span aria-hidden="true">→</span></a></aside>
  </div>`;
  return html(page(ctx, { title: 'Launchpad', body, section: 'portal', compactFooter: true }));
}
