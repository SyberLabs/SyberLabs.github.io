// Single source of site navigation and project data.
// Read at build time by the homepage (src/home/page.js), the product pages (scripts/prerender.mjs through
// projects/project-template.js) and the shared header and footer (scripts/site-chrome.mjs). No page loads it in
// the browser, except a product page opened in `pnpm dev` (projects/experience-v7.js).
// Every project claim is taken from its repository at the commit named in `reflects` or its public
// page. Evidence states: implemented
// (the behaviour exists in code), tested (a named test exercises it), measured (numbers exist
// under stated conditions), deployed (it runs somewhere people can reach). Nothing is promoted
// from one state to the next by wording.

// One company inbox is the single contact everywhere (site, structured data, product pages). Change it here only.
export const EMAIL = 'contact@syberlabs.io';
export const CONTACT = `mailto:${EMAIL}`;
export const CONSULT = `${CONTACT}?subject=${encodeURIComponent('AI consultation')}`;
export const GITHUB = 'https://github.com/SyberLabs';            // the company's organisation

// Public tools and previews. Linked from the hero, the Atlas, the footer and each project page.
export const RISE_APP = 'https://rise.syberlabs.io/';
export const RISE_SAMPLE = 'https://rise.syberlabs.io/jev-scene-demo';
// Legacy public sample retained for existing deep links; not the site’s first-click journey.
export const RISE_TRY = 'https://rise.syberlabs.io/try/';
export const OMNI_PREVIEW = 'https://omni.syberlabs.io/';
export const SKETCH_APP = 'https://sketch.syberlabs.io/';

// Customer entry point stays stable before and after sales open. The app owns checkout readiness.
// Keep the marketing offer aligned with RISE's server-enforced plan; never infer paid availability from a merge.
export const RISE_PLUS = {
  state: 'coming', // 'coming' | 'live'; change only after paid launch verification
  price: '$8.99',
  characters: 60000,
  href: 'https://rise.syberlabs.io/plus/',
  source: 'https://github.com/SyberLabs/RISE/pull/542',
};
// The header row: products, the factory, services and one direct contact action.
// Lacuna Institute is SyberLabs' research institute. Its pages are the lacuna/ directory, published at /lacuna/
// (sources in src/lacuna/). lacunainstitute.org and lacunainstitute.com redirect there, path for path.
export const LACUNA = '/lacuna/';
export const LACUNA_PARACAS = '/lacuna/research/paracas-bundles/';

export const nav = [
  { id: 'products', label: 'Products', href: '/#products' },
  { id: 'research', label: 'Research', href: '/research/' },
  { id: 'factory', label: 'Factory', href: '/factory/' },
  { id: 'services', label: 'Services', href: '/services/' },
  { id: 'lacuna', label: 'Lacuna', href: LACUNA },
  { id: 'game', label: 'Game', href: '/psycho-syber/' },
];

export const workWithUs = { label: 'Book a consultation', href: CONSULT };

// The footer carries a few essentials, the contact route and the legal page. It does not repeat the site map: the
// menu (siteMap below) is the header's Menu (the Atlas), a <details> that opens and closes without JavaScript.
export const footerLinks = [
  { label: 'Contact', href: CONTACT },
  { label: 'Services', href: '/services/' },
  { label: 'GitHub', href: GITHUB, external: true },
  { label: 'Privacy', href: '/privacy/' },
  { label: 'Subscriber account', href: RISE_PLUS.href, external: true },
  { label: 'Staff sign in', href: '/admin/' },
];

export const projects = [
  {
    slug: 'syberwork', number: '01', name: 'SyberWork', category: 'Software factory', accent: '#0297de',
    reflects: 'SyberLabs/SyberWork@208eaf6 · verified 2026-10-05',
    pageTitle: 'SyberWork: Verification Runtime for AI-Written Code',
    metaDescription: 'Open-source Python runtime that tests AI-proposed code changes in isolation, logs every step in a signed hash chain, and enforces human approval.',
    headline: 'Verifies every AI-written code change before human approval.',
    intro: 'SyberWork is an open-source Python runtime for AI coding agents. It executes contract checks independently on every proposed diff, enforces explicit approval rules, and logs every step in a cryptographically signed chain.',
    summary: 'Build Thread governs code changes inside Git repositories. Regardless of what a model claims about its own tests, SyberWork runs checks on the exact proposed files, blocks duplicate actions with idempotency keys, and verifies outcomes before advancing a branch.',
    status: { kind: 'wip', label: 'In development' },
    primary: { label: 'View source', href: 'https://github.com/SyberLabs/SyberWork', external: true },
    secondary: { label: 'Discuss a pilot', href: CONSULT },
    ghost: { label: 'Build Thread in ten minutes', href: 'https://github.com/SyberLabs/SyberWork/blob/main/docs/BUILD_THREAD.md' },
    why: { title: 'Enforce rules outside the model.',
      paragraphs: [
        'Autonomous agents should propose work, never self-certify it. SyberWork separates proposal from execution: explicit policy defines allowed actions and approvers, independent checks validate every change, and every refusal logs the exact rule violated.',
        'The same verification contract governs code changes, deployments, or procurement orders.',
      ] },
    use: { title: 'Review one code change end to end.', note: 'Requires Python 3.11+ and Git. No account, model, or network needed.',
      steps: [
        ['01 / init', 'Define checks', 'syberlabs init writes a contract to .syberlabs/ and infers your test command. If none is detected, it inserts a failing default so unchecked code can never pass.'],
        ['02 / start', 'Open a thread', 'Scopes one change to a repository, explicit file paths, and a verified base Git commit.'],
        ['03 / propose', 'Isolate edits', 'Saves human, agent, or search-generated edits as separate Git commits without touching your working files.'],
        ['04 / check', 'Verify independently', 'Runs contract checks against the exact proposed files, logging exit codes, durations, and output hashes.'],
        ['05 / accept & publish', 'Gate promotion', 'Updates one branch only if its base commit matches. Pushing, opening pull requests, and publishing remain separate gated actions with duplicate protection.'],
      ] },
    run: { title: 'The model claimed tests passed. SyberWork ran them and rejected the change.',
      note: 'Built-in Build Thread example (SyberWork@208eaf6, 5 October 2026, Python 3.11, local Git, zero network calls).',
      command: 'PYTHONPATH=. python examples/build_thread.py',
      output: '{\n  "context": ["tests/test_report.py:1-7", "src/report.py:1-2"],\n  "model": {\n    "candidate": "c1",\n    "claimed": { "tests": "passed", "confidence": 0.97 },\n    "verdict": "candidate_check_failed:tests",\n    "accept": "denied:candidate_check_failed:tests"\n  },\n  "patch": {\n    "candidate": "c2",\n    "verdict": "all_checks_passed",\n    "accept": "succeeded",\n    "branch": "refs/heads/syberlabs/e643ed26",\n    "commit": "7c606ae8f44f3f999c010799e1d2fdcee1166011"\n  },\n  "working_tree_and_main_untouched": true,\n  "resumed": { "status": "complete", "accepted": "c2", "events": 18, "chain_valid": true },\n  "replay_under_v2": ["candidate_check_missing:lint", "candidate_check_missing:lint"]\n}\nbuild-thread complete',
      caption: 'Candidate c1 claimed passing tests at 0.97 confidence; SyberWork ran the suite on its files, observed failure, and denied acceptance. Candidate c2 passed all checks and updated a dedicated branch via compare-and-swap, leaving the working tree and main untouched. Resuming verified all 18 events in the hash chain. Replaying the same log under an updated lint rule confirms both candidates would now be rejected.' },
    design: { title: 'Built for auditability and isolation.',
      items: [
        ['Clean core boundary', 'The reusable syberlabs core defines policy, proposals, canonical JSON, and in-memory sessions. The syberwork application adds storage, HTTP APIs, CLI, console, and connectors. Core never imports app code.'],
        ['Cryptographic audit log', 'Every event joins a canonical-JSON hash chain paired with rule IDs, an HMAC witness, Ed25519 chain-head signatures, and an append-only transparency log maintained by a separate signing process.'],
        ['Typed exchange protocol', '15 JSON schemas (sdk.syberlabs.space/v0alpha1) formalize rules, observations, proposals, approvals, actions, outcome checks, and policy updates, backed by a validator and reference traces.'],
        ['Compiled rules and offline replay', 'Policy compiles into ordered execution steps, approval gates, and completion criteria. Replay tests rule updates against recorded history without calling models or touching external systems.'],
        ['Planners cannot execute', 'Planners see objectives, rules, and history, then propose a single action over HTTPS or local loopback. Execution stays strictly separate.'],
        ['Safe writes', 'Executors attach unique idempotency keys and preconditions to every write. Uncertain outcomes remain marked uncertain instead of triggering blind retries.'],
      ] },
    evidence: [
      ['tested', '23 golden conformance traces, clean-install release gate, and green CI across CPython 3.11 to 3.13.'],
      ['measured', 'Single-machine SQLite medians: explain.allowed 3.8 µs, complete_case 37.4 ms, 501-event chain verification 10.2 ms.'],
      ['implemented', 'End-to-end procurement workflow against a reference system with idempotent order POSTs and manager sign-off.'],
      ['not yet', 'Local loopback only; no external SDK adopters. Benchmark completed one three-fixture pilot that proved too simple for general conclusions.'],
    ],
    facts: [
      ['Stage', 'Open-source runtime and SDK (v0.1.0, wheel verified)'],
      ['Technology', 'Python 3.11+ (zero runtime dependencies), SQLite, pytest, Docker (console)'],
      ['License', 'Apache 2.0'],
      ['Source', { label: 'github.com/SyberLabs/SyberWork', href: 'https://github.com/SyberLabs/SyberWork' }],
    ],
  },
  {
    slug: 'attest', number: '02', name: 'Attest', category: 'Documentation testing', accent: '#0297de',
    reflects: 'SyberLabs/attest@274b8e7 · verified 2026-11-05',
    pageTitle: 'Attest: Executable Testing for Docs and Specs',
    metaDescription: 'Attest runs every command and browser step in your READMEs, quickstarts, and specs, flags what fails, and gates repairs behind explicit policy.',
    headline: 'Executes every step in your docs against the running app and flags what breaks.',
    intro: 'Point Attest at a README, quickstart, AI how-to response, or product spec. It executes shell commands in a scratch directory and UI steps in Chrome, returning every claim marked proven, stale, broken, unverifiable, or skipped with full evidence.',
    summary: 'Failed steps route to a repair agent governed by a policy file. Browser verification re-runs before any patch lands, and every case outputs a structured receipt readable by SyberWork.',
    status: { kind: 'wip', label: 'Public source · early' },
    primary: { label: 'View source', href: 'https://github.com/SyberLabs/attest', external: true },
    secondary: { label: 'Discuss a pilot', href: CONSULT },
    why: { title: 'Products ship daily. Docs quietly rot.',
      paragraphs: [
        'Quickstarts and specs promise specific commands, buttons, and labels. When software changes, stale instructions break onboarding and customers discover it first.',
        'Attest verifies every instruction against the live product using deterministic rules. A step passes only when its command exits cleanly or Chrome observes the expected label. No model grades its own work.',
      ] },
    use: { title: 'Four workflows from audit to spec-driven builds.', note: 'Python 3.11+. Browser steps run via Kane CLI (TestMu browser agent).',
      steps: [
        ['01 / Prove', 'Audit a doc', 'Run attest prove on Markdown. Shell steps execute in a scratch folder; UI steps run in Chrome. Outputs one report with per-claim evidence badges.'],
        ['02 / Repair', 'Patch stale docs', 'An agent patches outdated descriptions in a temporary checkout. Chrome verification must pass before any edit applies.'],
        ['03 / Protect', 'Guard product guarantees', 'Mark binding behaviors in policy. Attest refuses to weaken protected promises to pass a check and generates an implementation handoff instead.'],
        ['04 / Spec', 'Build to spec', 'Failing spec claims become tickets. An agent implements fixes in an isolated copy verified by Chrome; merging requires human approval.'],
      ] },
    design: { title: 'Deterministic verdicts, pluggable agents.',
      items: [
        ['Line-exact claim extraction', 'One structured-output call parses docs into typed claims mapped to exact line ranges. Fenced shell blocks execute verbatim.'],
        ['Rule-based verdicts', 'Shell claims check exit codes and expected output. Browser claims compare expected and observed UI labels, catching negations and numeric drift.'],
        ['Policy-gated repairs', 'Before any agent edits a file, policy separates editable prose from protected product commitments.'],
        ['Auditable receipts', 'Every run emits an attest.receipt/v0 record containing before/after document hashes, policy rulings, patch hashes, and evidence for SyberWork ingestion.'],
        ['Agent-agnostic', 'Defaults to OpenAI, but any CLI tool that accepts a brief and outputs a diff can plug in.'],
      ] },
    evidence: [
      ['measured', 'At Kane CLI Hack Day (San Francisco, 24 October 2026), proved 9 documents across 23 turns with 31 screenshot-backed browser claims.'],
      ['measured', 'Caught live drift: Vite’s starter page changed from “Vite + React” to “Get started”; GitHub renamed “Security & analysis” to “Advanced Security”.'],
      ['tested', 'Unit and red-team suites covering forged approvals, protected-promise tampering, and path-escape attacks.'],
      ['not yet', 'Local CLI only, with unsandboxed shell execution and no hosted service. No external production teams yet.'],
    ],
    facts: [
      ['Stage', 'Public-source CLI tool (v0.1.0)'],
      ['Technology', 'Python 3.11+, OpenAI structured outputs, Kane CLI, Chrome'],
      ['Works with', { label: 'SyberWork', href: '/projects/syberwork/' }],
      ['License', 'MIT (declared in pyproject.toml)'],
      ['Source', { label: 'github.com/SyberLabs/attest', href: 'https://github.com/SyberLabs/attest' }],
    ],
  },
  {
    slug: 'rise', number: '03', name: 'RISE', category: 'Browser reading app', accent: '#0297de',
    reflects: 'SyberLabs/RISE@998d725 · verified 2026-10-05',
    pageTitle: 'RISE: Timed Browser Reader with Sound and Visuals',
    metaDescription: 'Browser-based reading app presenting text at your pace with synthesized sound and procedural visuals. Zero accounts required; your texts stay local.',
    headline: 'Timed text, synthesized audio, and procedural visuals in the browser.',
    intro: 'A browser-based reading instrument. Words unfold at your pace alongside synthesized audio and procedural visuals, with instant switching to a traditional page view.',
    summary: 'Open beta at rise.syberlabs.io. Reading runs locally in your browser, keeping uploaded texts and compositions in local storage. Optional AI reading requests use your own model connection; the RISE server holds no model credentials.',
    status: { kind: 'live', label: 'Live · open beta' },
    primary: { label: 'Open RISE', href: RISE_APP },
    secondary: { label: 'Try interactive sample', href: RISE_SAMPLE },
    ghost: { label: 'Watch demo film', href: '/rise-demo/', icon: 'play' },
    live: { href: RISE_APP, label: 'rise.syberlabs.io', note: 'No account, API key, or install required. Pick a reading and press Begin.' },
    video: { src: '/rise-demo/rise-marketing-20260929-v3.mp4', poster: '/rise-demo/rise-marketing-20260929-v3-poster.jpg', title: 'RISE demo film',
      caption: 'Cut from unmocked RISE screen captures with an AI-generated narrator, portrait, and original music bed. Abstract visuals and synthesized sound come directly from RISE.' },
    why: { title: 'Reading through time, alongside static pages.',
      paragraphs: [
        'RISE pairs paced typography with sound and procedural motion while letting readers switch back to a navigable page at any moment.',
        'Whether timed audiovisual presentation improves comprehension or preference remains an open question; we have not run a reader study and make no preference claims.',
      ] },
    use: { title: 'What ships today.', note: 'Five rooms with related tools grouped inside each.',
      steps: [
        ['01 / Home', 'Start today’s reading', 'Opens directly to a curated reading over moving visuals. Press Begin or choose another work.'],
        ['02 / Read', 'Stream or Page', 'Switch freely between timed Stream playback and a navigable Page layout without losing your place.'],
        ['03 / Library', 'Curated public-domain texts', 'Browse literature, philosophy, poetry, and scripture with edition provenance, including the Douay-Rheims Bible and timed liturgy in Chapel.'],
        ['04 / Make', 'Compose your own', 'Build audiovisual readings in Workshop, Scriptorium, and Visual Lab, saved locally in your browser Vault.'],
        ['05 / Ask', 'Connect your own model', 'Describe a reading mood and let your model choose strictly from the supplied catalog via OpenRouter or local Kev-4B. Usage bills to your connection, never SyberLabs.'],
      ] },
    gallery: { eyebrow: 'Rooms', title: 'Five rooms.',
      note: 'Unmocked captures from SyberLabs/RISE@998d725 (5 October 2026, headless Chromium, 1440×900) featuring Wordsworth and Coleridge’s Rural Architecture over RISE’s procedural visual engines. Also available: a 25-second silent screen capture of Home → Begin → Stream.',
      link: { href: '/rise-demo/rooms/rise-rooms-begin-20261005.mp4', label: 'Watch screen recording (MP4, 25 s, silent)' },
      items: [
        { src: '/rise-demo/rooms/rise-home-20261005.webp', label: '01 / Home', alt: 'RISE Home: a line of a poem over a magenta visual field, with the buttons Read it with sound, Another reading and Library.',
          caption: 'Opens directly to today’s reading streaming over its procedural visual field.' },
        { src: '/rise-demo/rooms/rise-menu-20261005.webp', label: 'Menu', alt: 'The RISE Menu open over Home, listing Home, Read, Library, Make and Settings, then Ask for a reading, Guide and Wormhole.',
          caption: 'Quick access to Home, Read, Library, Make, and Settings, plus Ask, Guide, and Wormhole.' },
        { src: '/rise-demo/rooms/rise-read-stream-20261005.webp', label: '02 / Read · Stream', alt: 'RISE Read in Stream: one phrase of the poem large on a dark panel over the visual field, with a control bar showing 0:10 of 0:31.',
          caption: 'Timed playback with minimal controls: pause, Page view, fullscreen, visuals, settings, and end.' },
        { src: '/rise-demo/rooms/rise-read-page-20261005.webp', label: '02 / Read · Page', alt: 'RISE Read in Page view: the poem set as a page under the title Lyrical Ballads, Volume II, Rural Architecture, with the visual field below.',
          caption: 'Mid-reading toggle to a navigable typeset page while the visual field continues underneath.' },
        { src: '/rise-demo/rooms/rise-library-20261005.webp', label: '03 / Library', alt: 'RISE Library: the Works shelf with Chapel, Rosary, Stations, Journeys, Keystones and Provenance panes, and The Iliad and Metamorphoses listed under Epic.',
          caption: 'Curated public-domain editions (including Standard Ebooks translations of The Iliad and Metamorphoses), plus Chapel, Rosary, Stations, Journeys, Keystones, and Provenance.' },
        { src: '/rise-demo/rooms/rise-make-20261005.webp', label: '04 / Make', alt: 'RISE Make on its Workshop pane: Sources and Assets on the left, an empty Visual Score in the centre, the Project inspector on the right.',
          caption: 'Workshop, Vault, Scriptorium, Visual Lab, and Visual Catalog for building custom compositions from built-in procedural engines.' },
      ] },
    map: { id: 'rise', title: 'How RISE validates AI reading plans.',
      note: 'Interactive trace of RISE@998d725’s decision gate. Models run over your connection and may select only from supplied catalog options; two examples show invalid proposals blocked before playback.',
      fallback: 'This map needs JavaScript.' },
    design: { title: 'Fast, local-first, and server-stateless.',
      items: [
        ['Unified reading state', 'One session model powers both Stream and Page views, preserving exact position across switches.'],
        ['Verified external book files', 'Texts load on demand outside the JS bundle (saving 15.4 MB), addressed and verified by SHA-256 content hash on every open.'],
        ['Strict first-load budget', 'Initial payload is ~59 KB Brotli across three requests, enforced by CI at a 64 KB ceiling.'],
        ['Zero server-side AI', 'The Cloudflare Worker serves only the app and static catalog. It runs no models and stores no credentials; six retired inference routes return HTTP 410.'],
        ['ChatGPT Composer', 'Prepares a complete reading in one tool call, validated deterministically before the reader presses Begin. Rejected readings cannot play.'],
        ['Automated release checks', 'Around 2,800 Vitest unit and integration tests, Playwright browser suites, generated architecture diagram checks, and rollback-ready builds.'],
      ] },
    evidence: [
      ['deployed', 'Reader, Library, Chapel, Make rooms, and interactive sample live at rise.syberlabs.io.'],
      ['tested', 'CI runs unit, integration, and Playwright suites, first-load budgets, and architecture checks on every release.'],
      ['measured', 'ChatGPT developer-mode test (4 October 2026) produced a validated Current and audible narration. Partial validation, not a public listing.'],
      RISE_PLUS.state === 'live'
        ? ['deployed', `RISE Plus voice (optional) runs at rise.syberlabs.io: ElevenLabs narration for your own texts, ${RISE_PLUS.price}/month via Stripe, no account required.`]
        : ['tested', `RISE Plus voice, optional ElevenLabs narration (${RISE_PLUS.price}/month): merged and verified in Stripe test mode (8 October 2026); paid launch pending verification.`],
      ['not yet', 'No external reader study or physical-device user testing conducted.'],
    ],
    facts: [
      ['Runs in', 'Modern browsers at rise.syberlabs.io'],
      ['Technology', 'JavaScript (ES modules), Vite, Web Audio API, Canvas 2D, IndexedDB, Cloudflare Workers, Vitest, Playwright, GitHub Actions'],
      ['AI integration', 'Optional and user-owned: OpenRouter (hosted Jev) or local pinned Kev-4B; no production Kev deployment by design.'],
      ['Privacy', 'Personal texts and compositions stay in browser storage. Connecting your own AI sends reading excerpts only to your chosen endpoint with your consent.'],
      ['License', 'Apache 2.0 (application code); texts and visual works carry individual licenses'],
      ['Composer in Claude', 'Live custom connector: Name RISE, URL https://rise.syberlabs.io/api/mcp (directory submission planned).'],
      ['Earlier evidence', { label: 'Jev integration in RISE', href: '/jev/' }],
      ['Your own model', { label: 'Reader-owned AI: Jev and Kev', href: '/kev/' }],
      ['RISE Plus', { label: RISE_PLUS.state === 'live' ? 'Optional narration for your own texts: live in RISE' : 'Optional narration for your own texts: paid launch pending verification', href: '/plus/' }],
      ['Source', { label: 'github.com/SyberLabs/RISE', href: 'https://github.com/SyberLabs/RISE' }],
    ],
  },
  {
    slug: 'flyspace', number: '04', name: 'FLYSPACE', category: 'AI data canvas', accent: '#0297de',
    reflects: 'SyberLabs/Flyspace@e95ae73 · verified 2026-10-05',
    pageTitle: 'FLYSPACE: Source-Traced Data Canvas for AI Assistants',
    metaDescription: 'Visual workspace for wiring live data sources into AI assistants so every answer cites the exact inputs that produced it. Browser preview available.',
    headline: 'Traces every AI answer to the exact data sources wired into it.',
    intro: 'FLYSPACE (formerly OmniOS) is a visual canvas for connecting data sources to AI assistants. Every answer records and cites the exact incoming sources that produced it.',
    summary: 'Try the browser preview at omni.syberlabs.io with the Shell Store and keyless public feeds. Live AI answers and keyed sources require running FLYSPACE locally with your own model (for example via Ollama).',
    status: { kind: 'live', label: 'Live preview' },
    primary: { label: 'Open preview', href: OMNI_PREVIEW },
    secondary: { label: 'Discuss a pilot', href: CONSULT },
    ghost: { label: 'Run locally', href: 'https://github.com/SyberLabs/Flyspace#run' },
    live: { href: OMNI_PREVIEW, label: 'omni.syberlabs.io', note: 'Browser preview live at omni.syberlabs.io. Your canvas stays local in your browser.' },
    video: { src: '/omni-demo/omnios-morning-20261005.mp4', poster: '/omni-demo/omnios-morning-20261005-poster.jpg', title: 'Workflow capture: question, cited sources, crystal, second persona',
      caption: 'Silent 30-second capture from OmniOS@e95ae73 (5 October 2026) running the morning acceptance test. Uses fixture data rather than live feeds or models; interface, wiring, citations, and history are production UI.' },
    why: { title: 'Stop guessing what your assistant saw.',
      paragraphs: [
        'Chat windows hide context boundaries. FLYSPACE makes data flow explicit: every block shows a source, every wire shows an active input, and every connection indicates whether data arrived.',
        'Every answer logs the exact inputs that produced it, including outputs chained through upstream assistants. Silent or failed feeds are never cited.',
      ] },
    use: { title: 'What runs in the preview vs. locally.', note: 'Steps 01 to 03 run in the public browser preview. Steps 04 and 05 require a local install with a model connection.',
      steps: [
        ['01 / Shell', 'Load workspaces', 'Open saved templates from the Shell Store, such as the Investor workspace wiring Polymarket, CoinGecko, World Bank, and Hacker News through Analyst and Strategist personas.'],
        ['02 / Blocks', 'Add public feeds', 'Drop in live blocks for prediction markets, crypto prices, economic series, research, and news with zero API keys.'],
        ['03 / Wires', 'Enforce schema fit', 'Wire blocks into personas. FLYSPACE validates input and output compatibility and refuses mismatches with an explanation.'],
        ['04 / Ask', 'Query locally', 'Ask connected personas questions using your own model. Answers cite only wired inputs and log provider, model, latency, and source snapshots.'],
        ['05 / Talk', 'Voice commands', 'Hold Talk for structured actions (“wire hacker news to the analyst”, “delete this”, “undo”). Destructive steps preview first; ambiguous references prompt for clarification.'],
      ] },
    map: { id: 'omnios', title: 'Trace how sources reach an answer.',
      note: 'Walk through the Investor workspace: one feed fails, one goes stale, and the provenance log records exactly which sources backed each answer.',
      fallback: 'This map needs JavaScript.' },
    design: { title: 'Explicit wiring, strict boundaries.',
      items: [
        ['Scoped personas', 'Each assistant (persona) reads strictly from its active incoming wires and cannot fetch outside inputs on its own.'],
        ['Typed connections', 'Schema checks run on every wire. Mismatches fail unless you explicitly select text-only conversion; untyped blocks connect freely.'],
        ['Full lineage history', 'Canvases persist locally in IndexedDB with no server needed. An optional PostgreSQL backend logs full request payloads and multi-persona lineage even after upstream data changes.'],
        ['Approval-gated tool manifests', 'OpenAPI specs, MCP schemas, or structured definitions compile into capability manifests. Write and delete actions require explicit approval, idempotency keys block duplicates, and uncertain outcomes stay flagged.'],
        ['Server-side secrets', 'API keys stay strictly in server environment variables. Automated build checks inject canary values and fail CI if any secret leaks into browser bundles.'],
        ['Preview limits', 'The public preview disables paid models, keyed feeds, and server history routes. Full local setup instructions ship with the repository.'],
      ] },
    evidence: [
      ['deployed', 'Limited public preview live at omni.syberlabs.io since 3 October 2026 on Cloudflare Workers.'],
      ['tested', 'Unit suites across stores, services, and capability engine, plus 6 Playwright specs covering the full morning workflow.'],
      ['implemented', 'Capability compiler and server-side broker hardened against fixtures and stubbed transports.'],
      ['not yet', 'No third-party APIs or MCP servers measured in production. Speech tested via typed transcripts only. Identity issuer not yet provisioned.'],
    ],
    facts: [
      ['Stage', 'Local-first single-user app with limited public preview'],
      ['Formerly', 'OmniOS (renamed October 2026; preview remains at omni.syberlabs.io for now)'],
      ['Technology', 'TypeScript, Next.js, React, Zustand, IndexedDB, optional PostgreSQL, Tailwind CSS, Vitest, Playwright, Cloudflare Workers'],
      ['AI models', 'Anthropic Claude, Google Gemini, local models via Ollama, optional Kev suggestions'],
      ['Data sources', 'Polymarket, CoinGecko, Hacker News, World Bank, OpenAlex, Metaculus, NewsAPI (keyed)'],
      ['License', 'Public repository; license file pending'],
      ['Source', { label: 'github.com/SyberLabs/Flyspace', href: 'https://github.com/SyberLabs/Flyspace' }],
    ],
  },
];

// The Menu (the Atlas): every product, the research, the company's ways of working with customers, and the account
// and legal routes. A group title is one word: project-template.js builds an element id from it.
export const siteMap = [
  { title: 'Products', items: [
    { label: 'SyberWork', note: 'Automated verification and human sign-off for AI-written code', href: '/projects/syberwork/' },
    { label: 'Attest', note: 'Executable tests for documentation and product specs', href: '/projects/attest/' },
    { label: 'RISE', note: 'Timed browser reader with synced audio and procedural visuals', href: '/projects/rise/' },
    { label: 'FLYSPACE', note: 'Source-traced data canvas for AI assistants', href: '/projects/flyspace/' },
  ] },
  { title: 'Research', items: [
    { label: 'Research index', note: 'Technical reports, benchmarks, and working papers', href: '/research/' },
    { label: 'Lacuna Institute', note: 'Interactive atlas of 21 historical gaps, fully sourced', href: LACUNA },
    { label: 'Paracas bundles', note: 'Open dataset tracking 13 exported mummy bundles', href: LACUNA_PARACAS },
  ] },
  { title: 'Company', items: [
    { label: 'Services', note: 'Consulting, custom agent builds, and design partnerships', href: '/services/' },
    { label: 'The Factory', note: 'Inside SyberWork’s six-stage verification pipeline', href: '/factory/' },
    { label: 'Approach', note: 'Five engineering rules for verifiable AI systems', href: '/approach/' },
    { label: 'PSYCHO SYBER', note: 'Six-stage stealth game in the browser', href: '/psycho-syber/' },
    { label: 'Email', note: EMAIL, href: CONTACT },
  ] },
  { title: 'Account', items: [
    { label: 'Subscriber account', note: 'Manage existing RISE subscriptions', href: RISE_PLUS.href, external: true },
    { label: 'Privacy', note: 'Static-site data and security policy', href: '/privacy/' },
  ] },
];

// The reports the homepage lists under Research, newest first. Each line is the report's own wording on the research
// index (research/index.html), which is written by hand: src/home/parts/research.js fails the build if a title or a
// date here is not on that page.
export const research = [
  { code: 'DA–01', kind: 'Draft report', title: 'Decision Arena: same request, different deciders', href: '/research/decision-arena/', date: '8 October 2026',
    line: 'Evaluates multiple deciders on identical RISE reading requests. Initial run covers two non-model baselines.' },
  { code: 'SB–01', kind: 'Research note', title: 'Sybershoke: shock tests for multi-agent systems', href: '/research/sybershoke/', date: '29 September 2026',
    line: 'Deterministic fault-injection harness: seeded fault plans judged strictly by recorded history invariants.' },
  { code: 'GC–01', kind: 'Technical report', title: 'GrokCell Execution: reliable execution for AI agents', href: '/research/jev-execution/', date: '26 September 2026',
    line: 'Defines the application layer required after a model picks an action: permissions, budgets, validation, and crash recovery.' },
];

export const skills = ['Python', 'TypeScript', 'JavaScript', 'SQL', 'React', 'Next.js', 'FastAPI', 'PostgreSQL', 'SQLite', 'Redis', 'Cloudflare Workers', 'LightGBM', 'scikit-learn', 'pandas', 'NumPy', 'LLM applications', 'AI agents', 'pytest', 'Vitest', 'Playwright'];
