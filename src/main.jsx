import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './visual.css';
import { mountProcedural } from '../projects/procedural.js';
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
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';

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
  { name: 'RISE', slug: 'rise', kind: 'Reading interface', description: 'Text becomes a timed, visual and sonic experience. Bring a passage into the Chamber and change how it unfolds.', href: 'https://rise.syberlabs.io/', accent: '#8e70f8', signal: 'TEXT / SPACE' },
  { name: 'Commons', slug: 'commons', kind: 'Mission coordination', description: 'A local prototype for community missions: define a need, review a plan, and inspect the decision history.', accent: '#adf19b', signal: 'NEED / EVIDENCE' },
  { name: 'Relay', slug: 'relay', kind: 'Application workspace', description: 'Keep the job, research, draft and exact human approval connected through every revision.', accent: '#48c9c9', signal: 'JOB / CONTEXT' },
  { name: 'OmniOS', slug: 'omnios', kind: 'Spatial AI workspace', description: 'Wire data into a persona on a canvas. See what context reached an answer.', accent: '#ea79c4', signal: 'DATA / BLOCKS' },
  { name: 'OSAHR', slug: 'osahr', kind: 'Simulation research', description: 'Define graph rules, run stochastic events and inspect the replayable result.', accent: '#e9b66f', signal: 'GRAPH / STATE' },
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
        <Button href="/commons/" color="inherit" sx={{ display: { xs: 'inline-flex' } }}>Commons</Button>
        <Button href="#experience" color="inherit" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Experience</Button>
        <Button href="mailto:syberlabs.software@gmail.com" color="primary" variant="outlined" size="small" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>Contact</Button>
        <ThemeToggle />
      </Stack>
    </Toolbar></Container>
  </AppBar>;
}

function Hero() {
  const [active, setActive] = useState(0);
  const sceneRef = useRef(null);
  const fieldRef = useRef(null);
  const project = projects[active];
  useEffect(() => mountProcedural(fieldRef.current, project.slug), [project.slug]);
  const onTabKeyDown = event => {
    const moves = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: -active, End: projects.length - 1 - active };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = (active + moves[event.key] + projects.length) % projects.length;
    setActive(next);
    document.getElementById(`project-tab-${next}`)?.focus();
  };
  const onMove = event => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !sceneRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    sceneRef.current.style.setProperty('--tilt-x', `${((event.clientY - rect.top) / rect.height - .5) * -8}deg`);
    sceneRef.current.style.setProperty('--tilt-y', `${((event.clientX - rect.left) / rect.width - .5) * 12}deg`);
  };
  return <Box component="section" id="work" className={`lab-hero project-${project.slug}`} onPointerMove={onMove} onPointerLeave={() => { if (sceneRef.current) { sceneRef.current.style.removeProperty('--tilt-x'); sceneRef.current.style.removeProperty('--tilt-y'); } }} style={{ '--active-color': project.accent }}>
    <canvas className="lab-procedural" ref={fieldRef} aria-hidden="true" />
    <Container maxWidth="xl" className="lab-stage">
      <Box className="stage-intro">
        <Typography variant="overline" className="stage-eyebrow">SYBERLABS <span>·</span> INDEPENDENT AI LAB</Typography>
        <Typography component="h1" variant="h1" className="hero-title">Make the<br /><em>invisible</em><br />enterable.</Typography>
        <Typography className="hero-lede">We build instruments for ideas: to feel a text unfold, coordinate a mission, inspect an answer, or replay a system.</Typography>
      </Box>
      <Box role="tablist" aria-label="Explore SyberLabs projects" className="stage-nav" onKeyDown={onTabKeyDown}>
        {projects.map((item, index) => <button key={item.name} type="button" role="tab" tabIndex={active === index ? 0 : -1} id={`project-tab-${index}`} aria-selected={active === index} aria-controls="project-panel" onClick={() => setActive(index)} className={`stage-tab ${active === index ? 'selected' : ''}`} style={{ '--tab-color': item.accent }}>
          <span>0{index + 1}</span><strong>{item.name}</strong><ArrowForwardRoundedIcon fontSize="small" />
        </button>)}
      </Box>
      <Box className="scene-wrap" ref={sceneRef} aria-label={`${project.name} abstract visual field`} role="img">
        <Box className="portal-aura" aria-hidden="true" />
        <Box className="portal-orbit orbit-one" aria-hidden="true" />
        <Box className="portal-orbit orbit-two" aria-hidden="true" />
        <Box className="portal-disc" aria-hidden="true"><Box className="portal-skin" /></Box>
        <Box className="portal-echo echo-one" aria-hidden="true" />
        <Box className="portal-echo echo-two" aria-hidden="true" />
        <Box className="portal-axis" aria-hidden="true" />
        <Box className="portal-caption" aria-hidden="true"><b>{project.signal}</b></Box>
      </Box>
      <Box className="stage-detail" id="project-panel" role="tabpanel" aria-labelledby={`project-tab-${active}`} key={project.name}>
        <Typography className="detail-kicker">FIELD 0{active + 1} / {project.kind}</Typography>
        <Typography component="h2" className="detail-title">{project.name}</Typography>
        <Typography className="detail-copy">{project.description}</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2.5 }}>
          {project.slug === 'rise' && <Button href={project.href} variant="contained" endIcon={<ArrowOutwardRoundedIcon />}>Enter RISE</Button>}
          <Button href={project.slug === 'commons' ? '/commons/' : `/projects/${project.slug}/`} variant="outlined" endIcon={<ArrowForwardRoundedIcon />}>{project.slug === 'commons' ? 'View prototype' : 'Explore project'}</Button>
          {active === 0 && <Button href="/rise-demo/" variant="outlined" endIcon={<PlayArrowRoundedIcon />}>Watch demo</Button>}
        </Stack>
      </Box>
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

function Footer() {
  return <Box component="footer" sx={{ bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', py: 5 }}><Container maxWidth="lg">
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
      <Box><Typography variant="h6" fontWeight={800}>SyberLabs</Typography><Typography color="text.secondary" variant="body2">Mateo Robles · Seth Carlson</Typography></Box>
      <Stack direction="row" spacing={2.5}><Link href="https://github.com/SyberLabs" target="_blank" rel="noopener noreferrer" underline="hover">GitHub</Link><Link href="mailto:syberlabs.software@gmail.com" underline="hover">Work with us ↗</Link></Stack>
    </Box>
    <Divider sx={{ my: 3 }} /><Typography color="text.secondary" variant="caption">© 2026 SyberLabs</Typography>
  </Container></Box>;
}

function App() {
  return <ThemeProvider theme={theme} defaultMode="system"><CssBaseline /><Header /><main><Hero /><Experience /></main><Footer /></ThemeProvider>;
}

createRoot(document.getElementById('root')).render(<App />);
