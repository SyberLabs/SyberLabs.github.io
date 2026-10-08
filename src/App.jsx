import React, { useEffect, useRef, useState } from 'react';
import { projects, skills, EMAIL, CONTACT, RESUME, LINKEDIN, GITHUB, RISE_APP, OMNI_PREVIEW, SKETCH_APP, RISE_PLUS } from '../projects/site-data.js';
import { latest } from '../projects/latest.js';
import { header as chromeHeader, footer as chromeFooter } from '../projects/project-template.js';
import { mount, RING_SVG, paramLine } from '../kit/v2/syber-atmosphere.js';
import plateStill from './plate-i.webp';
import plateStillSm from './plate-i-sm.webp';
import { params as sigilParams, drawAll, draw } from '../kit/v2/syber-sigil.js';
import { boot, reducedMotion } from './site/site.js';
import { mountThink } from './site/think.js';
import { gallery } from './sketch-gallery/index.js';
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

const Badge = ({ status, bare }) => <span className={`sy-badge sy-badge--${status.kind}${bare ? ' sy-badge--bare' : ''}`}>{status.label}</span>;

// The header, the field canvas and the footer are the same markup every page gets (projects/project-template.js);
// the homepage bundle boots the behaviours itself, so the shared /syberlabs.js is not loaded here.
const Header = () => <div className="home-chrome" dangerouslySetInnerHTML={{ __html: chromeHeader('', { sticky: false, script: false }) }} />;
const Footer = () => <div className="home-chrome home-footer" dangerouslySetInnerHTML={{ __html: chromeFooter('/') }} />;

// Plate I: the one live 2D long-exposure attractor on the site. Without JS, without WebGL2 or on software GL,
// a still exposure of the same plate (src/plate-i.webp, parameters STILL) sits in the ring instead.
const STILL = [-1.378, 1.637, 0.958, 0.685];

// "Think.": one span per letter (src/site/think.js, .home-think in home.css). Each letter's scatter (--dx, --dy, --r)
// is where it condenses from on the way in. The text stays "Think." for search, readers and the no-JS page.
const THINK = [['T', -0.2, 0.34, -9], ['h', 0.12, -0.3, 7], ['i', -0.08, 0.4, -5], ['n', 0.16, -0.24, 8], ['k', -0.14, 0.32, -7], ['.', 0.24, -0.36, 12]];
const Think = React.forwardRef((_, ref) => <em ref={ref} className="home-think" data-split-skip data-text="Think.">
  {THINK.map(([ch, dx, dy, r], i) => <span key={i} className={`home-think__l${ch === '.' ? ' home-think__dot' : ''}`} style={{ '--i': i, '--dx': dx + 'em', '--dy': dy + 'em', '--r': r + 'deg' }}>{ch}</span>)}
</em>);

function Hero() {
  const canvas = useRef(null), copy = useRef(null), caption = useRef(null), think = useRef(null);
  const [live, setLive] = useState(false);
  // before boot() splits and reveals the title (child effects run first), so the letters start from their scatter
  useEffect(() => { const t = mountThink(think.current); return () => t.destroy(); }, []);
  useEffect(() => {
    const plate = mount(canvas.current, { mode: 'hero', avoid: copy.current, caption: caption.current, allowSoftware: window.SY_ALLOW_SOFTWARE_GL === true });
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
        <h1 id="hero-title" className="sy-display-xl home-hero__title" data-split>Read.<br /> <Think ref={think} /><br /> Build.</h1>
        <p className="sy-body-lg home-hero__intro" data-reveal>SyberLabs builds an audiovisual reader, a canvas for thinking with AI over live data, and infrastructure that makes AI agents reviewable. Two of them are live.</p>
        <div className="home-hero__actions" data-reveal>
          <a className="sy-btn sy-btn--solid" href={RISE_APP}>Open RISE<Icon name="arrow" className="sy-icon--trail" /></a>
          <a className="sy-btn sy-btn--line" href={OMNI_PREVIEW}>Try the OmniOS preview<Icon name="external" /></a>
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
      <p className="sy-plate-caption home-hero__caption" aria-hidden="true" data-reveal><b>Plate I · Clifford attractor</b><i>Order, drawn out of chaos.</i><span className="home-eq">x′ = sin(a·y) + c·cos(a·x)<br />y′ = sin(b·x) + d·cos(b·y)</span><span className="sy-params" ref={caption}>{paramLine(STILL)}</span></p>
    </div>
    <nav className="sy-strip home-strip" aria-label="Projects at a glance">
      <ol>{projects.map(p => <li key={p.slug} style={{ '--sy-accent': p.accent }}><a href={`/projects/${p.slug}/`}><span className="sy-strip__n">{p.number}<span className="home-strip__cat"> · {p.category}</span></span><span className="sy-strip__t">{p.name}</span><Badge status={p.status} bare /></a></li>)}</ol>
    </nav>
    <a className="home-scrollcue" href="#work" aria-label="Scroll to the work"><span /></a>
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
        <p className="sy-body-lg">RISE Plus voice is a premium ElevenLabs voice for RISE, the browser-based audiovisual reader. It voices a reading of your own as the words arrive on screen.</p>
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

// Work: five projects as leaning glass cards, each with its sigil large and its accent lighting the card.
function Work() {
  const redraw = event => { const c = event.currentTarget.querySelector('canvas[data-sigil]'); if (c) draw(c, c.dataset.sigil); };
  return <section id="work" className="home-sec sy-wrap" aria-labelledby="work-title">
    <div className="site-head home-head" data-reveal>
      <div><p className="sy-eyebrow">Work / 01–05</p><h2 id="work-title" className="sy-display">Five <em>projects.</em></h2></div>
      <p className="home-head__note sy-small">Each page says why it exists, what you can do with it, how it is built, and what has been shown and what has not.</p>
    </div>
    <ul className="home-cards" data-reveal-children>
      {projects.map(p => <li key={p.slug}><a className="home-card sy-card" href={`/projects/${p.slug}/`} style={{ '--sy-accent': p.accent }} data-tilt="6" onMouseEnter={redraw}>
        <span className="home-card__top"><span className="home-card__index">{p.number}</span><Badge status={p.status} /></span>
        <span className="home-card__sigil-wrap"><canvas className="home-card__sigil" data-sigil={p.slug} aria-hidden="true" /></span>
        <span className="home-card__name"><span className="home-card__title">{p.name}</span><span className="home-card__cat">{p.category}</span></span>
        <span className="home-card__headline">{p.headline}</span>
        <span className="home-card__intro">{p.intro}</span>
        <span className="home-card__foot"><span className="home-card__stack">{p.facts.find(([k]) => k === 'Technology')?.[1]?.split(',').slice(0, 3).map(s => s.trim()).join(' · ') || p.facts[0]?.[1]}</span><span className="home-card__go">Open<Icon name="arrow" size={16} /></span></span>
      </a></li>)}
      <li><a className="home-card home-card--more sy-card" href="/approach/" data-tilt="6">
        <span className="home-card__top"><span className="home-card__index">+</span></span>
        <span className="home-card__name"><span className="home-card__title">How we build</span><span className="home-card__cat">Approach</span></span>
        <span className="home-card__headline">Observe. Design. Verify.</span>
        <span className="home-card__intro">Start with what is true, decide what a person should be able to see, choose or approve, then test that they can steer the result.</span>
        <span className="home-card__foot"><span className="home-card__stack">Also: Services · Design kit</span><span className="home-card__go">Read<Icon name="arrow" size={16} /></span></span>
      </a></li>
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

function Research() {
  return <section id="research" className="home-sec sy-wrap" aria-labelledby="research-title">
    <div className="site-head" data-reveal><p className="sy-eyebrow">Research / September 2026</p><h2 id="research-title" className="sy-display">Reliable <em>execution</em> for AI agents.</h2></div>
    <div className="home-research" data-reveal-children>
      <a className="home-paper sy-card" href="/research/jev-execution/" style={{ '--sy-accent': 'var(--sy-ice)' }} data-tilt="4">
        <figure className="sy-plate-figure home-research__fig" aria-hidden="true">
          <div className="sy-plate sy-plate--sigil"><canvas data-sigil="jev-execution" data-caption-for="params-jev-execution" /></div>
          <figcaption><b>Plate VII · Technical report</b>de Jong map · <span className="sy-nowrap">seed “jev-execution”</span><span className="sy-params" id="params-jev-execution">{sigilParams('jev-execution').caption}</span></figcaption>
        </figure>
        <div className="home-paper__body">
          <p className="sy-eyebrow">Technical report</p>
          <h3 className="home-paper__title">An execution layer that enforces permissions, checks results, and survives crashes.</h3>
          <p className="sy-body">A model can choose an action, but an application still has to enforce permissions and budgets, check the result, and recover from crashes. Our current research defines that layer and tests it with a Python and SQLite prototype.</p>
          <p className="sy-plate-caption sy-plate-caption--figure home-research__stat"><b className="sy-figure" data-count="87">87</b><span>passing regression tests, including process-crash recovery experiments</span></p>
          <span className="sy-link home-research__link">Read the technical report<Icon name="arrow" /></span>
        </div>
      </a>
      <a className="home-paper home-paper--note sy-card" href="/research/sybershoke/" style={{ '--sy-accent': 'var(--sy-magenta)' }} data-tilt="4">
        <figure className="sy-plate-figure home-research__fig" aria-hidden="true">
          <div className="sy-plate sy-plate--sigil"><canvas data-sigil="sybershoke" data-caption-for="params-sybershoke" /></div>
          <figcaption><b>Plate VIII · Research note</b>de Jong map · <span className="sy-nowrap">seed “sybershoke”</span><span className="sy-params" id="params-sybershoke">{sigilParams('sybershoke').caption}</span></figcaption>
        </figure>
        <div className="home-paper__body">
          <p className="sy-eyebrow">Research note / Sybershoke</p>
          <h3 className="home-paper__title">Shock the run. Then count.</h3>
          <p className="sy-body">Sybershoke shock-tests multi-agent systems. It kills workers, duplicates and drops messages, then checks that nothing was lost or accepted twice. It has now checked one real system’s source, the RISE Worker, against recorded answers.</p>
          <span className="sy-link home-research__link">Read the research note<Icon name="arrow" /></span>
        </div>
      </a>
    </div>
    <div className="home-research-more" data-reveal>
      <p className="sy-eyebrow">Also</p>
      <ul className="home-research__links">
        <li><a href="/research/">All research: the index<Icon name="arrow" size={16} /></a></li>
        <li><a href="/kev/">RISE, Jev and Kev: reader-owned AI<Icon name="arrow" size={16} /></a></li>
        <li><a href="/jev/">Jev in RISE: the earlier case study<Icon name="arrow" size={16} /></a></li>
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
  return <section id="latest" className="home-sec sy-wrap" aria-labelledby="latest-title">
    <div className="site-head" data-reveal><div><p className="sy-eyebrow">Latest / October 2026</p><h2 id="latest-title" className="sy-display">What <em>changed.</em></h2></div><p className="home-head__note sy-small">Merged, deployed, decided or recorded, newest first. Each line links to its evidence.</p></div>
    <ol className="home-latest" data-reveal-children>
      {latest.map(item => <li key={item.href + item.title} className={`home-latest__row is-${item.state.replace(/\s+/g, '-')}`}>
        <span className="home-latest__date sy-label"><time dateTime={item.date}>{fmt(item.date)}</time></span>
        <span className="home-latest__state sy-label"><i aria-hidden="true" />{item.state}</span>
        <span className="home-latest__body"><a className="home-latest__title" href={item.href} rel="noopener">{item.project} · {item.title}<Icon name="external" size={14} /></a><span className="home-latest__text">{item.text}</span></span>
      </li>)}
    </ol>
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
    return () => sigils.disconnect();
  }, []);
  return <>
    <Header />
    <main id="main"><Hero /><PlusVoice /><Work /><Sketch /><Latest /><Research /><About /><Sign /></main>
    <Footer />
  </>;
}
