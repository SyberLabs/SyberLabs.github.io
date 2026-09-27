// Project page template (SyberLabs DS v1): one neutral template for every project.
// Pure module: used in the browser (experience-v7.js) and at build time (scripts/prerender.mjs).
// The project accent appears only as its identity marker: the dot, the index number and the active indicator.
import { projects, nav, headerAction, footerLinks } from './site-data.js';
export { projects };

const ICONS = {
  arrow: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  external: '<path d="M7 17L17 7"/><path d="M8 7h9v9"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 9l5 3-5 3z"/>',
  menu: '<path d="M4 9h16"/><path d="M4 15h16"/>',
  close: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  sound: '<path d="M4 10v4h3l5 4V6l-5 4H4z"/><path d="M16 9a4 4 0 0 1 0 6"/>',
  stream: '<path d="M4 7h9M4 12h13M4 17h6"/><path d="M17 14l3 3-3 3"/>',
  page: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  conditions: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
};
const icon = (name, size = 20, cls = '') =>
  `<svg class="sy-icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
const esc = value => String(value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const badge = status => `<span class="sy-badge sy-badge--${status.kind}"><span class="sy-badge__dot" aria-hidden="true"></span>${esc(status.label)}</span>`;

// Shared page shell. `current` marks the nav item (header) or footer link (by href) for this page.
// Static pages get the same markup from scripts/shell.mjs, so there is one source for both.
export const header = (current = '') => {
  const cur = item => item.id === current ? ' aria-current="page"' : '';
  return `<a class="sy-skip" href="#main">Skip to content</a>
<header class="sy-header"><div class="sy-header__inner">
  <a class="sy-lockup" href="/" aria-label="SyberLabs home"><img class="sy-lockup__mark" src="/syber-logo-96.png" alt="" width="18" height="20"><span>SYBERLABS</span></a>
  <nav class="sy-header__nav" aria-label="Primary"><ul>${nav.map(item => `<li><a class="sy-header__link" href="${item.href}"${cur(item)}>${item.label}</a></li>`).join('')}</ul><a class="sy-btn sy-btn--secondary sy-header__action" href="${headerAction.href}">${headerAction.label}</a></nav>
  <details class="sy-menu"><summary class="sy-btn sy-btn--icon" aria-label="Menu">${icon('menu', 20, 'sy-icon--open')}${icon('close', 20, 'sy-icon--close')}</summary><div class="sy-menu__panel"><nav aria-label="Mobile"><ul>${nav.map(item => `<li><a href="${item.href}"${cur(item)}>${item.label}</a></li>`).join('')}</ul><a class="sy-btn sy-btn--secondary" href="${headerAction.href}">${headerAction.label}</a></nav></div></details>
</div></header>`;
};

export const footer = (current = '') => `<footer class="sy-footer"><div class="sy-footer__inner">
  <div class="sy-footer__brand"><a class="sy-lockup" href="/" aria-label="SyberLabs home"><img class="sy-lockup__mark" src="/syber-logo-96.png" alt="" width="18" height="20"><span>SYBERLABS</span></a><span class="sy-footer__copy">© 2026 SyberLabs</span></div>
  <nav class="sy-footer__nav" aria-label="Footer">${footerLinks.map(link => `<a class="sy-footer__link" href="${link.href}"${link.href === current ? ' aria-current="page"' : ''}>${link.label}${link.external ? icon('external', 16) : ''}</a>`).join('')}</nav>
</div></footer>`;

function actions(p) {
  const primary = p.primary && `<a class="sy-btn sy-btn--primary" href="${p.primary.href}">${esc(p.primary.label)}${icon(p.primary.external ? 'external' : 'arrow', 20, 'sy-icon--trail')}</a>`;
  const secondary = p.secondary ? `<a class="sy-btn sy-btn--secondary" href="${p.secondary.href}">${esc(p.secondary.label)}</a>` : '';
  const ghost = p.ghost ? `<a class="sy-btn sy-btn--ghost" href="${p.ghost.href}">${icon(p.ghost.icon || 'arrow')}${esc(p.ghost.label)}</a>` : '';
  return `<div class="sy-actions pj-actions">${primary || ''}${secondary}${ghost}</div>`;
}

const riseFrame = () => `
<section class="pj-frame sy-container" aria-label="RISE preview">
  <div class="pj-frame__box" role="img" aria-label="The RISE reader in Stream mode: one line of Meditations by Marcus Aurelius on a dark stage, with a progress line and playback controls.">
    <div class="pj-frame__bar sy-label">
      <div class="pj-frame__work"><span class="pj-frame__work-title">Meditations</span><span aria-hidden="true">·</span><span>Marcus Aurelius</span></div>
      <div class="pj-frame__tabs"><span class="is-active">Stream</span><span>Page</span><span>Conditions</span></div>
    </div>
    <div class="pj-frame__stage">
      <p class="pj-frame__line">Very little is needed to make <span>a happy life.</span></p>
      <span class="pj-frame__source sy-label">Meditations · Marcus Aurelius</span>
    </div>
    <div class="pj-frame__progress"><span></span></div>
    <div class="pj-frame__controls sy-label">
      <div class="pj-frame__time">${icon('pause')}<span><span class="pj-frame__hi">04:12</span> / 11:08</span></div>
      <div class="pj-frame__meta"><span class="pj-frame__pace">Pace <span class="pj-frame__hi">180 wpm</span></span><span class="pj-frame__sound">${icon('sound')}<span class="pj-frame__hi">Sound on</span></span></div>
    </div>
  </div>
</section>`;

const riseHow = () => `
<section class="pj-section sy-container" aria-labelledby="how-title">
  <div class="pj-split">
    <h2 id="how-title" class="sy-label">How it works</h2>
    <p class="sy-title pj-split__main">One text. Many ways to feel it.</p>
  </div>
  <div class="pj-how">
    ${[['stream', 'Stream', 'Words arrive through time. Set pacing and playback.'], ['page', 'Page', 'Words occupy a spatial surface you can navigate.'], ['conditions', 'Conditions', 'Tune visual fields and sound around the reading.']]
      .map(([key, title, text]) => `<div class="pj-how__item">${icon(key)}<h3 class="sy-subheading">${title}</h3><p>${text}</p></div>`).join('')}
  </div>
</section>`;

// Commons: the record every project keeps (formerly the separate /commons/ page).
const commonsHow = () => `
<section class="pj-section sy-container" aria-labelledby="how-title">
  <div class="pj-split">
    <h2 id="how-title" class="sy-label">How it works</h2>
    <div class="pj-split__main"><p class="sy-title">Every project keeps its history.</p><p class="sy-small pj-split__note">Phase 0 example with synthetic data.</p></div>
  </div>
  <ol class="pj-how pj-how--steps">
    ${[['01 / Need', 'Name the problem', 'Describe the need and the outcome the community would recognize.'], ['02 / Evidence', 'Show the basis', 'Keep supporting material and unanswered questions close to the plan.'], ['03 / Human review', 'Request changes', 'A reviewer can send a draft back for changes. Each decision is kept in the audit history.'], ['04 / Outcome', 'Carry learning forward', 'Planned: make results and reusable patterns easy to review and apply to the next project.']]
      .map(([label, title, text]) => `<li class="pj-how__item"><span class="sy-label">${label}</span><h3 class="sy-subheading">${title}</h3><p>${text}</p></li>`).join('')}
  </ol>
</section>`;

function facts(p) {
  const value = v => typeof v === 'string' ? esc(v) : `<a class="sy-link sy-link--inline" href="${v.href}">${esc(v.label)}${/^https?:/.test(v.href) ? icon('external', 16) : ''}</a>`;
  const rows = [['Status', `<span class="sy-badge sy-badge--${p.status.kind} pj-facts__badge"><span class="sy-badge__dot" aria-hidden="true"></span>${esc(p.status.label)}</span>`], ...p.facts.map(([k, v]) => [k, value(v)])];
  return `
<section class="pj-section sy-container" aria-labelledby="facts-title">
  <div class="pj-split pj-split--facts">
    <h2 id="facts-title" class="sy-label pj-facts__label">Facts</h2>
    <dl class="pj-facts pj-split__main">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>
  </div>
</section>`;
}

function others(p) {
  const rows = projects.filter(item => item.slug !== p.slug).map(item => `
    <a class="sy-row" href="/projects/${item.slug}/" style="--accent:${item.accent}">
      <span class="sy-row__number">${item.number}</span>
      <span class="sy-row__id"><span class="sy-row__name-line"><span class="sy-row__dot" aria-hidden="true"></span><span class="sy-row__name">${esc(item.name)}</span></span><span class="sy-row__category sy-label">${esc(item.category)}</span></span>
      <span class="sy-row__copy"><span class="sy-row__headline">${esc(item.headline)}</span></span>
      <span class="sy-row__status">${badge(item.status)}</span>
      <span class="sy-row__arrow">${icon('arrow')}</span>
    </a>`).join('');
  return `
<section class="pj-section sy-container" aria-labelledby="others-title">
  <div class="pj-others__head"><h2 id="others-title" class="sy-label">Other projects</h2><a class="sy-link sy-link--sm pj-others__all" href="/#work">All work${icon('arrow', 16)}</a></div>
  <div class="sy-rows sy-rows--compact pj-others">${rows}</div>
</section>`;
}

export function renderProject(p) {
  return {
    title: `${p.pageTitle || p.name} | SyberLabs`,
    description: `${p.intro} ${p.summary || ''}`.trim(),
    body: `${header('work')}
<main id="main">
  <section class="pj-hero sy-container" aria-labelledby="project-title">
    <p class="pj-eyebrow sy-label"><span class="pj-dot" aria-hidden="true"></span><span><span class="pj-number">${p.number}</span> / ${esc(p.category)}</span></p>
    <div class="pj-identity"><span class="sy-heading">${esc(p.name)}</span><span class="pj-divider" aria-hidden="true"></span>${badge(p.status)}</div>
    <h1 id="project-title" class="sy-display pj-title">${esc(p.headline)}</h1>
    <p class="sy-body-lg pj-intro">${esc(p.intro)}</p>
    ${p.summary ? `<p class="pj-summary">${esc(p.summary)}</p>` : ''}
    ${actions(p)}
  </section>
  ${p.slug === 'rise' ? riseFrame() + riseHow() : ''}
  ${p.slug === 'commons' ? commonsHow() : ''}
  ${facts(p)}
  ${others(p)}
</main>
${footer(`/projects/${p.slug}/`)}`,
  };
}
