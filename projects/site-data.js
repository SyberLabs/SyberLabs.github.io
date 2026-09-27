// Single source of site navigation and project data.
// Bundled into the homepage by Vite (src/App.jsx), used by the build-time prerender
// (scripts/prerender.mjs) and loaded as-is by the project pages (experience-v7.js).
// Every project claim is taken from its repository, its public page, or docs/SYSTEM_MAPS.md.

export const CONTACT = 'mailto:syberlabs.software@gmail.com';
export const EMAIL = 'syberlabs.software@gmail.com';
export const RESUME = '/mateo_robles_resume.pdf';
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
  { label: 'GitHub', href: GITHUB, external: true },
  { label: 'LinkedIn', href: LINKEDIN, external: true },
  { label: 'Résumé', href: RESUME },
  { label: 'Services', href: '/services/' },
  { label: 'Contact', href: CONTACT },
];

export const projects = [
  {
    slug: 'rise', number: '01', name: 'RISE', category: 'AI-assisted reading app', accent: '#e4d2ae',
    pageTitle: 'RISE: AI-Assisted Reading App',
    headline: 'Read beyond the page.',
    intro: 'A browser-based reading app that controls the pacing, layout, imagery, and sound around a text, with AI-suggested settings.',
    summary: 'Readers can bring their own files or choose from a built-in library. They describe the reading they want, and the Jev decision API chooses a passage, visuals, and sound from a menu that RISE defines. RISE validates every choice before playback, and the reader can override it at any time.',
    status: { kind: 'live', label: 'Live' },
    primary: { label: 'Open RISE', href: 'https://rise.syberlabs.io/' },
    secondary: { label: 'Try interactive sample', href: 'https://rise.syberlabs.io/jev-scene-demo' },
    ghost: { label: 'Watch the demo video', href: '/rise-demo/', icon: 'play' },
    facts: [
      ['Runs in', 'Any modern browser at rise.syberlabs.io'],
      ['Technology', 'JavaScript, Vite, Cloudflare Workers, PostgreSQL (Neon), Redis (Upstash), sql.js, Vitest, Playwright'],
      ['AI integration', 'Jev decision API (TypeSafe AI). In a recorded live evaluation, Jev matched 48 of 49 explicit reader preferences.'],
      ['Privacy', 'Text files you bring are processed in your browser. Only a short reading request is sent to the AI model.'],
      ['Case study', { label: 'Jev integration in RISE', href: '/jev/' }],
      ['Source', { label: 'github.com/SyberLabs/RISE', href: 'https://github.com/SyberLabs/RISE' }],
    ],
  },
  {
    slug: 'commons', number: '02', name: 'Commons', category: 'Project coordination', accent: '#a8e39a',
    pageTitle: 'Commons: Community Project Coordination Prototype',
    headline: 'Turn a need into a mission.',
    intro: 'A prototype for community-led projects that keeps the need, plan, evidence, human review, and outcome in one auditable record.',
    summary: 'A reviewer can send a plan back for changes, and every decision stays in the audit history. The current prototype runs locally with synthetic data.',
    status: { kind: 'private', label: 'Private prototype' },
    primary: { label: 'Explore Commons', href: '/commons/' },
    facts: [
      ['Stage', 'Local Phase 0 prototype with synthetic data and continuous integration'],
      ['Not yet built', 'Hosted accounts, participant data, and live AI calls'],
      ['Source', 'Private repository'],
    ],
  },
  {
    slug: 'relay', number: '03', name: 'Relay', category: 'Job application workspace', accent: '#6bd6cf',
    pageTitle: 'Relay: Job Application Workspace for AI-Assisted Drafting',
    headline: 'Every application has a history.',
    intro: 'A workspace for job seekers who draft with AI assistants, with one record per job and human approval of the final wording.',
    summary: 'Relay works alongside assistants such as ChatGPT, Claude, Codex, and Grok. Each job keeps its research, confirmed facts, and draft versions in one history. Relay checks selected claims in AI drafts against the confirmed facts, and approval applies only to the exact wording of a specific draft version.',
    status: { kind: 'early', label: 'Early release' },
    primary: { label: 'View source', href: 'https://github.com/SyberLabs/relay', external: true },
    facts: [
      ['Mateo’s role', 'Product lead'],
      ['Technology', 'TypeScript, React, Cloudflare Workers, Drizzle ORM, Chrome extension (Manifest V3), Playwright'],
      ['Key features', 'One history per job posting; exact-wording approval; tracker CSV import; Greenhouse and Lever job board import; claim checks against a confirmed-fact ledger'],
      ['Boundary', 'Relay prepares and tracks application materials. It does not submit employer forms.'],
      ['Source', { label: 'github.com/SyberLabs/relay', href: 'https://github.com/SyberLabs/relay' }],
    ],
  },
  {
    slug: 'omnios', number: '04', name: 'OmniOS', category: 'AI analysis canvas', accent: '#e99ad3',
    pageTitle: 'OmniOS: AI Analysis Canvas with Traceable Sources',
    headline: 'See the sources behind an answer.',
    intro: 'A canvas for asking AI questions about live data, where every answer shows which sources it used.',
    summary: 'Data sources such as prediction markets, economic series, and news are placed as blocks and wired to AI personas. A persona can use only what its connections carry, and an optional PostgreSQL ledger records each model call and the inputs behind it.',
    status: { kind: 'research', label: 'Research' },
    primary: { label: 'View source', href: 'https://github.com/SyberLabs/OmniOS', external: true },
    facts: [
      ['Stage', 'Local-first, single-user research preview'],
      ['Technology', 'TypeScript, Next.js, React, Zustand, IndexedDB, PostgreSQL, Tailwind CSS, Vitest, Playwright'],
      ['AI models', 'Anthropic Claude, Google Gemini, and local models through Ollama'],
      ['Data sources', 'Polymarket, Metaculus, Hacker News, World Bank, NewsAPI'],
      ['Source', { label: 'github.com/SyberLabs/OmniOS', href: 'https://github.com/SyberLabs/OmniOS' }],
    ],
  },
  {
    slug: 'osahr', number: '05', name: 'OSAHR', category: 'Stochastic simulation library', accent: '#f0a868',
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

export const skills = ['Python', 'TypeScript', 'JavaScript', 'SQL', 'React', 'Next.js', 'FastAPI', 'PostgreSQL', 'SQLite', 'Redis', 'Cloudflare Workers', 'LightGBM', 'scikit-learn', 'pandas', 'NumPy', 'LLM applications', 'AI agents', 'pytest', 'Vitest', 'Playwright'];
