// Single source of site navigation and project data.
// Bundled into the homepage by Vite (src/main.jsx) and loaded as-is by the project pages (experience-v7.js).

export const CONTACT = 'mailto:syberlabs.software@gmail.com';

export const nav = [
  { id: 'work', label: 'Work', href: '/#work' },
  { id: 'research', label: 'Research', href: '/#research' },
  { id: 'services', label: 'Services', href: '/services/' },
  { id: 'contact', label: 'Contact', href: CONTACT },
];

export const workWithUs = { label: 'Work with us', href: '/services/' };

export const footerLinks = [
  { label: 'GitHub', href: 'https://github.com/SyberLabs', external: true },
  { label: 'Contact', href: CONTACT },
];

export const projects = [
  {
    slug: 'rise', number: '01', name: 'RISE', category: 'Audiovisual reader', accent: '#e4d2ae',
    headline: 'Read beyond the page.',
    intro: 'Shape the timing, space, image, and sound around a text.',
    status: { kind: 'live', label: 'Live' },
    primary: { label: 'Open RISE', href: 'https://rise.syberlabs.io/' },
    secondary: { label: 'Try interactive sample', href: 'https://rise.syberlabs.io/jev-scene-demo' },
    ghost: { label: 'Watch captured demo', href: '/rise-demo/', icon: 'play' },
    facts: [
      ['Runs in', 'Your browser at rise.syberlabs.io'],
      ['Source', { label: 'github.com/SyberLabs', href: 'https://github.com/SyberLabs' }],
      ['Privacy', 'Reading material stays in your browser.'],
    ],
  },
  {
    slug: 'commons', number: '02', name: 'Commons', category: 'Mission coordination', accent: '#a8e39a',
    headline: 'Turn a need into a mission.',
    intro: 'Keep the plan, evidence, review, and outcome together.',
    status: { kind: 'private', label: 'Private prototype' },
    primary: { label: 'Explore Commons', href: '/commons/' },
    facts: [
      ['Stage', 'Local Phase 0 prototype with synthetic data'],
      ['Source', 'Private repository'],
    ],
  },
  {
    slug: 'relay', number: '03', name: 'Relay', category: 'Application workspace', accent: '#6bd6cf',
    headline: 'Every application has a history.',
    intro: 'Keep the job, research, draft, and exact approval connected.',
    status: { kind: 'early', label: 'Early release' },
    primary: { label: 'View source', href: 'https://github.com/SyberLabs/relay', external: true },
    facts: [
      ['Source', { label: 'github.com/SyberLabs/relay', href: 'https://github.com/SyberLabs/relay' }],
      ['Boundary', 'Relay can prepare and track application materials. It does not submit employer forms.'],
    ],
  },
  {
    slug: 'omnios', number: '04', name: 'OmniOS', category: 'Spatial AI workspace', accent: '#e99ad3',
    headline: 'See the sources behind an answer.',
    intro: 'Connect sources to a question and trace the result.',
    status: { kind: 'research', label: 'Research' },
    primary: { label: 'View source', href: 'https://github.com/SyberLabs/OmniOS', external: true },
    facts: [
      ['Stage', 'Local-first, single-user research project'],
      ['Source', { label: 'github.com/SyberLabs/OmniOS', href: 'https://github.com/SyberLabs/OmniOS' }],
    ],
  },
  {
    slug: 'osahr', number: '05', name: 'OSAHR', category: 'Simulation research', accent: '#f0a868',
    headline: 'Replay a changing system.',
    intro: 'Run graph rules and inspect the events they produce.',
    status: { kind: 'research', label: 'Research' },
    primary: { label: 'View source', href: 'https://github.com/SyberLabs/OSAHR_Cell', external: true },
    facts: [
      ['Stage', 'Open research kernel · Python 3.11+'],
      ['Source', { label: 'github.com/SyberLabs/OSAHR_Cell', href: 'https://github.com/SyberLabs/OSAHR_Cell' }],
    ],
  },
];
