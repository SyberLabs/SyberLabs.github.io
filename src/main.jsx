import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, useColorScheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import risePoster from '../rise-demo/poster-20260926.jpg';
import LabTrial from './LabTrial.jsx';
import './home.css';

const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data' },
  colorSchemes: { light: true, dark: true },
});

const work = [
  { number: '01', name: 'Jev', type: 'Evaluation', description: 'Our independent evaluation of TypeSafe AI’s model for bounded judgments.', href: '/jev/' },
  { number: '02', name: 'Commons', type: 'Local prototype', description: 'A place to turn a shared need into a plan with a visible decision history.', href: '/commons/' },
  { number: '03', name: 'OmniOS', type: 'Research', description: 'A spatial AI workspace that shows which sources reached an answer.', href: '/projects/omnios/' },
  { number: '04', name: 'OSAHR', type: 'Research', description: 'Graph based simulation with inspectable rules, events, and replay.', href: '/projects/osahr/' },
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
      <a href="#work">Work</a><a href="#system">System</a><a href="/jev/">Jev</a><a href="/approach/">Approach</a>
    </nav>
    <div className="header-actions"><a className="header-contact" href="mailto:syberlabs.software@gmail.com">Get in touch <span aria-hidden="true">↗</span></a><ThemeToggle />
      <details className="mobile-menu"><summary>Menu</summary><nav aria-label="Mobile navigation"><a href="#work">Work</a><a href="#system">System</a><a href="/jev/">Jev</a><a href="/approach/">Approach</a><a href="/rise-demo/">RISE demo</a><a href="mailto:syberlabs.software@gmail.com">Contact</a></nav></details>
    </div>
  </header>;
}

function Hero() {
  return <section className="hero" aria-labelledby="hero-title">
    <div className="hero-grid">
      <div className="hero-heading"><p className="eyebrow">SYBERLABS / INDEPENDENT SOFTWARE LAB</p><h1 id="hero-title">Software you can <em>feel.</em><br />Decisions you can <em>inspect.</em></h1></div>
      <div className="hero-aside"><p>We build experiential software that changes how ideas are encountered, and empirical software that shows how a decision was made.</p><div className="hero-cta"><a className="text-link" href="#work">Meet the two approaches <span aria-hidden="true">↘</span></a><a className="text-link" href="#trial">Run a lab trial <span aria-hidden="true">↗</span></a></div></div>
    </div>
    <div className="flagships" id="work">
      <article className="flagship flagship-rise" aria-labelledby="rise-title">
        <video className="flagship-video" autoPlay muted loop playsInline preload="metadata" poster={risePoster} aria-hidden="true"><source src="/rise-demo/rise-demo-20260926.mp4" type="video/mp4" /></video>
        <div className="flagship-shade" aria-hidden="true" />
        <div className="flagship-top"><span>01 / EXPERIENTIAL SOFTWARE</span><span>RISE · LIVE APP</span></div>
        <div className="flagship-copy"><p>FEEL AND STEER THE EXPERIENCE</p><h2 id="rise-title">One text.<br />Many ways to feel it.</h2><span>Change timing, space, image, and sound around the same words.</span><a href="/projects/rise/">Explore RISE <span aria-hidden="true">↗</span></a></div>
      </article>
      <article className="flagship flagship-relay" aria-labelledby="relay-title">
        <div className="flagship-top"><span>02 / EMPIRICAL SOFTWARE</span><span>RELAY · EARLY RELEASE</span></div>
        <div className="relay-record" role="img" aria-label="Illustrative Relay record: a job posting and applicant research lead to draft version 03, which requires human review after a revision">
          <div className="record-header"><span>ILLUSTRATIVE JOB RECORD / 014</span><span>VERSION 03</span></div>
          <div className="record-chain"><div><small>01 / SOURCE</small><strong>Job posting</strong><span>Attached to this record</span></div><div><small>02 / CONTEXT</small><strong>Research + facts</strong><span>Carried into the draft</span></div><div><small>03 / REVISION</small><strong>Draft v03</strong><span>Changed since v02</span></div></div>
          <div className="record-status"><span className="status-dot" aria-hidden="true" /><span>EXACT WORDING NEEDS HUMAN REVIEW</span></div>
        </div>
        <div className="flagship-copy"><p>INSPECT AND CHALLENGE THE RECORD</p><h2 id="relay-title">Every draft has a source and a state.</h2><span>Keep the posting, research, revisions, and exact approval connected.</span><a href="/projects/relay/">Explore Relay <span aria-hidden="true">↗</span></a></div>
      </article>
    </div>
  </section>;
}

function Work() {
  return <section className="work-section" id="other-work" aria-labelledby="work-title"><div className="section-heading"><p className="eyebrow">ELSEWHERE IN THE LAB</p><h2 id="work-title">Other questions.<br /><em>Same rigor.</em></h2><p>Independent evaluations, prototypes, and research systems extend these ideas into other domains.</p></div>
    <div className="work-list">{work.map(item => <a className="work-row" href={item.href} key={item.name}><span className="work-num">{item.number}</span><span className="work-name">{item.name}</span><span className="work-description">{item.description}</span><span className="work-type">{item.type}</span><span className="work-arrow" aria-hidden="true">↗</span></a>)}</div>
  </section>;
}

function System() {
  return <section className="system" id="system" aria-labelledby="system-title"><div className="system-inner">
    <div className="system-heading"><div><p className="eyebrow">TWO MODES · ONE STANDARD</p><h2 id="system-title">Human agency is<br /><em>the common thread.</em></h2></div><p>An experience should be steerable. A decision should be answerable. Both begin with a person who can see and shape what happens next.</p></div>
    <div className="system-paths" aria-label="Experiential software moves from source text through presentation to reader control. Empirical software moves from a source record through revision to human review.">
      <div className="system-path"><span className="path-label">EXPERIENTIAL / RISE</span><div className="path-steps"><span>Source text</span><i aria-hidden="true">→</i><span>Timing · space · sound</span><i aria-hidden="true">→</i><strong>Reader control</strong></div></div>
      <div className="system-path"><span className="path-label">EMPIRICAL / RELAY</span><div className="path-steps"><span>Source record</span><i aria-hidden="true">→</i><span>Versioned draft</span><i aria-hidden="true">→</i><strong>Human review</strong></div></div>
    </div>
    <div className="system-foot"><p>Different products. A shared commitment to letting people steer and inspect.</p><a href="/approach/">Read our approach <span aria-hidden="true">↗</span></a></div>
  </div></section>;
}

function Footer() {
  return <footer className="site-footer"><div className="footer-main"><div><p className="eyebrow">SYBERLABS</p><h2>Ideas deserve<br />better interfaces.</h2><a href="mailto:syberlabs.software@gmail.com">Get in touch <span aria-hidden="true">↗</span></a></div><nav aria-label="Site directory"><div><strong>Explore</strong><a href="/projects/rise/">RISE</a><a href="/jev/">Jev</a><a href="/commons/">Commons</a><a href="/projects/relay/">Relay</a><a href="/projects/omnios/">OmniOS</a><a href="/projects/osahr/">OSAHR</a></div><div><strong>More</strong><a href="/approach/">Approach</a><a href="/rise-demo/">RISE demo</a><a href="https://www.youtube.com/@RiseChamber" target="_blank" rel="noopener noreferrer">YouTube</a><a href="https://github.com/SyberLabs" target="_blank" rel="noopener noreferrer">GitHub</a></div></nav></div><div className="footer-bottom"><span>© 2026 SyberLabs · Mateo Robles · Seth Carlson</span><a href="#hero-title">Back to top ↑</a></div></footer>;
}

function App() {
  return <ThemeProvider theme={theme} defaultMode="light"><Header /><main><Hero /><System /><LabTrial /><Work /></main><Footer /></ThemeProvider>;
}

createRoot(document.getElementById('root')).render(<App />);
