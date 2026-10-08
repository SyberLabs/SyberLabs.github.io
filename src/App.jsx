import React, { useEffect, useRef, useState } from 'react';
import { projects, skills, EMAIL, CONTACT, RESUME, LINKEDIN, GITHUB, RISE_APP, OMNI_PREVIEW, SKETCH_APP, RISE_PLUS } from '../projects/site-data.js';
import { latest } from '../projects/latest.js';
import { header as chromeHeader, footer as chromeFooter } from '../projects/project-template.js';
import { mount, RING_SVG } from '../kit/v2/syber-atmosphere.js';
import plateStill from './plate-i.webp';
import plateStillSm from './plate-i-sm.webp';
import { drawAll, draw } from '../kit/v2/syber-sigil.js';
import { boot, reducedMotion } from './site/site.js';
import { mountThink } from './site/think.js';
import { gallery } from './sketch-gallery/index.js';
import { githits } from './githits.js';
import '../kit/v2/syber-atlas.css';
import './syberlabs.css';
import './home.css';

function Icon({ name, size = 18, className = '' }) {
  const paths = {
    arrow: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
    down: <><path d="M12 5v14" /><path d="M6 13l6 6 6-6" /></>,
    external: <><path d="M7 17L17 7" /><path d="M8 7h9v9" /></>,
  };
  return <svg className={`sy-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function CopyButton({ text, label }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0';
      document.body.append(t); t.select(); try { document.execCommand('copy'); } catch (e2) {} t.remove();
    }
    setDone(true); setTimeout(() => setDone(false), 1600);
  };
  return <button type="button" className={`home-copy${done ? ' is-done' : ''}`} onClick={copy} aria-label={`Copy ${label}`}><span aria-live="polite">{done ? 'Copied' : 'Copy'}</span></button>;
}

const Badge = ({ status, bare }) => <span className={`sy-badge sy-badge--${status.kind}${bare ? ' sy-badge--bare' : ''}`}>{status.label}</span>;

// The header, the field canvas and the footer are the same markup every page gets (projects/project-template.js);
// the homepage bundle boots the behaviours itself, so the shared /syberlabs.js is not loaded here.
const Header = () => <div className="home-chrome" dangerouslySetInnerHTML={{ __html: chromeHeader('', { sticky: false, script: false }) }} />;
const Footer = () => <div className="home-chrome home-footer" dangerouslySetInnerHTML={{ __html: chromeFooter('/') }} />;

// Plate I: the one live 2D long-exposure attractor on the site. Without JS, without WebGL2 or on software GL,
// a still exposure of the same plate (src/plate-i.webp) sits in the ring instead.

// "Think.": one span per letter (src/site/think.js, .home-think in home.css). Each letter's scatter (--dx, --dy, --r)
// is where it condenses from on the way in. The text stays "Think." for search, readers and the no-JS page.
const THINK = [['T', -0.2, 0.34, -9], ['h', 0.12, -0.3, 7], ['i', -0.08, 0.4, -5], ['n', 0.16, -0.24, 8], ['k', -0.14, 0.32, -7], ['.', 0.24, -0.36, 12]];
const Think = React.forwardRef((_, ref) => <em ref={ref} className="home-think" data-split-skip data-text="Think.">
  {THINK.map(([ch, dx, dy, r], i) => <span key={i} className={`home-think__l${ch === '.' ? ' home-think__dot' : ''}`} style={{ '--i': i, '--dx': dx + 'em', '--dy': dy + 'em', '--r': r + 'deg' }}>{ch}</span>)}
</em>);

function Hero() {
  const canvas = useRef(null), copy = useRef(null), think = useRef(null);
  const [live, setLive] = useState(false);
  // before boot() splits and reveals the title (child effects run first), so the letters start from their scatter
  useEffect(() => { const t = mountThink(think.current); return () => t.destroy(); }, []);
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
    <canvas ref={canvas} className="sy-atmosphere" aria-hidden="true" />
    <img className="home-still" src={plateStill} srcSet={`${plateStillSm} 560w, ${plateStill} 1000w`} sizes="(max-width: 900px) 400px, 60vw" width="1000" height="1000" alt="" aria-hidden="true" decoding="async" />
    <span className="home-ring" aria-hidden="true" dangerouslySetInnerHTML={{ __html: RING_SVG }} />
    <div className="sy-scrim home-hero__scrim" aria-hidden="true" />
    <div className="home-hero__in sy-wrap">
      <div className="home-hero__copy" ref={copy}>
        <a className="home-gh-chip" href="/stack/" data-reveal><span className="home-gh-chip__k">How we build</span><span className="home-gh-chip__t">Dependencies read at their exact version, through <b>GitHits</b></span><Icon name="arrow" size={16} /></a>
        <p className="sy-eyebrow" data-reveal>SyberLabs / Independent AI software lab</p>
        <h1 id="hero-title" className="sy-display-xl home-hero__title" data-split>Read.<br /> <Think ref={think} /><br /> Build.</h1>
        <p className="sy-body-lg home-hero__intro" data-reveal>SyberLabs builds creative tools for people and dependable infrastructure for AI agents. Read with <a href="#work">RISE</a>, think on <a href="#work">FLYSPACE</a>, build with <a href="#work">SyberWork</a>.</p>
        <div className="home-hero__actions" data-reveal>
          <a className="sy-btn sy-btn--solid" href={RISE_APP}>Open RISE<Icon name="arrow" className="sy-icon--trail" /></a>
          <a className="sy-btn sy-btn--line" href={OMNI_PREVIEW}>Try the FLYSPACE preview<Icon name="external" /></a>
          <a className="sy-btn sy-btn--ghost" href="#sketch">Play: RISE Sketch<Icon name="down" /></a>
          <a className="sy-btn sy-btn--ghost" href="#work">See the work<Icon name="down" /></a>
        </div>
        <div className="home-hero__founder" data-reveal>
          <span>Founded in 2026 by <strong>Mateo Robles</strong></span>
          <ul>
            <li><a href={RESUME}>Résumé (PDF)</a></li>
            <li><a href={LINKEDIN}>LinkedIn</a></li>
            <li><a href={GITHUB}>GitHub</a></li>
            <li><a href={CONTACT}>Email</a></li>
          </ul>
        </div>
      </div>
    </div>
    <nav className="sy-strip home-strip" aria-label="Projects at a glance">
      <ol>{featured.map((p, i) => <li key={p.slug} style={{ '--sy-accent': p.accent }}><a href={`/projects/${p.slug}/`}><span className="sy-strip__n">0{i + 1}<span className="home-strip__cat"> · {SHOW[p.slug].kicker}</span></span><span className="sy-strip__t">{p.name}</span><Badge status={p.status} bare /></a></li>)}</ol>
    </nav>
    <a className="home-scrollcue" href="#work" aria-label="Scroll to the work"><span /></a>
  </section>;
}

// GitHits, right under the hero: what our agents use it for, and totals from the project pages' dependency panels,
// computed at build time from data/githits (src/githits.js). A fixture snapshot shows "Snapshot pending", no numbers.
// GitHits is a third-party tool we use: no logo, no partnership or endorsement wording.
function GitHits() {
  const g = githits;
  const day = g.day ? <time dateTime={g.iso}>{g.day}</time> : 'an unrecorded date';
  const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
  const row = r => !g.live ? 'Snapshot pending'
    : !r.packages ? 'No runtime dependencies declared'
    : `${plural(r.packages, 'package')} · ${r.affected === null ? 'vulnerabilities not checked' : r.affected ? `${r.affected} with known vulnerabilities` : 'known vulnerabilities: none reported'}`;
  const stats = [
    [g.packages, 'Packages checked', 'declared runtime dependencies'],
    [g.projects, 'Projects', 'each with a dependency panel'],
    [g.affected ?? 'Not checked', 'Known vulnerabilities', g.affected === null ? 'not every package was checked' : 'packages with advisories reported'],
    [g.licenses, 'Licenses', 'distinct, as GitHits reports them'],
  ];
  return <section id="githits" className="home-sec sy-wrap" aria-labelledby="githits-title">
    <div className="home-gh sy-card" style={{ '--sy-accent': 'var(--sy-ice)' }} data-reveal data-tilt="2">
      <div className="home-gh__copy">
        <p className="sy-eyebrow">How we build / GitHits</p>
        <h2 id="githits-title" className="sy-display">Read the source, <em>not the memory.</em></h2>
        <p className="sy-body-lg">Our coding agents look up open-source code at the exact version a project uses, through GitHits, a third-party index of public code. A model’s memory blends releases; the pinned source does not.</p>
        <p className="sy-body">Every project page shows a dependency check: license, latest version and known vulnerabilities for each declared package, fetched from the GitHits package API each time this site is built.</p>
        <div className="sy-actions home-gh__actions">
          <a className="sy-btn sy-btn--solid" href="/stack/">How we build<Icon name="arrow" className="sy-icon--trail" /></a>
          <a className="sy-btn sy-btn--line" href="https://githits.com/" rel="noopener">githits.com<Icon name="external" /></a>
        </div>
      </div>
      <div className="home-gh__data">
        {g.live
          ? <dl className="home-gh__stats">{stats.map(([value, term, note]) => <div key={term}><dt className="sy-label">{term}</dt><dd><b className={typeof value === 'number' ? '' : 'is-word'}>{value}</b><span>{note}</span></dd></div>)}</dl>
          : <p className="home-gh__pending sy-label" role="note"><i aria-hidden="true" />Snapshot pending — GitHits data not yet fetched</p>}
        <ul className="home-gh__rows">
          {g.rows.map(r => <li key={r.slug} style={{ '--sy-accent': r.accent }}><a href={r.href}><span className="home-gh__name">{r.name}</span><span className="home-gh__val">{row(r)}</span><Icon name="arrow" size={16} /></a></li>)}
        </ul>
        <p className="sy-small home-gh__attr">{g.live ? <>Package data from GitHits, retrieved {day}.</> : <>Package data from GitHits once fetched. Snapshot made {day}.</>}</p>
      </div>
    </div>
  </section>;
}

// RISE Plus voice, right under the hero. One switch, RISE_PLUS.state in projects/site-data.js: 'coming' names the
// price and offers only the free reader; 'live' offers the purchase. The copy says no more than the state allows.
function PlusVoice() {
  const live = RISE_PLUS.state === 'live';
  return <section id="plus" className="home-sec sy-wrap" aria-labelledby="plus-title">
    <div className="home-plus sy-card" style={{ '--sy-accent': '#f2d9a6' }} data-reveal data-tilt="2">
      <div className="home-plus__copy">
        <p className="home-plus__top"><span className="sy-eyebrow">RISE Plus / Voice</span><Badge status={live ? { kind: 'live', label: 'Live' } : { kind: 'early', label: 'Coming · not yet available' }} /></p>
        <h2 id="plus-title" className="sy-display">Your own reading, <em>read aloud.</em></h2>
        <p className="sy-body-lg">RISE Plus voice is an ElevenLabs voice for RISE, the browser-based audiovisual reader. It voices a reading of your own as the words arrive on screen.</p>
        <p className="home-plus__price"><b>{RISE_PLUS.price}</b><span>a month</span></p>
        <p className="sy-small home-plus__state">{live
          ? 'RISE itself stays free. Plus adds the voice.'
          : <>Not available yet. It is built and tested in <a href={RISE_PLUS.source}>draft pull requests</a> that are not merged or deployed. RISE itself is free today.</>}</p>
        <div className="sy-actions home-plus__actions">
          {live
            ? <><a className="sy-btn sy-btn--solid" href={RISE_PLUS.href}>Get Plus voice — {RISE_PLUS.price}/month<Icon name="external" /></a><a className="sy-btn sy-btn--line" href={RISE_APP}>Try RISE free<Icon name="external" /></a></>
            : <><a className="sy-btn sy-btn--solid" href={RISE_APP}>Try RISE free<Icon name="external" /></a><a className="sy-btn sy-btn--ghost" href="/projects/rise/">About RISE<Icon name="arrow" /></a></>}
        </div>
      </div>
      <dl className="home-plus__points">
        {RISE_PLUS.points.map(([term, text]) => <div key={term}><dt className="sy-label">{term}</dt><dd>{text}</dd></div>)}
      </dl>
    </div>
  </section>;
}

// The homepage leads with three products, in the order of the hero: Read (RISE), Think (FLYSPACE), Build (SyberWork).
// Names, accents, statuses and project pages come from projects/site-data.js; what each one is for lives here.
// Every claim below is one the project's own page carries (what is live, what is in testing, what is not yet).
const RISE_MCP = 'https://rise.syberlabs.io/api/mcp';
const CLAUDE_CONNECTORS = 'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp';
const SHOW = {
  rise: {
    kicker: 'Creative suite',
    what: 'Turn words and strokes into something you experience.',
    who: 'Readers, writers and visual artists',
    suite: [
      { name: 'Reader', sigil: 'rise reader', status: { kind: 'live', label: 'Live · open beta' }, href: RISE_APP, cta: 'Read now', external: true,
        what: 'Read any text as a timed stream of words, image, sound and procedural visuals, or as a typeset page.' },
      { name: 'Composer', sigil: 'rise composer', status: { kind: 'live', label: 'Live · in Claude' }, href: CLAUDE_CONNECTORS, cta: 'How to add a connector', external: true,
        what: 'Ask Claude for a reading and RISE presents the answer as a spoken, visual reading. Add it as a custom connector:',
        connector: { name: 'RISE', url: RISE_MCP }, later: 'Submission to Claude’s connector directory is planned.' },
      { name: 'Sketch', sigil: 'rise sketch', status: { kind: 'live', label: 'Live' }, href: SKETCH_APP, cta: 'Draw now', external: true,
        what: 'Draw with living ink that grows, ripples and folds into mandalas of up to twelve.' },
    ],
    note: 'Working on interoperability, so a reading, a composition and a drawing can move between all three.',
    primary: { label: 'Open RISE Reader', href: RISE_APP },
  },
  flyspace: {
    kicker: 'Spatial AI workspace',
    what: 'A spatial workspace with APIs on the fly.',
    who: 'Analysts, researchers and builders who need answers traced to live data',
    points: [
      ['Data blocks', 'Live numbers from public sources: prediction markets, crypto prices, World Bank series, research papers and news.'],
      ['AI blocks', 'Wire data into AI personas that answer only from what their wires carry, and cite it.'],
      ['APIs on the fly', 'Hand it an OpenAPI document or MCP tools and they become blocks. Anything that writes waits for your approval.'],
    ],
    note: 'The public preview runs the canvas and live data blocks. AI answers run in the local app with your own keys.',
    primary: { label: 'Try the preview', href: OMNI_PREVIEW },
  },
  syberwork: {
    kicker: 'Governed agent runtime',
    what: 'Put AI agents to work with contracts, sign-off and a record.',
    who: 'Teams bringing agents into workflows that need approvals and an audit trail',
    points: [
      ['Contracts', 'Say what may happen. A rule in code admits or refuses each step.'],
      ['Sign-off', 'A named person approves before anything consequential runs.'],
      ['A record', 'A hash-chained history of what was proposed, observed, approved and executed.'],
    ],
    note: 'SyberWork is evolving. Version 0.1 is open source under Apache 2.0 while the next version takes shape.',
    primary: { label: 'View source', href: 'https://github.com/SyberLabs/SyberWork' },
  },
};
const featured = Object.keys(SHOW).map(slug => projects.find(p => p.slug === slug)).filter(Boolean);
const isExternal = href => /^https?:/.test(href);

function Work() {
  const redraw = event => event.currentTarget.querySelectorAll('canvas[data-sigil]').forEach(c => draw(c, c.dataset.sigil));
  return <section id="work" className="home-sec sy-wrap" aria-labelledby="work-title">
    <div className="site-head home-head" data-reveal>
      <div><p className="sy-eyebrow">Work</p><h2 id="work-title" className="sy-display home-work__title">Creative <em>humans.</em><br /> Reliable <em>agents.</em></h2></div>
      <p className="home-head__note sy-small">Tools that make people more expressive, and infrastructure that keeps AI accountable. What each one does, who it is for, and where it stands.</p>
    </div>
    <ul className="home-show" data-reveal-children>
      {featured.map(p => { const s = SHOW[p.slug]; return <li key={p.slug} className={`home-show__item home-show__item--${p.slug}`}>
        <article className={`home-show__card sy-card${p.status.kind === 'wip' ? ' is-wip' : ''}`} style={{ '--sy-accent': p.accent }} aria-labelledby={`show-${p.slug}`} data-tilt="2" onMouseEnter={redraw}>
          {!s.suite && <span className="home-card__sigil-wrap home-show__sigil"><canvas className="home-card__sigil" data-sigil={p.slug} aria-hidden="true" /></span>}
          <div className="home-show__info">
            <p className="home-show__top"><span className="home-show__kicker">{s.kicker}</span><Badge status={p.status} /></p>
            <h3 id={`show-${p.slug}`} className="home-show__name">{p.name}</h3>
            <p className="home-show__what">{s.what}</p>
            <p className="home-show__who"><span className="sy-label">For</span><span>{s.who}</span></p>
            {s.points && <dl className="home-show__points">{s.points.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>}
            <p className={`home-show__note${s.suite ? ' home-show__note--link' : ''}`}>{s.suite && <span className="home-show__link-icon" aria-hidden="true"><i /><i /><i /></span>}{s.note}</p>
            <p className="home-show__foot">
              <a className="sy-btn sy-btn--solid" href={s.primary.href}>{s.primary.label}<Icon name={isExternal(s.primary.href) ? 'external' : 'arrow'} /></a>
              <a className="sy-link home-show__more" href={`/projects/${p.slug}/`}>Details<Icon name="arrow" size={16} /></a>
            </p>
          </div>
          {s.suite && <ol className="home-suite">{s.suite.map((x, i) => <li key={x.name}>
            <div className="home-suite__item">
              <span className="home-suite__head"><span className="home-suite__sigil"><canvas className="home-card__sigil" data-sigil={x.sigil} aria-hidden="true" /></span><span className="home-suite__n">0{i + 1}</span></span>
              <span className="home-suite__name"><small>RISE</small> {x.name}</span>
              <Badge status={x.status} bare />
              <span className="home-suite__what">{x.what}</span>
              {x.connector && <span className="home-suite__connector">
                <span className="home-suite__conn"><span className="sy-label">Name</span><code>{x.connector.name}</code><CopyButton text={x.connector.name} label="the connector name" /></span>
                <span className="home-suite__conn"><span className="sy-label">URL</span><code>{x.connector.url.split(/(?=\/api\/)/).flatMap((part, i) => i ? [<wbr key={i} />, part] : [part])}</code><CopyButton text={x.connector.url} label="the connector URL" /></span>
              </span>}
              {x.later && <span className="home-suite__later">{x.later}</span>}
              <a className="home-suite__go" href={x.href}>{x.cta}<Icon name={x.external ? 'external' : 'arrow'} size={16} /></a>
            </div></li>)}</ol>}
        </article>
      </li>; })}
    </ul>
  </section>;
}

// Plate IX: a drawable kaleidoscope previewing RISE Sketch. The plate is decoration you can play with; the
// copy and the link beside it carry everything, and stay in the served HTML.
function Sketch() {
  const canvas = useRef(null);
  useEffect(() => {
    let plate;
    import('./site/sketch-plate.js').then(m => { if (canvas.current) plate = m.mountSketchPlate(canvas.current, { reduced: reducedMotion() }); });
    return () => plate?.destroy();
  }, []);
  return <section id="sketch" className="home-sec home-sketch sy-wrap" aria-labelledby="sketch-title" style={{ '--sy-accent': 'var(--sy-research)' }}>
    <div className="home-sketch__copy" data-reveal-children>
      <p className="sy-eyebrow">Play / RISE Sketch</p>
      <h2 id="sketch-title" className="sy-display">Your stroke is <em>the seed.</em></h2>
      <p className="sy-body-lg">RISE Sketch is a drawing instrument where every mark is alive. A stroke grows into coastline, crystal, botany, smoke, braids or interference rings, read from your speed, pressure and stillness. There are no sliders.</p>
      <p className="sy-body">Turn on symmetry and each stroke folds into a mirror or a mandala of up to twelve, every fold in its own hue. It runs in the browser, works offline and keeps your drawings on your device. Share one as a video of it growing, or as a link that lets a friend keep drawing.</p>
      <div className="sy-actions home-sketch__actions">
        <a className="sy-btn sy-btn--solid" href={SKETCH_APP}>Draw in RISE Sketch<Icon name="external" /></a>
        <a className="sy-btn sy-btn--ghost" href="https://github.com/SyberLabs/RISE-Sketch">Source<Icon name="external" /></a>
      </div>
      <p className="sy-small home-sketch__hint" aria-hidden="true">Drag inside the plate. Every stroke folds twelve ways.</p>
    </div>
    <figure className="sy-plate-figure home-sketch__fig">
      <div className="home-sketch__plate">
        <canvas ref={canvas} className="home-sketch__canvas" aria-hidden="true" />
        <span className="home-sketch__ring" aria-hidden="true" />
      </div>
      <figcaption className="sy-plate-caption"><b>Plate IX · Living ink</b><i>Six turns, each mirrored.</i><span className="sy-params">D<sub>6</sub> · sprouts to gen 4 · rings at 1.32<sup>k</sup></span></figcaption>
    </figure>
    <SketchGallery />
  </section>;
}

// Grown in RISE Sketch: timelapses exported by the app itself; each card opens that drawing (its remix link).
function SketchGallery() {
  const list = useRef(null);
  useEffect(() => {
    let g;
    import('./site/sketch-gallery.js').then(m => { if (list.current) g = m.mountSketchGallery(list.current); });
    return () => g?.destroy();
  }, []);
  if (!gallery.length) return null;
  return <div className="home-sketch__gallery">
    <p className="sy-eyebrow">Grown in RISE Sketch</p>
    <ul ref={list} className="home-sketch__reel" data-reveal-children>
      {gallery.map(g => <li key={g.title}><a className="home-sketch__clip sy-card" href={g.remix}>
        <video data-sketch-loop src={g.video} poster={g.poster} muted loop playsInline preload="none" width="720" height="720" aria-hidden="true" />
        <span className="home-sketch__clip-body"><span className="home-sketch__clip-title">{g.title}</span><span className="home-sketch__clip-cap">{g.caption}</span><span className="home-sketch__clip-go">Remix this drawing<Icon name="external" size={16} /></span></span>
      </a></li>)}
    </ul>
    <p className="sy-small home-sketch__reel-note">Each video was exported by the app's own Share timelapse. Open one and it grows again, then it's yours to keep drawing.</p>
  </div>;
}

// Research: one featured study, chosen because it ran against a real system's source and changed it. Every number
// and limit here is quoted from research/sybershoke/ (revision 2), which cites SyberLabs/sybershoke@45956fe.
const SHOKE = 'https://github.com/SyberLabs/sybershoke', SHOKE_FIX = 'https://github.com/SyberLabs/RISE/pull/306';
function Research() {
  return <section id="research" className="home-sec sy-wrap" aria-labelledby="research-title">
    <div className="site-head home-head" data-reveal>
      <div><p className="sy-eyebrow">Research / Reliable agents</p><h2 id="research-title" className="sy-display">Break it <em>on purpose.</em></h2></div>
      <p className="home-head__note sy-small">We test agent systems by injecting the faults production will, and publish what each study does and does not establish.</p>
    </div>
    <article className="home-study sy-card" style={{ '--sy-accent': 'var(--sy-magenta)' }} aria-labelledby="study-title" data-reveal data-tilt="2">
      <figure className="sy-plate-figure home-study__fig" aria-hidden="true">
        <div className="sy-plate sy-plate--sigil"><canvas data-sigil="sybershoke" /></div>
        <figcaption><b>Sybershoke</b>Research note · revision 2 · 29 September 2026</figcaption>
      </figure>
      <div className="home-study__body">
        <p className="sy-eyebrow">Fault injection · a real system</p>
        <h3 id="study-title" className="home-study__title">We shock-tested the source of RISE’s production Worker and found two bugs, each replayable from a seed.</h3>
        <p className="sy-body">Sybershoke turns a seed into a fault plan (killed workers, duplicated and dropped messages), records the run as a plain-text history, judges that history against invariants, and shrinks a failing plan to the faults that matter. Run against the Worker’s source on recorded production AI answers, it found a keyword override that sent “drift off to sleep” to 300 words per minute, and a missing provider fallback.</p>
        <dl className="home-study__stats">
          <div><dt><b data-count="39">39</b></dt><dd>recorded production AI answers replayed</dd></div>
          <div><dt><b data-count="2">2</b></dt><dd>bugs found, each reproducible from its seed</dd></div>
          <div><dt><b>#306</b></dt><dd>the override fix, <a href={SHOKE_FIX}>merged in RISE</a></dd></div>
        </dl>
        <p className="home-study__method"><span className="sy-label">Method</span><span>Fault injection in the tradition of <a href="https://jepsen.io/">Jepsen</a>; failing plans minimized by delta debugging (Zeller and Hildebrandt, <a href="https://doi.org/10.1109/32.988498">IEEE Transactions on Software Engineering, 2002</a>).</span></p>
        <p className="home-study__method"><span className="sy-label">Limits</span><span>The Worker’s source ran with stand-ins for Redis and Neon and with virtual time, so the study reports caught versus not caught, not live failure rates.</span></p>
        <p className="home-study__foot">
          <a className="sy-btn sy-btn--solid" href="/research/sybershoke/">Read the research note<Icon name="arrow" className="sy-icon--trail" /></a>
          <a className="sy-btn sy-btn--line" href={SHOKE}>Source<Icon name="external" /></a>
        </p>
      </div>
    </article>
    <div className="home-research-more" data-reveal>
      <p className="sy-eyebrow">Also</p>
      <ul className="home-research__links">
        <li><a href="/research/">All research: the index<Icon name="arrow" size={16} /></a></li>
        <li><a href="/research/jev-execution/">GrokCell Execution: technical report on a prototype<Icon name="arrow" size={16} /></a></li>
        <li><a href="/kev/">RISE, Jev and Kev: reader-owned AI<Icon name="arrow" size={16} /></a></li>
        <li><a href="https://github.com/SyberLabs/papers">Papers: working papers and studies<Icon name="external" size={16} /></a></li>
        <li><a href="https://github.com/SyberLabs/cross-platform">Instrument panel: run and inspect five systems<Icon name="external" size={16} /></a></li>
        <li><a href="/kit/v2/">Design system v2 “Atlas”: the kit<Icon name="arrow" size={16} /></a></li>
      </ul>
    </div>
  </section>;
}

// Latest: what merged, deployed or was decided, newest first, each with its link (projects/latest.js).
function Latest() {
  const fmt = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  // the month of the newest record, not a month typed into the page
  const newest = latest.length ? new Date(latest[0].date + 'T12:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
  return <section id="latest" className="home-sec sy-wrap" aria-labelledby="latest-title">
    <div className="site-head" data-reveal><div><p className="sy-eyebrow">Latest{newest && ` / ${newest}`}</p><h2 id="latest-title" className="sy-display">What <em>changed.</em></h2></div><p className="home-head__note sy-small">Merged, deployed, decided or recorded, newest first. Each line links to its evidence.</p></div>
    <ol className="home-latest" data-reveal-children>
      {latest.map(item => <li key={item.href + item.title} className={`home-latest__row is-${item.state.replace(/\s+/g, '-')}`}>
        <span className="home-latest__date sy-label"><time dateTime={item.date}>{fmt(item.date)}</time></span>
        <span className="home-latest__state sy-label"><i aria-hidden="true" />{item.state}</span>
        <span className="home-latest__body"><a className="home-latest__title" href={item.href} rel="noopener">{item.project} · {item.title}<Icon name="external" size={14} /></a><span className="home-latest__text">{item.text}</span></span>
      </li>)}
    </ol>
  </section>;
}

// The factory: how the pull requests get made. The loop as a numbered strip (it is a sequence), four
// numbers that src/site/factory-stats.js refreshes from GitHub after load (the served text is the
// Oct 8 snapshot, so the section reads the same without JS), and the why beside its plate.
const FACTORY_STATS = [
  { id: 'merged-7d', n: 300, label: 'pull requests merged in the last 7 days' },
  { id: 'reviewed-7d', n: 220, label: 'of them reviewed by Codex' },
  { id: 'merged-24h', n: 40, label: 'merged in the last 24 hours' },
  { id: 'repos', n: 27, label: 'public repositories in the org' },
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
    <div className="site-head" data-reveal><p className="sy-eyebrow">About</p><h2 id="about-title" className="sy-display">About <em>SyberLabs.</em></h2></div>
    <div className="home-about">
      <div className="home-about__copy" data-reveal-children>
        <p className="sy-body-lg home-about__lead">SyberLabs is an independent software and AI research lab founded in 2026 by Mateo Robles. The lab designs, builds, and evaluates AI products and research software, with a focus on applied machine learning, LLM applications, AI agent reliability, and simulation. Seth Carlson builds the engineering infrastructure behind RISE and co-builds Relay.</p>
        <p>Every project is published with its current status and its limits. Prototypes, measured results, and planned work are labeled separately so readers can tell what has been shown and what has not.</p>
        <h3 className="sy-eyebrow home-about__label">Technical skills</h3>
        <ul className="home-about__skills" data-reveal-children>{skills.map(s => <li key={s}>{s}</li>)}</ul>
      </div>
      <aside className="sy-plate sy-plate--card home-about__founder sy-card" aria-labelledby="founder-name" data-tilt="4" data-reveal>
        <p className="sy-eyebrow">Founder</p>
        <h3 id="founder-name" className="home-about__name">Mateo Robles</h3>
        <p className="home-about__role">Founder and Independent Researcher, SyberLabs</p>
        <p>B.S. Computer Science, emphasis in Data Science, Santa Clara University (2026). Software engineer working across machine learning, LLM applications, and full-stack development.</p>
        <ul className="home-about__links">
          <li><a href={RESUME}>Résumé (PDF)<Icon name="arrow" /></a></li>
          <li><a href={LINKEDIN}>LinkedIn<Icon name="external" /></a></li>
          <li><a href={GITHUB}>GitHub<Icon name="external" /></a></li>
          <li><a href={CONTACT}>{EMAIL}</a></li>
        </ul>
      </aside>
    </div>
    <div className="home-cta sy-card" data-reveal data-tilt="2">
      <div><p className="sy-eyebrow">Work with us</p><h3 className="home-cta__title">An interactive way to read <em>your</em> text.</h3><p className="sy-body">Paid pilots turn one rights-cleared excerpt into a focused reading experience in the browser, built on RISE.</p></div>
      <div className="sy-actions"><a className="sy-btn sy-btn--solid" href="/services/">About pilots<Icon name="arrow" className="sy-icon--trail" /></a><a className="sy-btn sy-btn--line" href={CONTACT}>Email the lab</a></div>
    </div>
  </section>;
}

// A closing signature: the mark, on its own, before the footer.
function Sign() {
  return <div className="home-sign sy-wrap" data-reveal>
    <picture data-tilt="10"><source srcSet="/syber-logo.webp" type="image/webp" /><img src="/syber-logo.png" alt="SyberLabs logo" width="678" height="750" loading="lazy" /></picture>
  </div>;
}

export default function App() {
  useEffect(() => {
    const sigils = drawAll(document);
    // The homepage field sits low and left, behind the copy and under Plate I, and climbs as the page scrolls.
    boot(document, { density: 'calm', offset: [-0.34, -0.42] });
    import('./site/factory-stats.js').then(m => m.factoryStats(document));
    return () => sigils.disconnect();
  }, []);
  return <>
    <Header />
    <main id="main"><Hero /><GitHits /><PlusVoice /><Work /><Sketch /><Latest /><Factory /><Research /><About /><Sign /></main>
    <Footer />
  </>;
}
