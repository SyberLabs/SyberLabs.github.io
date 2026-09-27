import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './visual.css';
import { ThemeProvider, createTheme, useColorScheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  AppBar, Box, Button, Card, CardActionArea, CardContent,
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
  { name: 'RISE', kind: 'Reading interface', description: 'Read through time and space in the live RISE app. Sign-in is required.', href: 'https://rise.syberlabs.io/', action: 'Open live app', accent: '#8e70f8' },
  { name: 'Relay', kind: 'Application workspace', description: 'Review job research and exact application drafts in one focused workspace.', accent: '#48c9c9' },
  { name: 'OmniOS', kind: 'Spatial AI workspace', description: 'A canvas for working with AI and connected data.', accent: '#ea79c4' },
  { name: 'OSAHR', kind: 'Simulation research', description: 'A research kernel for stochastic simulation on typed hypergraphs.', accent: '#e9b66f' },
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
    const colors = [['#8b74ff', '#f186c8', '#5eefd8'], ['#4fded9', '#8b74ff', '#f186c8'], ['#f186c8', '#f2b66e', '#8b74ff'], ['#f2b66e', '#8b74ff', '#4fded9']][active];
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
        <Button href="#work" color="inherit" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Work</Button>
        <Button href="#team" color="inherit" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Team</Button>
        <Button href="mailto:syberlabs.software@gmail.com" color="primary" variant="outlined" size="small" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>Contact</Button>
        <ThemeToggle />
      </Stack>
    </Toolbar></Container>
  </AppBar>;
}

function Hero() {
  return <Box component="section" className="lab-hero" sx={{ py: { xs: 8, md: 13 }, borderBottom: '1px solid', borderColor: 'divider' }}>
    <LabField />
    <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.05fr .95fr' }, alignItems: 'center', gap: { xs: 5, md: 8 } }}>
        <Box>
          <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 3 }}><Box className="signal-pulse" aria-hidden="true" /><Typography variant="overline" color="primary" sx={{ fontWeight: 800, letterSpacing: '.17em' }}>INDEPENDENT AI LAB</Typography></Stack>
          <Typography component="h1" variant="h1" sx={{ fontSize: { xs: '2.7rem', sm: '3.6rem', md: '4.4rem' }, lineHeight: 1.07, maxWidth: 650 }}>
            New ways to <Box component="span" className="spectral-text">experience</Box> information.
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 3, fontSize: { xs: '1.06rem', md: '1.2rem' }, lineHeight: 1.75, maxWidth: 560 }}>
            An independent AI lab making interfaces for reading, thinking, and simulation. Built to be explored.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4, alignItems: { xs: 'stretch', sm: 'center' } }}>
            <Button href="/rise-demo/" variant="contained" size="large" endIcon={<PlayArrowRoundedIcon />}>Watch the RISE demo</Button>
            <Button href="#work" variant="outlined" size="large" endIcon={<ArrowForwardRoundedIcon />}>Explore our work</Button>
          </Stack>
        </Box>
        <Box className="hero-art"><Box className="signal-orbit" aria-hidden="true" /><Card variant="outlined" sx={{ overflow: 'hidden', position: 'relative', borderColor: 'divider', bgcolor: 'background.paper', borderRadius: 3 }}>
          <CardActionArea component="a" href="https://rise.syberlabs.io/" aria-label="Open the live RISE app">
            <Box sx={{ position: 'relative', aspectRatio: '16 / 10', bgcolor: '#0a1020' }}>
              <Box component="img" src="/rise-demo/poster-20260926.jpg" alt="RISE reading interface demo preview" className="rise-preview" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 38%, rgba(4,10,20,.86) 100%)' }} />
              <Box sx={{ position: 'absolute', bottom: 22, left: 24, right: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
                <Box><Typography variant="overline" sx={{ opacity: .75, letterSpacing: '.14em' }}>LIVE APP</Typography><Typography variant="h5">RISE</Typography></Box>
                <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: '#fff', color: '#5945ad', display: 'grid', placeItems: 'center' }}><ArrowOutwardRoundedIcon /></Box>
              </Box>
            </Box>
          </CardActionArea>
        </Card></Box>
      </Box>
    </Container>
  </Box>;
}

function Work() {
  const [active, setActive] = useState(0);
  const project = projects[active];
  return <Box component="section" id="work" className="work-section" sx={{ py: { xs: 8, md: 11 } }}><Container maxWidth="lg">
    <Typography variant="overline" color="primary" sx={{ fontWeight: 800, letterSpacing: '.13em' }}>THE LAB / 01—04</Typography>
    <Typography component="h2" variant="h2" sx={{ mt: 1, fontSize: { xs: '2rem', md: '2.75rem' } }}>Choose a line of inquiry.</Typography>
    <Typography color="text.secondary" sx={{ mt: 1.5, mb: 4.5, maxWidth: 610 }}>Explore our products and research. Move between them to change the field.</Typography>
    <Box className="lab-navigator">
      <Box role="tablist" aria-label="SyberLabs projects" className="project-selector">
        {projects.map((item, index) => <button key={item.name} type="button" role="tab" id={`project-tab-${index}`} aria-selected={active === index} aria-controls="project-panel" onClick={() => setActive(index)} className={`project-option ${active === index ? 'selected' : ''}`} style={{ '--option-accent': item.accent }}>
          <span className="project-index">0{index + 1}</span><span className="project-option-name">{item.name}</span><span className="project-option-kind">{item.kind}</span><ArrowForwardRoundedIcon fontSize="small" />
        </button>)}
      </Box>
      <Box id="project-panel" role="tabpanel" aria-labelledby={`project-tab-${active}`} className="project-stage" sx={{ borderRadius: 3 }}>
        <LabField active={active} />
        <Box className="stage-label">SYBERLABS / {String(active + 1).padStart(2, '0')}</Box>
        <Box className="stage-copy" key={project.name}>
          <Typography variant="overline" sx={{ color: project.accent, fontWeight: 800, letterSpacing: '.18em' }}>{project.kind}</Typography>
          <Typography component="h3" variant="h2" sx={{ fontSize: { xs: '3rem', md: '4.6rem' }, color: '#fff', mt: .5 }}>{project.name}</Typography>
          <Typography sx={{ color: '#d6d3e4', maxWidth: 440, lineHeight: 1.7, mt: 1 }}>{project.description}</Typography>
          {project.href && <Button href={project.href} variant="contained" endIcon={<ArrowOutwardRoundedIcon />} sx={{ mt: 3 }}>Open live RISE app</Button>}
        </Box>
      </Box>
    </Box>
  </Container></Box>;
}

function Experience() {
  return <Box component="section" className="experience-section" sx={{ py: { xs: 8, md: 10 }, borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}><Container maxWidth="lg" sx={{ position: 'relative' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 3, flexWrap: 'wrap', mb: 3 }}>
      <Box><Typography variant="overline" sx={{ color: '#bcadff', fontWeight: 800, letterSpacing: '.13em' }}>VISUAL EXPERIMENT</Typography><Typography component="h2" variant="h2" sx={{ mt: 1, fontSize: { xs: '2rem', md: '2.75rem' } }}>RISE Experience</Typography></Box>
      <Button href="https://www.youtube.com/@RiseChamber" target="_blank" rel="noopener noreferrer" endIcon={<ArrowOutwardRoundedIcon />} sx={{ color: '#d9d1ff' }}>YouTube channel</Button>
    </Box>
    <Box className="experience-frame" sx={{ aspectRatio: '16 / 9', borderRadius: 2.5, overflow: 'hidden', bgcolor: '#000' }}>
      <Box component="iframe" src="https://www.youtube-nocookie.com/embed/pWa_ibgPoGo" title="RISE UP (ONE SHOT) — RISE Experience" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen sx={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
    </Box>
  </Container></Box>;
}

function Team() {
  return <Box component="section" id="team" sx={{ py: { xs: 8, md: 11 } }}><Container maxWidth="lg">
    <Typography variant="overline" color="primary" sx={{ fontWeight: 800, letterSpacing: '.13em' }}>PEOPLE</Typography>
    <Typography component="h2" variant="h2" sx={{ mt: 1, mb: 4, fontSize: { xs: '2rem', md: '2.75rem' } }}>The team</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2.5 }}>
      {[{name:'Mateo Robles',role:'Principal Architect',work:'Design and engineering for RISE and OmniOS.',url:'https://github.com/sykosyber'}, {name:'Seth Carlson',role:'Principal Engineer',work:'Engineering for Relay, RISE, and OSAHR.',url:'https://github.com/sdcarlson'}].map(person =>
        <Card key={person.name} variant="outlined" sx={{ borderColor: 'divider', bgcolor: 'background.paper', borderRadius: 2.5 }}><CardContent sx={{ p: 3 }}>
          <Typography variant="h5">{person.name}</Typography><Typography color="primary" fontWeight={700} sx={{ mt: .5 }}>{person.role}</Typography>
          <Typography color="text.secondary" sx={{ mt: 2, mb: 2 }}>{person.work}</Typography>
          <Link href={person.url} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: .5, fontWeight: 700 }}>GitHub <ArrowOutwardRoundedIcon fontSize="small" /></Link>
        </CardContent></Card>) }
    </Box>
  </Container></Box>;
}

function Footer() {
  return <Box component="footer" sx={{ bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', py: 5 }}><Container maxWidth="lg">
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
      <Box><Typography variant="h6" fontWeight={800}>SyberLabs</Typography><Typography color="text.secondary" variant="body2">An independent AI lab for useful experiments.</Typography></Box>
      <Stack direction="row" spacing={2.5}><Link href="https://github.com/SyberLabs" target="_blank" rel="noopener noreferrer" underline="hover">GitHub</Link><Link href="mailto:syberlabs.software@gmail.com" underline="hover">Email</Link></Stack>
    </Box>
    <Divider sx={{ my: 3 }} /><Typography color="text.secondary" variant="caption">© 2026 SyberLabs</Typography>
  </Container></Box>;
}

function App() {
  return <ThemeProvider theme={theme} defaultMode="system"><CssBaseline /><Header /><main><Hero /><Work /><Experience /><Team />
    <Box component="section" className="contact-section" sx={{ color: '#fff', py: { xs: 7, md: 8 } }}><Container maxWidth="lg"><Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" spacing={3}>
      <Box><Typography variant="h3" sx={{ fontSize: { xs: '1.65rem', md: '2.1rem' } }}>Work with SyberLabs</Typography><Typography sx={{ mt: 1, opacity: .85 }}>Built or operated JEV systems? Get in touch.</Typography></Box>
      <Button href="mailto:syberlabs.software@gmail.com?subject=JEV%20engineering" variant="contained" color="inherit" sx={{ color: '#433090', bgcolor: '#fff', alignSelf: { xs: 'start', md: 'center' } }} endIcon={<ArrowForwardRoundedIcon />}>Email the team</Button>
    </Stack></Container></Box>
  </main><Footer /></ThemeProvider>;
}

createRoot(document.getElementById('root')).render(<App />);
