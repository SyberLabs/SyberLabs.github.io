import React, { useEffect, useRef, useState } from 'react';
import syberMark from '../syber-logo-96.png';
import { projects, nav, workWithUs, footerLinks, skills, EMAIL, CONTACT, RESUME, LINKEDIN, GITHUB } from '../projects/site-data.js';
import { mount, RING_SVG, paramLine } from '../kit/v2/syber-atmosphere.js';
import plateStill from './plate-i.webp';
import plateStillSm from './plate-i-sm.webp';
import { params as sigilParams, drawAll, draw } from '../kit/v2/syber-sigil.js';
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

function Header() {
  const closeMenu = event => { if (event.target.closest('a')) event.currentTarget.closest('details').open = false; };
  return <header className="sy-header">
    <div className="sy-header__in">
      <a className="sy-lockup" href="/" aria-label="SyberLabs home"><img src={syberMark} alt="" width="22" height="24" />SYBERLABS</a>
      <nav className="sy-nav" aria-label="Primary">
        <ul>{nav.map(item => <li key={item.label}><a href={item.href}>{item.label}</a></li>)}</ul>
        <a className="sy-btn sy-btn--line" href={workWithUs.href}>{workWithUs.label}</a>
      </nav>
      <details className="sy-menu">
        <summary>Menu</summary>
        <div className="sy-menu__panel">
          <nav aria-label="Mobile" onClick={closeMenu}>
            <ul>{nav.map(item => <li key={item.label}><a href={item.href}>{item.label}</a></li>)}</ul>
            <a className="sy-btn sy-btn--solid" href={workWithUs.href}>{workWithUs.label}</a>
          </nav>
        </div>
      </details>
    </div>
  </header>;
}

// Plate I: the one live attractor on the site. Without JS, without WebGL2 or on software GL, a still exposure of
// the same plate (src/plate-i.webp, parameters STILL) sits in the ring instead; the live canvas replaces it.
const STILL = [-1.378, 1.637, 0.958, 0.685];
function Hero() {
  const canvas = useRef(null), copy = useRef(null), caption = useRef(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    // window.SY_ALLOW_SOFTWARE_GL is set only by screenshot tooling; real visitors on software WebGL get the still.
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
        <p className="sy-eyebrow">SyberLabs / Independent AI software lab</p>
        <h1 id="hero-title" className="sy-display-xl home-hero__title">Read.<br /> <em>Think.</em><br /> Build.</h1>
        <p className="sy-body-lg home-hero__intro">SyberLabs builds AI-powered reading software and tools that make AI agents reviewable.</p>
        <div className="home-hero__actions">
          <a className="sy-btn sy-btn--solid" href="https://rise.syberlabs.io/sequences/">Start a short reading<Icon name="arrow" className="sy-icon--trail" /></a>
          <a className="sy-btn sy-btn--line" href="#work">See the work<Icon name="down" /></a>
        </div>
        <div className="home-hero__founder">
          <span>Founded in 2026 by <strong>Mateo Robles</strong></span>
          <ul>
            <li><a href={RESUME}>Résumé (PDF)</a></li>
            <li><a href={LINKEDIN}>LinkedIn</a></li>
            <li><a href={GITHUB}>GitHub</a></li>
            <li><a href={CONTACT}>Email</a></li>
          </ul>
        </div>
      </div>
      <p className="sy-plate-caption home-hero__caption" aria-hidden="true"><b>Plate I · Clifford attractor</b><i>Order, drawn out of chaos.</i><span className="home-eq">x′ = sin(a·y) + c·cos(a·x)<br />y′ = sin(b·x) + d·cos(b·y)</span><span className="sy-params" ref={caption}>{paramLine(STILL)}</span></p>
    </div>
    <nav className="sy-strip" aria-label="Projects at a glance">
      <ol>{projects.map(p => <li key={p.slug} style={{ '--sy-accent': p.accent }}><a href={`/projects/${p.slug}/`}><span className="sy-strip__n">{p.number}<span className="home-strip__cat"> · {p.category}</span></span><span className="sy-strip__t">{p.name}</span><Badge status={p.status} bare /></a></li>)}</ol>
    </nav>
  </section>;
}

function Work() {
  const redraw = event => { const c = event.currentTarget.querySelector('canvas'); if (c) draw(c, c.dataset.sigil); };
  return <section id="work" className="home-sec sy-wrap" aria-labelledby="work-title">
    <div className="site-head home-head">
      <div><p className="sy-eyebrow">Work</p><h2 id="work-title" className="sy-display">Projects</h2></div>
    </div>
    <ul className="sy-project-rows home-rows">
      {projects.map(p => <li key={p.slug}><a className="sy-project-row" href={`/projects/${p.slug}/`} style={{ '--sy-accent': p.accent }} onMouseEnter={redraw}>
        <span className="sy-project-row__index">{p.number}</span>
        <canvas className="sy-project-row__sigil" data-sigil={p.slug} aria-hidden="true" />
        <span className="sy-project-row__name"><span className="sy-project-row__title">{p.name}</span><span className="sy-project-row__cat">{p.category}</span></span>
        <span className="sy-project-row__body"><span className="sy-project-row__headline">{p.headline}</span><span className="sy-project-row__intro">{p.intro}</span><span className="sy-project-row__stack">{p.facts.find(([k]) => k === 'Technology')?.[1]}</span></span>
        <Badge status={p.status} />
        <svg className="sy-project-row__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
      </a></li>)}
    </ul>
  </section>;
}

function Research() {
  return <section id="research" className="home-sec sy-wrap" aria-labelledby="research-title">
    <div className="site-head"><p className="sy-eyebrow">Research / September 2026</p><h2 id="research-title" className="sy-display">Reliable execution for AI agents.</h2></div>
    <div className="home-research">
      <div>
        <figure className="sy-plate-figure home-research__fig" aria-hidden="true" style={{ '--sy-accent': 'var(--sy-ice)' }}>
          <div className="sy-plate sy-plate--sigil"><canvas data-sigil="jev-execution" data-caption-for="params-jev-execution" /></div>
          <figcaption><b>Plate VII · Technical report</b>de Jong map · <span className="sy-nowrap">seed “jev-execution”</span><span className="sy-params" id="params-jev-execution">{sigilParams('jev-execution').caption}</span></figcaption>
        </figure>
      </div>
      <div>
        <p className="sy-body-lg">A model can choose an action, but an application still has to enforce permissions and budgets, check the result, and recover from crashes. Our current research defines that execution layer and tests it with a Python and SQLite prototype that passes 87 regression tests, including process-crash recovery experiments.</p>
        <p className="sy-plate-caption sy-plate-caption--figure home-research__stat"><b className="sy-figure">87</b><span>passing regression tests</span></p>
        <a className="sy-link home-research__link" href="/research/jev-execution/">Read the technical report<Icon name="arrow" /></a>
      </div>
    </div>
  </section>;
}

function About() {
  return <section id="about" className="home-sec sy-wrap" aria-labelledby="about-title">
    <div className="site-head"><p className="sy-eyebrow">About</p><h2 id="about-title" className="sy-display">About SyberLabs</h2></div>
    <div className="home-about">
      <div className="home-about__copy">
        <p className="sy-body-lg home-about__lead">SyberLabs is an independent software and AI research lab founded in 2026 by Mateo Robles. The lab designs, builds, and evaluates AI products and research software, with a focus on applied machine learning, LLM applications, AI agent reliability, and simulation.</p>
        <p>Every project is published with its current status and its limits. Prototypes, measured results, and planned work are labeled separately so readers can tell what has been shown and what has not.</p>
        <h3 className="sy-eyebrow home-about__label">Technical skills</h3>
        <ul className="home-about__skills">{skills.map(s => <li key={s}>{s}</li>)}</ul>
      </div>
      <aside className="sy-plate sy-plate--card home-about__founder" aria-labelledby="founder-name">
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
  </section>;
}

function Footer() {
  return <footer className="sy-footer home-footer">
    <div className="sy-footer__in">
      <a className="sy-lockup" href="/"><img src={syberMark} alt="" width="18" height="20" />© 2026 SyberLabs</a>
      <nav aria-label="Footer">
        {footerLinks.map(link => <a key={link.label} href={link.href}>{link.label}{link.external && <> <Icon name="external" size={16} /></>}</a>)}
      </nav>
    </div>
  </footer>;
}

export default function App() {
  useEffect(() => { const sigils = drawAll(document); return () => sigils.disconnect(); }, []);
  return <>
    <a className="sy-skip" href="#main">Skip to content</a>
    <Header />
    <main id="main"><Hero /><Work /><Research /><About /></main>
    <Footer />
  </>;
}
