import React, { useEffect, useRef, useState } from 'react';
import { projects, skills, EMAIL, CONTACT, RESUME, LINKEDIN, MATEO_GITHUB, MATEO_SITE, RISE_APP, OMNI_PREVIEW, SKETCH_APP, RISE_PLUS } from '../projects/site-data.js';
import { header as chromeHeader, footer as chromeFooter } from '../projects/project-template.js';
import { mount, RING_SVG } from '../kit/v2/syber-atmosphere.js';
import plateStill from './plate-i.webp';
import plateStillSm from './plate-i-sm.webp';
import { params as sigilParams, drawAll, draw } from '../kit/v2/syber-sigil.js';
import { boot, reducedMotion } from './site/site.js';
import { mountSlot } from './site/slot.js';
import { mountStrike } from './site/strike.js';
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

// The hero headline as four slot reels (src/site/slot.js) that land on the page's two parts, in page order:
// Creative systems. (part 01) / Reliable agents. (part 02). Each strip passes real combinations of the same
// vocabulary on its way; the last word is where it stops. Search engines and screen readers get the .sy-sr text.
const REELS = [
  ['Reliable', 'Generative', 'Reliable', 'Creative'],
  ['agents.', 'humans.', 'agents.', 'humans.', 'systems.'],
  ['Creative', 'Generative', 'Creative', 'Generative', 'Reliable'],
  ['systems.', 'humans.', 'systems.', 'humans.', 'systems.', 'agents.'],
];
// a reel: the words as type (.home-slot__face) and the same words pre-streaked (.home-slot__ghost), the motion blur
// slot.js fades in with the reel's speed
const Reel = ({ words, noun }) => {
  const Tag = noun ? 'em' : 'span';
  return <Tag className={`home-slot__reel${noun ? ' home-slot__reel--noun' : ''}`}>
    <span className="home-slot__strip">
      <span className="home-slot__face">{words.map((w, i) => <span key={i} className={`home-slot__w${i === words.length - 1 ? ' is-final' : ''}`}>{w}</span>)}</span>
      <span className="home-slot__ghost">{words.map((w, i) => <span key={i} className="home-slot__w">{w}</span>)}</span>
    </span>
  </Tag>;
};
const Slot = React.forwardRef((_, ref) => <h1 ref={ref} id="hero-title" className="sy-display-xl home-hero__title home-slot">
  <span className="sy-sr">Creative systems. Reliable agents.</span>
  <span className="home-slot__lines" aria-hidden="true">
    <span className="home-slot__line"><Reel words={REELS[0]} /> <Reel words={REELS[1]} noun /></span>
    <span className="home-slot__line"><Reel words={REELS[2]} /> <Reel words={REELS[3]} noun /></span>
  </span>
</h1>);

function Hero() {
  const canvas = useRef(null), copy = useRef(null), slot = useRef(null);
  const [live, setLive] = useState(false);
  useEffect(() => { const m = mountSlot(slot.current); return () => m.destroy(); }, []);
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
        <p className="sy-eyebrow" data-reveal>SyberLabs / Independent AI software lab</p>
        <Slot ref={slot} />
        <p className="sy-body-lg home-hero__intro" data-reveal>SyberLabs builds creative systems where people and AI make together, and the infrastructure that keeps AI agents reliable.</p>
        <div className="home-hero__actions" data-reveal>
          <a className="sy-btn sy-btn--solid" href={RISE_APP}>Read today’s poem<Icon name="arrow" className="sy-icon--trail" /></a>
          <a className="sy-btn sy-btn--line" href="#reliability">For teams: reliable agents<Icon name="down" /></a>
        </div>
        <p className="home-hero__note" data-reveal>Free in your browser. No account needed.</p>
        <div className="home-hero__founder" data-reveal>
          <span>Founded in 2026 by <strong>Mateo Robles</strong></span>
          <ul>
            <li><a href={RESUME}>Résumé (PDF)</a></li>
            <li><a href={LINKEDIN}>LinkedIn</a></li>
            <li><a href={MATEO_GITHUB}>GitHub</a></li>
            <li><a href={CONTACT}>Email</a></li>
          </ul>
        </div>
      </div>
    </div>
    <nav className="home-launch" aria-label="Try a tool">
      <ul className="sy-wrap">
        <li style={{ '--sy-accent': '#f2d9a6' }}><a href="https://rise.syberlabs.io/voice-demo"><span className="home-launch__meta">RISE Reader · Open beta</span><span className="home-launch__title">Try a custom voice reading<Icon name="external" /></span><span className="home-launch__note">ElevenLabs voice and psychedelic visuals. Sign-in required.</span></a></li>
        <li style={{ '--sy-accent': '#ff91df' }}><a href={SKETCH_APP}><span className="home-launch__meta">RISE Sketch · Live</span><span className="home-launch__title">Draw with living ink<Icon name="external" /></span><span className="home-launch__note">Make a mark. Watch it grow.</span></a></li>
        <li style={{ '--sy-accent': '#90d8f0' }}><a href={OMNI_PREVIEW}><span className="home-launch__meta">FLYSPACE · Preview</span><span className="home-launch__title">Explore a workspace<Icon name="external" /></span><span className="home-launch__note">Opens as OmniOS. AI needs the local app.</span></a></li>
      </ul>
    </nav>
  </section>;
}

// GitHits, after the projects, as supporting evidence of how we build (a third party, so it never leads the page): what our agents use it for, and totals from the project pages' dependency panels,
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
    <div className="home-gh sy-card" style={{ '--sy-accent': 'var(--sy-ice)' }} data-reveal>
      <div className="home-gh__copy">
        <p className="sy-eyebrow">How we build / GitHits</p>
        <h2 id="githits-title" className="sy-display">Read the source, <em>not the memory.</em></h2>
        <p className="sy-body-lg">Our coding agents look up open-source code at the exact version a project uses, through GitHits, a third-party index of public code. A model’s memory blends releases; the pinned source does not.</p>
        <p className="sy-body">Every project page shows a dependency check: license, latest version and known vulnerabilities for each declared package, fetched from the GitHits package API each time this site is built.</p>
        <div className="sy-actions home-gh__actions">
          <a className="sy-btn sy-btn--line" href="/stack/">How we build<Icon name="arrow" className="sy-icon--trail" /></a>
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

const RISE_MCP = 'https://rise.syberlabs.io/api/mcp';
const CLAUDE_CONNECTORS = 'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp';

// The runtime, right under the hero: RISE Composer, free and live in Claude, with RISE Premium as a panel beneath it.
// What it claims is what runs: Claude composes a reading over the connector (rise_present with a Current), RISE checks
// it before anything plays, and the reader steps into it. Premium copy follows RISE_PLUS.state ('coming' never offers a sale).
const RUNTIME = [
  ['01', 'Compose', 'A model writes the reading: the words, how they arrive, and the scene around them.'],
  ['02', 'Admit', 'RISE checks every choice against what it can perform. Nothing plays that it did not admit.'],
  ['03', 'Experience', 'Words arrive in time, with image, sound and procedural motion. You step inside the answer.'],
];

// The strike (src/site/strike.js), played once when the flow comes into view and frozen on its last frame: node 1
// charges, a fractal bolt strikes node 2, a second strikes node 3, and node 3 bursts. Reduced motion shows that frame.
function RuntimeFlow() {
  const wrap = useRef(null), canvas = useRef(null);
  const [state, setState] = useState('idle'); // idle -> playing (once) | still (reduced motion)
  useEffect(() => {
    const el = wrap.current, strike = mountStrike(canvas.current);
    const measure = () => {
      const box = el.getBoundingClientRect();
      const pts = [...el.querySelectorAll('.home-rt__node')].map(n => { const b = n.getBoundingClientRect(); return [b.left - box.left + b.width / 2, b.top - box.top + b.height / 2, b.height / 2]; });
      if (pts.length === 3) strike.layout(pts, box.width, box.height);
    };
    measure();
    const ro = 'ResizeObserver' in window ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    let io = null;
    if (reducedMotion() || !('IntersectionObserver' in window)) { strike.still(); setState('still'); }
    else {
      io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { strike.play(); setState('playing'); io.disconnect(); } }, { threshold: 0.55 });
      io.observe(el);
    }
    return () => { ro?.disconnect(); io?.disconnect(); strike.destroy(); };
  }, []);
  return <div ref={wrap} className={`home-rt__flow is-${state}`}>
    <canvas ref={canvas} className="home-rt__strike" aria-hidden="true" />
    <ol className="home-rt__stages" aria-label="How the runtime works">
      {RUNTIME.map(([n, term, text]) => <li key={n} className="home-rt__stage">
        <span className="home-rt__node" aria-hidden="true"><i /></span>
        <span className="home-rt__n">{n}</span>
        <span className="home-rt__term">{term}</span>
        <span className="home-rt__text">{text}</span>
      </li>)}
    </ol>
  </div>;
}

function Runtime() {
  const live = RISE_PLUS.state === 'live';
  return <section id="runtime" className="home-sec sy-wrap" aria-labelledby="runtime-title">
    <div className="home-rt sy-card" style={{ '--sy-accent': '#f2d9a6' }} data-reveal data-tilt="1">
      <div className="home-rt__main">
        <div className="home-rt__copy">
          <p className="home-rt__top"><span className="sy-eyebrow">RISE Composer</span><Badge status={{ kind: 'live', label: 'Free · live in Claude' }} /></p>
          <h2 id="runtime-title" className="sy-display home-rt__title">The experiential runtime <em>for machine intelligence.</em></h2>
          <p className="sy-body-lg home-rt__lede">Models think in text. RISE gives their answers time, image, sound and motion: a reading you step inside, not a block you scroll past.</p>
          <div className="home-rt__connect">
            <p className="sy-label">Add it to Claude as a custom connector</p>
            <span className="home-suite__conn"><span className="sy-label">Name</span><code>RISE</code><CopyButton text="RISE" label="the connector name" /></span>
            <span className="home-suite__conn"><span className="sy-label">URL</span><code>{RISE_MCP.split(/(?=\/api\/)/).flatMap((part, i) => i ? [<wbr key={i} />, part] : [part])}</code><CopyButton text={RISE_MCP} label="the connector URL" /></span>
          </div>
          <div className="sy-actions home-rt__actions">
            <a className="sy-btn sy-btn--solid" href={CLAUDE_CONNECTORS}>How to add a connector<Icon name="external" /></a>
            <a className="sy-btn sy-btn--line" href={RISE_APP}>Open RISE<Icon name="external" /></a>
          </div>
        </div>
        <RuntimeFlow />
      </div>
    </div>
    <div className="home-premium sy-card" style={{ '--sy-accent': '#f2d9a6' }} data-reveal>
      <p className="home-premium__text"><b className="home-premium__name">RISE Premium</b> offers ElevenLabs integration for <b className="home-premium__price">{RISE_PLUS.price}</b> a month.{!live && <Badge status={{ kind: 'early', label: 'Paid launch pending' }} />}</p>
      <a className="sy-btn sy-btn--line home-premium__go" href="/plus/">Learn more<Icon name="arrow" /></a>
    </div>
  </section>;
}

// The page is in three parts, in the order of the hero's resting line: 01 Creative systems (RISE, FLYSPACE, Sketch),
// 02 Reliable agents (SyberWork, Sybershoke, GitHits), 03 About. Product names, accents, statuses and pages come from
// projects/site-data.js; what each one is for lives here, and every claim is one the project's own page carries.
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
    note: 'The public preview opens as OmniOS, with a browser-local canvas and public data blocks. AI answers need the local app and your own keys.',
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
const isExternal = href => /^https?:/.test(href);

// A part's opening: its number, the half of the hero line it delivers, and who it is for.
function PartHead({ id, n, title, em, note }) {
  return <header id={id} className="home-part sy-wrap" data-reveal>
    <p className="home-part__n">{n}</p>
    <h2 className="sy-display home-part__title">{title} <em>{em}</em></h2>
    <p className="home-part__note">{note}</p>
  </header>;
}

function Products({ slugs, label }) {
  const list = slugs.map(slug => projects.find(p => p.slug === slug)).filter(Boolean);
  const redraw = event => event.currentTarget.querySelectorAll('canvas[data-sigil]').forEach(c => draw(c, c.dataset.sigil));
  return <section className="home-sec home-products sy-wrap" aria-label={label}>
    <ul className="home-show" data-reveal-children>
      {list.map(p => { const s = SHOW[p.slug]; return <li key={p.slug} className={`home-show__item home-show__item--${p.slug}`}>
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

// Research: Sybershoke, framed as what it is (a method for testing service-oriented agent systems under fault), with
// the RISE run as its field result. Every claim is in research/sybershoke/ (revision 2, SyberLabs/sybershoke@45956fe):
// the faults it injects, the seed -> fault plan -> history -> invariants abstraction, delta-debugging shrinking, and
// its stated scope.
const SHOKE = 'https://github.com/SyberLabs/sybershoke';
const SHOKE_PILLARS = [
  ['Deterministic', 'One seed, one fault schedule, one history, on any machine. A failure is a seed you can rerun.'],
  ['Invariant-driven', 'The system under test never grades itself. Correctness is read from the history: no task lost, none accepted twice.'],
  ['Minimal', 'Delta debugging strips a failing schedule to the faults that matter, so a report reads as a cause, not a log.'],
];
function Research() {
  return <section id="research" className="home-sec sy-wrap" aria-labelledby="research-title">
    <div className="site-head home-head" data-reveal>
      <div><p className="sy-eyebrow">Research / Reliability engineering</p><h2 id="research-title" className="sy-display">Reliability you can <em>replay.</em></h2></div>
      <p className="home-head__note sy-small">Agentic systems fail between services: a worker dies mid-task, a message lands twice, a model provider stalls. We make those failures deterministic, so every one can be reproduced, reduced and fixed.</p>
    </div>
    <article className="home-study sy-card" style={{ '--sy-accent': 'var(--sy-magenta)' }} aria-labelledby="study-title" data-reveal data-tilt="2">
      <figure className="sy-plate-figure home-study__fig" aria-hidden="true">
        <div className="sy-plate sy-plate--sigil"><canvas data-sigil="sybershoke" /></div>
        <figcaption><b>Sybershoke</b>Research note · revision 2 · 29 September 2026</figcaption>
      </figure>
      <div className="home-study__body">
        <p className="sy-eyebrow">Sybershoke · Deterministic fault injection</p>
        <h3 id="study-title" className="home-study__title">Turn distributed failure into a reproducible test case.</h3>
        <p className="sy-body">Sybershoke compiles a seed into a fault schedule (crashed workers, dropped and duplicated messages, slow or failing model providers), runs the system under it, and records an event history. Pass or fail is decided by invariants over that history alone. A failing schedule shrinks to the smallest set of faults that still breaks it.</p>
        <dl className="home-study__pillars">
          {SHOKE_PILLARS.map(([term, text]) => <div key={term}><dt>{term}</dt><dd>{text}</dd></div>)}
        </dl>
        <p className="home-study__method"><span className="sy-label">Lineage</span><span>Fault injection after <a href="https://jepsen.io/">Jepsen</a>; minimization by delta debugging (Zeller and Hildebrandt, <a href="https://doi.org/10.1109/32.988498">IEEE Transactions on Software Engineering, 2002</a>).</span></p>
        <p className="home-study__method"><span className="sy-label">Scope</span><span>Run against the worker’s source, with stand-ins for Redis and Neon and virtual time. Results are defects found, not production failure rates.</span></p>
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
      </ul>
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
    <div className="site-head" data-reveal><p className="sy-eyebrow">03 / About</p><h2 id="about-title" className="sy-display">About <em>SyberLabs.</em></h2></div>
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
          <li><a href={MATEO_GITHUB}>GitHub<Icon name="external" /></a></li>
          <li><a href={MATEO_SITE}>Personal site<Icon name="external" /></a></li>
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
    <main id="main">
      <Hero />
      <PartHead id="work" n="01" title="Creative" em="systems." note="Across the human–machine boundary: tools people create with, and a runtime machine intelligence performs through." />
      <Runtime /><Products slugs={['rise', 'flyspace']} label="Creative tools" /><Sketch />
      <PartHead id="reliability" n="02" title="Reliable" em="agents." note="Infrastructure that keeps AI accountable: governed execution with human sign-off, tested under failure before it ships." />
      <Products slugs={['syberwork']} label="Agent infrastructure" /><Research /><GitHits />{INTERNAL_SECTIONS && <Factory />}
      <About /><Sign />
    </main>
    <Footer />
  </>;
}
