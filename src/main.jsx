import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './visual.css';
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
  { name: 'RISE', slug: 'rise', kind: 'Reading interface', description: 'Read through time and space in the live RISE app. Sign-in is required.', href: 'https://rise.syberlabs.io/', accent: '#8e70f8' },
  { name: 'Commons', slug: 'commons', kind: 'Mission coordination', description: 'A human-directed workspace for community missions. The local prototype and CI foundation are in place; a six-week roadmap covers access, evidence, JEV evaluation, and a pilot rehearsal.', accent: '#adf19b' },
  { name: 'Relay', slug: 'relay', kind: 'Application workspace', description: 'Review job research and exact application drafts in one focused workspace.', accent: '#48c9c9' },
  { name: 'OmniOS', slug: 'omnios', kind: 'Spatial AI workspace', description: 'A canvas for working with AI and connected data.', accent: '#ea79c4' },
  { name: 'OSAHR', slug: 'osahr', kind: 'Simulation research', description: 'A research kernel for stochastic simulation on typed hypergraphs.', accent: '#e9b66f' },
];

function LabField({ active = 0 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame, visible = true, tick = 0;
    const pointer = { x: .5, y: .5 };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) draw(); });
    observer.observe(canvas);
    const onPointer = event => { const rect = canvas.getBoundingClientRect(); pointer.x = (event.clientX - rect.left) / rect.width; pointer.y = (event.clientY - rect.top) / rect.height; };
    canvas.addEventListener('pointermove', onPointer);
    const colors = [['#8b74ff', '#f186c8', '#5eefd8'], ['#adf19b', '#5eefd8', '#d2b6ff'], ['#4fded9', '#8b74ff', '#f186c8'], ['#f186c8', '#f2b66e', '#8b74ff'], ['#f2b66e', '#8b74ff', '#4fded9']][active];
    function draw() {
      if (!visible || document.hidden) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width, h = rect.height;
      context.fillStyle = '#090b1c'; context.fillRect(0, 0, w, h);
      const drift = reduced.matches ? 0 : tick * .003;
      const focusX = w * (.5 + (pointer.x - .5) * .16);
      const focusY = h * (.5 + (pointer.y - .5) * .16);
      for (let band = 0; band < 3; band++) {
        context.beginPath();
        for (let point = 0; point <= 190; point++) {
          const t = point / 190 * Math.PI * 2;
          const radius = Math.min(w * .36, h * .42) * (.65 + band * .2);
          const wave = Math.sin(t * (3 + active) + drift * (band + 1)) * (14 + band * 5);
          const x = focusX + Math.cos(t + drift * .12) * (radius + wave) * 1.28;
          const y = focusY + Math.sin(t + drift * .08) * (radius + wave) * .67;
          if (!point) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.closePath();
        context.strokeStyle = colors[band]; context.globalAlpha = .13 + band * .11;
        context.lineWidth = 1.5 + band * .8; context.shadowBlur = 24; context.shadowColor = colors[band]; context.stroke();
      }
      context.shadowBlur = 0; context.globalAlpha = 1;
      for (let i = 0; i < 72; i++) {
        const angle = i * 2.39996 + drift * (.15 + i % 4 * .05);
        const radius = Math.sqrt(i / 72) * Math.min(w * .42, h * .44);
        const x = focusX + Math.cos(angle) * radius * 1.55;
        const y = focusY + Math.sin(angle) * radius * .8;
        context.fillStyle = colors[i % 3]; context.globalAlpha = .18 + (i % 5) * .1;
        context.beginPath(); context.arc(x, y, i % 9 === 0 ? 2.1 : 1, 0, Math.PI * 2); context.fill();
      }
      context.globalAlpha = 1;
      if (!reduced.matches) { tick++; frame = requestAnimationFrame(draw); }
    }
    draw();
    const onVisibility = () => { if (!document.hidden) draw(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); canvas.removeEventListener('pointermove', onPointer); document.removeEventListener('visibilitychange', onVisibility); };
  }, [active]);
  return <canvas ref={canvasRef} className="lab-field" aria-hidden="true" />;
}

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
        <Button href="#work" color="inherit" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Explore</Button>
        <Button href="/projects/commons/" color="inherit" sx={{ display: { xs: 'inline-flex' } }}>Commons</Button>
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
  const project = projects[active];
  const onMove = event => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !sceneRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    sceneRef.current.style.setProperty('--tilt-x', `${((event.clientY - rect.top) / rect.height - .5) * -15}deg`);
    sceneRef.current.style.setProperty('--tilt-y', `${((event.clientX - rect.left) / rect.width - .5) * 19}deg`);
  };
  return <Box component="section" id="work" className="lab-hero" onPointerMove={onMove} onPointerLeave={() => { if (sceneRef.current) { sceneRef.current.style.removeProperty('--tilt-x'); sceneRef.current.style.removeProperty('--tilt-y'); } }} style={{ '--active-color': project.accent }}>
    <LabField active={active} />
    <Box className="hero-vignette" aria-hidden="true" />
    <Container maxWidth="xl" className="lab-stage">
      <Box className="stage-intro">
        <Typography variant="overline" className="stage-eyebrow">INDEPENDENT AI LAB · EST. 2024</Typography>
        <Typography component="h1" variant="h1" className="hero-title">Make the<br /><em>unknown</em><br />tangible.</Typography>
        <Typography className="hero-lede">Interfaces and experiments at the edge of reading, intelligence, and simulation.</Typography>
      </Box>
      <Box className="scene-wrap" ref={sceneRef} aria-hidden="true">
        <Box className="portal-scene">
          <Box className="portal-shadow" />
          <Box className="portal-ring ring-back" />
          <Box className="portal-shell" />
          <Box className="portal-core" />
          <Box className="portal-ring ring-front" />
          <Box className="portal-orbit orbit-one" />
          <Box className="portal-orbit orbit-two" />
          <Box className="portal-label">SYBER / {String(active + 1).padStart(2, '0')}</Box>
        </Box>
      </Box>
      <Box className="stage-detail" id="project-panel" role="tabpanel" aria-labelledby={`project-tab-${active}`} key={project.name}>
        <Typography className="detail-kicker">0{active + 1} / {project.kind}</Typography>
        <Typography component="h2" className="detail-title">{project.name}</Typography>
        <Typography className="detail-copy">{project.description}</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2.5 }}>
          {project.href && <Button href={project.href} variant="contained" endIcon={<ArrowOutwardRoundedIcon />}>Launch RISE</Button>}
          <Button href={project.slug === 'commons' ? '/commons/' : `/projects/${project.slug}/`} variant="outlined" endIcon={<ArrowForwardRoundedIcon />}>Explore project</Button>
          {active === 0 && <Button href="/rise-demo/" variant="outlined" endIcon={<PlayArrowRoundedIcon />}>Watch demo</Button>}
        </Stack>
      </Box>
      <Box role="tablist" aria-label="Explore SyberLabs projects" className="stage-nav">
        {projects.map((item, index) => <button key={item.name} type="button" role="tab" id={`project-tab-${index}`} aria-selected={active === index} aria-controls="project-panel" onClick={() => setActive(index)} className={`stage-tab ${active === index ? 'selected' : ''}`} style={{ '--tab-color': item.accent }}>
          <span>0{index + 1}</span><strong>{item.name}</strong><ArrowForwardRoundedIcon fontSize="small" />
        </button>)}
      </Box>
      <Box className="stage-bottom"><span>SCROLL TO EXPERIENCE ↓</span><span>MOVE CURSOR TO EXPLORE</span></Box>
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
