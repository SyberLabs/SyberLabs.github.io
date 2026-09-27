import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, useColorScheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import risePoster from '../rise-demo/poster-20260926.jpg';
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
    <a className="wordmark" href="/" aria-label="SyberLabs home"><img src="/favicon-blue-32x32.png" alt="" /><span>SYBERLABS</span></a>
    <nav className="desktop-nav" aria-label="Main navigation">
      <a href="#work">Work</a><a href="#system">System</a>
    </nav>
    <div className="header-actions"><a className="header-contact" href="mailto:syberlabs.software@gmail.com">Get in touch <span aria-hidden="true">↗</span></a><ThemeToggle />
      <details className="mobile-menu"><summary>Menu</summary><nav aria-label="Mobile navigation" onClick={event => { if (event.target.closest('a')) event.currentTarget.closest('details').open = false; }}><a href="#work">Work</a><a href="#system">System</a><a href="mailto:syberlabs.software@gmail.com">Contact</a></nav></details>
    </div>
  </header>;
}

function Hero() {
  return <section className="hero" aria-labelledby="hero-title">
    <div className="hero-grid">
      <div className="hero-heading"><p className="eyebrow">SYBERLABS / INDEPENDENT SOFTWARE LAB</p><h1 id="hero-title">Software you can <em>feel.</em><br />Decisions you can <em>inspect.</em></h1></div>
    </div>
    <div className="flagships" id="work">
      <article className="flagship flagship-rise" aria-labelledby="rise-title">
        <video className="flagship-video" autoPlay muted loop playsInline preload="metadata" poster={risePoster} aria-hidden="true"><source src="/rise-demo/rise-demo-20260926.mp4" type="video/mp4" /></video>
        <div className="flagship-shade" aria-hidden="true" />
        <div className="flagship-top"><span>01 / EXPERIENTIAL SOFTWARE</span><span>RISE · LIVE APP</span></div>
        <div className="flagship-copy"><h2 id="rise-title">One text.<br />Many ways to feel it.</h2><a href="/projects/rise/">Explore RISE <span aria-hidden="true">↗</span></a></div>
      </article>
      <article className="flagship flagship-relay" aria-labelledby="relay-title">
        <div className="flagship-top"><span>02 / EMPIRICAL SOFTWARE</span><span>RELAY · EARLY RELEASE</span></div>
        <div className="relay-record" role="img" aria-label="Illustrative Relay record: a job posting and applicant research lead to draft version 03, which requires human review after a revision">
          <div className="record-header"><span>ILLUSTRATIVE RELAY RECORD</span><span>VERSION 03</span></div>
          <div className="record-chain"><div><small>SOURCE</small><strong>Job posting</strong></div><div><small>CONTEXT</small><strong>Research + facts</strong></div><div><small>DRAFT</small><strong>Version 03</strong></div></div>
          <div className="record-status"><span className="status-dot" aria-hidden="true" /><span>EXACT WORDING NEEDS HUMAN REVIEW</span></div>
        </div>
        <div className="flagship-copy"><h2 id="relay-title">Every draft has a source and a state.</h2><a href="/projects/relay/">Explore Relay <span aria-hidden="true">↗</span></a></div>
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
  return <section className="system" id="system" aria-label="Two software paths">
  <div className="system-inner">
    <div className="system-paths" aria-label="Experiential software moves from source text through presentation to reader control. Empirical software moves from a source record through revision to human review.">
      <div className="system-path"><span className="path-label">EXPERIENTIAL / RISE</span><div className="path-steps"><span>Source text</span><i aria-hidden="true">→</i><span>Timing · space · sound</span><i aria-hidden="true">→</i><strong>Reader control</strong></div></div>
      <div className="system-path"><span className="path-label">EMPIRICAL / RELAY</span><div className="path-steps"><span>Source record</span><i aria-hidden="true">→</i><span>Versioned draft</span><i aria-hidden="true">→</i><strong>Human review</strong></div></div>
      <div className="system-convergence"><strong>PERSON IN CONTROL</strong></div>
    </div>
  </div></section>;
}

function Footer() {
  return <footer className="site-footer"><a href="mailto:syberlabs.software@gmail.com">Contact SyberLabs ↗</a><span>© 2026 SyberLabs</span></footer>;
}

function App() {
  return <ThemeProvider theme={theme} defaultMode="light"><Header /><main><Hero /><System /><Work /></main><Footer /></ThemeProvider>;
}

createRoot(document.getElementById('root')).render(<App />);
