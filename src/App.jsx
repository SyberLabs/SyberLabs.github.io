import React, { useEffect, useRef, useState } from 'react';
import { skills, EMAIL, CONTACT, RESUME, LINKEDIN, MATEO_GITHUB, MATEO_SITE, OMNI_PREVIEW, SKETCH_APP, RISE_PLUS } from '../projects/site-data.js';
import { header as chromeHeader, footer as chromeFooter } from '../projects/project-template.js';
import { mount, RING_SVG } from '../kit/v2/syber-atmosphere.js';
import plateStill from './plate-i.webp';
import plateStillSm from './plate-i-sm.webp';
import risePreview from './rise-preview-720.webp';
import risePreviewSm from './rise-preview-480.webp';
import riseHome from './rise-home-720.webp';
import { params as sigilParams, drawAll } from '../kit/v2/syber-sigil.js';
import { boot } from './site/site.js';
import '../kit/v2/syber-atlas.css';
import './syberlabs.css';
import './home.css';

// The homepage leads with one product, RISE, and one action: a one-minute reading at rise.syberlabs.io/try/.
// Order below the hero: RISE, the publisher pilot, more from the lab (#work, the header's Projects link), research and
// approach, about and contact (#about). The header and footer (nav, Sign in, All pages) are the shared chrome. The Claude connector instructions now live on /projects/rise/#composer and the
// GitHits dependency totals on /stack/#dependencies (src/githits-panel.jsx).
const RISE_TRY = 'https://rise.syberlabs.io/try/';

function Icon({ name, size = 18, className = '' }) {
  const paths = {
    arrow: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
    down: <><path d="M12 5v14" /><path d="M6 13l6 6 6-6" /></>,
    external: <><path d="M7 17L17 7" /><path d="M8 7h9v9" /></>,
  };
  return <svg className={`sy-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

// The header, the field canvas and the footer are the same markup every page gets (projects/project-template.js);
// the homepage bundle boots the behaviours itself, so the shared /syberlabs.js is not loaded here.
const Header = () => <div className="home-chrome" dangerouslySetInnerHTML={{ __html: chromeHeader('', { sticky: false, script: false }) }} />;
const Footer = () => <div className="home-chrome home-footer" dangerouslySetInnerHTML={{ __html: chromeFooter('/') }} />;

// RISE Plus voice, labelled with its current availability (RISE_PLUS.state; /plus/ carries the full wording).
const plusLive = RISE_PLUS.state === 'live';
const PLUS_NOTE = plusLive
  ? `Optional premium voice (RISE Plus): an ElevenLabs voice reads the text you bring, ${RISE_PLUS.price} a month.`
  : 'Optional premium voice (RISE Plus): an ElevenLabs voice reads the text you bring. Not yet available; paid launch pending verification.';

// Plate I: the one live 2D long-exposure attractor on the site, now the field behind a RISE preview. Without JS,
// without WebGL2 or on software GL, a still exposure of the same plate (src/plate-i.webp) sits in the ring instead.
// On phones the copy and the call to action come first and the plate sits below them.
function Hero() {
  const canvas = useRef(null), copy = useRef(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const plate = mount(canvas.current, { mode: 'hero', avoid: copy.current, allowSoftware: window.SY_ALLOW_SOFTWARE_GL === true });
    setLive(plate.supported);
    // the Atlas covers the page with a blurred backdrop: hold the plate instead of re-blurring a moving one
    const html = document.documentElement;
    const mo = new MutationObserver(() => html.classList.contains('sy-atlas-open') ? plate.pause() : plate.resume());
    mo.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => { mo.disconnect(); plate.destroy(); };
  }, []);
  return <section className={`home-hero sy-nebula${live ? ' is-live' : ''}`} aria-labelledby="hero-title">
    <div className="sy-scrim home-hero__scrim" aria-hidden="true" />
    <div className="home-hero__in sy-wrap">
      <div className="home-hero__copy" ref={copy}>
        <p className="sy-eyebrow">RISE / from SyberLabs</p>
        <h1 id="hero-title" className="sy-display-xl home-hero__title">Turn text into a <em>reading experience.</em></h1>
        <p className="sy-body-lg home-hero__intro">RISE brings words to life with pacing, visuals, and sound. Free in your browser. No account needed.</p>
        <div className="home-hero__actions">
          <a className="sy-btn sy-btn--solid home-hero__cta" href={RISE_TRY}>Try a one-minute reading<Icon name="arrow" className="sy-icon--trail" /></a>
          <a className="home-hero__explore" href="#work">Explore the lab<Icon name="down" size={16} /></a>
        </div>
      </div>
    </div>
    <div className="home-hero__art">
      <canvas ref={canvas} className="sy-atmosphere" aria-hidden="true" />
      <img className="home-still" src={plateStill} srcSet={`${plateStillSm} 560w, ${plateStill} 1000w`} sizes="(max-width: 900px) 400px, 60vw" width="1000" height="1000" alt="" aria-hidden="true" decoding="async" />
      <span className="home-ring" aria-hidden="true" dangerouslySetInnerHTML={{ __html: RING_SVG }} />
      <figure className="home-preview">
        <img src={risePreview} srcSet={`${risePreviewSm} 480w, ${risePreview} 720w`} sizes="(max-width: 900px) 78vw, 440px" width="720" height="450" alt="RISE mid-reading: one line of a poem, large, over a violet procedural visual field, with the reading's controls below." decoding="async" />
        <figcaption>RISE · Stream, ten seconds in</figcaption>
      </figure>
    </div>
  </section>;
}

// RISE, once: what it is, three benefits, the same one-minute reading. Every claim is on /projects/rise/.
const BENEFITS = [
  ['Paced, not scrolled', 'Words arrive at a pace you set, or sit on a page you can navigate. Switch at any point and keep your place.'],
  ['Pictures and sound', 'Procedural visuals and sound surround the words, so a poem or a chapter has a room around it.'],
  ['Nothing to set up', 'It runs in any modern browser at rise.syberlabs.io. No account, no key and no install.'],
];
function Rise() {
  return <section id="rise" className="home-sec sy-wrap home-rise" aria-labelledby="rise-title" style={{ '--sy-accent': '#f2d9a6' }}>
    <div className="home-rise__copy" data-reveal>
      <p className="sy-eyebrow">RISE / Live · open beta</p>
      <h2 id="rise-title" className="sy-display">A reader that <em>performs the text.</em></h2>
      <ul className="home-benefits">
        {BENEFITS.map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}
      </ul>
      <div className="sy-actions home-rise__actions">
        <a className="sy-btn sy-btn--solid" href={RISE_TRY}>Try a one-minute reading<Icon name="arrow" className="sy-icon--trail" /></a>
        <a className="sy-btn sy-btn--line" href="/projects/rise/">How RISE works<Icon name="arrow" /></a>
      </div>
      <p className="home-plus">{PLUS_NOTE} <a href="/plus/">About RISE Plus</a></p>
    </div>
    <figure className="home-rise__fig" data-reveal>
      <img src={riseHome} width="720" height="450" loading="lazy" decoding="async" alt="RISE Home: today's poem streaming over a magenta visual field, with the buttons Read it with sound, Another reading and Library." />
      <figcaption className="sy-small">RISE Home, with the day’s poem. Screenshot of a local build, 5 October 2026.</figcaption>
    </figure>
  </section>;
}

// For publishers and creators: one concrete pilot, consistent with /services/.
function Publishers() {
  return <section id="publishers" className="home-sec sy-wrap" aria-labelledby="publishers-title">
    <div className="home-pilot sy-card" data-reveal>
      <div>
        <p className="sy-eyebrow">For publishers and creators</p>
        <h2 id="publishers-title" className="home-pilot__title">One of your pieces, <em>as a RISE reading.</em></h2>
        <p className="sy-body">We turn one of your pieces into a RISE reading your readers can open in a browser. A pilot is one rights-cleared excerpt and one reader journey, with a fixed quote once we have reviewed the text.</p>
      </div>
      <div className="sy-actions"><a className="sy-btn sy-btn--solid" href="/services/">About pilots<Icon name="arrow" className="sy-icon--trail" /></a></div>
    </div>
  </section>;
}

// More from the lab: three compact cards. Statuses and claims match each project's page.
const LAB = [
  { id: 'sketch', sigil: 'rise sketch', accent: '#c7a4ff', kicker: 'RISE Sketch · Live', name: 'Sketch',
    what: 'A drawing instrument with living ink: each stroke grows, ripples and folds into mirrors or mandalas of up to twelve. Runs in the browser and works offline.',
    links: [{ label: 'Draw now', href: SKETCH_APP }, { label: 'Source', href: 'https://github.com/SyberLabs/RISE-Sketch' }] },
  { id: 'flyspace', sigil: 'flyspace', accent: '#f59be0', kicker: 'FLYSPACE · Live preview', name: 'FLYSPACE',
    what: 'A spatial workspace for AI over live data: wire public data blocks into AI personas that answer only from what the wires carry, and cite it.',
    links: [{ label: 'Details', href: '/projects/flyspace/' }, { label: 'Try the preview', href: OMNI_PREVIEW }] },
  { id: 'reliability', sigil: 'syberwork', accent: '#a6f08f', kicker: 'Agent reliability · In progress', name: 'Reliable agents',
    what: 'SyberWork puts agents to work under contracts, human sign-off and a hash-chained record. Sybershoke replays distributed failures from a seed so each one can be reduced and fixed.',
    links: [{ label: 'SyberWork', href: '/projects/syberwork/' }, { label: 'Sybershoke', href: '/research/sybershoke/' }] },
];
function Lab() {
  return <section id="work" className="home-sec sy-wrap" aria-labelledby="lab-title">
    <div className="site-head home-head" data-reveal>
      <div><p className="sy-eyebrow">Projects</p><h2 id="lab-title" className="sy-display">More from <em>the lab.</em></h2></div>
      <p className="home-head__note sy-small">Every project page states what it has shown and what it has not.</p>
    </div>
    <ul className="home-lab" data-reveal-children>
      {LAB.map(p => <li key={p.id} className="home-lab__card sy-card" style={{ '--sy-accent': p.accent }}>
        <canvas className="home-lab__sigil" data-sigil={p.sigil} aria-hidden="true" />
        <p className="home-lab__kicker">{p.kicker}</p>
        <h3 className="home-lab__name">{p.name}</h3>
        <p className="home-lab__what">{p.what}</p>
        <p className="home-lab__links">{p.links.map(l => <a key={l.href} href={l.href}>{l.label}<Icon name={l.href.startsWith('http') ? 'external' : 'arrow'} size={16} /></a>)}</p>
      </li>)}
    </ul>
  </section>;
}

// Research and approach: two short intros, each to its own page.
function Research() {
  return <section id="research" className="home-sec sy-wrap" aria-labelledby="research-title">
    <div className="site-head" data-reveal><p className="sy-eyebrow">Research and approach</p><h2 id="research-title" className="sy-display">Shown, <em>with its limits.</em></h2></div>
    <div className="home-ra" data-reveal-children>
      <a className="home-ra__card sy-card" href="/research/">
        <h3>Research</h3>
        <p>Technical reports, research notes and working papers. Each states its claim, the evidence it has reached, and what it does not establish.</p>
        <span className="home-ra__go">The research index<Icon name="arrow" size={16} /></span>
      </a>
      <a className="home-ra__card sy-card" href="/approach/">
        <h3>Approach</h3>
        <p>How we build AI software: establish what a system knows, design what a person can do with it, and verify that they can review and change the result.</p>
        <span className="home-ra__go">How we work<Icon name="arrow" size={16} /></span>
      </a>
    </div>
  </section>;
}

// The factory is hidden from the public homepage while it moves to the internal dashboard (#81). It still
// compiles; set INTERNAL_SECTIONS to true to show it again (and restore the Atlas link in projects/site-data.js).
// ("What changed", the other section #81 hid, is gone from here: it is staff-only at /admin/changes, MasterMind RFC 0002.)
const INTERNAL_SECTIONS = false;

// The factory: how the pull requests get made. The loop as a numbered strip (it is a sequence), four
// numbers that src/site/factory-stats.js refreshes from GitHub after load (the served text is the
// Oct 8 snapshot, so the section reads the same without JS), and the why beside its plate.
const FACTORY_STATS = [
  { id: 'merged-7d', n: 290, label: 'pull requests merged in the last 7 days' },
  { id: 'reviewed-7d', n: 236, label: 'of them reviewed by Codex' },
  { id: 'merged-24h', n: 171, label: 'merged in the last 24 hours' },
  { id: 'repos', n: 15, label: 'public repositories in the org' },
];
const FACTORY_LOOP = [
  { who: 'Claude Code', accent: 'var(--sy-ice)', title: 'writes the pull request', text: 'One task, one branch, one PR, opened by the agent that did the work.' },
  { who: 'Codex', accent: 'var(--sy-amber)', title: 'reviews every PR', text: 'OpenAI’s GitHub app reads the diff: a different model family from the author.' },
  { who: 'Claude', accent: 'var(--sy-ice)', title: 'answers every finding', text: <><code>Fixed in &lt;sha&gt;</code> or <code>Not a defect: &lt;reason&gt;</code>, and resolves the thread. A GitHub Action, <code>codex-feedback.yml</code>, answers when no session is live.</> },
  { who: 'The gate', accent: 'var(--sy-live)', title: 'merges', text: 'main requires CI green and every review thread resolved. Auto-merge, no human click.' },
];
function Factory() {
  return <section id="factory" className="home-sec sy-wrap" aria-labelledby="factory-title">
    <div className="site-head home-head" data-reveal><div><p className="sy-eyebrow">Factory / October 2026</p><h2 id="factory-title" className="sy-display">Agents build. Agents review. <em>Humans look at the product.</em></h2></div><p className="home-head__note sy-small">Humans review the product at syberlabs.io and in production, not the pull request.</p></div>
    <ol className="home-loop" data-reveal-children>
      {FACTORY_LOOP.map((s, i) => <li key={s.who + s.title} className="sy-card" style={{ '--sy-accent': s.accent }}>
        <span className="home-loop__n">{String(i + 1).padStart(2, '0')}</span>
        <span className="home-loop__t"><b>{s.who}</b> {s.title}</span>
        <p className="home-loop__d">{s.text}</p>
      </li>)}
    </ol>
    <ul className="home-stats" data-reveal-children>
      {FACTORY_STATS.map(s => <li key={s.id} className="home-stat sy-card" data-stat={s.id}>
        <b className="home-stat__n sy-figure" data-count={s.n}>{s.n}</b>
        <span className="home-stat__l">{s.label}</span>
        <span className="home-stat__src" data-stat-src><i aria-hidden="true" />snapshot · Oct 8</span>
      </li>)}
    </ul>
    <div className="home-why" data-reveal>
      <figure className="sy-plate-figure home-why__fig" aria-hidden="true">
        <div className="sy-plate sy-plate--sigil"><canvas data-sigil="factory" data-caption-for="params-factory" /></div>
        <figcaption><b>Plate X · The factory</b>de Jong map · <span className="sy-nowrap">seed “factory”</span><span className="sy-params" id="params-factory">{sigilParams('factory').caption}</span></figcaption>
      </figure>
      <div className="home-why__body">
        <p className="sy-eyebrow">Why</p>
        <p className="sy-body-lg">Two people cannot read fifty pull requests a day, and a reviewer’s output only counts if something acts on it. So <a href="https://github.com/SyberLabs/RISE/blob/main/AGENTS.md#reviewer-findings" rel="noopener">the contract</a> makes an unanswered finding a merge blocker instead of an opinion: every thread is fixed or refuted, in writing, before the gate opens. <a href="https://github.com/SyberLabs/RISE/blob/main/.github/workflows/codex-feedback.yml" rel="noopener">The workflow</a> keeps that true when nobody is at the keyboard. What we look at is the thing that shipped.</p>
      </div>
    </div>
  </section>;
}

function About() {
  return <section id="about" className="home-sec sy-wrap" aria-labelledby="about-title">
    <div className="site-head" data-reveal><p className="sy-eyebrow">About and contact</p><h2 id="about-title" className="sy-display">About <em>SyberLabs.</em></h2></div>
    <div className="home-about">
      <div className="home-about__copy" data-reveal-children>
        <p className="sy-body-lg home-about__lead">SyberLabs is an independent software and AI research lab founded in 2026 by Mateo Robles. The lab designs, builds, and evaluates AI products and research software, with a focus on applied machine learning, LLM applications, AI agent reliability, and simulation. Seth Carlson builds the engineering infrastructure behind RISE and co-builds Relay.</p>
        <p>Every project is published with its current status and its limits. Prototypes, measured results, and planned work are labeled separately so readers can tell what has been shown and what has not.</p>
        <h3 className="sy-eyebrow home-about__label">Technical skills</h3>
        <ul className="home-about__skills">{skills.map(s => <li key={s}>{s}</li>)}</ul>
      </div>
      <aside className="sy-plate sy-plate--card home-about__founder sy-card" aria-labelledby="founder-name" data-tilt="4" data-reveal>
        <p className="sy-eyebrow">Founder</p>
        <h3 id="founder-name" className="home-about__name">Mateo Robles</h3>
        <p className="home-about__role">Founder and Independent Researcher, SyberLabs</p>
        <p>B.S. Computer Science, emphasis in Data Science, Santa Clara University (2026). Software engineer working across machine learning, LLM applications, and full-stack development.</p>
        <ul className="home-about__links">
          <li><a href={RESUME}>Résumé (PDF)<Icon name="arrow" /></a></li>
          <li><a href={LINKEDIN}>LinkedIn<Icon name="external" /></a></li>
          <li><a href={MATEO_GITHUB}>GitHub<Icon name="external" /></a></li>
          <li><a href={MATEO_SITE}>Personal site<Icon name="external" /></a></li>
          <li><a href={CONTACT}>{EMAIL}</a></li>
        </ul>
      </aside>
    </div>
    <div className="home-cta sy-card" data-reveal>
      <div><p className="sy-eyebrow">Contact</p><h3 className="home-cta__title">Write to <em>the lab.</em></h3><p className="sy-body">Questions about RISE, a pilot, or the research: one email reaches us.</p></div>
      <div className="sy-actions"><a className="sy-btn sy-btn--solid" href={CONTACT}>Email the lab<Icon name="arrow" className="sy-icon--trail" /></a><a className="sy-btn sy-btn--line" href="/services/">Work with us</a></div>
    </div>
  </section>;
}

export default function App() {
  useEffect(() => {
    const sigils = drawAll(document);
    // The homepage field sits low and left, behind the copy and under Plate I, and climbs as the page scrolls.
    boot(document, { density: 'calm', offset: [-0.34, -0.42] });
    if (INTERNAL_SECTIONS) import('./site/factory-stats.js').then(m => m.factoryStats(document));
    return () => sigils.disconnect();
  }, []);
  return <>
    <Header />
    <main id="main">
      <Hero />
      <Rise />
      <Publishers />
      <Lab />
      <Research />
      {INTERNAL_SECTIONS && <Factory />}
      <About />
    </main>
    <Footer />
  </>;
}
