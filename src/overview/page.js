// The overview page (/overview/), as HTML. A pure function of projects/site-data.js: the build writes its result into
// overview/index.html (vite.config.js), so the page a browser receives is complete without JavaScript.
// src/overview/main.js then starts the hero clip and mounts the canvas visuals as each scrolls near.
//
// This was the homepage until November 18, 2026 (commit ff2ae68). On November 25 the homepage became one visual
// (src/home/) and this page took everything else. It has a first screen and four parts: Factory (the software that
// checks AI's work, with the Line in a card), Studio (creative software, the pieces and the game), Lacuna (Lacuna
// Institute) and contact. Each product is described once, by its headline in projects/site-data.js. No individual is
// named: the site speaks for the company.
// Wording follows CLAUDE.md: every line states a fact a reader can check or act on. Factory, Studio and Lacuna are names.
import { CONTACT, CONSULT, EMAIL, GITHUB, LACUNA, LACUNA_PARACAS, projects } from '../../projects/site-data.js';
import { header, footer } from '../../projects/project-template.js';
import { sites as ATLAS_SITES, first as FIRST_SITE } from '../visuals/atlas.js';
import { HERO } from './media.js';
import { position } from './page-format.js';

const esc = value => String(value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const bySlug = slug => projects.find(p => p.slug === slug);
const FACTORY = ['syberwork', 'attest'].map(bySlug);
const STUDIO = ['rise', 'flyspace'].map(bySlug);

const status = s => `<span class="home-status${s.kind === 'live' ? ' is-live' : ''}"><i aria-hidden="true"></i>${esc(s.label)}</span>`;

const productRows = items => `<ul class="home-rows" role="list">${items.map(p => `
        <li><a href="/projects/${p.slug}/">
          <span class="home-rows__mark home-rows__no" aria-hidden="true">${esc(p.number)}</span>
          <span class="home-rows__name">${esc(p.name)}</span>
          <span class="home-rows__line">${esc(p.headline)}</span>
          ${status(p.status)}
        </a></li>`).join('')}
      </ul>`;

// Lacuna Institute's own mark: a ring with a gap.
const LACUNA_MARK = '<svg class="home-rows__mark" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="15.5" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="81 16.4" opacity=".85"/><circle cx="20" cy="20" r="9" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/><circle cx="20" cy="20" r="2.2" fill="#fc734d"/></svg>';
// Lacuna Institute's two published works. The counts are the pages' own: the Atlas lists its sites in
// src/lacuna/atlas/sites.js, and the dataset page counts 13 bundles.
const LACUNA_ROWS = [
  { href: LACUNA, name: 'Lacuna Atlas', line: `A globe of ${ATLAS_SITES.length} places where the historical record has a gap. Each has its sources and one open question.`, status: { kind: 'live', label: 'Live' } },
  { href: LACUNA_PARACAS, name: 'Paracas bundles', line: 'A census of the 13 Paracas mummy bundles recorded leaving Peru. Every claim carries a grade beside its source.', status: { kind: 'data', label: 'Dataset · version 1.0' } },
];
const lacunaRows = () => `<ul class="home-rows" role="list">${LACUNA_ROWS.map(r => `
        <li><a href="${r.href}">
          ${LACUNA_MARK}
          <span class="home-rows__name">${esc(r.name)}</span>
          <span class="home-rows__line">${esc(r.line)}</span>
          ${status(r.status)}
        </a></li>`).join('')}
      </ul>`;

// SyberWork's recorded run, read from the same output the product page prints (projects/site-data.js, `run`), so the
// two cannot disagree. It shows one row per proposed change: what was claimed, what SyberWork's own check found and
// what happened to the change. If the output ever stops parsing, or changes shape, the figure is left out. The
// table carries its roles in the markup because narrow screens lay it out as blocks (src/home/home.css).
const CHECK_WORDS = { 'candidate_check_failed:tests': 'Tests failed', all_checks_passed: 'All checks passed' };
function recordedRun(p) {
  const run = p && p.run;
  if (!run) return '';
  let data;
  try { data = JSON.parse(run.output.slice(0, run.output.lastIndexOf('}') + 1)); } catch { return ''; }
  const rows = [data.model, data.patch].filter(Boolean).map(c => {
    const checked = CHECK_WORDS[c.verdict];
    const accepted = c.accept === 'succeeded', denied = typeof c.accept === 'string' && c.accept.startsWith('denied');
    if (!c.candidate || !checked || (!accepted && !denied)) return null;
    const claimed = c.claimed ? `Tests ${esc(c.claimed.tests)}, confidence ${esc(c.claimed.confidence)}` : 'No claim in the record';
    return `<tr role="row"><th scope="row" role="rowheader">${esc(c.candidate)}</th><td role="cell" data-label="Claimed">${claimed}</td><td role="cell" data-label="SyberWork's check">${checked}</td><td role="cell" data-label="Outcome"><span class="home-run__outcome ${accepted ? 'is-accepted' : 'is-rejected'}"><i aria-hidden="true"></i>${accepted ? 'Accepted' : 'Rejected'}</span></td></tr>`;
  });
  if (rows.length !== 2 || rows.includes(null)) return '';
  return `
      <figure class="home-run">
        <figcaption>
          <p class="home-label">Recorded run</p>
          <p class="home-run__title">${esc(run.title)}</p>
          <p class="home-run__note">${esc(run.note)} <a href="/projects/${p.slug}/">Full output on the ${esc(p.name)} page</a></p>
        </figcaption>
        <table role="table" aria-label="${esc(run.title)}">
          <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Proposed change</th><th scope="col" role="columnheader">Claimed</th><th scope="col" role="columnheader">SyberWork&rsquo;s check</th><th scope="col" role="columnheader">Outcome</th></tr></thead>
          <tbody role="rowgroup">${rows.join('')}</tbody>
        </table>
      </figure>`;
}

// Pieces that move to sound. Each tile shows a still; pressing one runs the piece itself, one at a time.
const PIECES = [
  ['cymatica', 'Cymatica', 'Each note sets its own figure.'],
  ['plutonian-core', 'Plutonian Core', 'The kick strikes the core.'],
  ['kaleidos', 'Kaleidos', 'One attractor, folded 6 to 16 times.'],
  ['murmuration', 'Murmuration', 'Up to 20,000 birds, one flock.'],
];

// The Line (src/visuals/line.js), in a card. A model, drawn as a small network, proposes changes; each goes down the
// stations, and one that reaches Approve waits until the visitor presses Approve. The five steps are a list in the
// markup: with JavaScript each name is set beside its station on the canvas (src/overview/line.js), and without it
// the list reads as it is. The steps are in the factory page's words (/factory/).
const STEPS = [
  ['propose', 'Propose', 'A model proposes a change and reports its own test result.'],
  ['check', 'Check', 'SyberWork runs the checks on the files in the change.'],
  ['review', 'Review', 'A separate reviewer examines the change.'],
  ['approve', 'Approve', 'A person approves it.'],
  ['publish', 'Publish', 'The change is published after that approval.'],
];
// What each colour in the picture means. The same three colours mark the recorded run under it.
const KEY = [['machine', 'The model and its checks'], ['go', 'Passed, approved or published'], ['stop', 'Stopped or returned']];
const lineCard = () => `
        <figure class="home-line" data-line>
          <div class="home-line__zone" data-line-zone>
            <canvas class="home-line__canvas" data-visual="line" aria-hidden="true"></canvas>
            <p class="home-line__model"><b>Model</b> <span class="home-line__tally" data-line-model></span></p>
            <ol class="home-line__steps" aria-label="How SyberWork handles a change">${STEPS.map(([key, name, what]) => `
              <li data-step="${key}"><b>${name}</b> <span class="home-line__what">${what}</span> <span class="home-line__tally" data-tally="${key}"></span></li>`).join('')}
            </ol>
            <button class="home-line__approve" type="button" data-line-approve hidden>Approve</button>
          </div>
          <figcaption>
            <p class="home-line__state" data-line-state role="status"></p>
            <ul class="home-line__key" aria-label="What the colours mean">${KEY.map(([kind, what]) => `<li><i class="is-${kind}" aria-hidden="true"></i>${what}</li>`).join('')}</ul>
            <p class="home-line__note">The picture is an illustration with invented changes, drawn in your browser.</p>
          </figcaption>
        </figure>`;

const main = () => `<main id="main">
    <section class="home-hero" aria-labelledby="hero-title">
      <div class="home-hero__media"><picture><source media="(max-width: 600px)" srcset="${HERO.portraitPoster}" width="720" height="1280"><img src="${HERO.poster}" width="1280" height="720" alt="" fetchpriority="high"></picture></div>
      <div class="home-hero__copy sy-wrap">
        <h1 id="hero-title" tabindex="-1"><span class="home-wordmark" data-text="SyberLabs">SyberLabs</span></h1>
        <p class="home-hero__line">Software for checking AI&rsquo;s work.</p>
        <ul class="home-index" aria-label="Parts of SyberLabs">
          <li><a href="#factory"><b>Factory</b> <span>SyberWork tests AI-written code changes. Attest runs every step in your docs.</span></a></li>
          <li><a href="#studio"><b>Studio</b> <span>RISE is a reading app. FLYSPACE shows which data fed each AI answer.</span></a></li>
          <li><a href="#lacuna"><b>Lacuna</b> <span>A research institute. Its atlas covers ${ATLAS_SITES.length} places where the historical record has a gap.</span></a></li>
        </ul>
        <p class="home-play"><a href="/psycho-syber/"><span class="home-play__p">PSYCHO</span> <span class="home-play__s">SYBER</span> <span class="home-play__t">Play the game</span></a></p>
      </div>
    </section>

    <section id="factory" class="home-part" aria-labelledby="factory-title">
      <div class="home-stage home-stage--rise">
        <div class="home-stage__view"><canvas data-visual="factory" role="img" aria-label="A machine reads a strand, copies it piece by piece, rejects the pieces that fail and releases two finished strands. Its stations are labelled Propose, Check, Review, Approve and Publish."></canvas></div>
        <div class="home-stage__cap sy-wrap">
          <h2 id="factory-title">Factory</h2>
          <p>SyberWork runs the checks on each proposed change, a separate reviewer examines it, and a person approves it before anything is published. <a href="/factory/">How SyberWork handles a code change</a></p>
        </div>
      </div>
      <div id="products" class="home-block sy-wrap">${lineCard()}
      ${productRows(FACTORY)}${recordedRun(bySlug('syberwork'))}
        <p id="partners" class="home-note"><span class="home-label">Design partnership</span><span><b>GitHits.</b> A Python client and a Claude Code integration for GitHits code search, both built through SyberWork. They were tested against a local stand-in for the API, so we claim no live usage or savings. <a href="/services/#partnerships">Design partnerships</a></span></p>
      </div>
    </section>

    <section id="studio" class="home-part home-part--studio" aria-labelledby="studio-title">
      <div class="home-block sy-wrap">
        <h2 id="studio-title">Studio</h2>
      ${productRows(STUDIO)}
        <p class="home-label home-pieces__label" id="pieces-title">Four pieces that move to sound. Press one to run it.</p>
        <ul class="home-pieces" role="list" aria-labelledby="pieces-title">${PIECES.map(([slug, name, line]) => `
          <li><figure class="home-tile" data-piece="${slug}" data-name="${esc(name)}">
            <img src="/media/home/posters/${slug}.jpg" width="960" height="1200" alt="" loading="lazy" decoding="async">
            <div class="home-tile__shield home-tile__shield--a"></div><div class="home-tile__shield home-tile__shield--b"></div>
            <figcaption><b>${esc(name)}</b><span>${esc(line)}</span></figcaption>
            <button class="home-tile__run" type="button" aria-label="Run ${esc(name)}">Run</button>
          </figure></li>`).join('')}
        </ul>
        <p class="home-note"><span class="home-label">Game</span><span><b>PSYCHO SYBER.</b> A side-scrolling game that runs in the browser. It has six stages: one for each of the four products, one for Lacuna Institute and a last one with no exit. It plays with a keyboard and a mouse, or by touch on a phone. <a href="/psycho-syber/">Play PSYCHO SYBER</a></span></p>
        <p class="home-note"><span class="home-label">Briefing</span><span><b>VERTICAL.</b> An interactive 20-slide briefing on the intelligence explosion, with twelve live browser simulations, generative sound and keyboard navigation. <a href="/vertical/">Open VERTICAL</a></span></p>
      </div>
    </section>

    <section id="lacuna" class="home-part" aria-labelledby="lacuna-title">
      <div class="home-stage home-stage--globe">
        <div class="home-stage__view">
          <canvas data-visual="atlas" role="img" aria-label="The Earth drawn in dots, turning. The ${ATLAS_SITES.length} research sites of the Lacuna Atlas are marked on it and named one at a time."></canvas>
          <a class="home-globe" data-atlas-globe href="${LACUNA}#${FIRST_SITE.id}" aria-label="Open ${esc(FIRST_SITE.name)} on the Lacuna Atlas"></a>
        </div>
        <div class="home-stage__cap sy-wrap">
          <h2 id="lacuna-title"><a href="${LACUNA}" aria-label="Lacuna Institute">Lacuna</a></h2>
          <p>The globe marks the ${ATLAS_SITES.length} sites of the Lacuna Atlas. Facing now: <a data-atlas-site href="${LACUNA}#${FIRST_SITE.id}">${esc(FIRST_SITE.name)}</a> <span class="home-coords" data-atlas-coords>${position(FIRST_SITE.lat, FIRST_SITE.lon)}</span></p>
        </div>
      </div>
      <div class="home-block sy-wrap">
      ${lacunaRows()}
        <p class="home-note"><span class="home-label">Research institute</span><span><b>Lacuna Institute</b> is part of SyberLabs. It studies places and objects where the historical record has a gap, and publishes what is known, what is missing and its sources.</span></p>
      </div>
    </section>

    <section id="contact" class="home-contact" aria-labelledby="contact-title">
      <div class="home-contact__field"><canvas data-visual="field" role="img" aria-label="A field of coupled oscillators falls into step. The letters of SyberLabs appear as the strokes that stay a quarter turn out of phase."></canvas></div>
      <div class="home-contact__copy sy-wrap">
        <h2 id="contact-title">Tell us what you are building.</h2>
        <p>Email a short outline of the problem and where AI should help. We reply with next steps.</p>
        <a class="sy-btn sy-btn--solid" href="${CONSULT}">Book a consultation</a>
        <p class="home-contact__links"><a href="${CONTACT}">${EMAIL}</a><a href="${GITHUB}">GitHub</a></p>
      </div>
    </section>
  </main>`;

// Everything inside <body>, between the email_off comments index.html already carries.
export const renderOverview = () => `${header('', { here: '/overview/', sticky: false, script: false })}
  ${main()}
  ${footer('/overview/')}`;
