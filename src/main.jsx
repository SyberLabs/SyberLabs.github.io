import React, { useState } from 'react';
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
  { number: '01', name: 'Jev', type: 'Evaluation', description: 'Our independent evaluation of TypeSafe AI’s model for bounded judgments.', href: '/jev/' },
  { number: '02', name: 'Commons', type: 'Local prototype', description: 'A place to turn a shared need into a plan with a visible decision history.', href: '/commons/' },
  { number: '03', name: 'Relay', type: 'Product', description: 'An application workspace that keeps research, revisions, and exact approval together.', href: '/projects/relay/' },
  { number: '04', name: 'OmniOS', type: 'Research', description: 'A spatial AI workspace that shows which sources reached an answer.', href: '/projects/omnios/' },
  { number: '05', name: 'OSAHR', type: 'Research', description: 'Graph based simulation with inspectable rules, events, and replay.', href: '/projects/osahr/' },
];

function ThemeToggle() {
  const { mode, setMode } = useColorScheme();
  React.useEffect(() => { if (mode === 'system') setMode('light'); }, [mode, setMode]);
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
      <div className="hero-heading"><p className="eyebrow">INDEPENDENT AI LAB</p><h1 id="hero-title">Make intelligence <em>tangible.</em></h1></div>
      <div className="hero-aside"><p>We build RISE for immersive reading and tools for decisions you can inspect, question, and control.</p><a className="text-link" href="#work">Explore the work <span aria-hidden="true">↗</span></a></div>
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
  </section>;
}

const systemContexts = [
  { name: 'RISE', focus: 'Reading', href: '/projects/rise/' },
  { name: 'Jev', focus: 'Model judgment', href: '/jev/' },
  { name: 'Commons', focus: 'Shared plans', href: '/commons/' },
  { name: 'Relay', focus: 'Application review', href: '/projects/relay/' },
  { name: 'OmniOS', focus: 'Spatial answers', href: '/projects/omnios/' },
  { name: 'OSAHR', focus: 'Simulation', href: '/projects/osahr/' },
];

const labCases = {
  RISE: { question: 'Should a reading session change pace?', input: 'Reader state + passage context', proposed: 'Suggest a slower pace' },
  Commons: { question: 'Should a mission draft advance?', input: 'Mission evidence + reviewer state', proposed: 'Advance the draft' },
  Relay: { question: 'Should an application draft advance?', input: 'Sources + revisions + owner state', proposed: 'Advance the draft' },
};

function evaluateTrial({ evidence, confidence, consent, approval }) {
  if (!consent) return { status: 'HOLD', reason: 'Consent is absent. The proposed action is blocked.', rule: '01 / consent = false', color: '#dfaa8f' };
  if (evidence < 75) return { status: 'MORE EVIDENCE', reason: 'The evidence score is below the illustrative 75% gate.', rule: `02 / evidence ${evidence}% < 75%`, color: '#e2bc82' };
  if (confidence < 70) return { status: 'HUMAN REVIEW', reason: 'The illustrative confidence is below the 70% review gate.', rule: `03 / confidence ${confidence}% < 70%`, color: '#b6a5e5' };
  if (!approval) return { status: 'AWAITING APPROVAL', reason: 'The checks pass. A person still has to approve the action.', rule: '04 / approval = pending', color: '#a6c5bd' };
  return { status: 'PERMITTED', reason: 'All illustrative gates pass, including explicit human approval.', rule: '05 / all gates pass', color: '#b9cf9d' };
}

function System() {
  const [scenario, setScenario] = useState('RISE');
  const [evidence, setEvidence] = useState(82);
  const [confidence, setConfidence] = useState(78);
  const [consent, setConsent] = useState(true);
  const [approval, setApproval] = useState(false);
  const [trials, setTrials] = useState([]);
  const result = evaluateTrial({ evidence, confidence, consent, approval });
  const runTrial = () => {
    const snapshot = { scenario, evidence, confidence, consent, approval, ...result };
    setTrials(previous => [{ id: (previous[0]?.id ?? 0) + 1, ...snapshot }, ...previous].slice(0, 4));
  };
  const loadTrial = trial => {
    setScenario(trial.scenario);
    setEvidence(trial.evidence);
    setConfidence(trial.confidence);
    setConsent(trial.consent);
    setApproval(trial.approval);
  };
  return <section className="system" id="system" aria-labelledby="system-title"><div className="system-inner">
    <div className="system-heading"><div><p className="eyebrow">AN OPEN LAB INSTRUMENT</p><h2 id="system-title">Change the state.<br /><em>See the rule.</em></h2></div><p>Try a decision boundary. Change its inputs, run a trial, and inspect the exact rule that shaped the result.</p></div>
    <div className="lab-notice"><span>LOCAL DEMONSTRATION / POLICY v0.1</span><p>These are user controlled, illustrative inputs. This instrument makes no model call and reports no product performance.</p></div>
    <div className="lab-console" style={{ '--trial-accent': result.color }}>
      <div className="lab-controls"><div className="lab-panel-heading"><span>01 / SET THE CONDITIONS</span><strong>{labCases[scenario].question}</strong></div>
        <div className="lab-scenarios" role="group" aria-label="Choose a product scenario">{Object.keys(labCases).map(name => <button type="button" className={scenario === name ? 'is-selected' : ''} aria-pressed={scenario === name} onClick={() => setScenario(name)} key={name}>{name}</button>)}</div>
        <label className="lab-range"><span>Evidence available <strong>{evidence}%</strong></span><input type="range" min="0" max="100" value={evidence} onChange={event => setEvidence(Number(event.target.value))} /></label>
        <label className="lab-range"><span>Illustrative confidence <strong>{confidence}%</strong></span><input type="range" min="0" max="100" value={confidence} onChange={event => setConfidence(Number(event.target.value))} /></label>
        <label className="lab-check"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>Consent is present</span></label>
        <label className="lab-check"><input type="checkbox" checked={approval} onChange={event => setApproval(event.target.checked)} /><span>Human approval recorded</span></label>
        <button className="lab-run" type="button" onClick={runTrial}>Run trial <span aria-hidden="true">↗</span></button>
      </div>
      <div className="lab-observation"><div className="lab-panel-heading"><span>02 / OBSERVE THE PATH</span><strong>{labCases[scenario].proposed}</strong></div>
        <div className="lab-stage" aria-hidden="true"><div className="lab-stage-ring ring-one" /><div className="lab-stage-ring ring-two" /><div className="lab-stage-core"><span>INPUT</span><b>→</b><span>RULE</span><b>→</b><span>RESULT</span></div></div>
        <div className="lab-state"><span>INPUT</span><p>{labCases[scenario].input}</p><span>ACTIVE RULE</span><p>{result.rule}</p><span>PREVIEW OUTCOME</span><strong aria-live="polite">{result.status}</strong><p>{result.reason}</p></div>
      </div>
    </div>
    <div className="lab-record"><div><p className="eyebrow">03 / RECORDED TRIALS</p><p>Run the same state twice and you get the same result. Change one input to see which rule changes.</p></div><ol aria-live="polite">{trials.length ? trials.map(trial => <li key={trial.id}><span>#{String(trial.id).padStart(2, '0')} · {trial.scenario}</span><strong>{trial.status}</strong><small>E{trial.evidence} / C{trial.confidence} / CONSENT {trial.consent ? 'YES' : 'NO'} / APPROVAL {trial.approval ? 'YES' : 'NO'}</small><code>{trial.rule}</code><button type="button" onClick={() => loadTrial(trial)} aria-label={`Load inputs from trial ${trial.id}`}>Load inputs ↗</button></li>) : <li className="lab-empty">No trials recorded yet. Set the conditions and run one.</li>}</ol></div>
    <div className="system-contexts"><p className="eyebrow">ONE METHOD · DISTINCT PROJECTS</p><div>{systemContexts.map(context => <a href={context.href} key={context.name}><strong>{context.name}</strong><span>{context.focus}</span><span aria-hidden="true">↗</span></a>)}</div></div>
    <div className="system-foot"><p>See how each project applies an inspectable boundary to its own domain.</p><a href="/approach/">Read our approach <span aria-hidden="true">↗</span></a></div>
  </div></section>;
}

function Footer() {
  return <footer className="site-footer"><div className="footer-main"><div><p className="eyebrow">SYBERLABS</p><h2>Ideas deserve<br />better interfaces.</h2><a href="mailto:syberlabs.software@gmail.com">Get in touch <span aria-hidden="true">↗</span></a></div><nav aria-label="Site directory"><div><strong>Explore</strong><a href="/projects/rise/">RISE</a><a href="/jev/">Jev</a><a href="/commons/">Commons</a><a href="/projects/relay/">Relay</a><a href="/projects/omnios/">OmniOS</a><a href="/projects/osahr/">OSAHR</a></div><div><strong>More</strong><a href="/approach/">Approach</a><a href="/rise-demo/">RISE demo</a><a href="https://www.youtube.com/@RiseChamber" target="_blank" rel="noopener noreferrer">YouTube</a><a href="https://github.com/SyberLabs" target="_blank" rel="noopener noreferrer">GitHub</a></div></nav></div><div className="footer-bottom"><span>© 2026 SyberLabs · Mateo Robles · Seth Carlson</span><a href="#hero-title">Back to top ↑</a></div></footer>;
}

function App() {
  return <ThemeProvider theme={theme} defaultMode="light"><Header /><main><Hero /><Work /><System /></main><Footer /></ThemeProvider>;
}

createRoot(document.getElementById('root')).render(<App />);
