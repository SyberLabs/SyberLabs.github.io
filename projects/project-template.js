// Project page template (SyberLabs design system v2 "Atlas"): one template for every project.
// Pure module: used in the browser (experience-v7.js), at build time (scripts/prerender.mjs), and by
// scripts/site-chrome.mjs, which writes the same header and footer into the static pages.
// Each project carries its sigil (a de Jong attractor seeded by its slug) large in a plate frame.
import { projects, nav, workWithUs, footerLinks } from './site-data.js';
import { params as sigilParams } from '../kit/v2/syber-sigil.js';
export { projects };

const ICONS = {
  arrow: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  external: '<path d="M7 17L17 7"/><path d="M8 7h9v9"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 9l5 3-5 3z"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  sound: '<path d="M4 10v4h3l5 4V6l-5 4H4z"/><path d="M16 9a4 4 0 0 1 0 6"/>',
  stream: '<path d="M4 7h9M4 12h13M4 17h6"/><path d="M17 14l3 3-3 3"/>',
  page: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  conditions: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
};
export const icon = (name, size = 20, cls = '') =>
  `<svg class="sy-icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
const esc = value => String(value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const badge = (status, cls = '') => `<span class="sy-badge sy-badge--${status.kind}${cls ? ' ' + cls : ''}">${esc(status.label)}</span>`;
const PLATES = ['II', 'III', 'IV', 'V', 'VI', 'VII'];

// Site chrome: identical markup on every static page (see scripts/site-chrome.mjs) and the project pages.
export const header = (current = '') => {
  const cur = item => item.id === current ? ' aria-current="page"' : '';
  const links = nav.map(item => `<li><a href="${item.href}"${cur(item)}>${item.label}</a></li>`).join('');
  return `<a class="sy-skip" href="#main">Skip to content</a>
<header class="sy-header sy-header--sticky"><div class="sy-header__in">
  <a class="sy-lockup" href="/" aria-label="SyberLabs home"><img src="/syber-logo-96.png" alt="" width="22" height="24">SYBERLABS</a>
  <nav class="sy-nav" aria-label="Primary"><ul>${links}</ul><a class="sy-btn sy-btn--line" href="${workWithUs.href}">${workWithUs.label}</a></nav>
  <details class="sy-menu"><summary>Menu</summary><div class="sy-menu__panel"><nav aria-label="Mobile"><ul>${links}</ul><a class="sy-btn sy-btn--solid" href="${workWithUs.href}">${workWithUs.label}</a></nav></div></details>
</div></header>`;
};

export const footer = () => `<footer class="sy-footer"><div class="sy-footer__in">
  <a class="sy-lockup" href="/"><img src="/syber-logo-96.png" alt="" width="18" height="20">© 2026 SyberLabs</a>
  <nav aria-label="Footer">${footerLinks.map(link => `<a href="${link.href}">${link.label}${link.external ? ' ' + icon('external', 16) : ''}</a>`).join('')}</nav>
</div></footer>`;

// A product sigil in a plate frame, with its de Jong parameters as the plate caption.
export function sigilPlate(seed, plate, title, cls = '') {
  const id = `params-${seed}`;
  return `<figure class="sy-plate-figure site-sigil ${cls}" aria-hidden="true">
    <div class="sy-plate sy-plate--sigil"><canvas data-sigil="${esc(seed)}" data-caption-for="${id}"></canvas></div>
    <figcaption><b>Plate ${plate} · ${esc(title)}</b>de Jong map · <span class="sy-nowrap">seed “${esc(seed)}”</span><span class="sy-params" id="${id}">${sigilParams(seed).caption}</span></figcaption>
  </figure>`;
}

function actions(p) {
  const primary = `<a class="sy-btn sy-btn--solid" href="${p.primary.href}">${esc(p.primary.label)}${icon(p.primary.external ? 'external' : 'arrow', 18, 'sy-icon--trail')}</a>`;
  const secondary = p.secondary ? `<a class="sy-btn sy-btn--line" href="${p.secondary.href}">${esc(p.secondary.label)}</a>` : '';
  const ghost = p.ghost ? `<a class="sy-btn sy-btn--ghost" href="${p.ghost.href}">${icon(p.ghost.icon || 'arrow', 18)}${esc(p.ghost.label)}</a>` : '';
  return `<div class="sy-actions pj-actions">${primary}${secondary}${ghost}</div>`;
}

const riseFrame = () => `
<section class="pj-frame sy-container" aria-label="RISE preview">
  <div class="sy-plate pj-frame__box" role="img" aria-label="The RISE reader in Stream mode: one line of Meditations by Marcus Aurelius on a dark stage, with a progress line and playback controls.">
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
    <h2 id="how-title" class="sy-eyebrow">How it works</h2>
    <p class="sy-title pj-split__main">One text. Many ways to feel it.</p>
  </div>
  <div class="pj-how">
    ${[['stream', 'Stream', 'Words arrive through time. Set pacing and playback.'], ['page', 'Page', 'Words occupy a spatial surface you can navigate.'], ['conditions', 'Conditions', 'Tune visual fields and sound around the reading.']]
      .map(([key, title, text]) => `<div class="pj-how__item">${icon(key)}<h3 class="sy-subheading">${title}</h3><p>${text}</p></div>`).join('')}
  </div>
</section>`;

function facts(p) {
  const value = v => typeof v === 'string' ? esc(v) : `<a class="sy-link pj-facts__link" href="${v.href}">${esc(v.label)}${/^https?:/.test(v.href) ? icon('external', 16) : ''}</a>`;
  const rows = [['Status', badge(p.status)], ...p.facts.map(([k, v]) => [k, k === 'Technology' ? `<span class="pj-facts__tech">${value(v)}</span>` : value(v)])];
  return `
<section class="pj-section sy-container" aria-labelledby="facts-title">
  <div class="pj-split pj-split--facts">
    <h2 id="facts-title" class="sy-eyebrow pj-facts__label">Facts</h2>
    <dl class="pj-facts pj-split__main">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>
  </div>
</section>`;
}

export function projectRow(item, { intro = true } = {}) {
  const tech = item.facts.find(([k]) => k === 'Technology')?.[1];
  return `<li><a class="sy-project-row" href="/projects/${item.slug}/" style="--sy-accent:${item.accent}">
    <span class="sy-project-row__index">${item.number}</span>
    <canvas class="sy-project-row__sigil" data-sigil="${item.slug}" aria-hidden="true"></canvas>
    <span class="sy-project-row__name"><span class="sy-project-row__title">${esc(item.name)}</span><span class="sy-project-row__cat">${esc(item.category)}</span></span>
    <span class="sy-project-row__body"><span class="sy-project-row__headline">${esc(item.headline)}</span>${intro ? `<span class="sy-project-row__intro">${esc(item.intro)}</span>${tech ? `<span class="sy-project-row__stack">${esc(tech)}</span>` : ''}` : ''}</span>
    ${badge(item.status)}
    <svg class="sy-project-row__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS.arrow}</svg>
  </a></li>`;
}

function others(p) {
  return `
<section class="pj-section sy-container" aria-labelledby="others-title">
  <div class="pj-others__head"><h2 id="others-title" class="sy-eyebrow">Other projects</h2><a class="sy-link sy-link--sm pj-others__all" href="/#work">All work${icon('arrow', 16)}</a></div>
  <ul class="sy-project-rows pj-others">${projects.filter(item => item.slug !== p.slug).map(item => projectRow(item, { intro: false })).join('')}</ul>
</section>`;
}

export function renderProject(p) {
  const i = projects.indexOf(p);
  return {
    title: `${p.pageTitle || p.name} | SyberLabs`,
    description: `${p.intro} ${p.summary || ''}`.trim(),
    body: `${header('work')}
<main id="main">
  <section class="pj-hero sy-container" aria-labelledby="project-title">
    <div class="pj-hero__copy">
      <p class="pj-eyebrow sy-eyebrow"><span class="pj-number">${p.number}</span> / ${esc(p.category)}</p>
      <div class="pj-identity"><span class="pj-name">${esc(p.name)}</span>${badge(p.status)}</div>
      <h1 id="project-title" class="sy-display pj-title">${esc(p.headline)}</h1>
      <p class="sy-body-lg pj-intro">${esc(p.intro)}</p>
      ${p.summary ? `<p class="pj-summary">${esc(p.summary)}</p>` : ''}
      ${actions(p)}
    </div>
    ${sigilPlate(p.slug, PLATES[i] || 'II', p.name, 'pj-sigil')}
  </section>
  ${p.slug === 'rise' ? riseFrame() + riseHow() : ''}
  ${facts(p)}
  ${others(p)}
</main>
${footer()}`,
  };
}
