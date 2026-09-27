import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, useColorScheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  AppBar, Box, Button, Card, CardActionArea, CardContent, Chip,
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
      primary: { main: '#1558a6' },
      background: { default: '#f7f9fc', paper: '#ffffff' },
      text: { primary: '#17243a', secondary: '#56657b' },
      divider: '#dae2ec',
    } },
    dark: { palette: {
      primary: { main: '#8ab8ff' },
      background: { default: '#0c1422', paper: '#152137' },
      text: { primary: '#f2f6fc', secondary: '#afbdd0' },
      divider: '#304058',
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
  { name: 'RISE', kind: 'Reading interface', description: 'A new way to read through time and space. Explore the interface in a short live demo.', href: '/rise/', action: 'Watch demo', featured: true },
  { name: 'Relay', kind: 'Application workspace', description: 'Review job research and exact application drafts in one focused workspace.', href: 'https://github.com/SyberLabs/relay', action: 'View project' },
  { name: 'OmniOS', kind: 'Spatial workspace', description: 'A canvas for working with AI and connected data.', href: 'https://github.com/SyberLabs/OmniOS', action: 'View project' },
  { name: 'OSAHR', kind: 'Research system', description: 'A research kernel for stochastic simulation on typed hypergraphs.', href: 'https://github.com/SyberLabs/OSAHR_Cell', action: 'View project' },
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
  return <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
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
  return <Box component="section" sx={{ py: { xs: 7, md: 12 }, borderBottom: '1px solid', borderColor: 'divider' }}>
    <Container maxWidth="lg">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.05fr .95fr' }, alignItems: 'center', gap: { xs: 5, md: 8 } }}>
        <Box>
          <Chip label="INDEPENDENT SOFTWARE LAB" size="small" color="primary" variant="outlined" sx={{ mb: 3, fontWeight: 700, letterSpacing: '.08em' }} />
          <Typography component="h1" variant="h1" sx={{ fontSize: { xs: '2.7rem', sm: '3.6rem', md: '4.1rem' }, lineHeight: 1.1, maxWidth: 650 }}>
            Software for reading, thinking, and simulation.
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 3, fontSize: { xs: '1.06rem', md: '1.2rem' }, lineHeight: 1.75, maxWidth: 560 }}>
            SyberLabs designs and builds focused tools that make complex work easier to see, explore, and use.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4, alignItems: { xs: 'stretch', sm: 'center' } }}>
            <Button href="/rise/" variant="contained" size="large" endIcon={<PlayArrowRoundedIcon />}>Watch the RISE demo</Button>
            <Button href="#work" variant="outlined" size="large" endIcon={<ArrowForwardRoundedIcon />}>Explore our work</Button>
          </Stack>
        </Box>
        <Card variant="outlined" sx={{ overflow: 'hidden', borderColor: 'divider', bgcolor: 'background.paper', borderRadius: 3 }}>
          <CardActionArea component="a" href="/rise/" aria-label="Watch the RISE demo">
            <Box sx={{ position: 'relative', aspectRatio: '16 / 10', bgcolor: '#0a1020' }}>
              <Box component="img" src="/rise/poster.jpg" alt="RISE reading interface demo preview" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 38%, rgba(4,10,20,.86) 100%)' }} />
              <Box sx={{ position: 'absolute', bottom: 22, left: 24, right: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
                <Box><Typography variant="overline" sx={{ opacity: .75, letterSpacing: '.14em' }}>FEATURED DEMO</Typography><Typography variant="h5">RISE</Typography></Box>
                <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: '#fff', color: '#1558a6', display: 'grid', placeItems: 'center' }}><PlayArrowRoundedIcon /></Box>
              </Box>
            </Box>
          </CardActionArea>
        </Card>
      </Box>
    </Container>
  </Box>;
}

function Work() {
  return <Box component="section" id="work" sx={{ py: { xs: 8, md: 11 } }}><Container maxWidth="lg">
    <Typography variant="overline" color="primary" sx={{ fontWeight: 800, letterSpacing: '.13em' }}>PORTFOLIO</Typography>
    <Typography component="h2" variant="h2" sx={{ mt: 1, fontSize: { xs: '2rem', md: '2.75rem' } }}>Selected work</Typography>
    <Typography color="text.secondary" sx={{ mt: 1.5, mb: 4.5, maxWidth: 610 }}>Products and experiments across reading, decision making, spatial computing, and simulation.</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2.5 }}>
      {projects.map(project => <Card key={project.name} variant="outlined" sx={{ borderColor: 'divider', bgcolor: 'background.paper', borderRadius: 2.5, height: '100%' }}>
        <CardActionArea component="a" href={project.href} target={project.href.startsWith('http') ? '_blank' : undefined} rel={project.href.startsWith('http') ? 'noopener noreferrer' : undefined} sx={{ height: '100%', p: { xs: 2.5, md: 3 } }}>
          <CardContent sx={{ p: '0 !important', display: 'flex', flexDirection: 'column', minHeight: 195 }}>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 800, letterSpacing: '.1em' }}>{project.kind}</Typography>
            <Typography variant="h5" sx={{ mt: 1, mb: 1.3 }}>{project.name}</Typography>
            <Typography color="text.secondary" sx={{ lineHeight: 1.7, flexGrow: 1 }}>{project.description}</Typography>
            <Stack direction="row" alignItems="center" spacing={.7} color="primary.main" sx={{ mt: 3 }}><Typography variant="button">{project.action}</Typography><ArrowOutwardRoundedIcon fontSize="small" /></Stack>
          </CardContent>
        </CardActionArea>
      </Card>)}
    </Box>
  </Container></Box>;
}

function Experience() {
  return <Box component="section" sx={{ py: { xs: 8, md: 10 }, bgcolor: 'background.paper', borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}><Container maxWidth="lg">
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 3, flexWrap: 'wrap', mb: 3 }}>
      <Box><Typography variant="overline" color="primary" sx={{ fontWeight: 800, letterSpacing: '.13em' }}>WATCH</Typography><Typography component="h2" variant="h2" sx={{ mt: 1, fontSize: { xs: '2rem', md: '2.75rem' } }}>RISE Experience</Typography></Box>
      <Button href="https://www.youtube.com/@RiseChamber" target="_blank" rel="noopener noreferrer" endIcon={<ArrowOutwardRoundedIcon />}>YouTube channel</Button>
    </Box>
    <Box sx={{ aspectRatio: '16 / 9', borderRadius: 2.5, overflow: 'hidden', bgcolor: '#000', border: '1px solid', borderColor: 'divider' }}>
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
      <Box><Typography variant="h6" fontWeight={800}>SyberLabs</Typography><Typography color="text.secondary" variant="body2">Software for reading, thinking, and simulation.</Typography></Box>
      <Stack direction="row" spacing={2.5}><Link href="https://github.com/SyberLabs" target="_blank" rel="noopener noreferrer" underline="hover">GitHub</Link><Link href="mailto:syberlabs.software@gmail.com" underline="hover">Email</Link></Stack>
    </Box>
    <Divider sx={{ my: 3 }} /><Typography color="text.secondary" variant="caption">© 2026 SyberLabs</Typography>
  </Container></Box>;
}

function App() {
  return <ThemeProvider theme={theme} defaultMode="system"><CssBaseline /><Header /><main><Hero /><Work /><Experience /><Team />
    <Box component="section" sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: { xs: 7, md: 8 } }}><Container maxWidth="lg"><Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" spacing={3}>
      <Box><Typography variant="h3" sx={{ fontSize: { xs: '1.65rem', md: '2.1rem' } }}>Work with SyberLabs</Typography><Typography sx={{ mt: 1, opacity: .85 }}>Built or operated JEV systems? Get in touch.</Typography></Box>
      <Button href="mailto:syberlabs.software@gmail.com?subject=JEV%20engineering" variant="contained" color="inherit" sx={{ color: '#1558a6', bgcolor: '#fff', alignSelf: { xs: 'start', md: 'center' } }} endIcon={<ArrowForwardRoundedIcon />}>Email the team</Button>
    </Stack></Container></Box>
  </main><Footer /></ThemeProvider>;
}

createRoot(document.getElementById('root')).render(<App />);
