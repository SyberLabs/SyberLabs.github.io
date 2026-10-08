// Project page template (SyberLabs site v3 "Observatory" on the Atlas v2 kit): one template for every project.
// Pure module: used in the browser (experience-v7.js), at build time (scripts/prerender.mjs), by the homepage
// (src/App.jsx renders the same header/footer) and by scripts/site-chrome.mjs, which writes the same header
// and footer into the static pages.
// Each project carries its sigil (a de Jong attractor seeded by its slug) large in a plate frame, drawn flat
// by kit/v2/syber-sigil.js and, when WebGL is fast, spun in 3D over it by src/site/field.js.
import { projects, nav, workWithUs, footerLinks, siteMap, EMAIL } from './site-data.js';
import { params as sigilParams } from '../kit/v2/syber-sigil.js';
export { projects };

const ICONS = {
  arrow: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5"/><path d="M11 18l-6-6 6-6"/>',
  external: '<path d="M7 17L17 7"/><path d="M8 7h9v9"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 9l5 3-5 3z"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  sound: '<path d="M4 10v4h3l5 4V6l-5 4H4z"/><path d="M16 9a4 4 0 0 1 0 6"/>',
  stream: '<path d="M4 7h9M4 12h13M4 17h6"/><path d="M17 14l3 3-3 3"/>',
  page: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  conditions: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
};
export const icon = (name, size = 20, cls = '') =>
  `<svg class="sy-icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
const esc = value => String(value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const badge = (status, cls = '') => `<span class="sy-badge sy-badge--${status.kind}${cls ? ' ' + cls : ''}">${esc(status.label)}</span>`;
const PLATES = ['II', 'III', 'IV', 'V', 'VI', 'VII'];

// The Atlas: the full-screen site map inside the header's <details>. Works without JS (details/summary);
// src/site/nav.js adds Esc, focus handling and the "/" shortcut.
const atlas = () => `<div class="sy-atlas" id="sy-atlas" role="dialog" aria-label="Site map">
  <span class="sy-atlas__backdrop" aria-hidden="true"></span>
  <div class="sy-atlas__panel">
    <div class="sy-atlas__head"><p class="sy-eyebrow">Atlas / every page on syberlabs.io</p><button class="sy-atlas__close" type="button" aria-label="Close menu">${icon('close', 20)}</button></div>
    <div class="sy-atlas__groups">${siteMap.map(group => `<section class="sy-atlas__group" aria-labelledby="atlas-${group.title.toLowerCase()}"><h2 id="atlas-${group.title.toLowerCase()}" class="sy-atlas__title">${esc(group.title)}</h2><ul>${group.items.map(item => `<li><a href="${item.href}"${item.external ? ' rel="noopener"' : ''}${item.accent ? ` style="--sy-accent:${item.accent}"` : ''}>${item.sigil ? `<canvas class="sy-atlas__sigil" data-sigil="${item.sigil}" data-color="${item.accent}" aria-hidden="true"></canvas>` : '<span class="sy-atlas__dot" aria-hidden="true"></span>'}<span class="sy-atlas__label">${esc(item.label)}${item.external ? ' ' + icon('external', 14) : ''}</span><span class="sy-atlas__note">${esc(item.note)}</span></a></li>`).join('')}</ul></section>`).join('')}</div>
    <p class="sy-atlas__foot"><span>Press <kbd>/</kbd> anywhere to open this map · <kbd>Esc</kbd> closes</span><a href="mailto:${EMAIL}">${EMAIL}</a></p>
  </div>
</div>`;

// Site chrome: identical markup on every static page (see scripts/site-chrome.mjs) and the project pages.
// `current` marks the page: a nav id for the header, a link href for the footer.
// `sticky` (default) keeps the header in flow; the homepage passes false so it floats over the hero.
export const header = (current = '', { sticky = true, script = true } = {}) => {
  const cur = item => item.id === current ? ' aria-current="page"' : '';
  const links = nav.map(item => `<li><a href="${item.href}"${cur(item)}>${item.label}</a></li>`).join('');
  return `<a class="sy-skip" href="#main">Skip to content</a>
<div class="sy-field-host" aria-hidden="true"><canvas class="sy-field"></canvas></div>
<header class="sy-header${sticky ? ' sy-header--sticky' : ''}"><div class="sy-header__in">
  <a class="sy-lockup" href="/" aria-label="SyberLabs home"><img src="/syber-logo-96.png" alt="" width="22" height="24">SYBERLABS</a>
  <nav class="sy-nav" aria-label="Primary"><ul>${links}</ul><a class="sy-btn sy-btn--line" href="${workWithUs.href}">${workWithUs.label}</a></nav>
  <details class="sy-menu"><summary aria-expanded="false" aria-controls="sy-atlas">${icon('menu', 18)}<span>Menu</span></summary>${atlas()}</details>
</div></header>${script ? '\n<script type="module" src="/syberlabs.js"></script>' : ''}`;
};

// The footer carries the whole map too, so every page is reachable without opening the menu (and without JS).
export const footer = (current = '') => `<footer class="sy-footer">
<div class="sy-footer__map"><div class="sy-footer__map-in">${siteMap.map(group => `<section aria-labelledby="foot-${group.title.toLowerCase()}"><h2 id="foot-${group.title.toLowerCase()}" class="sy-eyebrow">${esc(group.title)}</h2><ul>${group.items.map(item => `<li><a href="${item.href}"${item.external ? ' rel="noopener"' : ''}${item.href === current ? ' aria-current="page"' : ''}${item.accent ? ` style="--sy-accent:${item.accent}"` : ''}>${item.accent ? '<span class="sy-footer__dot" aria-hidden="true"></span>' : ''}${esc(item.label)}${item.external ? ' ' + icon('external', 14) : ''}</a></li>`).join('')}</ul></section>`).join('')}</div></div>
<div class="sy-footer__in">
  <a class="sy-lockup" href="/"><img src="/syber-logo-96.png" alt="" width="18" height="20">© 2026 SyberLabs</a>
  <nav aria-label="Footer">${footerLinks.map(link => `<a href="${link.href}"${link.href === current ? ' aria-current="page"' : ''}>${link.label}${link.external ? ' ' + icon('external', 16) : ''}</a>`).join('')}</nav>
</div></footer>`;

// Breadcrumb for every page below the homepage.
export const crumbs = (items) => `<nav class="sy-crumbs" aria-label="Breadcrumb"><ol><li><a href="/">SyberLabs</a></li>${items.map((it, i) => `<li>${i === items.length - 1 ? `<span aria-current="page">${esc(it.label)}</span>` : `<a href="${it.href}">${esc(it.label)}</a>`}</li>`).join('')}</ol></nav>`;

// A product sigil in a plate frame, with its de Jong parameters as the plate caption. The flat sigil is
// always drawn; a 3D cloud (data-sigil3d) spins over it when the field engine is available.
export function sigilPlate(seed, plate, title, cls = '') {
  const id = `params-${seed}`;
  return `<figure class="sy-plate-figure site-sigil ${cls}" aria-hidden="true" data-tilt="6" data-sigil3d-host>
    <div class="sy-plate sy-plate--sigil"><canvas data-sigil="${esc(seed)}" data-caption-for="${id}"></canvas><canvas class="sy-sigil3d" data-sigil3d="${esc(seed)}"></canvas><span class="sy-plate__sheen"></span></div>
    <figcaption><b>Plate ${plate} · ${esc(title)}</b>de Jong map · <span class="sy-nowrap">seed “${esc(seed)}”</span><span class="sy-params" id="${id}">${sigilParams(seed).caption}</span></figcaption>
  </figure>`;
}

function actions(p) {
  const primary = p.primary ? `<a class="sy-btn sy-btn--solid" href="${p.primary.href}">${esc(p.primary.label)}${icon(p.primary.external ? 'external' : 'arrow', 18, 'sy-icon--trail')}</a>` : '';
  const secondary = p.secondary ? `<a class="sy-btn sy-btn--line" href="${p.secondary.href}">${esc(p.secondary.label)}</a>` : '';
  const ghost = p.ghost ? `<a class="sy-btn sy-btn--ghost" href="${p.ghost.href}">${icon(p.ghost.icon || 'arrow', 18)}${esc(p.ghost.label)}</a>` : '';
  return `<div class="sy-actions pj-actions">${primary}${secondary}${ghost}</div>`;
}

// A live destination, named at the top of the page so a visitor can reach the running thing in one tap.
const liveBar = p => p.live ? `
<section class="pj-live sy-container" aria-label="Where to use ${esc(p.name)}" data-reveal>
  <a class="pj-live__card sy-card" href="${p.live.href}" rel="noopener" data-tilt="2">
    <span class="pj-live__dot" aria-hidden="true"></span>
    <span class="pj-live__text"><span class="pj-live__label">${esc(p.status.label)} · <b>${esc(p.live.label)}</b></span><span class="pj-live__note">${esc(p.live.note)}</span></span>
    <span class="sy-btn sy-btn--solid pj-live__go">Open${icon('external', 18, 'sy-icon--trail')}</span>
  </a>
</section>` : '';

// A demo film in a plate frame. The video never autoplays; the poster is the page's still.
const videoSection = p => p.video ? `
<section class="pj-section pj-video sy-container" aria-labelledby="video-title">
  <div class="pj-split" data-reveal>
    <h2 id="video-title" class="sy-eyebrow">Demo film</h2>
    <p class="sy-title pj-split__main">${esc(p.video.title)}</p>
  </div>
  <figure class="pj-video__figure" data-reveal>
    <div class="sy-plate pj-video__box" data-tilt="2"><video controls preload="none" playsinline poster="${p.video.poster}" aria-label="${esc(p.video.title)}"><source src="${p.video.src}" type="video/mp4"><a href="${p.video.src}">Download the film (MP4)</a></video></div>
    <figcaption class="sy-small pj-video__caption">${esc(p.video.caption)}</figcaption>
  </figure>
</section>` : '';

// Motivation: why the thing exists, in two paragraphs.
const whySection = p => p.why ? `
<section class="pj-section sy-container" aria-labelledby="why-title">
  <div class="pj-split" data-reveal>
    <h2 id="why-title" class="sy-eyebrow">Why</h2>
    <div class="pj-split__main"><p class="sy-title">${esc(p.why.title)}</p><div class="pj-why" data-reveal-children>${p.why.paragraphs.map(t => `<p class="sy-body">${esc(t)}</p>`).join('')}</div></div>
  </div>
</section>` : '';

// Use case: the numbered steps a person actually takes.
const useSection = p => p.use ? `
<section class="pj-section sy-container" aria-labelledby="use-title">
  <div class="pj-split" data-reveal>
    <h2 id="use-title" class="sy-eyebrow">Use</h2>
    <div class="pj-split__main"><p class="sy-title">${esc(p.use.title)}</p>${p.use.note ? `<p class="sy-small pj-split__note">${esc(p.use.note)}</p>` : ''}</div>
  </div>
  <ol class="pj-how pj-how--steps pj-how--${p.use.steps.length}" data-reveal-children>
    ${p.use.steps.map(([label, title, text]) => `<li class="pj-how__item sy-card" data-tilt="5"><span class="sy-label">${esc(label)}</span><h3 class="sy-subheading">${esc(title)}</h3><p>${esc(text)}</p></li>`).join('')}
  </ol>
</section>` : '';

// Gallery: screenshots of the real thing, each in a plate frame with a caption that says exactly what it shows
// (room, build, date, source of the text). p.gallery = { title, note, link?, items: [{ src, alt, label?, caption, width?, height? }] }.
const gallerySection = p => p.gallery ? `
<section class="pj-section pj-gallery sy-container" aria-labelledby="gallery-title">
  <div class="pj-split" data-reveal>
    <h2 id="gallery-title" class="sy-eyebrow">${esc(p.gallery.eyebrow || 'Gallery')}</h2>
    <div class="pj-split__main"><p class="sy-title">${esc(p.gallery.title)}</p>${p.gallery.note ? `<p class="sy-small pj-split__note">${esc(p.gallery.note)}${p.gallery.link ? ` <a class="sy-link pj-gallery__link" href="${p.gallery.link.href}">${esc(p.gallery.link.label)}</a>` : ''}</p>` : ''}</div>
  </div>
  <ul class="pj-gallery__grid" data-reveal-children>
    ${p.gallery.items.map(it => `<li class="pj-gallery__item"><figure class="pj-gallery__figure"><div class="sy-plate pj-gallery__plate" data-tilt="3"><img src="${it.src}" alt="${esc(it.alt)}" width="${it.width || 1440}" height="${it.height || 900}" loading="lazy" decoding="async"></div><figcaption class="sy-small pj-gallery__caption">${it.label ? `<b>${esc(it.label)}</b>` : ''}${esc(it.caption)}</figcaption></figure></li>`).join('')}
  </ul>
</section>` : '';

// Design: how it is built, as a grid of named mechanisms.
const designSection = p => p.design ? `
<section class="pj-section sy-container" aria-labelledby="design-title">
  <div class="pj-split" data-reveal>
    <h2 id="design-title" class="sy-eyebrow">Design</h2>
    <p class="sy-title pj-split__main">${esc(p.design.title)}</p>
  </div>
  <ul class="pj-design" data-reveal-children>
    ${p.design.items.map(([title, text]) => `<li class="pj-design__item sy-card" data-tilt="4"><h3 class="sy-subheading">${esc(title)}</h3><p>${esc(text)}</p></li>`).join('')}
  </ul>
</section>` : '';

// Evidence: each claim labelled with the state it has reached, and what has not been shown.
const STATES = { deployed: 'Deployed', measured: 'Measured', tested: 'Tested', implemented: 'Implemented', 'not yet': 'Not yet' };
const evidenceSection = p => p.evidence ? `
<section class="pj-section sy-container" aria-labelledby="evidence-title">
  <div class="pj-split pj-split--facts" data-reveal>
    <h2 id="evidence-title" class="sy-eyebrow pj-facts__label">Evidence</h2>
    <div class="pj-split__main">
      <ul class="pj-evidence" data-reveal-children>${p.evidence.map(([state, text]) => `<li class="pj-evidence__row is-${state.replace(/\s+/g, '-')}"><span class="pj-evidence__state sy-label"><i aria-hidden="true"></i>${esc(STATES[state] || state)}</span><p>${esc(text)}</p></li>`).join('')}</ul>
      ${p.reflects ? `<p class="sy-small pj-evidence__ref">Reflects ${esc(p.reflects)}. Each state is earned by code, a named test, a measurement under stated conditions, or a deployment; none is promoted by wording.</p>` : ''}
    </div>
  </div>
</section>` : '';

// An inspectable system map (src/system-maps/), drawn from the repository's own recorded or rule-based trace.
// The host keeps a paragraph for readers without JavaScript; /system-map.js replaces it with the exhibit.
const mapSection = p => p.map ? `
<section class="pj-section pj-map sy-container" aria-labelledby="map-title">
  <div class="pj-split" data-reveal>
    <h2 id="map-title" class="sy-eyebrow">Inspect</h2>
    <div class="pj-split__main"><p class="sy-title">${esc(p.map.title)}</p><p class="sy-small pj-split__note">${esc(p.map.note)}</p></div>
  </div>
  <div class="pj-map__host" data-system-map="${esc(p.map.id)}" data-reveal><p class="sy-small pj-map__fallback">${esc(p.map.fallback)}</p></div>
  <script type="module" src="/system-map.js"></script>
</section>` : '';

// A recorded run: the output of running the repository's own example, shown as it came back.
const runSection = p => p.run ? `
<section class="pj-section pj-run sy-container" aria-labelledby="run-title">
  <div class="pj-split" data-reveal>
    <h2 id="run-title" class="sy-eyebrow">Recorded run</h2>
    <div class="pj-split__main"><p class="sy-title">${esc(p.run.title)}</p><p class="sy-small pj-split__note">${esc(p.run.note)}</p></div>
  </div>
  <figure class="pj-run__figure" data-reveal>
    <div class="sy-plate pj-run__box" data-tilt="2"><p class="pj-run__cmd sy-label">${esc(p.run.command)}</p><pre class="pj-run__out"><code>${esc(p.run.output)}</code></pre></div>
    <figcaption class="sy-small pj-run__caption">${esc(p.run.caption)}</figcaption>
  </figure>
</section>` : '';

// Dependency evidence: an empty, hidden host that experience-v7.js fills from /githits/<slug>.json (the
// project's declared packages as GitHits reported them). No file, no JavaScript or a failed fetch: nothing shows.
const depsSection = p => `
<section id="dependency-evidence" class="pj-section pj-deps sy-container" aria-labelledby="deps-title" data-githits="${esc(p.slug)}" hidden></section>`;

const sections = p => `${liveBar(p)}${videoSection(p)}${whySection(p)}${useSection(p)}${gallerySection(p)}${mapSection(p)}${runSection(p)}${designSection(p)}${evidenceSection(p)}${facts(p)}${depsSection(p)}`;

// Every section below the hero, in reading order. Exported so the static RISE page (projects/rise/index.html,
// authored by hand) can carry the same sections: scripts/prerender.mjs fills its marker at build time. That page
// does not otherwise load experience-v7.js, so the sections bring it along to fill the dependency panel.
export const renderSections = p => `${sections(p)}
<script type="module" src="/projects/experience-v7.js?v=15"></script>`;

function facts(p) {
  const value = v => typeof v === 'string' ? esc(v) : `<a class="sy-link pj-facts__link" href="${v.href}">${esc(v.label)}${/^https?:/.test(v.href) ? icon('external', 16) : ''}</a>`;
  const rows = [['Status', badge(p.status)], ...p.facts.map(([k, v]) => [k, k === 'Technology' ? `<span class="pj-facts__tech">${value(v)}</span>` : value(v)])];
  return `
<section class="pj-section sy-container" aria-labelledby="facts-title">
  <div class="pj-split pj-split--facts" data-reveal>
    <h2 id="facts-title" class="sy-eyebrow pj-facts__label">Facts</h2>
    <dl class="pj-facts pj-split__main">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>
  </div>
</section>`;
}

export function projectRow(item, { intro = true } = {}) {
  const tech = item.facts.find(([k]) => k === 'Technology')?.[1];
  return `<li><a class="sy-project-row" href="/projects/${item.slug}/" style="--sy-accent:${item.accent}" data-tilt="2">
    <span class="sy-project-row__index">${item.number}</span>
    <canvas class="sy-project-row__sigil" data-sigil="${item.slug}" aria-hidden="true"></canvas>
    <span class="sy-project-row__name"><span class="sy-project-row__title">${esc(item.name)}</span><span class="sy-project-row__cat">${esc(item.category)}</span></span>
    <span class="sy-project-row__body"><span class="sy-project-row__headline">${esc(item.headline)}</span>${intro ? `<span class="sy-project-row__intro">${esc(item.intro)}</span>${tech ? `<span class="sy-project-row__stack">${esc(tech)}</span>` : ''}` : ''}</span>
    ${badge(item.status)}
    <svg class="sy-project-row__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS.arrow}</svg>
  </a></li>`;
}

// Previous / next project, so the five pages read as one loop.
function neighbours(p) {
  const i = projects.indexOf(p), prev = projects[(i + projects.length - 1) % projects.length], next = projects[(i + 1) % projects.length];
  const card = (q, dir) => `<a class="sy-neighbour sy-neighbour--${dir}" href="/projects/${q.slug}/" style="--sy-accent:${q.accent}" data-tilt="4">
    <span class="sy-neighbour__dir sy-label">${dir === 'prev' ? icon('back', 16) + 'Previous' : 'Next' + icon('arrow', 16)}</span>
    <canvas class="sy-neighbour__sigil" data-sigil="${q.slug}" aria-hidden="true"></canvas>
    <span class="sy-neighbour__name">${esc(q.name)}</span><span class="sy-neighbour__cat">${esc(q.category)}</span>
  </a>`;
  return `<nav class="sy-neighbours sy-container" aria-label="Previous and next project" data-reveal>${card(prev, 'prev')}<a class="sy-neighbour sy-neighbour--all" href="/#work"><span class="sy-label">All projects</span><span class="sy-neighbour__name">${projects.length} projects</span></a>${card(next, 'next')}</nav>`;
}

function others(p) {
  return `
<section class="pj-section sy-container" aria-labelledby="others-title">
  <div class="pj-others__head" data-reveal><h2 id="others-title" class="sy-eyebrow">Other projects</h2><a class="sy-link sy-link--sm pj-others__all" href="/#work">All work${icon('arrow', 16)}</a></div>
  <ul class="sy-project-rows pj-others" data-reveal-children>${projects.filter(item => item.slug !== p.slug).map(item => projectRow(item, { intro: false })).join('')}</ul>
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
      ${crumbs([{ label: 'Work', href: '/#work' }, { label: p.name }])}
      <p class="pj-eyebrow sy-eyebrow" data-reveal><span class="pj-number">${p.number}</span> / ${esc(p.category)}</p>
      <div class="pj-identity" data-reveal><span class="pj-name">${esc(p.name)}</span>${badge(p.status)}</div>
      <h1 id="project-title" class="sy-display pj-title" data-split>${esc(p.headline)}</h1>
      <p class="sy-body-lg pj-intro" data-reveal>${esc(p.intro)}</p>
      ${p.summary ? `<p class="pj-summary" data-reveal>${esc(p.summary)}</p>` : ''}
      <div data-reveal>${actions(p)}</div>
    </div>
    ${sigilPlate(p.slug, PLATES[i] || 'II', p.name, 'pj-sigil')}
  </section>
  ${sections(p)}
  ${others(p)}
  ${neighbours(p)}
</main>
${footer()}`,
  };
}
