import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, useColorScheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import risePoster from '../rise-demo/visual-sequence-poster-20260927-v2.jpg';
import syberMark from '../syber-logo.webp';
import syberMarkPng from '../syber-logo.png';
import syberMarkSmall from '../syber-logo-96.png';
import SystemMaps from './system-maps/SystemMaps.jsx';
import './home.css';

const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data' },
  colorSchemes: { light: true, dark: true },
});

const work = [
  { name: 'Jev', href: '/jev/' },
  { name: 'Commons', href: '/commons/' },
  { name: 'OmniOS', href: '/projects/omnios/' },
  { name: 'OSAHR', href: '/projects/osahr/' },
];

function ThemeToggle() {
  const { mode, setMode } = useColorScheme();
  if (!mode) return null;
  const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return <IconButton className="theme-toggle" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setMode(dark ? 'light' : 'dark')}>
    {dark ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
  </IconButton>;
}

function Header() {
  return <header className="site-header">
    <a className="wordmark" href="/" aria-label="SyberLabs home"><img src={syberMarkSmall} alt="" width="27" height="30" /><span>SYBERLABS</span></a>
    <nav className="desktop-nav" aria-label="Main navigation">
      <a href="#work">Work</a><a href="#maps">Maps</a><a href="#system">System</a>
    </nav>
    <div className="header-actions"><a className="header-contact" href="mailto:syberlabs.software@gmail.com">Get in touch <span aria-hidden="true">↗</span></a><ThemeToggle />
      <details className="mobile-menu"><summary>Menu</summary><nav aria-label="Mobile navigation" onClick={event => { if (event.target.closest('a')) event.currentTarget.closest('details').open = false; }}><a href="#work">Work</a><a href="#maps">Maps</a><a href="#system">System</a><a href="mailto:syberlabs.software@gmail.com">Contact</a></nav></details>
    </div>
  </header>;
}

function Hero() {
  return <section className="hero" aria-labelledby="hero-title">
    <div className="hero-grid">
      <div className="hero-heading"><p className="eyebrow">SYBERLABS / INDEPENDENT SOFTWARE LAB</p><h1 id="hero-title">{['Read', 'Think', 'Build'].map((word, i) => <React.Fragment key={word}>{i > 0 && ' '}<span className="hero-word">{word}<span className="hero-stop">.</span></span></React.Fragment>)}</h1><p className="hero-intro"><span className="hero-rule" aria-hidden="true" />Software for you and your agents.</p></div>
      <picture><source srcSet={syberMark} type="image/webp" /><img className="hero-mark" src={syberMarkPng} alt="SyberLabs mark" width="678" height="750" /></picture>
    </div>
    <div className="flagships" id="work">
      <article className="flagship flagship-rise" aria-labelledby="rise-title">
        <div className="flagship-top"><span>01 / HUMAN ENVIRONMENT</span><span>RISE · LIVE APP</span></div>
        <div className="rise-preview"><video className="rise-preview-video" autoPlay muted loop playsInline preload="auto" poster={risePoster} aria-label="RISE concept sequence: kaleidoscopic Attractor, Fractal Flame, Curia tiger and Astronomy"><source src="/rise-demo/rise-visual-sequence-20260927-v2.mp4" type="video/mp4" /></video><span className="rise-preview-caption">NEW VISUAL SEQUENCE / 25 SEC</span></div>
        <div className="flagship-copy"><h2 id="rise-title">One text.<br />Many ways to feel it.</h2><p className="flagship-update">Ask Jev to change the world around your reading.</p><div className="rise-actions"><a href="https://rise.syberlabs.io/jev-scene-demo">Try the interactive sample <span aria-hidden="true">↗</span></a><a href="/rise-demo/">Watch the full demo <span aria-hidden="true">↗</span></a></div></div>
      </article>
      <article className="flagship flagship-relay" aria-labelledby="relay-title">
        <div className="flagship-top"><span>02 / AGENT WORKFLOW</span><span>RELAY · EARLY RELEASE</span></div>
        <div className="relay-record" role="img" aria-label="Illustrative Relay record: a job posting and applicant research lead to draft version 03, which requires human review after a revision">
          <div className="record-header"><span>ILLUSTRATIVE RELAY RECORD</span><span>VERSION 03</span></div>
          <div className="record-chain"><div><small>SOURCE</small><strong>Job posting</strong></div><div><small>CONTEXT</small><strong>Research + facts</strong></div><div><small>DRAFT</small><strong>Version 03</strong></div></div>
          <div className="record-status"><span className="status-dot" aria-hidden="true" /><span>EXACT WORDING NEEDS HUMAN REVIEW</span></div>
        </div>
        <div className="flagship-copy"><h2 id="relay-title">Every draft has a source and a state.</h2><div className="flagship-actions"><a href="https://relay.syberlabs.io/">Open Relay <span aria-hidden="true">↗</span></a><a href="/projects/relay/">Explore Relay <span aria-hidden="true">↗</span></a></div></div>
      </article>
    </div>
  </section>;
}

function Work() {
  return <section className="work-section" id="other-work" aria-label="Other projects">
    <div className="work-list">{work.map(item => <a className="work-row" href={item.href} key={item.name}><span className="work-name">{item.name}</span><span className="work-arrow" aria-hidden="true">↗</span></a>)}</div>
  </section>;
}

function System() {
  return <section className="system" id="system" aria-labelledby="system-title">
  <div className="system-inner">
    <div className="system-heading"><p className="system-eyebrow">THE SYBERLABS FIELD</p><h2 id="system-title">Across the human–agent boundary.</h2><p>Agents can generate and coordinate. People can explore ideas, delegate choices, inspect consequences, and change course.</p></div>
    <div className="system-planes">
      <article className="system-plane system-plane-agent" aria-labelledby="agent-plane-title">
        <span className="plane-index">01 / AGENT SYSTEMS</span><h3 id="agent-plane-title">Infrastructure for agents.</h3>
        <div className="plane-row"><span className="plane-label">INTRA / WITHIN GENERATION</span><p>Generate, test, stabilize.</p><strong>SyberRuntime</strong></div>
        <div className="plane-row"><span className="plane-label">AUTHORITY / BEFORE EXECUTION</span><p>Declare and check what an agent may do.</p><strong>Turtle · policy evaluator (P0)</strong></div>
        <div className="plane-row"><span className="plane-label">EXO / ACROSS SYSTEMS</span><p>Model, deliberate, authorize, coordinate.</p><strong>Barn · Bough · OSAHR · Relay</strong></div>
        <p className="plane-future"><span>THE DIRECTION</span> SyberLabs SDK, growing from SyberWork.</p>
      </article>
      <article className="system-plane system-plane-human" aria-labelledby="human-plane-title">
        <span className="plane-index">02 / HUMAN ENVIRONMENTS</span><h3 id="human-plane-title">Interfaces for thought.</h3>
        <div className="plane-row"><span className="plane-label">WORKSPACE / OMNIOS</span><p>Spatial work with inspectable context.</p></div>
        <div className="plane-row"><span className="plane-label">MEDIA / RISE</span><p>Reading shaped by text, space, sound, and Jev’s delegated choices.</p></div>
        <p className="plane-future"><span>THE CONNECTION</span> Agent action becomes a human experience.</p>
      </article>
    </div>
    <div className="system-boundary"><span>THE BOUNDARY</span><strong>Human thought <i aria-hidden="true">→</i> Delegated action <i aria-hidden="true">→</i> Inspectable consequence</strong><p>RISE can make delegation fluid. Relay makes review explicit before an artifact is submitted.</p></div>
  </div></section>;
}

function Footer() {
  return <footer className="site-footer"><a href="mailto:syberlabs.software@gmail.com">Contact SyberLabs ↗</a><span>© 2026 SyberLabs</span></footer>;
}

function App() {
  return <ThemeProvider theme={theme} defaultMode="dark"><Header /><main><Hero /><SystemMaps /><System /><Work /></main><Footer /></ThemeProvider>;
}

createRoot(document.getElementById('root')).render(<App />);
