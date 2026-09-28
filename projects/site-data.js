// Single source of site navigation and project data.
// Bundled into the homepage by Vite (src/App.jsx), used by the build-time prerender
// (scripts/prerender.mjs) and loaded as-is by the project pages (experience-v7.js).
// Every project claim is taken from its repository, its public page, or docs/SYSTEM_MAPS.md.

export const CONTACT = 'mailto:syberlabs.software@gmail.com';
export const EMAIL = 'syberlabs.software@gmail.com';
export const LINKEDIN = 'https://www.linkedin.com/in/mateo-robles-71260b189';
export const GITHUB = 'https://github.com/SyberLabs';

export const nav = [
  { id: 'work', label: 'Work', href: '/#work' },
  { id: 'research', label: 'Research', href: '/#research' },
  { id: 'about', label: 'About', href: '/#about' },
  { id: 'contact', label: 'Contact', href: CONTACT },
];

export const workWithUs = { label: 'Work with us', href: '/services/' };

export const footerLinks = [
  { label: 'Services', href: '/services/' },
  { label: 'GitHub', href: GITHUB, external: true },
  { label: 'LinkedIn', href: LINKEDIN, external: true },
  { label: 'Contact', href: CONTACT },
  { label: 'Privacy', href: '/privacy/' },
];

export const projects = [
  {
    slug: 'rise', number: '01', name: 'RISE', category: 'AI-assisted reading app', accent: '#f2d9a6',
    pageTitle: 'RISE: AI-Assisted Reading App',
    headline: 'Read beyond the page.',
    intro: 'A browser-based reading app that controls the pacing, layout, imagery, and sound around a text, with AI-suggested settings.',
    summary: 'Readers can bring their own files or choose from a built-in library. A language model can suggest a passage, visuals, and sound from a fixed menu. RISE validates every choice before playback, and the reader can override it.',
    status: { kind: 'live', label: 'Live' },
    primary: { label: 'Open RISE', href: 'https://rise.syberlabs.io/' },
    secondary: { label: 'Try interactive sample', href: 'https://rise.syberlabs.io/jev-scene-demo' },
    ghost: { label: 'Watch the demo video', href: '/rise-demo/', icon: 'play' },
    facts: [
      ['Runs in', 'Any modern browser at rise.syberlabs.io'],
      ['Technology', 'JavaScript, Vite, Cloudflare Workers, PostgreSQL (Neon), Redis (Upstash), sql.js, Vitest, Playwright'],
      ['AI integration', 'A language model suggests a passage, visuals, and sound from a fixed menu. RISE validates every choice before playback, and the reader can override it.'],
      ['Privacy', 'Text files you bring are processed in your browser. Only a short reading request is sent to the AI model.'],
      ['Source', { label: 'github.com/SyberLabs/RISE', href: 'https://github.com/SyberLabs/RISE' }],
    ],
  },
  {
    slug: 'osahr', number: '02', name: 'OSAHR', category: 'Stochastic simulation library', accent: '#ffae63',
    pageTitle: 'OSAHR: Open-Source Stochastic Simulation Library in Python',
    headline: 'Replay a changing system.',
    intro: 'An open-source Python library for exact stochastic simulation of networks that change their own structure, with step-by-step replay.',
    summary: 'Rules rewrite a typed directed hypergraph at random times with exact probabilities. The library includes three schedulers (direct SSA, modified next-reaction, and bounded thinning), incremental pattern matching checked against an exhaustive matcher, and seeded, hash-checked replay. Every public claim is graded Known, Measured, Inferred, or Proposed.',
    status: { kind: 'research', label: 'Research' },
    primary: { label: 'View source', href: 'https://github.com/SyberLabs/OSAHR_Cell', external: true },
    facts: [
      ['Stage', 'Open-source research library, version 0.2'],
      ['Technology', 'Python 3.11+ (no runtime dependencies in the core library), pytest'],
      ['Scope', 'Research models of mechanisms, not calibrated forecasts'],
      ['Source', { label: 'github.com/SyberLabs/OSAHR_Cell', href: 'https://github.com/SyberLabs/OSAHR_Cell' }],
    ],
  },
];

