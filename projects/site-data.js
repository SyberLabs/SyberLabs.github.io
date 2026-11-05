// Single source of site navigation and project data.
// Bundled into the homepage by Vite (src/App.jsx), used by the build-time prerender
// (scripts/prerender.mjs) and loaded as-is by the project pages (experience-v7.js).
// Every project claim is taken from its repository at the commit named in `reflects` or its public
// page. Evidence states: implemented
// (the behaviour exists in code), tested (a named test exercises it), measured (numbers exist
// under stated conditions), deployed (it runs somewhere people can reach). Nothing is promoted
// from one state to the next by wording.

// One company inbox is the single contact everywhere (site, structured data, product pages). Change it here only.
export const EMAIL = 'syberlabs.support@gmail.com';
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
export const nav = [
  { id: 'products', label: 'Products', href: '/#products' },
  { id: 'factory', label: 'Factory', href: '/factory/' },
  { id: 'services', label: 'Services', href: '/services/' },
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
    slug: 'syberwork', number: '01', name: 'SyberWork', category: 'Autonomous software factory', accent: '#0297de',
    reflects: 'SyberLabs/SyberWork@208eaf6 · verified 2026-10-05',
    pageTitle: 'SyberWork: The Autonomous Software Factory',
    headline: 'Agents build. The host checks. A person admits.',
    intro: 'The factory floor for AI agents that write, test and repair code. Every change is checked before it lands. Rules define the allowed steps, a named person approves the work, and a tamper-evident history records what was proposed, checked, approved and done.',
    summary: 'Build Thread applies these checks to code changes in your Git repository. It runs the checks itself before accepting a change, even if the model says the tests passed. Actions use unique keys to prevent duplicate execution, and their results are checked afterwards.',
    status: { kind: 'wip', label: 'Work in progress' },
    primary: { label: 'View source', href: 'https://github.com/SyberLabs/SyberWork', external: true },
    secondary: { label: 'Discuss a pilot', href: CONSULT },
    ghost: { label: 'Build Thread in ten minutes', href: 'https://github.com/SyberLabs/SyberWork/blob/main/docs/BUILD_THREAD.md' },
    why: { title: 'Why check each proposed step?',
      paragraphs: [
        'When an AI proposes an action, people need to know who approved it, what evidence supported it and whether it succeeded. SyberWork checks each proposal against rules controlled by the system running it.',
        'The rules define what may happen and who can approve it. If a proposal breaks a rule, SyberWork refuses it and records the reason and the rule used. The same checks can apply to a purchase order or a code change.',
      ] },
    use: { title: 'Build Thread: review one code change', note: 'Python 3.11+ and git. No account, no model and no network required.',
      steps: [
        ['01 / init', 'Name your real checks', 'syberlabs init writes a contract into .syberlabs/ and guesses the test command. When it cannot, it writes a check that fails until you name one, so an unchecked change never looks accepted.'],
        ['02 / start', 'Open a thread', 'A thread tracks one change to one repository and names the files it may affect. It records and checks the starting Git commit.'],
        ['03 / propose', 'Keep proposed edits separate', 'Your edit, a coding tool’s edit, or an automated search result is saved as a separate Git commit for review. It does not change your working files.'],
        ['04 / check', 'The host runs the checks', 'Checks run against the exact proposed files. The record keeps their exit codes, how long they took and hashes of their output.'],
        ['05 / accept and publish', 'Accept the change, then choose what to publish', 'Accept updates one branch only if it still points to the expected commit. Pushing code, opening a pull request and publishing each require a separate allowed action, with duplicate prevention and recovery checks.'],
      ] },
    run: { title: 'A model’s claim is not a result.',
      note: 'The repository’s own Build Thread example, run on 2026-10-05 from SyberWork@208eaf6 with Python 3.11 and git. No model, no network.',
      command: 'PYTHONPATH=. python examples/build_thread.py',
      output: '{\n  "context": ["tests/test_report.py:1-7", "src/report.py:1-2"],\n  "model": {\n    "candidate": "c1",\n    "claimed": { "tests": "passed", "confidence": 0.97 },\n    "verdict": "candidate_check_failed:tests",\n    "accept": "denied:candidate_check_failed:tests"\n  },\n  "patch": {\n    "candidate": "c2",\n    "verdict": "all_checks_passed",\n    "accept": "succeeded",\n    "branch": "refs/heads/syberlabs/e643ed26",\n    "commit": "7c606ae8f44f3f999c010799e1d2fdcee1166011"\n  },\n  "working_tree_and_main_untouched": true,\n  "resumed": { "status": "complete", "accepted": "c2", "events": 18, "chain_valid": true },\n  "replay_under_v2": ["candidate_check_missing:lint", "candidate_check_missing:lint"]\n}\nbuild-thread complete',
      caption: 'The provider claimed c1 passed its tests with 0.97 confidence, but checks run on its exact files failed, so SyberWork rejected it. Candidate c2 passed all checks. It was accepted by updating one branch only after confirming the branch had not changed (compare-and-swap). The working files and main branch were untouched. The thread resumed from a valid 18-event history. Replaying that history with a new lint-check requirement shows both candidates would be rejected for the missing check.' },
    design: { title: 'How it is built',
      items: [
        ['Separate the core from the app', 'The reusable syberlabs package defines the rules, proposal interface and in-memory Session. It uses a fixed JSON format and a hash-linked event history. The syberwork app adds storage, a web API, command-line tools, a console and connectors. The core never imports the app.'],
        ['A chain you can verify', 'Every case event is hashed into a chain with a canonical-JSON digest and rule id beside it, an HMAC witness, an Ed25519 signature of the chain head, and an append-only transparency log kept in a separate file by a witness process that holds the key.'],
        ['A fixed format for exchanging work records', 'Fifteen JSON schemas define work rules, observations, proposals, approval decisions, actions, outcome checks and rule changes. The protocol is sdk.syberlabs.space/v0alpha1, with a format checker and reference event sequences.'],
        ['Plan checks and review rule changes', 'The compiler turns the work rules into ordered steps, approval checks, completion checks and form fields. Replay shows how changed rules would apply to recorded history without calling a model, changing a destination or fetching live data.'],
        ['Separate proposals from execution', 'A planner receives the objective, allowed actions, work rules, history and completion criteria, then proposes one action. It cannot execute the action. It can run through an HTTPS service or a local loopback address.'],
        ['Prevent duplicate writes', 'Executors send writes with unique request keys and conditions that prevent duplicates or outdated changes, then record the receipt. If the outcome is uncertain, it stays marked uncertain rather than being retried blindly.'],
      ] },
    evidence: [
      ['tested', 'Twenty-three golden conformance traces, a clean-install release gate and CI green on CPython 3.11 to 3.13.'],
      ['measured', 'On one development machine with the default SQLite sync: explain.allowed median 3.8 µs, complete_case median 37.4 ms, chain verification of 501 events median 10.2 ms.'],
      ['implemented', 'The included procurement case runs end to end against a separate reference system, with a real order POST under an idempotency key and manager sign-off.'],
      ['not yet', 'The service binds to loopback and has no deployment beyond one machine. No outside project consumes the SDK. The model-versus-patch benchmark has had one pilot against a real model, on three fixtures that proved too easy; it has no general result yet.'],
    ],
    facts: [
      ['Stage', 'Open-source runtime and SDK, version 0.1.0, wheel verified'],
      ['Technology', 'Python 3.11+ with no runtime dependencies, SQLite, pytest; Docker files for the console'],
      ['License', 'Apache 2.0'],
      ['Source', { label: 'github.com/SyberLabs/SyberWork', href: 'https://github.com/SyberLabs/SyberWork' }],
    ],
  },
  {
    slug: 'attest', number: '02', name: 'Attest', category: 'Document and spec verification', accent: '#0297de',
    reflects: 'SyberLabs/attest@274b8e7 · verified 2026-11-05',
    pageTitle: 'Attest: Prove Every Promise Your Docs Make',
    headline: 'Prove every promise your docs make.',
    intro: 'Point Attest at a README, a quickstart, an AI assistant’s how-to answer or a product spec. It runs every step against the real app (commands in a scratch directory, browser steps in a real Chrome) and hands the document back with each step marked proven, stale, broken, unverifiable or skipped, with evidence behind every mark.',
    summary: 'Attest is the first station of the SyberLabs factory. Steps that fail go to an agent, an authority policy decides what that agent may change, and the browser check runs again. A case closes only when the fix is proven, and every case leaves a receipt.',
    status: { kind: 'wip', label: 'Public source · early' },
    primary: { label: 'View source', href: 'https://github.com/SyberLabs/attest', external: true },
    secondary: { label: 'Discuss a pilot', href: CONSULT },
    why: { title: 'Why prove a document?',
      paragraphs: [
        'Docs, quickstarts and specs make promises: run this command, click this button, see this label. Products change underneath them, and the first person to notice is usually a frustrated customer.',
        'Attest treats each step as a claim to be checked against the running product. A claim is proven only when a command passed or the browser run observed the promised label; the verdict is a fixed rule, never a model’s say-so.',
      ] },
    use: { title: 'Four ways to use it', note: 'Python 3.11 or newer. Browser steps use Kane CLI, TestMu’s browser agent.',
      steps: [
        ['01 / Prove', 'Prove a doc', 'Run attest prove on a Markdown document. Shell steps run in a scratch directory, browser steps run in Chrome, and the result is one page with a badge on every claim.'],
        ['02 / Repair', 'Fix drift in the doc', 'When a descriptive claim has gone stale, an agent writes a doc-only patch in a throwaway checkout and the browser proves it again before anything is applied.'],
        ['03 / Protect', 'Refuse to weaken a promise', 'A policy file marks promises the product must keep. Attest will not edit those to make a check pass; it issues an implementation handoff instead.'],
        ['04 / Spec', 'Build to a spec', 'In spec mode a failing claim becomes a ticket. A worker implements it in a candidate copy of the app, never the original, and the browser checks the copy. Applying it needs a person’s approval.'],
      ] },
    design: { title: 'How it is built',
      items: [
        ['Claims pinned to lines', 'One structured-output call turns the document into typed claims tied to exact line spans. Fenced command blocks become shell claims verbatim.'],
        ['Verdicts by rule, not by model', 'Shell claims are judged on exit codes and promised output. Browser claims compare the expected label with the observed one, with guards for negation and changed numbers.'],
        ['An authority gate', 'Each stale or broken claim is checked against the policy before an agent touches it. Descriptive text may be repaired; protected promises may not.'],
        ['Receipts for every case', 'Each loop case writes an attest.receipt/v0 file: document hashes before and after, the claim, the authority decision, the patch hash and the evidence. SyberWork reads them as observations.'],
        ['Bring your own agent', 'OpenAI is the default worker. Any command that reads a brief and prints a diff can take its place, so a team can plug in the agent it already uses.'],
      ] },
    evidence: [
      ['measured', 'At Kane CLI Hack Day in San Francisco on 24 October 2026, Attest proved 9 documents across 23 turns, with 31 browser claims proven by Kane, each with a screenshot.'],
      ['measured', 'Real drift it caught that day: Vite’s starter page now reads “Get started”, not “Vite + React”, and GitHub’s “Security & analysis” is now “Advanced Security”.'],
      ['tested', 'Unit tests and red-team cases cover forged approvals, attempts to weaken a protected promise and path-escape attacks on the apply step.'],
      ['not yet', 'There is no hosted service; Attest runs locally as a command-line tool. Shell steps run on the host, not in a sandbox. No outside team runs it in production yet.'],
    ],
    facts: [
      ['Stage', 'Public-source command-line tool, version 0.1.0'],
      ['Technology', 'Python 3.11+, OpenAI structured outputs, Kane CLI and Chrome'],
      ['Works with', { label: 'SyberWork, the factory floor', href: '/projects/syberwork/' }],
      ['License', 'MIT, declared in pyproject.toml'],
      ['Source', { label: 'github.com/SyberLabs/attest', href: 'https://github.com/SyberLabs/attest' }],
    ],
  },
  {
    slug: 'rise', number: '03', name: 'RISE', category: 'Interactive reading app', accent: '#0297de',
    reflects: 'SyberLabs/RISE@998d725 · verified 2026-10-05',
    pageTitle: 'RISE: Interactive Reading with Text, Sound and Visuals',
    headline: 'Read beyond the page.',
    intro: 'An interactive reading app that combines text, sound and moving visuals in your browser. Read words at a pace you choose, or switch to a page view.',
    summary: 'Open beta at rise.syberlabs.io. Reading runs entirely in the browser, and the files and compositions you bring stay in browser storage. An optional AI reading request runs on the reader’s own model connection; once connected, visual direction also sends sections of the reading text there. The RISE server holds no model credential.',
    status: { kind: 'live', label: 'Live · open beta' },
    primary: { label: 'Open RISE', href: RISE_APP },
    secondary: { label: 'Try the interactive sample', href: RISE_SAMPLE },
    ghost: { label: 'Watch the demo film', href: '/rise-demo/', icon: 'play' },
    live: { href: RISE_APP, label: 'rise.syberlabs.io', note: 'No account, no key and no install. Pick a reading and press Begin.' },
    video: { src: '/rise-demo/rise-marketing-20260929-v3.mp4', poster: '/rise-demo/rise-marketing-20260929-v3-poster.jpg', title: 'RISE demo film',
      caption: 'Edited from real RISE screen recordings, with an AI-generated narrator and portrait. RISE creates its own abstract visuals and synthesized sound; the film uses an original music bed.' },
    why: { title: 'Why combine reading with sound and visuals?',
      paragraphs: [
        'RISE explores reading as an experience that unfolds over time. Readers can set the pace and combine the words with light and sound, or return to a page view.',
        'The idea is to explore whether the presentation changes how people experience a text. RISE provides browser controls for that exploration. No reader study has established a preference for this approach.',
      ] },
    use: { title: 'What you can do today', note: 'Five main areas, with related tools grouped inside each one.',
      steps: [
        ['01 / Home', 'Begin today’s reading', 'Home offers one reading with moving visuals behind it. Press Begin, or choose another reading.'],
        ['02 / Read', 'Stream or Page', 'Words arrive over time at a pace you set, or sit on a page you can navigate. Switch at any point; your place is kept.'],
        ['03 / Library', 'Curated public-domain texts', 'Browse literature, philosophy, poetry and scripture, with records of each edition, its structure and its rights. The Chapel includes the Douay-Rheims Bible and liturgy with timed pacing.'],
        ['04 / Make', 'Compose your own', 'Create readings with text, sound and visuals using Workshop, Scriptorium and Visual Lab. Save them in your browser with the Vault.'],
        ['05 / Ask', 'A reading from your own model', 'Describe what you want to read. The model chooses a book and presentation only from the supplied catalog. Connect through OpenRouter, or run Kev-4B locally; model requests use your connection and are not billed to SyberLabs.'],
      ] },
    gallery: { eyebrow: 'Rooms', title: 'The five rooms, as they open.',
      note: 'Screenshots of a local build of SyberLabs/RISE@998d725 taken on 2026-10-05 in headless Chromium at 1440×900, nothing mocked. The text in every shot is Rural Architecture, from Lyrical Ballads by Wordsworth and Coleridge, a public-domain work served from RISE’s own Library; the fields behind it are RISE’s procedural engines. A silent 25-second screen recording of the same build, Home → Begin → words arriving in Stream (with the few seconds of Preparing session the software renderer needs), is also available.',
      link: { href: '/rise-demo/rooms/rise-rooms-begin-20261005.mp4', label: 'Watch the screen recording (MP4, 25 s, no sound)' },
      items: [
        { src: '/rise-demo/rooms/rise-home-20261005.webp', label: '01 / Home', alt: 'RISE Home: a line of a poem over a magenta visual field, with the buttons Read it with sound, Another reading and Library.',
          caption: 'Home as it opens: today’s poem, already streaming over its own visual field.' },
        { src: '/rise-demo/rooms/rise-menu-20261005.webp', label: 'Menu', alt: 'The RISE Menu open over Home, listing Home, Read, Library, Make and Settings, then Ask for a reading, Guide and Wormhole.',
          caption: 'The Menu, open on Home: the five rooms, Home, Read, Library, Make and Settings, with Ask for a reading, Guide and Wormhole under More.' },
        { src: '/rise-demo/rooms/rise-read-stream-20261005.webp', label: '02 / Read · Stream', alt: 'RISE Read in Stream: one phrase of the poem large on a dark panel over the visual field, with a control bar showing 0:10 of 0:31.',
          caption: 'Read, in Stream, ten seconds into a 31-second reading, with the control bar shown: pause, Page view, fullscreen, Visuals, Settings, end.' },
        { src: '/rise-demo/rooms/rise-read-page-20261005.webp', label: '02 / Read · Page', alt: 'RISE Read in Page view: the poem set as a page under the title Lyrical Ballads, Volume II, Rural Architecture, with the visual field below.',
          caption: 'Read, switched to Page view mid-reading: the same poem set as a page under its edition title, the visual field continuing below.' },
        { src: '/rise-demo/rooms/rise-library-20261005.webp', label: '03 / Library', alt: 'RISE Library: the Works shelf with Chapel, Rosary, Stations, Journeys, Keystones and Provenance panes, and The Iliad and Metamorphoses listed under Epic.',
          caption: 'Library: curated public-domain works in named editions (the Epic shelf opens with Standard Ebooks translations of The Iliad and Metamorphoses), with Chapel, Rosary, Stations, Journeys, Keystones and Provenance as panes.' },
        { src: '/rise-demo/rooms/rise-make-20261005.webp', label: '04 / Make', alt: 'RISE Make on its Workshop pane: Sources and Assets on the left, an empty Visual Score in the centre, the Project inspector on the right.',
          caption: 'Make, opened from the Menu onto its Workshop pane with Vault, Scriptorium, Visual Lab and Visual Catalog alongside: a new, empty composition; the asset list is the build’s own procedural engines and sourced collections.' },
      ] },
    map: { id: 'rise', title: 'What a model may choose, and what it may not.',
      note: 'How RISE checks an AI reading suggestion, using the rules at 998d725: the model makes one request through your connection and can choose only from the supplied options. Two examples show a suggestion being refused without opening a reading.',
      fallback: 'This map needs JavaScript.' },
    design: { title: 'How it is built',
      items: [
        ['One reading, two views', 'RISE divides text into timed units, sets the pacing and prepares one reading session. That same session drives both Stream and Page, so switching views keeps your place.'],
        ['Book files checked when opened', 'Book text loads separately from the app, removing 15.4 MB from its JavaScript bundle. Files use SHA-256 content hashes as names, and RISE checks the hash each time it reads a file.'],
        ['A limit on initial download size', 'The initial download is about 59 KB across three requests with Brotli compression. Automated build checks enforce a 64 KB limit.'],
        ['No model runs on the RISE server', 'The Cloudflare Worker serves the app and its catalog of reading choices. It runs no model and holds no model credential. Six retired model-request routes return HTTP 410 (Gone).'],
        ['Composer, in ChatGPT', 'In ChatGPT, RISE lets the model prepare a reading with text, sound and visuals in one tool call. RISE checks the result before making it playable, and the reader presses Begin to start. Rejected readings cannot play.'],
        ['Automated checks before release', 'Around 2,800 Vitest unit and integration tests, plus Playwright browser tests, check the app. Releases also check a generated architecture diagram and the built files, with a way to restore an earlier release.'],
      ] },
    evidence: [
      ['deployed', 'The reader, Library, Chapel, Make rooms and the interactive sample run at rise.syberlabs.io.'],
      ['tested', 'Unit, integration and browser suites run in CI; the first-load budget and the design diagram are checked on every release.'],
      ['measured', 'Composer in ChatGPT: a controlled developer-mode session on 2026-10-04 produced an admitted Current and narration the reader confirmed hearing. That is partial acceptance on one release, not a public listing.'],
      RISE_PLUS.state === 'live'
        ? ['deployed', `RISE Plus voice (optional) runs at rise.syberlabs.io: an ElevenLabs voice for a reading of your own, ${RISE_PLUS.price} a month through Stripe, with no account.`]
        : ['tested', `RISE Plus voice, an optional ElevenLabs voice (${RISE_PLUS.price} a month): implementation merged; paid launch pending verification. It runs in production on Stripe test mode: on 2026-10-08 a test purchase unlocked it and the voice was heard reading the buyer's own file.`],
      ['not yet', 'No reader study has been run; release evidence still records zero real-device and stranger-testing records.'],
    ],
    facts: [
      ['Runs in', 'Any modern browser at rise.syberlabs.io'],
      ['Technology', 'JavaScript (ES modules), Vite, Web Audio API, Canvas 2D, IndexedDB, Cloudflare Workers, Vitest, Playwright, GitHub Actions'],
      ['AI integration', 'Optional and reader-owned: Connect OpenRouter (TypeSafe AI’s hosted Jev), or run RISE locally with a pinned Kev-4B; there is no production Kev deployment, by design.'],
      ['Privacy', 'Texts you bring and compositions you make stay in your browser. Once you connect your own AI, visual direction sends sections of the reading text to that connection (a text you bring, only with your consent). See the app’s posted Privacy and Terms.'],
      ['License', 'Apache 2.0 for application code; texts and visual works carry their own terms'],
      ['Composer in Claude', 'Live as a custom connector: add one named RISE with the URL https://rise.syberlabs.io/api/mcp. Submission to Claude’s connector directory is planned.'],
      ['Earlier evidence', { label: 'Jev integration in RISE', href: '/jev/' }],
      ['Your own model', { label: 'Reader-owned AI: Jev and Kev', href: '/kev/' }],
      ['RISE Plus', { label: RISE_PLUS.state === 'live' ? 'Optional voice, your own reading read aloud: live in RISE' : 'Optional voice, your own reading read aloud: paid launch pending verification', href: '/plus/' }],
      ['Source', { label: 'github.com/SyberLabs/RISE', href: 'https://github.com/SyberLabs/RISE' }],
    ],
  },
  {
    slug: 'flyspace', number: '04', name: 'FLYSPACE', category: 'Visual data workspace', accent: '#0297de',
    reflects: 'SyberLabs/Flyspace@e95ae73 · verified 2026-10-05',
    pageTitle: 'FLYSPACE: Connect Data Sources to AI Assistants',
    headline: 'See the sources behind an answer.',
    intro: 'A visual workspace where you connect data sources to AI assistants and see which sources feed each answer. AI answers require running FLYSPACE locally with your own model, for example through Ollama. Formerly OmniOS.',
    summary: 'A limited public preview is live at omni.syberlabs.io: the canvas, the Shell Store and every keyless public data source run in your browser. AI answers and keyed sources are switched off there.',
    status: { kind: 'live', label: 'Live preview' },
    primary: { label: 'Open the preview', href: OMNI_PREVIEW },
    secondary: { label: 'Discuss a pilot', href: CONSULT },
    ghost: { label: 'Run it locally', href: 'https://github.com/SyberLabs/Flyspace#run' },
    live: { href: OMNI_PREVIEW, label: 'omni.syberlabs.io', note: 'The preview runs at omni.syberlabs.io. Your canvas stays in your browser.' },
    video: { src: '/omni-demo/omnios-morning-20261005.mp4', poster: '/omni-demo/omnios-morning-20261005-poster.jpg', title: 'The morning: one question, cited sources, a crystal, a second persona',
      caption: 'Recorded on 2026-10-05 from a local production build of OmniOS@e95ae73, following the “morning” journey specified by its acceptance test. The blocks and two AI answers use fixed test data, not live markets or a live model. The canvas, connections, source labels and answer history are the real interface. Silent, 30 seconds.' },
    why: { title: 'Why a canvas.',
      paragraphs: [
        'FLYSPACE shows which data an AI assistant receives. A canvas displays the sources, their connections and whether they supplied any data.',
        'Each answer records the source data used to produce it, including data passed through other AI assistants. Sources that supplied no data are not cited.',
      ] },
    use: { title: 'What you can do in the preview', note: 'The first three steps work in the public preview. AI questions and voice controls require a local setup with a model connection.',
      steps: [
        ['01 / Shell', 'Open a saved workspace', 'The Shell Store opens saved workspaces. The Investor workspace connects Polymarket, CoinGecko, World Bank and Hacker News to an Analyst assistant, then connects that assistant to a Strategist.'],
        ['02 / Blocks', 'Pull real numbers', 'Add blocks for prediction markets, crypto prices, economic series, research and news. Every built-in source is public and needs no key.'],
        ['03 / Wires', 'Say what feeds what', 'Connect a data block to an AI assistant. FLYSPACE checks that their input and output formats match. If they do not, it explains the mismatch and leaves the workspace unchanged.'],
        ['04 / Ask', 'Ask with your own model', 'Ask an assistant a question. Its answer cites only the sources connected to it. A record identifies the model provider, model, response time and source data used.'],
        ['05 / Talk', 'Spoken canvas control', 'Hold Talk and use a supported command such as “wire hacker news to the analyst”, “delete this” or “undo”. The app checks the request, previews deletion and asks for clearer names when a request is ambiguous.'],
      ] },
    map: { id: 'omnios', title: 'Which sources reach an answer.',
      note: 'The Investor shell, stepped through by rule: a feed fails, a feed goes stale, and the record says exactly which sources each answer used. Open any node to see who owns it.',
      fallback: 'This map needs JavaScript.' },
    design: { title: 'How it is built',
      items: [
        ['Sources, connections and assistants', 'A block shows one data source. A wire connects it only after the app checks that connection. An AI assistant, called a persona in the app, answers using its active incoming connections and cannot select its own inputs.'],
        ['Check data formats before connecting', 'The app checks declared input and output formats when you create a connection. A mismatch is refused unless you choose a text-only conversion. Blocks without declared formats can still connect without that check.'],
        ['Record how each answer was made', 'An optional PostgreSQL database records each model request and the exact source data used. It also records answers passed between assistants, so you can trace them after source data changes. The canvas stays in browser storage (IndexedDB) and works without a server.'],
        ['Review tools before allowing changes', 'Tool descriptions become a list of available actions, called a capability manifest. It can be built from OpenAPI documents, MCP tool schemas or a structured description and registered with one function. Actions that write or delete data require approval; the list cannot grant itself permission. Unique request keys prevent duplicates, and uncertain results remain marked uncertain.'],
        ['Keys stay server-side', 'Model-provider keys are read from the server environment and never sent to the browser. Automated builds substitute detectable test values for secrets and fail if any value appears in browser code.'],
        ['Limits of the public preview', 'The public preview disables paid model requests, sources requiring keys and access to the model-request history at the server routes. The setup checklist is published with the code.'],
      ] },
    evidence: [
      ['deployed', 'The limited public preview has run at omni.syberlabs.io since 2026-10-03, deployed by hand from a recorded commit on Cloudflare Workers.'],
      ['tested', 'Unit tests across the stores, services and capability engine, and six Playwright specs including the “morning” golden path: shell → question → cited sources → crystal → second persona.'],
      ['implemented', 'The capability compiler and the server-side broker are implemented and hardened against fixtures and stubbed transports.'],
      ['not yet', 'No third-party API or MCP server has been measured in production use. Speech is tested with typed transcripts; there is no live microphone measurement. The hosted identity boundary exists in code with no provisioned issuer.'],
    ],
    facts: [
      ['Stage', 'Local-first, single-user app with a limited public preview'],
      ['Formerly', 'OmniOS, renamed in October 2026; the preview address, omni.syberlabs.io, keeps the old name for now'],
      ['Technology', 'TypeScript, Next.js, React, Zustand, IndexedDB, PostgreSQL (optional), Tailwind CSS, Vitest, Playwright, Cloudflare Workers'],
      ['AI models', 'Anthropic Claude, Google Gemini, and local models through Ollama; optional Kev persona suggestions'],
      ['Data sources', 'Polymarket, CoinGecko, Hacker News, World Bank, OpenAlex, Metaculus, NewsAPI (keyed)'],
      ['License', 'No license file yet; the repository is public'],
      ['Source', { label: 'github.com/SyberLabs/Flyspace', href: 'https://github.com/SyberLabs/Flyspace' }],
    ],
  },
];

// The Menu (the Atlas): every product, the company's ways of working with customers, and the account and legal routes.
export const siteMap = [
  { title: 'Products', items: [
    { label: 'SyberWork', note: 'The autonomous software factory', href: '/projects/syberwork/' },
    { label: 'Attest', note: 'Prove every promise your docs make', href: '/projects/attest/' },
    { label: 'RISE', note: 'Interactive reading with sound and visuals', href: '/projects/rise/' },
    { label: 'FLYSPACE', note: 'See which data feeds each AI answer', href: '/projects/flyspace/' },
  ] },
  { title: 'Company', items: [
    { label: 'Consulting and partnerships', note: 'Custom AI systems, built and checked', href: '/services/' },
    { label: 'The factory', note: 'Agents build, the host checks, a person admits', href: '/factory/' },
    { label: 'Research', note: 'Reports, evaluations and their evidence', href: '/research/' },
    { label: 'Email', note: EMAIL, href: CONTACT },
  ] },
  { title: 'Account', items: [
    { label: 'Subscriber account', note: 'Existing RISE subscribers', href: RISE_PLUS.href, external: true },
    { label: 'Privacy', note: 'Data and contact policy', href: '/privacy/' },
  ] },
];

export const skills = ['Python', 'TypeScript', 'JavaScript', 'SQL', 'React', 'Next.js', 'FastAPI', 'PostgreSQL', 'SQLite', 'Redis', 'Cloudflare Workers', 'LightGBM', 'scikit-learn', 'pandas', 'NumPy', 'LLM applications', 'AI agents', 'pytest', 'Vitest', 'Playwright'];
