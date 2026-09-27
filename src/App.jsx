import React from 'react';
import syberMark from '../syber-logo-96.png';
import { projects, nav, headerAction, footerLinks, skills, EMAIL, CONTACT, RESUME, LINKEDIN, GITHUB } from '../projects/site-data.js';
import './syberlabs.css';
import './home.css';

function Icon({ name, size = 20, className = '' }) {
  const paths = {
    arrow: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
    down: <><path d="M12 5v14" /><path d="M6 13l6 6 6-6" /></>,
    external: <><path d="M7 17L17 7" /><path d="M8 7h9v9" /></>,
    menu: <><path d="M4 9h16" /><path d="M4 15h16" /></>,
    close: <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>,
  };
  return <svg className={`sy-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Header() {
  const closeMenu = event => { if (event.target.closest('a')) event.currentTarget.closest('details').open = false; };
  return <header className="sy-header">
    <div className="sy-header__inner">
      <a className="sy-lockup" href="/" aria-label="SyberLabs home"><img className="sy-lockup__mark" src={syberMark} alt="" width="18" height="20" /><span>SYBERLABS</span></a>
      <nav className="sy-header__nav" aria-label="Primary">
        <ul>{nav.map(item => <li key={item.label}><a className="sy-header__link" href={item.href}>{item.label}</a></li>)}</ul>
        <a className="sy-btn sy-btn--secondary sy-header__action" href={headerAction.href}>{headerAction.label}</a>
      </nav>
      <details className="sy-menu">
        <summary className="sy-btn sy-btn--icon" aria-label="Menu"><Icon name="menu" className="sy-icon--open" /><Icon name="close" className="sy-icon--close" /></summary>
        <div className="sy-menu__panel">
          <nav aria-label="Mobile" onClick={closeMenu}>
            <ul>{nav.map(item => <li key={item.label}><a href={item.href}>{item.label}</a></li>)}</ul>
            <a className="sy-btn sy-btn--secondary" href={headerAction.href}>{headerAction.label}</a>
          </nav>
        </div>
      </details>
    </div>
  </header>;
}

function Hero() {
  return <section className="home-hero sy-container" aria-labelledby="hero-title">
    <p className="sy-eyebrow">SyberLabs / Independent AI software lab</p>
    <h1 id="hero-title" className="sy-display-xl home-hero__title">Read. <br className="home-break" />Think. <br className="home-break" />Build.</h1>
    <p className="sy-body-lg home-hero__intro">SyberLabs builds AI-powered reading software and tools that make AI agents reviewable.</p>
    <div className="sy-actions home-hero__actions">
      <a className="sy-btn sy-btn--primary" href="https://rise.syberlabs.io/sequences/">Start a short reading<Icon name="arrow" className="sy-icon--trail" /></a>
      <a className="sy-btn sy-btn--ghost" href="#work">See the work<Icon name="down" /></a>
    </div>
  </section>;
}

function Work() {
  return <section id="work" className="home-work sy-container" aria-labelledby="work-title">
    <p className="sy-eyebrow">Work</p>
    <h2 id="work-title" className="sy-title home-section-title">Projects</h2>
    <div className="sy-rows home-rows">
      {projects.map(p => <a key={p.slug} className="sy-row" href={`/projects/${p.slug}/`} style={{ '--accent': p.accent }}>
        <span className="sy-row__number">{p.number}</span>
        <span className="sy-row__id">
          <span className="sy-row__name-line"><span className="sy-row__dot" aria-hidden="true" /><span className="sy-row__name">{p.name}</span></span>
          <span className="sy-row__category sy-label">{p.category}</span>
        </span>
        <span className="sy-row__copy"><span className="sy-row__headline">{p.headline}</span><span className="sy-row__summary">{p.intro}</span><span className="home-row__stack">{p.facts.find(([k]) => k === 'Technology')?.[1]}</span></span>
        <span className="sy-row__status"><span className={`sy-badge sy-badge--${p.status.kind}`}><span className="sy-badge__dot" aria-hidden="true" />{p.status.label}</span></span>
        <span className="sy-row__arrow"><Icon name="arrow" /></span>
      </a>)}
    </div>
  </section>;
}

function Research() {
  return <section id="research" className="home-research sy-container" aria-labelledby="research-title">
    <div>
      <p className="sy-eyebrow">Research / September 2026</p>
      <h2 id="research-title" className="sy-title home-research__title">Reliable execution for AI agents.</h2>
    </div>
    <div className="home-research__body">
      <p className="sy-body-lg">A model can choose an action, but an application still has to enforce permissions and budgets, check the result, and recover from crashes. Our current research defines that execution layer and tests it with a Python and SQLite prototype that passes 87 regression tests, including process-crash recovery experiments.</p>
      <a className="sy-link home-research__link" href="/research/jev-execution/">Read the technical report<Icon name="arrow" /></a>
    </div>
  </section>;
}

function About() {
  return <section id="about" className="home-about sy-container" aria-labelledby="about-title">
    <p className="sy-eyebrow">About</p>
    <h2 id="about-title" className="sy-title home-section-title">About SyberLabs</h2>
    <div className="home-about__grid">
      <div className="home-about__copy">
        <p className="sy-body-lg">SyberLabs is an independent software and AI research lab founded in 2026 by Mateo Robles. The lab designs, builds, and evaluates AI products and research software, with a focus on applied machine learning, LLM applications, AI agent reliability, and simulation.</p>
        <p>Every project is published with its current status and its limits. Prototypes, measured results, and planned work are labeled separately so readers can tell what has been shown and what has not.</p>
        <h3 className="sy-label home-about__label">Technical skills</h3>
        <ul className="home-about__skills">{skills.map(s => <li key={s}>{s}</li>)}</ul>
      </div>
      <aside className="home-about__founder" aria-labelledby="founder-name">
        <p className="sy-label">Founder</p>
        <h3 id="founder-name" className="sy-heading">Mateo Robles</h3>
        <p className="home-about__role">Founder and Independent Researcher, SyberLabs</p>
        <p>B.S. Computer Science, emphasis in Data Science, Santa Clara University (2026). Software engineer working across machine learning, LLM applications, and full-stack development.</p>
        <ul className="home-about__links">
          <li><a className="sy-link" href={RESUME}>Résumé (PDF)<Icon name="arrow" /></a></li>
          <li><a className="sy-link" href={LINKEDIN}>LinkedIn<Icon name="external" /></a></li>
          <li><a className="sy-link" href={GITHUB}>GitHub<Icon name="external" /></a></li>
          <li><a className="sy-link" href={CONTACT}>{EMAIL}</a></li>
        </ul>
      </aside>
    </div>
  </section>;
}

function Footer() {
  return <footer className="sy-footer">
    <div className="sy-footer__inner">
      <div className="sy-footer__brand"><a className="sy-lockup" href="/" aria-label="SyberLabs home"><img className="sy-lockup__mark" src={syberMark} alt="" width="18" height="20" /><span>SYBERLABS</span></a><span className="sy-footer__copy">© 2026 SyberLabs</span></div>
      <nav className="sy-footer__nav" aria-label="Footer">
        {footerLinks.map(link => <a key={link.label} className="sy-footer__link" href={link.href}>{link.label}{link.external && <Icon name="external" size={16} />}</a>)}
      </nav>
    </div>
  </footer>;
}

export default function App() {
  return <>
    <a className="sy-skip" href="#main">Skip to content</a>
    <Header />
    <main id="main"><Hero /><Work /><Research /><About /></main>
    <Footer />
  </>;
}

