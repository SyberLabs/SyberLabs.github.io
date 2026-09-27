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
  { number: '01', name: 'Jev', type: 'Research', description: 'Typed model judgments, bounded by product rules and human authority.', href: '/jev/' },
  { number: '02', name: 'Commons', type: 'Prototype', description: 'A place to turn a shared need into a plan with a visible decision history.', href: '/commons/' },
  { number: '03', name: 'Relay', type: 'Product', description: 'An application workspace that keeps research, revisions, and exact approval together.', href: '/projects/relay/' },
  { number: '04', name: 'OmniOS', type: 'Research', description: 'A spatial AI workspace that shows which sources reached an answer.', href: '/projects/omnios/' },
  { number: '05', name: 'OSAHR', type: 'Research', description: 'Graph based simulation with inspectable rules, events, and replay.', href: '/projects/osahr/' },
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
      <a href="#work">Work</a><a href="/jev/">Research</a><a href="/approach/">Approach</a><a href="https://www.youtube.com/@RiseChamber" target="_blank" rel="noopener noreferrer">Media</a>
    </nav>
    <div className="header-actions"><a className="header-contact" href="mailto:syberlabs.software@gmail.com">Get in touch <span aria-hidden="true">↗</span></a><ThemeToggle />
      <details className="mobile-menu"><summary>Menu</summary><nav aria-label="Mobile navigation"><a href="#work">Work</a><a href="/jev/">Research</a><a href="/approach/">Approach</a><a href="/rise-demo/">RISE demo</a><a href="/commons/">Commons</a><a href="mailto:syberlabs.software@gmail.com">Contact</a></nav></details>
    </div>
  </header>;
}

function Hero() {
  return <section className="hero" aria-labelledby="hero-title">
    <div className="hero-grid">
      <div className="hero-heading"><p className="eyebrow">INDEPENDENT AI LAB</p><h1 id="hero-title">Make intelligence <em>tangible.</em></h1></div>
      <div className="hero-aside"><p>We build interfaces for reading, decisions, and simulation. Our work makes complex systems easier to enter, question, and control.</p><a className="text-link" href="#work">Explore the work <span aria-hidden="true">↗</span></a></div>
    </div>
    <a className="feature" href="/projects/rise/" aria-label="Explore RISE, our reading experience">
      <video className="feature-video" autoPlay muted loop playsInline preload="metadata" poster={risePoster} aria-hidden="true"><source src="/rise-demo/rise-demo-20260926.mp4" type="video/mp4" /></video>
      <span className="feature-shade" aria-hidden="true" />
      <span className="feature-top"><span>FEATURED SYSTEM / 001</span><span>RISE · LIVE EXPERIENCE</span></span>
      <span className="feature-bottom"><span><small>READING, REIMAGINED</small><strong>Words become worlds.</strong><span>Explore RISE <span aria-hidden="true">↗</span></span></span><span className="feature-index">01 / 06</span></span>
    </a>
  </section>;
}

function Work() {
  return <section className="work-section" id="work" aria-labelledby="work-title"><div className="section-heading"><p className="eyebrow">OUR WORK</p><h2 id="work-title">Systems worth<br /><em>understanding.</em></h2><p>Each project starts with a concrete problem and a clear account of what the software should do.</p></div>
    <div className="work-list">{work.map(item => <a className="work-row" href={item.href} key={item.name}><span className="work-num">{item.number}</span><span className="work-name">{item.name}</span><span className="work-description">{item.description}</span><span className="work-type">{item.type}</span><span className="work-arrow" aria-hidden="true">↗</span></a>)}</div>
    <a className="work-rise-link" href="/projects/rise/">See the RISE project page <span aria-hidden="true">↗</span></a>
  </section>;
}

function Thinking() {
  return <section className="thinking" aria-labelledby="thinking-title"><div className="thinking-inner"><div><p className="eyebrow">HOW WE THINK</p><h2 id="thinking-title">Question the system.<br />Then build what matters.</h2></div><div className="thinking-copy"><p>Good AI products make their boundaries visible. We expose the inputs, the transformation, and the point where a person stays in control.</p><div className="thinking-links"><a href="/approach/">Read our approach <span aria-hidden="true">↗</span></a><a href="/jev/">Study the Jev research <span aria-hidden="true">↗</span></a></div></div></div></section>;
}

function Media() {
  return <section className="media" aria-labelledby="media-title"><div className="media-heading"><p className="eyebrow">FROM THE LAB</p><h2 id="media-title">See the experience.</h2><p>RISE UP (ONE SHOT) is a visual expression of the world behind RISE.</p></div><div className="media-frame"><iframe src="https://www.youtube-nocookie.com/embed/pWa_ibgPoGo" title="RISE UP (ONE SHOT) visualizer" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div><div className="media-links"><a href="/rise-demo/">Watch the RISE demo <span aria-hidden="true">↗</span></a><a href="https://www.youtube.com/@RiseChamber" target="_blank" rel="noopener noreferrer">Visit the channel <span aria-hidden="true">↗</span></a></div></section>;
}

function Footer() {
  return <footer className="site-footer"><div className="footer-main"><div><p className="eyebrow">SYBERLABS</p><h2>Ideas deserve<br />better interfaces.</h2><a href="mailto:syberlabs.software@gmail.com">Work with us <span aria-hidden="true">↗</span></a></div><nav aria-label="Site directory"><div><strong>Explore</strong><a href="/projects/rise/">RISE</a><a href="/jev/">Jev</a><a href="/commons/">Commons</a><a href="/projects/relay/">Relay</a><a href="/projects/omnios/">OmniOS</a><a href="/projects/osahr/">OSAHR</a></div><div><strong>More</strong><a href="/approach/">Approach</a><a href="/rise-demo/">RISE demo</a><a href="https://www.youtube.com/@RiseChamber" target="_blank" rel="noopener noreferrer">YouTube</a><a href="https://github.com/SyberLabs" target="_blank" rel="noopener noreferrer">GitHub</a></div></nav></div><div className="footer-bottom"><span>© 2026 SyberLabs · Mateo Robles · Seth Carlson</span><a href="#hero-title">Back to top ↑</a></div></footer>;
}

function App() {
  return <ThemeProvider theme={theme} defaultMode="system"><Header /><main><Hero /><Work /><Thinking /><Media /></main><Footer /></ThemeProvider>;
}

createRoot(document.getElementById('root')).render(<App />);
