import React, { useEffect, useRef, useState } from 'react';
import { projects, skills, EMAIL, CONTACT, RESUME, LINKEDIN, GITHUB, RISE_APP, OMNI_PREVIEW } from '../projects/site-data.js';
import { header as chromeHeader, footer as chromeFooter } from '../projects/project-template.js';
import { mount, RING_SVG, paramLine } from '../kit/v2/syber-atmosphere.js';
import plateStill from './plate-i.webp';
import plateStillSm from './plate-i-sm.webp';
import { params as sigilParams, drawAll, draw } from '../kit/v2/syber-sigil.js';
import { boot } from './site/site.js';
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
function Hero() {
  const canvas = useRef(null), copy = useRef(null), caption = useRef(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const plate = mount(canvas.current, { mode: 'hero', avoid: copy.current, caption: caption.current, allowSoftware: window.SY_ALLOW_SOFTWARE_GL === true });
    setLive(plate.supported);
    return () => plate.destroy();
  }, []);
  return <section className={`home-hero sy-nebula${live ? ' is-live' : ''}`} aria-labelledby="hero-title">
    <canvas ref={canvas} className="sy-atmosphere" aria-hidden="true" />
    <img className="home-still" src={plateStill} srcSet={`${plateStillSm} 560w, ${plateStill} 1000w`} sizes="(max-width: 900px) 400px, 60vw" width="1000" height="1000" alt="" aria-hidden="true" decoding="async" />
    <span className="home-ring" aria-hidden="true" dangerouslySetInnerHTML={{ __html: RING_SVG }} />
    <div className="sy-scrim home-hero__scrim" aria-hidden="true" />
    <div className="home-hero__in sy-wrap">
      <div className="home-hero__copy" ref={copy}>
        <p className="sy-eyebrow" data-reveal>SyberLabs / Independent AI software lab</p>
        <h1 id="hero-title" className="sy-display-xl home-hero__title" data-split>Read.<br /> <em>Think.</em><br /> Build.</h1>
        <p className="sy-body-lg home-hero__intro" data-reveal>SyberLabs builds an audiovisual reader, a canvas for thinking with AI over live data, and infrastructure that makes AI agents reviewable. Two of them are live.</p>
        <div className="home-hero__actions" data-reveal>
          <a className="sy-btn sy-btn--solid" href={RISE_APP}>Open RISE<Icon name="arrow" className="sy-icon--trail" /></a>
          <a className="sy-btn sy-btn--line" href={OMNI_PREVIEW}>Try the OmniOS preview<Icon name="external" /></a>
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
        <li><a href="/kev/">RISE and Kev: migration status<Icon name="arrow" size={16} /></a></li>
        <li><a href="/jev/">Jev in RISE: the earlier case study<Icon name="arrow" size={16} /></a></li>
        <li><a href="https://github.com/SyberLabs/papers">Papers: working papers and studies<Icon name="external" size={16} /></a></li>
        <li><a href="https://github.com/SyberLabs/cross-platform">Instrument panel: run and inspect five systems<Icon name="external" size={16} /></a></li>
        <li><a href="/kit/v2/">Design system v2 “Atlas”: the kit<Icon name="arrow" size={16} /></a></li>
      </ul>
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
    return () => sigils.disconnect();
  }, []);
  return <>
    <Header />
    <main id="main"><Hero /><Work /><Research /><About /><Sign /></main>
    <Footer />
  </>;
}
