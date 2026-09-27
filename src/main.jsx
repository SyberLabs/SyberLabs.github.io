import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './visual.css';
import './home.css';
import { mountSphereField } from '../projects/sphere-field.js';
import risePoster from '../rise-demo/poster-20260926.jpg';
import { ThemeProvider, createTheme, useColorScheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  AppBar, Box, Button,
  Container, Divider, IconButton, Link, Stack, Toolbar, Typography
} from '@mui/material';
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';

const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data' },
  colorSchemes: {
    light: { palette: {
      primary: { main: '#5945ad' },
      background: { default: '#f8f7fc', paper: '#ffffff' },
      text: { primary: '#211e32', secondary: '#5e5873' },
      divider: '#e5e0ef',
    } },
    dark: { palette: {
      primary: { main: '#bcadff' },
      background: { default: '#0b0b18', paper: '#17172a' },
      text: { primary: '#f7f5ff', secondary: '#bbb7d0' },
      divider: '#35304b',
    } },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'DM Sans, Arial, sans-serif',
    h1: { fontFamily: 'Manrope, Arial, sans-serif', fontWeight: 800, letterSpacing: '-0.055em' },
    h2: { fontFamily: 'Manrope, Arial, sans-serif', fontWeight: 800, letterSpacing: '-0.04em' },
    h3: { fontFamily: 'Manrope, Arial, sans-serif', fontWeight: 700, letterSpacing: '-0.035em' },
    h5: { fontFamily: 'Manrope, Arial, sans-serif', fontWeight: 700, letterSpacing: '-0.025em' },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 9, boxShadow: 'none' } } },
    MuiCard: { styleOverrides: { root: { boxShadow: 'none' } } },
  },
});

const projects = [
  { name: 'Commons', kind: 'Mission coordination', href: '/commons/' },
  { name: 'Relay', kind: 'Application workspace', href: '/projects/relay/' },
  { name: 'OmniOS', kind: 'Spatial AI workspace', href: '/projects/omnios/' },
  { name: 'OSAHR', kind: 'Simulation research', href: '/projects/osahr/' },
];

function ThemeToggle() {
  const { mode, setMode } = useColorScheme();
  if (!mode) return <Box sx={{ width: 40, height: 40 }} />;
  const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return <IconButton aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setMode(dark ? 'light' : 'dark')} color="inherit" sx={{ border: '1px solid', borderColor: 'divider' }}>
    {dark ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
  </IconButton>;
}

function Header() {
  return <AppBar position="sticky" color="inherit" elevation={0} className="lab-header" sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
    <Container maxWidth="lg"><Toolbar disableGutters sx={{ minHeight: { xs: 68, md: 76 }, gap: 2 }}>
      <Link href="/" underline="none" color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mr: 'auto' }}>
        <Box component="img" src="/favicon-blue-32x32.png" alt="" sx={{ width: 34, height: 34, objectFit: 'contain', borderRadius: '50%' }} />
        <Typography variant="h6" sx={{ fontFamily: 'Manrope', fontWeight: 800, letterSpacing: '-0.035em' }}>SyberLabs</Typography>
      </Link>
      <Stack direction="row" spacing={{ xs: 1, sm: 2 }} alignItems="center">
        <Button href="/#selected-work" color="inherit" sx={{ display: { xs: 'inline-flex' } }}>Work</Button>
        <Button href="/jev/" color="inherit" sx={{ display: { xs: 'inline-flex' } }}>Jev</Button>
        <Button href="/approach/" color="inherit">Approach</Button>
        <Button href="mailto:syberlabs.software@gmail.com" color="primary" variant="outlined" size="small" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>Contact</Button>
        <ThemeToggle />
      </Stack>
    </Toolbar></Container>
  </AppBar>;
}

function Hero() {
  const sphereRef = useRef(null);
  useEffect(() => {
    const sphere = mountSphereField(sphereRef.current, 'rise', null, { riseImage: risePoster });
    return () => sphere.destroy();
  }, []);
  return <Box component="section" id="work" className="home-hero">
    <Container maxWidth="xl" className="home-hero-inner">
      <Box className="home-hero-copy">
        <Typography className="home-kicker">INDEPENDENT AI LAB</Typography>
        <Typography component="h1" className="home-title">Complex ideas.<br /><em>Clear experiences.</em></Typography>
        <Typography className="home-lede">We build interfaces for reading, decisions, and simulation that show what is happening and keep people in control.</Typography>
        <Box className="home-actions">
          <Button href="#selected-work" variant="contained" endIcon={<ArrowForwardRoundedIcon />}>Explore our work</Button>
          <Button href="/approach/" variant="text" endIcon={<ArrowOutwardRoundedIcon />}>How we build</Button>
        </Box>
      </Box>
      <Box component="a" href="https://rise.syberlabs.io/" className="featured-work" aria-label="Open RISE, our live reading experience">
        <Box className="featured-topline"><span>FEATURED WORK / 01</span><span>LIVE EXPERIENCE <i /></span></Box>
        <Box className="featured-screen rise-network-screen" role="img" aria-label="Animated RISE network: text flows through timing, space, and sound toward reader control">
          <Box className="rise-network-sphere"><canvas ref={sphereRef} aria-hidden="true" /></Box>
          <span className="rise-network-label input">INPUT / TEXT</span>
          <span className="rise-network-label transform">TRANSFORM / TIME · SPACE · SOUND</span>
          <span className="rise-network-label output">OUTPUT / READER CONTROL</span>
        </Box>
        <Box className="featured-bottom"><Box><span>READING, REIMAGINED</span><strong>RISE</strong><p>Watch text branch into timing, spatial presentation, and sound.</p></Box><span className="featured-arrow"><ArrowOutwardRoundedIcon /></span></Box>
      </Box>
    </Container>
    <Container maxWidth="xl" component="nav" id="selected-work" className="selected-work" aria-label="More SyberLabs projects">
      <Box className="work-heading"><span>MORE FROM THE LAB</span><span>EXPLORE THE PORTFOLIO</span></Box>
      <Box className="work-links">{projects.map((project, index) => <Box component="a" href={project.href} className="work-link" key={project.name}><span className="work-number">0{index + 2}</span><strong>{project.name}</strong><span className="work-kind">{project.kind}</span><ArrowOutwardRoundedIcon /></Box>)}</Box>
    </Container>
  </Box>;
}

function Experience() {
  return <Box component="section" id="experience" className="experience-section" sx={{ py: { xs: 8, md: 10 }, borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}><Container maxWidth="lg" sx={{ position: 'relative' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 3, flexWrap: 'wrap', mb: 3 }}>
      <Box><Typography variant="overline" sx={{ color: '#bcadff', fontWeight: 800, letterSpacing: '.13em' }}>VISUAL EXPERIMENT</Typography><Typography component="h2" variant="h2" sx={{ mt: 1, fontSize: { xs: '2rem', md: '2.75rem' } }}>RISE Experience</Typography></Box>
      <Button href="https://www.youtube.com/@RiseChamber" target="_blank" rel="noopener noreferrer" endIcon={<ArrowOutwardRoundedIcon />} sx={{ color: '#d9d1ff' }}>YouTube channel</Button>
    </Box>
    <Box className="experience-frame" sx={{ aspectRatio: '16 / 9', borderRadius: 2.5, overflow: 'hidden', bgcolor: '#000' }}>
      <Box component="iframe" src="https://www.youtube-nocookie.com/embed/pWa_ibgPoGo" title="RISE UP (ONE SHOT) — RISE Experience" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen sx={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
    </Box>
  </Container></Box>;
}

function JEVFeature() {
  return <Box component="section" aria-labelledby="jev-title" className="jev-technical"><Container maxWidth="lg" className="jev-technical-inner">
    <Box><Typography variant="overline" className="technical-kicker">RESEARCH THREAD / 01 · IN DEVELOPMENT</Typography><Typography component="h2" id="jev-title" variant="h2">Decisions are an <em>interface.</em></Typography><Typography className="technical-lede">We are evaluating where TypeSafe AI’s Jev can make a bounded, typed judgment inside our products. The application still owns permissions, validation, and the final action.</Typography><Button href="/jev/" variant="contained" endIcon={<ArrowForwardRoundedIcon />}>Read the JEV integration plan</Button></Box>
    <Box className="decision-diagram" aria-label="Proposed decision flow: product state enters a typed Jev question, then validation and human authority determine the action" role="img"><div className="diagram-header"><span>PROPOSED DECISION SEAM</span><span>ARCHITECTURE / NOT A LIVE INTEGRATION</span></div><div className="diagram-flow"><div><small>01 / INPUT</small><strong>Product state</strong><span>Only relevant context</span></div><b>→</b><div className="diagram-model"><small>02 / JUDGMENT</small><strong>Typed choice</strong><span>Jev · bounded options</span></div><b>→</b><div><small>03 / GATE</small><strong>Code + person</strong><span>Validate · authorize · act</span></div></div><div className="diagram-footer"><span>SCHEMA IS A CONTRACT</span><span>UNCERTAINTY IS A SIGNAL</span><span>AUTHORITY STAYS OUTSIDE THE MODEL</span></div></Box>
  </Container></Box>;
}

function LabSystem() {
  const nodes = [
    { name: 'RISE', detail: 'Reading in motion', href: 'https://rise.syberlabs.io/', position: 'rise' },
    { name: 'Commons', detail: 'Missions with evidence', href: '/commons/', position: 'commons' },
    { name: 'Relay', detail: 'Applications with context', href: '/projects/relay/', position: 'relay' },
    { name: 'OmniOS', detail: 'AI context on a canvas', href: '/projects/omnios/', position: 'omnios' },
    { name: 'OSAHR', detail: 'Simulation with replay', href: '/projects/osahr/', position: 'osahr' },
  ];
  return <Box component="section" className="lab-network" aria-labelledby="system-title"><Container maxWidth="xl">
    <Box className="network-intro"><Box><Typography className="network-kicker">THE SYBERLABS SYSTEM</Typography><Typography component="h2" id="system-title">One method.<br /><em>Five experiments.</em></Typography></Box><Typography>Across different domains, we return to one question: can a person see the relevant state, understand the transformation, and retain the choice?</Typography></Box>
    <Box className="network-map" aria-label="Five SyberLabs projects connected by a shared method">
      <svg className="network-wires" viewBox="0 0 1000 540" preserveAspectRatio="none" aria-hidden="true"><path d="M500 270 C360 205 300 150 170 128"/><path d="M500 270 C500 196 500 130 500 92"/><path d="M500 270 C640 205 700 150 830 128"/><path d="M500 270 C360 330 310 400 190 430"/><path d="M500 270 C640 330 690 400 810 430"/><circle cx="500" cy="270" r="5"/><circle cx="170" cy="128" r="4"/><circle cx="500" cy="92" r="4"/><circle cx="830" cy="128" r="4"/><circle cx="190" cy="430" r="4"/><circle cx="810" cy="430" r="4"/></svg>
      <Box className="network-hub"><span>SHARED DESIGN RULE</span><strong>Make the system legible.</strong><p>Visible state. Human agency.</p></Box>
      {nodes.map((node, index) => <Box component="a" href={node.href} className={`network-node node-${node.position}`} key={node.name}><span className="node-index">0{index + 1} / EXPERIMENT</span><strong>{node.name}<ArrowOutwardRoundedIcon /></strong><span className="node-detail">{node.detail}</span></Box>)}
    </Box>
    <Box className="network-pattern"><span>THE REPEATING PATTERN</span><Box className="pattern-steps"><div><b>01</b><strong>Frame the input</strong><p>Start with the information that matters.</p></div><div><b>02</b><strong>Expose the change</strong><p>Let people inspect what the system did.</p></div><div><b>03</b><strong>Keep human choice</strong><p>Make authority explicit at the final step.</p></div></Box></Box>
    <Typography className="network-note">A map of shared principles. Each project is its own product or research effort.</Typography>
  </Container></Box>;
}

function ResearchNote() {
  const example = [
    'type Choice = "continue" | "slow" | "pause";',
    'type State = { pace: number; interrupted: boolean };',
    'type Judgment = { choice: Choice; probability: number };',
    '',
    'const allowed: Choice[] = ["continue", "slow", "pause"];',
    'const result = judge(state, allowed);',
    'if (!allowed.includes(result.choice)) return "hold";',
    'if (result.probability < calibratedThreshold) return "ask";',
    'return result.choice;',
  ].join('\n');
  return <Box component="section" className="research-note" aria-labelledby="research-title"><Container maxWidth="lg">
    <Box className="research-head"><Typography className="technical-kicker">ENGINEERING NOTE / DECISION SYSTEMS / 001</Typography><Typography component="h2" id="research-title" variant="h2">A model may recommend.<br /><em>The system must decide.</em></Typography><Typography>We are testing a narrow interface: ambiguous state becomes a choice among options the application already permits. This is an integration design, not a claim that Jev serves these calls today.</Typography></Box>
    <figure className="decision-surface" aria-label="Illustrative decision surface: a fixed choice set receives relative scores, then validation and review determine whether a choice can proceed">
      <div className="surface-heading"><span>FIG. 01 / BOUNDED DECISION SPACE</span><span>CONCEPTUAL · NO MEASURED SCORES</span></div>
      <div className="surface-body">
        <div className="surface-context"><small>INPUT STATE</small><strong>Reader interrupted</strong><span>pace signal + interruption flag</span><div className="surface-context-line" /><span>Allowed choices fixed by product code</span></div>
        <div className="surface-choices"><div className="surface-axis"><small>ILLUSTRATIVE RELATIVE WEIGHT</small><span>lower ← → higher</span></div><div className="surface-choice"><b>continue</b><i style={{ '--weight': '29%' }} /><span>hold</span></div><div className="surface-choice"><b>slow</b><i style={{ '--weight': '76%' }} /><span>candidate</span></div><div className="surface-choice"><b>pause</b><i style={{ '--weight': '52%' }} /><span>review</span></div><p>Bar lengths show a possible ranking only. They are not Jev output or calibrated probabilities.</p></div>
        <div className="surface-gate"><small>APPLICATION GATE</small><div><b>01</b><span>Check schema + allowed set</span></div><div><b>02</b><span>Apply evaluated threshold</span></div><div><b>03</b><span>Ask the person when needed</span></div><strong>Action requires authority ↗</strong></div>
      </div>
      <figcaption>Inspired by the structured decision framing in <a href="https://typesafe.ai/blog/introducing-system-one-models-and-jev" target="_blank" rel="noopener noreferrer">TypeSafe AI’s Jev article ↗</a>. Original schematic for a proposed SyberLabs interface.</figcaption>
    </figure>
    <Box className="research-layout"><Box className="research-code"><div className="research-code-head"><span>ILLUSTRATIVE CONTRACT · TYPESCRIPT-LIKE PSEUDOCODE</span><span>01 / 03</span></div><pre><code>{example}</code></pre><div className="research-code-foot">EXAMPLE ONLY / NO PROVIDER CALL OR LIVE THRESHOLD IMPLIED</div></Box><Box className="research-explainer"><article><small>01 / CHOICE SPACE</small><h3>Constrain before inference.</h3><p>The product decides which actions exist. A model score cannot create permission or authorize an action.</p></article><article><small>02 / UNCERTAINTY</small><h3>A probability is not approval.</h3><p>Thresholds need calibration on representative tasks. Low confidence leads to a deterministic hold or a human question.</p></article><article><small>03 / EVALUATION</small><h3>Measure the whole workflow.</h3><p>Compare with the existing rule or human path. Inspect disagreement, latency, failure recovery, and user outcome.</p></article></Box></Box>
    <Box className="research-evidence"><div><span>CURRENT EVIDENCE</span><p>TypeSafe AI describes Jev as a structured decision model. Our portfolio integration remains under evaluation.</p></div><div><span>RELEASE BAR</span><p>A connected path, representative evaluations, observed failure behavior, and a named human acceptance gate.</p></div><a href="/jev/">Full integration plan ↗</a><a href="https://typesafe.ai/blog/introducing-system-one-models-and-jev" target="_blank" rel="noopener noreferrer">TypeSafe’s original article ↗</a></Box>
  </Container></Box>;
}

function Motivation() {
  return <Box component="section" id="method" className="lab-method" aria-labelledby="method-title"><Container maxWidth="lg" className="method-inner">
    <Box><Typography className="method-kicker">WHAT DRIVES THE LAB</Typography><Typography component="h2" id="method-title" className="method-title">Question it.<br /><em>Then cut it.</em></Typography></Box>
    <Box className="method-copy">
      <Typography>Elon Musk’s engineering principles motivate our order of work: question each requirement, delete what does not earn its place, simplify, accelerate, then automate.</Typography>
      <Typography>The ponytail review is our reminder to keep cutting: unnecessary abstractions, dependencies, and process should go before we add another feature.</Typography>
      <Typography className="method-sequence">QUESTION <span>→</span> DELETE <span>→</span> SIMPLIFY <span>→</span> ACCELERATE <span>→</span> AUTOMATE</Typography>
    </Box>
  </Container></Box>;
}

function Footer() {
  return <Box component="footer" sx={{ bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', py: 5 }}><Container maxWidth="lg">
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
      <Box><Typography variant="h6" fontWeight={800}>SyberLabs</Typography><Typography color="text.secondary" variant="body2">Mateo Robles · Seth Carlson</Typography></Box>
      <Stack direction="row" spacing={2.5}><Link href="https://github.com/SyberLabs" target="_blank" rel="noopener noreferrer" underline="hover">GitHub</Link><Link href="mailto:syberlabs.software@gmail.com" underline="hover">Work with us ↗</Link></Stack>
    </Box>
    <Box component="nav" aria-label="Site directory" sx={{ mt: 3 }}>
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Explore the site</Typography>
      <Stack direction="row" spacing={{ xs: 1.5, sm: 2.5 }} useFlexGap flexWrap="wrap">
        <Link href="/jev/" underline="hover">JEV</Link>
        <Link href="/approach/" underline="hover">Approach</Link>
        <Link href="/rise-demo/" underline="hover">RISE demo</Link>
        <Link href="/commons/" underline="hover">Commons prototype</Link>
        <Link href="/projects/rise/" underline="hover">RISE</Link>
        <Link href="/projects/commons/" underline="hover">Commons project</Link>
        <Link href="/projects/relay/" underline="hover">Relay</Link>
        <Link href="/projects/omnios/" underline="hover">OmniOS</Link>
        <Link href="/projects/osahr/" underline="hover">OSAHR</Link>
      </Stack>
    </Box>
    <Divider sx={{ my: 3 }} /><Typography color="text.secondary" variant="caption">© 2026 SyberLabs</Typography>
  </Container></Box>;
}

function App() {
  return <ThemeProvider theme={theme} defaultMode="system"><CssBaseline /><Header /><main><Hero /><LabSystem /><JEVFeature /><ResearchNote /><Experience /><Motivation /></main><Footer /></ThemeProvider>;
}

createRoot(document.getElementById('root')).render(<App />);
