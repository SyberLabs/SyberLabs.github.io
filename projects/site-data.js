// Single source of site navigation and project data.
// Bundled into the homepage by Vite (src/App.jsx), used by the build-time prerender
// (scripts/prerender.mjs) and loaded as-is by the project pages (experience-v7.js).
// Every project claim is taken from its repository at the commit named in `reflects`, its public
// page, or docs/SYSTEM_MAPS.md. Evidence states follow MasterMind's discipline: implemented
// (the behaviour exists in code), tested (a named test exercises it), measured (numbers exist
// under stated conditions), deployed (it runs somewhere people can reach). Nothing is promoted
// from one state to the next by wording.

export const CONTACT = 'mailto:syberlabs.software@gmail.com';
export const EMAIL = 'syberlabs.software@gmail.com';
export const RESUME = '/mateo_robles_resume.pdf';
export const LINKEDIN = 'https://www.linkedin.com/in/mateo-robles-71260b189';
export const GITHUB = 'https://github.com/SyberLabs';

// The two things a visitor can use right now. Linked from the hero, the Atlas, the footer and each project page.
export const RISE_APP = 'https://rise.syberlabs.io/';
export const RISE_SAMPLE = 'https://rise.syberlabs.io/jev-scene-demo';
export const OMNI_PREVIEW = 'https://omni.syberlabs.io/';

export const nav = [
  { id: 'work', label: 'Work', href: '/#work' },
  { id: 'research', label: 'Research', href: '/#research' },
  { id: 'about', label: 'About', href: '/#about' },
  { id: 'contact', label: 'Contact', href: CONTACT },
];

export const workWithUs = { label: 'Work with us', href: '/services/' };

export const footerLinks = [
  { label: 'Approach', href: '/approach/' },
  { label: 'RISE app', href: RISE_APP, external: true },
  { label: 'OmniOS preview', href: OMNI_PREVIEW, external: true },
  { label: 'Services', href: '/services/' },
  { label: 'Résumé', href: RESUME },
  { label: 'GitHub', href: GITHUB, external: true },
  { label: 'LinkedIn', href: LINKEDIN, external: true },
  { label: 'Contact', href: CONTACT },
  { label: 'Privacy', href: '/privacy/' },
];

export const projects = [
  {
    slug: 'rise', number: '01', name: 'RISE', category: 'Audiovisual reader', accent: '#f2d9a6',
    reflects: 'SyberLabs/RISE@998d725 · verified 2026-10-05',
    pageTitle: 'RISE: Browser-Based Audiovisual Reader',
    headline: 'Read beyond the page.',
    intro: 'A browser-based audiovisual reader. RISE presents a text through time, image, sound and procedural visuals, so a book can be read as a timed stream or a typeset page.',
    summary: 'Open beta at rise.syberlabs.io. Reading runs entirely in the browser, and the files and compositions you bring stay in browser storage. An optional AI reading request runs on the reader’s own model connection; the RISE server holds no model credential.',
    status: { kind: 'live', label: 'Live · open beta' },
    primary: { label: 'Open RISE', href: RISE_APP },
    secondary: { label: 'Try the interactive sample', href: RISE_SAMPLE },
    ghost: { label: 'Watch the demo film', href: '/rise-demo/', icon: 'play' },
    live: { href: RISE_APP, label: 'rise.syberlabs.io', note: 'No account, no key and no install. Pick a reading and press Begin.' },
    video: { src: '/rise-demo/rise-marketing-20260929-v3.mp4', poster: '/rise-demo/rise-marketing-20260929-v3-poster.jpg', title: 'RISE demo film',
      caption: 'Edited from real RISE screen recordings, with an AI-generated narrator and portrait. RISE creates its own abstract visuals and synthesized sound; the film uses an original music bed.' },
    why: { title: 'Why a reader, not an app that shows text.',
      paragraphs: [
        'Screens inherited the page from print, so reading software mostly reproduces a page and adds a scrollbar. RISE starts from the other end: a text is a sequence in time, and time can carry pacing, light and sound the way a page carries typography.',
        'The bet is that the conditions around a text change how it is received. RISE is the instrument for testing that bet in a browser, with the reader in control of every condition. What has been shown so far is the instrument, not a measured preference; the project says so on every page.',
      ] },
    use: { title: 'What you can do today', note: 'Five rooms. Everything else is a pane inside one of them.',
      steps: [
        ['01 / Home', 'Begin today’s reading', 'Home names one reading, with its own visual field behind it. Press Begin, or roll another reading.'],
        ['02 / Read', 'Stream or Page', 'Words arrive over time at a pace you set, or sit on a page you can navigate. Switch at any point; your place is kept.'],
        ['03 / Library', 'Curated public-domain texts', 'Literature, philosophy, poetry and scripture, prepared through an editorial pipeline that tracks edition, structure and rights. The Chapel holds the Douay-Rheims Bible and liturgy paced by a liturgy engine.'],
        ['04 / Make', 'Compose your own', 'Workshop, Scriptorium and Visual Lab author audiovisual compositions; the Vault saves them in your browser.'],
        ['05 / Ask', 'A reading from your own model', 'Describe what you want to read and a bounded decision model picks a book and presentation from the held catalog. Connect OpenRouter, or run Kev-4B locally; nothing is billed to SyberLabs and nothing leaves your connection.'],
      ] },
    design: { title: 'How it is built',
      items: [
        ['One-way pipeline', 'Source text → timed units → pacing → compiled session → clock-driven player. The same compiled session drives Stream and Page.'],
        ['Content-addressed texts', 'Book text is served as SHA-256-named JSON and verified on every read, which took 15.4 MB out of the JavaScript bundle.'],
        ['A first-load budget', 'About 59 KB brotli over three requests, held under a 64 KB budget that CI enforces.'],
        ['No shared inference', 'The Cloudflare Worker serves the app and a static decision catalog. It runs no model and holds no model credential; the six former inference routes answer 410.'],
        ['Composer, in ChatGPT', 'In ChatGPT, RISE is a Composer: the host model composes one sealed Current in a single tool call, the Worker validates and admits it, and nothing plays until the reader presses Begin. A refused Current never becomes playable.'],
        ['Tested design contracts', 'Around 2,800 Vitest unit and integration tests plus Playwright browser tests, a generated architecture diagram, and release gates with artifact verification and rollback.'],
      ] },
    evidence: [
      ['deployed', 'The reader, Library, Chapel, Make rooms and the interactive sample run at rise.syberlabs.io.'],
      ['tested', 'Unit, integration and browser suites run in CI; the first-load budget and the design diagram are checked on every release.'],
      ['measured', 'Composer in ChatGPT: a controlled developer-mode session on 2026-10-04 produced an admitted Current and narration the reader confirmed hearing. That is partial acceptance on one release, not a public listing.'],
      ['not yet', 'No reader study has been run; release evidence still records zero real-device and stranger-testing records. Realtime Live and Dive are out of current scope by decision.'],
    ],
    facts: [
      ['Runs in', 'Any modern browser at rise.syberlabs.io'],
      ['Technology', 'JavaScript (ES modules), Vite, Web Audio API, Canvas 2D, IndexedDB, Cloudflare Workers, Vitest, Playwright, GitHub Actions'],
      ['AI integration', 'Optional and reader-owned: Connect OpenRouter (hosted Jev), or run RISE with a pinned local Kev-4B. The server makes no model calls.'],
      ['Privacy', 'Texts you bring and compositions you make stay in your browser. See the app’s posted Privacy and Terms.'],
      ['License', 'Apache 2.0 for application code; texts and visual works carry their own terms'],
      ['Earlier evidence', { label: 'Jev integration in RISE', href: '/jev/' }],
      ['Your own model', { label: 'Reader-owned AI: Jev and Kev', href: '/kev/' }],
      ['Source', { label: 'github.com/SyberLabs/RISE', href: 'https://github.com/SyberLabs/RISE' }],
    ],
  },
  {
    slug: 'omnios', number: '02', name: 'OmniOS', category: 'AI analysis canvas', accent: '#f59be0',
    reflects: 'SyberLabs/OmniOS@e95ae73 · verified 2026-10-05',
    pageTitle: 'OmniOS: Canvas for Thinking with AI over Live Data',
    headline: 'See the sources behind an answer.',
    intro: 'A canvas for thinking with AI over live data. Drop blocks that pull real numbers, wire them into personas, and ask a question that is answered only from what the wires actually carry.',
    summary: 'A limited public preview is live at omni.syberlabs.io: the canvas, the Shell Store and every keyless public data source run in your browser. AI answers and keyed sources are switched off there; the full app runs on your own machine with your own model keys.',
    status: { kind: 'live', label: 'Live preview' },
    primary: { label: 'Open the preview', href: OMNI_PREVIEW },
    secondary: { label: 'Run it locally', href: 'https://github.com/SyberLabs/OmniOS#run' },
    ghost: { label: 'View source', href: 'https://github.com/SyberLabs/OmniOS', icon: 'external' },
    live: { href: OMNI_PREVIEW, label: 'omni.syberlabs.io', note: 'Your canvas stays in your browser. Public data blocks are live; AI answers and keyed sources are disabled in the preview.' },
    why: { title: 'Why a canvas.',
      paragraphs: [
        'When you ask an AI about the world, its context is invisible: you cannot see which numbers it was given, which it was not, and whether a source it cites carried anything at all. OmniOS makes the context physical. A block is a live view of one source. A wire says this feeds that. A persona is a mind whose entire context is what its incoming wires carry.',
        'So the question “what does this thing actually know?” has a literal answer you can point at on screen. A source that carried no data is never cited, and an answer records which runs fed it, however many personas deep.',
      ] },
    use: { title: 'What you can do in the preview', note: 'Everything below the first three steps needs a model key, so it runs locally, not on the public preview.',
      steps: [
        ['01 / Shell', 'Open a pre-wired shell', 'The Shell Store spawns saved canvases. The Investor shell arrives with Polymarket, CoinGecko, World Bank and Hacker News already wired into an Analyst, and the Analyst into a Strategist.'],
        ['02 / Blocks', 'Pull real numbers', 'Add blocks for prediction markets, crypto prices, economic series, research and news. Every built-in source is public and needs no key.'],
        ['03 / Wires', 'Say what feeds what', 'Draw a wire from a block to a persona. Ports are typed; a wire that does not fit is refused with a sentence naming both ports, and the graph is left unchanged.'],
        ['04 / Ask', 'Locally, with your key', 'Ask a persona a question. The answer cites only the sources its wires carried, and the inference ledger records provider, model, latency and which runs fed the turn.'],
        ['05 / Talk', 'Spoken canvas control', 'Hold Talk and say a command from a fixed grammar: “wire hacker news to the analyst”, “delete this”, “undo”. Speech only proposes; the interaction engine decides, previews a delete, and refuses ambiguous names.'],
      ] },
    map: { id: 'omnios', title: 'Which sources reach an answer.',
      note: 'The Investor shell, stepped through by rule: a feed fails, a feed goes stale, and the record says exactly which sources each answer used. Open any node to see who owns it.',
      fallback: 'This map needs JavaScript. It steps through the Investor shell: four sources wired into an Analyst, a failed and a stale feed excluded from the answer, and the lineage from the Strategist back to the two sources that reached it.' },
    design: { title: 'How it is built',
      items: [
        ['Blocks, wires, personas', 'A block is a live view of one source; a wire is an admitted edge, not a line drawn first; a persona answers from its inbound active wires and cannot choose its own inputs.'],
        ['Typed ports', 'Declared ports are enforced when a wire is created. Compatible schemas connect; a mismatch is refused unless a text projection is chosen. Blocks with no ports stay connectable as untyped.'],
        ['The inference ledger', 'Optional PostgreSQL records every model execution and the exact sources that fed it. When one persona feeds another, the ledger records which run was consumed, so a cascade stays walkable after the upstream blocks refetch. The canvas itself stays in IndexedDB and works with no server.'],
        ['Capability compiler', 'An OpenAPI document, MCP tool schemas or a structured description compile into a capability manifest. One function registers it; write and destructive capabilities stay pending until approved; a manifest never grants itself authority; execution carries idempotency keys and reports an uncertain effect rather than guessing.'],
        ['Keys stay server-side', 'Provider keys are read from the server environment and never sent to the browser. CI builds with canary values for every secret and fails if any reaches the client bundle.'],
        ['Deployment posture', 'The full app is local-first and single-user. The public preview sets a demo flag that disables paid generation, keyed sources and ledger reads at the route level; the deployment checklist is published with the code.'],
      ] },
    evidence: [
      ['deployed', 'The limited public preview has run at omni.syberlabs.io since 2026-10-03, deployed by hand from a recorded commit on Cloudflare Workers.'],
      ['tested', 'Unit tests across the stores, services and capability engine, and six Playwright specs including the “morning” golden path: shell → question → cited sources → crystal → second persona.'],
      ['implemented', 'The capability compiler and the server-side broker are implemented and hardened against fixtures and stubbed transports.'],
      ['not yet', 'No third-party API or MCP server has been measured in production use. Speech is tested with typed transcripts; there is no live microphone measurement. The hosted identity boundary exists in code with no provisioned issuer.'],
    ],
    facts: [
      ['Stage', 'Local-first, single-user app with a limited public preview'],
      ['Technology', 'TypeScript, Next.js, React, Zustand, IndexedDB, PostgreSQL (optional), Tailwind CSS, Vitest, Playwright, Cloudflare Workers'],
      ['AI models', 'Anthropic Claude, Google Gemini, and local models through Ollama; optional Kev persona suggestions'],
      ['Data sources', 'Polymarket, CoinGecko, Hacker News, World Bank, OpenAlex, Metaculus, NewsAPI (keyed)'],
      ['License', 'No license file yet; the repository is public'],
      ['Source', { label: 'github.com/SyberLabs/OmniOS', href: 'https://github.com/SyberLabs/OmniOS' }],
    ],
  },
  {
    slug: 'syberwork', number: '03', name: 'SyberWork', category: 'Governed work runtime', accent: '#a6f08f',
    reflects: 'SyberLabs/SyberWork@208eaf6 · verified 2026-10-05',
    pageTitle: 'SyberWork: Contract-Governed Work Runtime and Python SDK',
    headline: 'Contracts govern the work.',
    intro: 'A runtime and Python SDK for governed work. A contract says what may happen, a rule in code admits or refuses each step, a named person approves, and a hash-chained case history records what was proposed, observed, approved and executed.',
    summary: 'An agent or a person proposes. Admission decides. An effect runs once, with an idempotency key, and is reconciled afterwards. Build Thread applies the same path to changes in your own Git repository: a model’s claim that the tests pass is an unverified signal until the host runs the checks itself.',
    status: { kind: 'early', label: 'Open source · v0.1' },
    primary: { label: 'View source', href: 'https://github.com/SyberLabs/SyberWork', external: true },
    secondary: { label: 'Build Thread in ten minutes', href: 'https://github.com/SyberLabs/SyberWork/blob/main/docs/BUILD_THREAD.md' },
    why: { title: 'Why admission, not autonomy.',
      paragraphs: [
        'Agent frameworks make it easy for a model to act and hard to say afterwards who allowed it, on what evidence, and whether the effect really happened. SyberWork starts from the opposite constraint: generation is free, but nothing becomes an effect without a gate the host owns.',
        'The gate is a contract plus a policy, compiled into an inspectable path. A proposal that does not fit is refused with the deciding rule and its provenance. The same machinery that governs a purchase order governs a code change, which is why the SDK can sit under an agent fleet without trusting any one agent.',
      ] },
    use: { title: 'Build Thread: one governed change', note: 'Python 3.11+ and git. No account, no model and no network required.',
      steps: [
        ['01 / init', 'Name your real checks', 'syberlabs init writes a contract into .syberlabs/ and guesses the test command. When it cannot, it writes a check that fails until you name one, so an unchecked change never looks accepted.'],
        ['02 / start', 'Open a thread', 'A thread is one change to one repository, with the paths it may touch. The base commit is recorded as a verified git observation.'],
        ['03 / propose', 'Candidates on their own refs', 'Your edit, a coding tool’s edit, or an evolutionary search becomes a Git commit on a non-authoritative ref. The working tree is never touched.'],
        ['04 / check', 'The host runs the checks', 'Exit codes, durations and output digests are recorded against the candidate’s exact tree. A provider’s own claim never counts as a result.'],
        ['05 / accept and publish', 'Compare-and-swap, then separate effects', 'Accept moves one branch with a compare-and-swap and nothing else. Push, pull request and publish are separate admitted actions, each idempotent and reconcilable after a crash.'],
      ] },
    design: { title: 'How it is built',
      items: [
        ['Two packages, one direction', 'syberlabs is the reusable core: canonical JSON, the event hash chain, admission rules, the planner interface and an in-memory Session. syberwork is the application: storage, HTTP API, CLI, console and connectors. The core never imports the app.'],
        ['A chain you can verify', 'Every case event is hashed into a chain with a canonical-JSON digest and rule id beside it, an HMAC witness, an Ed25519 signature of the chain head, and an append-only transparency log kept in a separate file by a witness process that holds the key.'],
        ['A frozen protocol', 'sdk.syberlabs.space/v0alpha1: fifteen JSON schemas for contracts, policies, observations, proposals, admission decisions, effects, reconciliation and evolution, with a validator and golden traces.'],
        ['Compiled paths and replay', 'The compiler turns a contract into a dependency-ordered known path, action gates, acceptance queries and a form schema. Amendment replay compares a new contract version against recorded history and makes no model calls, destination writes or live reads.'],
        ['External planners, bounded', 'A planner is any HTTPS or loopback endpoint that receives the objective, allowed actions, contract, events and acceptance, and returns one proposed action. It never executes.'],
        ['Real effects, once', 'Executors send durable writes with idempotency keys and conditional headers, record the receipt, and leave an uncertain effect marked uncertain rather than retried blindly.'],
      ] },
    evidence: [
      ['tested', 'Twenty-three golden conformance traces, a clean-install release gate and CI green on CPython 3.11 to 3.13.'],
      ['measured', 'On the author’s machine with the default SQLite sync: explain.allowed median 3.8 µs, complete_case median 37.4 ms, chain verification of 501 events median 10.2 ms.'],
      ['implemented', 'The included procurement case runs end to end against a separate reference system, with a real order POST under an idempotency key and manager sign-off.'],
      ['not yet', 'The service binds to loopback and has no deployment beyond one machine. No outside project consumes the SDK. The model-versus-patch benchmark has not been run against a real model.'],
    ],
    facts: [
      ['Stage', 'Open-source runtime and SDK, version 0.1.0, wheel verified'],
      ['Technology', 'Python 3.11+ with no runtime dependencies, SQLite, pytest; Docker files for the console'],
      ['Protocol', 'sdk.syberlabs.space/v0alpha1, frozen'],
      ['License', 'Apache 2.0'],
      ['Source', { label: 'github.com/SyberLabs/SyberWork', href: 'https://github.com/SyberLabs/SyberWork' }],
    ],
  },
  {
    slug: 'relay', number: '04', name: 'Relay', category: 'Job application workspace', accent: '#62e3d8',
    reflects: 'SyberLabs/relay@0000605 · verified 2026-10-05',
    pageTitle: 'Relay: Job Application Workspace for AI-Assisted Drafting',
    headline: 'Every application has a history.',
    intro: 'A workspace for job seekers who draft with AI assistants, with one record per job and human approval of the exact wording.',
    summary: 'Relay works alongside ChatGPT, Codex, Claude, Grok and your notes in Notion or Obsidian. Each job keeps its research, confirmed facts and draft versions in one history. Acceptance applies to the exact wording of a specific draft version, and Relay never submits an employer form.',
    status: { kind: 'early', label: 'Early release' },
    primary: { label: 'View source', href: 'https://github.com/SyberLabs/relay', external: true },
    secondary: { label: 'Integration setup', href: 'https://github.com/SyberLabs/relay/blob/main/integrations/README.md' },
    why: { title: 'Why a record, not another assistant.',
      paragraphs: [
        'People already hunt for jobs with ChatGPT, Claude, Grok, Notion and Obsidian. The work falls apart in the gaps: a new chat forgets the last draft, a tracker overwrites a decision, an interview note resets an application’s status.',
        'Relay is the record that remembers. Research keeps its history, acceptance belongs to the text, and every handoff is bound to a job and a version so stale work is rejected instead of silently replacing a newer review.',
      ] },
    use: { title: 'How a job moves through Relay', note: 'Fictional example records ship with the app; no real applicant data is included.',
      steps: [
        ['01 / Import', 'Bring the research', 'Add a job from a title and posting URL, pull a public Greenhouse or Lever board, map a tracker CSV, or import notes from Notion or Obsidian. Matching URLs join the same record.'],
        ['02 / Facts', 'Confirm what is true', 'A reusable candidate fact ledger that you confirm. Agent drafts are checked against it for selected claim patterns; unsupported claims are flagged, not silently passed.'],
        ['03 / Draft', 'Hand off to your assistant', 'Export a packet, let ChatGPT, Codex or Claude draft, and bring a version-bound draft back. Where the browser supports WebMCP, an assistant can stage a draft directly for review.'],
        ['04 / Accept', 'Approve the exact words', 'Acceptance records approval of one draft version. Change the text and it needs review again.'],
        ['05 / Send and record', 'You press submit', 'A human Inspect Accept arms a first-party Chrome extension to fill a form once. Relay does not POST the employer form, and outcomes are recorded with a receipt.'],
      ] },
    map: { id: 'relay', title: 'What leaves Relay, and what comes back.',
      note: 'Recorded by running the repository’s own modules: the bounded packet, the returned draft, the identity and version gate, the claim gate, and the five refusals that leave nothing written.',
      fallback: 'This map needs JavaScript. It replays a recorded handoff: a posting canonicalised to one job, a bounded packet handed to an assistant, the returned draft re-validated, one claim flagged, and acceptance refused while a blocker is open.' },
    design: { title: 'How it is built',
      items: [
        ['One history per job', 'Posting observations are preserved as rows; rediscovery keeps an existing interview or submitted status instead of resetting it.'],
        ['Version-bound handoffs', 'Draft packets and editor checks carry the job identity and generation-time version, and reject stale work.'],
        ['Claim checks', 'Word and number overlap between a draft and cited confirmed facts. The check is heuristic and says so: it does not establish factual truth.'],
        ['Edge deployment', 'TypeScript and React on Cloudflare Workers with Drizzle ORM, a Manifest V3 extension, and Playwright tests.'],
      ] },
    evidence: [
      ['tested', 'The domain, handoff and profile modules were executed under Node for the site’s recorded Relay map; the D1 acceptance write is reproduced as a rule.'],
      ['implemented', 'Runtime, Tracker, the fact ledger, CSV and job-board import, and every integration listed in the repository.'],
      ['not yet', 'No public deployment and no customer counts, hiring outcomes or throughput improvements are claimed. Autonomous hunting is not included.'],
    ],
    facts: [
      ['Built by', 'Seth Carlson and Mateo Robles'],
      ['Technology', 'TypeScript, React, Cloudflare Workers, Drizzle ORM, Chrome extension (Manifest V3), Playwright'],
      ['Boundary', 'Relay prepares and tracks application materials. It does not submit employer forms, host an MCP connection, or sync accounts in the background.'],
      ['Source', { label: 'github.com/SyberLabs/relay', href: 'https://github.com/SyberLabs/relay' }],
    ],
  },
  {
    slug: 'osahr', number: '05', name: 'OSAHR', category: 'Stochastic simulation library', accent: '#ffae63',
    reflects: 'SyberLabs/OSAHR_Cell@7293e27 · verified 2026-10-05',
    pageTitle: 'OSAHR: Open-Source Stochastic Simulation Library in Python',
    headline: 'Replay a changing system.',
    intro: 'An open-source Python library for exact stochastic simulation of networks that change their own structure, with seeded, hash-checked replay.',
    summary: 'Rules rewrite a typed directed hypergraph at random times with exact probabilities. Three schedulers, incremental pattern matching checked against an exhaustive matcher, adaptive parameters, and a replay that reproduces every recorded state hash. Every public claim is graded Known, Measured, Inferred or Proposed.',
    status: { kind: 'research', label: 'Research' },
    primary: { label: 'View source', href: 'https://github.com/SyberLabs/OSAHR_Cell', external: true },
    secondary: { label: 'Read the architecture', href: 'https://github.com/SyberLabs/OSAHR_Cell/blob/main/ARCHITECTURE.md' },
    why: { title: 'Why a kernel for networks that rewrite themselves.',
      paragraphs: [
        'Most simulators change the state of a fixed network. Many real systems change the network itself: a cell grows a connection, an organisation adds a role, an agent fleet forms a new channel. Modelling that exactly, with the right probabilities and a record you can replay, is the problem OSAHR takes on.',
        'The kernel is deliberately small and dependency-free so its invariants can be stated and checked. The adaptive, replayable network it provides is the primitive the lab’s governed-work infrastructure is designed to sit on; the seam between them is specified before it is built.',
      ] },
    use: { title: 'What you can do', note: 'pip install the wheel, or run the examples from a checkout.',
      steps: [
        ['01 / Model', 'Declare a typed hypergraph', 'A schema, a graph, and rules written as pattern → template with a rate expression and optional adaptation of parameters and memory.'],
        ['02 / Run', 'Choose a scheduler', 'Direct SSA, modified next-reaction, or bounded thinning. All three are exact; incremental matching is checked against an exhaustive matcher.'],
        ['03 / Replay', 'Reproduce every state', 'Seeded runs reproduce their trace, and delta replay reproduces every recorded state hash. The site’s own OSAHR map was exported this way.'],
        ['04 / Review', 'Graded evidence packets', 'The decision workbench turns frozen experiments into reviewable packets. GrokCell is a prototype agent control plane on the same kernel.'],
      ] },
    map: { id: 'osahr', title: 'A hypergraph, one committed event at a time.',
      note: 'Recorded by running the adaptive-signal example and exported from the trace. Every state is hashed; the replay reproduces every hash.',
      fallback: 'This map needs JavaScript. It replays a recorded run: two agents exchanging typed signal hyperedges, parameters adapting as rules fire, and the state hash after every committed event.' },
    design: { title: 'How it is built',
      items: [
        ['Exact stochastic rewriting', 'Continuous-time rules over a typed directed hypergraph, with the invariants written down in the architecture document.'],
        ['Incremental matching', 'Incidence-constrained pattern search keeps matching fast as the graph grows and is cross-checked against an exhaustive matcher.'],
        ['Adaptive parameters', 'Rules can rewrite the model’s own parameters and memory, so the dynamics change as the structure does.'],
        ['No runtime dependencies', 'Python 3.11+ only in the core; experiments are confirmatory records on the kernel.'],
      ] },
    evidence: [
      ['tested', 'A pytest suite of 41 test files; replay of the site’s recorded trace reproduces every state hash.'],
      ['implemented', 'Kernel, three schedulers, incremental matching, adaptive parameters, replay, the decision workbench and the GrokCell prototype.'],
      ['not yet', 'Research models of mechanisms, not calibrated forecasts. No continuous integration is configured in the repository yet.'],
    ],
    facts: [
      ['Stage', 'Open-source research library, version 0.2.1'],
      ['Technology', 'Python 3.11+ (no runtime dependencies in the core library), pytest'],
      ['Scope', 'Research models of mechanisms, not calibrated forecasts'],
      ['License', 'Apache 2.0'],
      ['Source', { label: 'github.com/SyberLabs/OSAHR_Cell', href: 'https://github.com/SyberLabs/OSAHR_Cell' }],
    ],
  },
];

// The Atlas: every destination on the site, grouped. Rendered as the full-screen menu on every page
// (projects/project-template.js `atlas()`), so no screen is more than one tap from any other.
export const siteMap = [
  { title: 'Use', items: [
    { label: 'RISE app', note: 'rise.syberlabs.io · open beta', href: RISE_APP, external: true, accent: '#f2d9a6', sigil: 'rise' },
    { label: 'OmniOS preview', note: 'omni.syberlabs.io · live preview', href: OMNI_PREVIEW, external: true, accent: '#f59be0', sigil: 'omnios' },
    { label: 'RISE interactive sample', note: 'Change the scene while you read', href: RISE_SAMPLE, external: true },
    { label: 'RISE demo', note: 'Watch the film', href: '/rise-demo/' },
  ] },
  { title: 'Projects', items: [
    { label: 'RISE', note: 'Audiovisual reader', href: '/projects/rise/', sigil: 'rise', accent: '#f2d9a6' },
    { label: 'OmniOS', note: 'AI analysis canvas', href: '/projects/omnios/', sigil: 'omnios', accent: '#f59be0' },
    { label: 'SyberWork', note: 'Governed work runtime', href: '/projects/syberwork/', sigil: 'syberwork', accent: '#a6f08f' },
    { label: 'Relay', note: 'Job application workspace', href: '/projects/relay/', sigil: 'relay', accent: '#62e3d8' },
    { label: 'OSAHR', note: 'Stochastic simulation library', href: '/projects/osahr/', sigil: 'osahr', accent: '#ffae63' },
  ] },
  { title: 'Research', items: [
    { label: 'Reliable execution for AI agents', note: 'Technical report · Sept 2026', href: '/research/jev-execution/' },
    { label: 'Sybershoke', note: 'Research note · shock tests for multi-agent systems', href: '/research/sybershoke/' },
    { label: 'Papers', note: 'Working papers and studies on GitHub', href: 'https://github.com/SyberLabs/papers', external: true },
    { label: 'RISE, Jev and Kev', note: 'Reader-owned AI', href: '/kev/' },
    { label: 'Jev in RISE', note: 'Earlier case study', href: '/jev/' },
  ] },
  { title: 'Lab', items: [
    { label: 'Home', note: 'Read. Think. Build.', href: '/' },
    { label: 'Approach', note: 'How we build', href: '/approach/' },
    { label: 'Services', note: 'Interactive reading pilots', href: '/services/' },
    { label: 'About', note: 'The lab and its founder', href: '/#about' },
    { label: 'Design kit', note: 'Atlas v2 tokens and components', href: '/kit/v2/' },
    { label: 'Privacy', note: 'What this site does with your data', href: '/privacy/' },
  ] },
  { title: 'Contact', items: [
    { label: 'Email', note: EMAIL, href: CONTACT },
    { label: 'GitHub', note: 'github.com/SyberLabs', href: GITHUB, external: true },
    { label: 'LinkedIn', note: 'Mateo Robles', href: LINKEDIN, external: true },
    { label: 'Résumé', note: 'PDF', href: RESUME },
  ] },
];

export const skills = ['Python', 'TypeScript', 'JavaScript', 'SQL', 'React', 'Next.js', 'FastAPI', 'PostgreSQL', 'SQLite', 'Redis', 'Cloudflare Workers', 'LightGBM', 'scikit-learn', 'pandas', 'NumPy', 'LLM applications', 'AI agents', 'pytest', 'Vitest', 'Playwright'];
