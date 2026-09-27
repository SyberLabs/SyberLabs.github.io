import { mountProcedural } from './procedural.js';

const projects = {
  rise: {
    number: '01', name: 'RISE', category: 'Audiovisual reader', accent: '#a68bff',
    headline: 'Read beyond the page.',
    intro: 'Shape the timing, space, image, and sound around a text.',
    status: 'Live browser app · interactive sample',
    actions: [['Try interactive sample ↗', 'https://rise.syberlabs.io/jev-scene-demo'], ['Open RISE ↗', 'https://rise.syberlabs.io/'], ['Watch captured demo ↗', '/rise-demo/']],
  },
  commons: {
    number: '02', name: 'Commons', category: 'Mission coordination', accent: '#adf19b',
    headline: 'Turn a need into a mission.',
    intro: 'Keep the plan, evidence, review, and outcome together.',
    status: 'Local Phase 0 prototype · private repository',
    actions: [['Explore Commons ↗', '/commons/']],
  },
  relay: {
    number: '03', name: 'Relay', category: 'Application workspace', accent: '#64e0da',
    headline: 'Every application has a history.',
    intro: 'Keep the job, research, draft, and exact approval connected.',
    status: 'Early release · source available',
    actions: [['See the work ↗', '/#work'], ['View source ↗', 'https://github.com/SyberLabs/relay']],
  },
  omnios: {
    number: '04', name: 'OmniOS', category: 'Spatial AI workspace', accent: '#ef91d4',
    headline: 'See the sources behind an answer.',
    intro: 'Connect sources to a question and trace the result.',
    status: 'Local-first, single-user research project',
    actions: [['See the work ↗', '/#work'], ['View source ↗', 'https://github.com/SyberLabs/OmniOS']],
  },
  osahr: {
    number: '05', name: 'OSAHR', category: 'Simulation research', accent: '#f0c487',
    headline: 'Replay a changing system.',
    intro: 'Run graph rules and inspect the events they produce.',
    status: 'Open research kernel · Python 3.11+',
    actions: [['See the work ↗', '/#work'], ['View source ↗', 'https://github.com/SyberLabs/OSAHR_Cell']],
  },
};

const slug = location.pathname.split('/').filter(Boolean).at(-1);
  const p = projects[slug];
if (!p) location.replace('/');
else {
  document.title = `${p.name} — SyberLabs`;
  document.body.classList.add(`page-${slug}`);
  document.documentElement.style.setProperty('--accent', p.accent);
  document.querySelector('meta[name="description"]').content = p.intro;
  const art = {
    rise: `<div class="rise-portal-art"><div class="rise-art-orbit"></div><div class="rise-art-disc"></div><div class="rise-art-echo"></div><span>TEXT / TIME / SPACE</span></div>`,
    commons: `<div class="mission-space"><div class="mission-line"></div><div class="mission-card m-one"><small>01 / NEED</small><strong>What matters?</strong><span>Define the shared problem</span></div><div class="mission-card m-two"><small>02 / EVIDENCE</small><strong>What do we know?</strong><span>Make the basis visible</span></div><div class="mission-card m-three"><small>03 / REVIEW</small><strong>Who approves?</strong><span>Human direction on record</span></div><div class="mission-card m-four"><small>04 / OUTCOME</small><strong>What changed?</strong><span>Carry the learning forward</span></div></div>`,
    relay: `<div class="relay-space"><div class="relay-document doc-back"><small>JOB / 014</small><b>Research</b><span>Posting · Notes · Facts</span></div><div class="relay-document doc-middle"><small>VERSION 03</small><b>Draft</b><span>Prepared for review</span></div><div class="relay-document doc-front"><small>HUMAN REVIEW</small><b>Exact wording</b><span class="relay-accepted">✓ Accepted for this job</span></div><div class="relay-thread"></div></div>`,
    omnios: `<div class="omni-space"><svg viewBox="0 0 600 520" aria-hidden="true"><path d="M127 129 C240 130 210 256 338 258 M138 396 C245 400 220 290 338 258 M338 258 C445 235 445 354 513 360"/></svg><div class="omni-node data-one"><small>DATA BLOCK</small><strong>World Bank</strong><span>Economic series</span></div><div class="omni-node data-two"><small>DATA BLOCK</small><strong>Markets</strong><span>Live signal</span></div><div class="omni-node persona"><small>PERSONA</small><strong>Investor</strong><span>Context from 2 wires</span></div><div class="omni-node answer"><small>OUTPUT</small><strong>Answer</strong><span>Trace the inputs ↗</span></div></div>`,
    osahr: `<div class="osahr-space"><svg viewBox="0 0 600 520" aria-hidden="true"><path d="M108 123 L285 101 L449 189 L371 368 L167 402 Z M108 123 L371 368 M285 101 L167 402 M449 189 L167 402"/><path class="pulse-path" d="M108 123 L285 101 L449 189 L371 368"/></svg><span class="graph-node n1">A</span><span class="graph-node n2">B</span><span class="graph-node n3">R</span><span class="graph-node n4">C</span><span class="graph-node n5">D</span><div class="rewrite-chip">RULE 03 → EVENT 14</div></div>`,
  }[slug];
  const system = {
    rise: `<div class="system-heading"><p class="eyebrow">INSIDE THE CHAMBER / READING AS A SCORE</p><h2>One text. Different dimensions.</h2><p>RISE separates the words from the way they are presented. Change the reading mode and conditions without changing the source text.</p></div><div class="rise-console"><div class="console-bar"><span>CHAMBER / LOCAL SESSION</span><span>TEXT · TIME · IMAGE · SOUND</span></div><div class="rise-score" data-mode="stream"><div class="score-text"><small>SOURCE / YOUR TEXT</small><strong>Language becomes an environment.</strong><span>Bring a .txt or .md file, or start from the Library.</span></div><div class="score-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="page-surface" aria-hidden="true"><span>Language becomes<br>an environment.</span></div></div><div class="console-options"><article><b>STREAM</b><span>Words arrive through time. Set pacing and playback.</span></article><article><b>PAGE</b><span>Words occupy a spatial surface you can navigate.</span></article><article><b>CONDITIONS</b><span>Tune visual fields and sound around the reading.</span></article></div><div class="product-controls"><span class="control-label">TRY A READING MODE</span><div role="group" aria-label="RISE reading mode"><button class="mode-button is-active" data-rise-mode="stream" aria-pressed="true">Stream</button><button class="mode-button" data-rise-mode="page" aria-pressed="false">Page</button></div><span class="control-readout" aria-live="polite">Stream · words arrive through time.</span></div></div>`,
    commons: `<div class="system-heading"><p class="eyebrow">MISSION OBJECT / HUMAN DIRECTION</p><h2>Make every handoff legible.</h2><p>A mission is a sequence of decisions with named evidence and review. The current prototype demonstrates that path with synthetic examples.</p></div><div class="commons-ledger"><div class="ledger-index"><span>PHASE 0 / SYNTHETIC MISSION</span><strong>Mission record</strong><small>LOCAL PROTOTYPE</small></div><div class="ledger-steps"><article><small>01 / FRAME</small><b>Need + evidence</b><p>State the shared problem and what supports it.</p></article><article><small>02 / PROPOSE</small><b>Draft a plan</b><p>Keep the intended work and milestones in one place.</p></article><article class="review-gate"><small>03 / HUMAN GATE</small><b>Review or request changes</b><p>The seeded reviewer records a decision before the mission proceeds.</p></article><article><small>04 / LEARN</small><b>Outcome + audit</b><p>Inspect the sequence and carry useful patterns forward.</p></article></div></div>`,
    relay: `<div class="system-heading"><p class="eyebrow">APPLICATION RECORD / VERSIONED ACCEPTANCE</p><h2>Every revision has a boundary.</h2><p>A job is the unit of continuity. Research can be reused; acceptance stays tied to exact words for that job and version.</p></div><div class="relay-ledger"><div class="relay-ledger-head"><span>ILLUSTRATIVE JOB RECORD / 014</span><strong>One posting. One history.</strong></div><div class="relay-chain"><div><small>POSTING URL</small><b>Rejoin the existing job</b><p>Matching URLs recover the record and its earlier research.</p></div><div><small>RESEARCH + FACTS</small><b>Carry context forward</b><p>Preserve notes across assistant and editing handoffs.</p></div><div class="relay-gate"><small>EXACT DRAFT / VERSION 03</small><b>Prepared for review</b><p>A changed version needs the person's review and acceptance.</p></div></div><div class="relay-inspector"><div role="group" aria-label="Inspect the Relay application record"><button class="mode-button is-active" data-relay-view="research" aria-pressed="true">Research</button><button class="mode-button" data-relay-view="draft" aria-pressed="false">Draft</button><button class="mode-button" data-relay-view="next" aria-pressed="false">Next action</button></div><p class="control-readout" aria-live="polite">Research stays attached to the job record across handoffs.</p></div><p class="ledger-foot">Relay can prepare and track application materials. It does not submit employer forms.</p></div>`,
    omnios: `<div class="system-heading"><p class="eyebrow">CONTEXT TOPOLOGY / VISIBLE INPUTS</p><h2>The answer has a wiring diagram.</h2><p>Instead of hiding context in a prompt, OmniOS places sources and personas on a canvas. The connection itself says what information can flow.</p></div><div class="omni-board"><div class="omni-source-list"><button class="omni-source is-connected" data-source="world" aria-pressed="true"><small>DATA 01 / CONNECTED</small><b>World Bank</b><span>Economic series</span></button><button class="omni-source is-connected" data-source="market" aria-pressed="true"><small>DATA 02 / CONNECTED</small><b>Market signal</b><span>Prediction context</span></button></div><div class="omni-route" aria-hidden="true"><span></span><span></span></div><div class="omni-persona-card"><small>PERSONA / INVESTOR</small><b>Incoming wires define context</b><span class="omni-context" aria-live="polite">2 visible inputs: economic series + market signal.</span></div><div class="omni-board-note">LOCAL-FIRST CANVAS · SOME SOURCES REQUIRE KEYS OR USE MOCK DATA · SELECT A BLOCK TO TRACE CONTEXT</div></div>`,
    osahr: `<div class="system-heading"><p class="eyebrow">EXPERIMENT TRACE / STOCHASTIC REWRITE</p><h2>From mechanism to inspectable evidence.</h2><p>The kernel operates on a typed directed hypergraph. A scheduler chooses events; replay records let a result be examined under the conditions that produced it.</p></div><div class="osahr-trace"><div class="trace-top"><span>SEEDED EXPERIMENT / ILLUSTRATIVE TRACE</span><span>GRAPH → RULE → EVENT → REPLAY</span></div><div class="trace-events" data-step="0"><article><small>STATE 00</small><b>Typed graph</b><span>Entities and directed relationships</span></article><article><small>RULE 03</small><b>Match + rewrite</b><span>Eligible structure changes</span></article><article><small>EVENT 14</small><b>Scheduler selects</b><span>Stochastic time advances</span></article><article><small>REPLAY</small><b>Frozen packet</b><span>Inspect conditions and outcome</span></article></div><div class="trace-controls"><button class="trace-step" type="button">Advance illustrative trace <span aria-hidden="true">↗</span></button><span class="trace-step-label" aria-live="polite">Current focus: typed graph.</span></div><div class="trace-footer">Research mechanism · illustrative UI sequence, not a kernel run or calibrated prediction</div></div>`,
  }[slug];
  document.getElementById('app').innerHTML = `
    <header class="syber-header">
  <a class="syber-wordmark" href="/" aria-label="SyberLabs home"><img src="/favicon-blue-32x32.png" alt=""><span>SYBERLABS</span></a>
  <nav class="syber-nav" aria-label="Main navigation"><a href="/#work">Work</a><a href="/#system">System</a></nav>
  <div class="syber-actions"><a class="syber-contact" href="mailto:syberlabs.software@gmail.com">Get in touch <span aria-hidden="true">↗</span></a><details class="syber-mobile-menu"><summary>Menu</summary><nav aria-label="Mobile navigation"><a href="/#work">Work</a><a href="/#system">System</a><a href="mailto:syberlabs.software@gmail.com">Contact</a></nav></details></div>
</header>
    <main><section class="hero" id="overview"><canvas class="procedural-field" aria-hidden="true"></canvas><div class="hero-copy"><p class="eyebrow">SYBERLABS / ${p.number} / ${p.category}</p><h1>${p.headline}</h1><p class="intro">${p.intro}</p><div class="actions">${p.actions.map(([label, url]) => `<a href="${url}">${label}</a>`).join('')}</div><p class="status"><span></span>${p.status}</p></div><div class="product-art art-${slug}" aria-label="Illustration of ${p.name} product concept" role="img">${art}</div></section>
    <section class="product-system" id="mechanics">${system}</section>
  </main>
    <footer class="syber-footer"><a href="/">SYBERLABS</a><a href="/#work">Explore all projects ↗</a><span>© 2026 SyberLabs</span></footer>`;
  const visual = document.querySelector('.product-art');
  mountProcedural(document.querySelector('.procedural-field'), slug);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  visual.addEventListener('pointermove', event => {
    if (reduceMotion.matches) return;
    const rect = visual.getBoundingClientRect();
    visual.style.setProperty('--ry', `${((event.clientX - rect.left) / rect.width - .5) * 14}deg`);
    visual.style.setProperty('--rx', `${((event.clientY - rect.top) / rect.height - .5) * -11}deg`);
  });
  visual.addEventListener('pointerleave', () => {
    visual.style.removeProperty('--ry'); visual.style.removeProperty('--rx');
  });

  document.querySelectorAll('[data-rise-mode]').forEach(button => button.addEventListener('click', () => {
    const pageMode = button.dataset.riseMode === 'page';
    document.querySelector('.rise-score').dataset.mode = pageMode ? 'page' : 'stream';
    document.querySelectorAll('[data-rise-mode]').forEach(item => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    document.querySelector('.rise-console .control-readout').textContent = pageMode
      ? 'Page · the same words settle onto a surface you can move through.'
      : 'Stream · words arrive through time.';
  }));

  const relayCopy = {
    research: 'Research remains attached to this job as you move between tools.',
    draft: 'Version 03 is prepared for review. A change in wording calls for fresh human acceptance.',
    next: 'Next action: the applicant reviews the exact draft. Relay does not submit it.'
  };
  document.querySelectorAll('[data-relay-view]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-relay-view]').forEach(item => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    document.querySelector('.relay-inspector .control-readout').textContent = relayCopy[button.dataset.relayView];
  }));

  const connectedSources = new Set(['world', 'market']);
  document.querySelectorAll('[data-source]').forEach(button => button.addEventListener('click', () => {
    const source = button.dataset.source;
    if (connectedSources.has(source)) connectedSources.delete(source);
    else connectedSources.add(source);
    const connected = connectedSources.has(source);
    button.classList.toggle('is-connected', connected);
    button.setAttribute('aria-pressed', String(connected));
    button.querySelector('small').textContent = `DATA ${source === 'world' ? '01' : '02'} / ${connected ? 'CONNECTED' : 'DISCONNECTED'}`;
    const inputs = [...connectedSources].map(id => id === 'world' ? 'economic series' : 'market signal');
    document.querySelector('.omni-context').textContent = inputs.length
      ? `${inputs.length} visible input${inputs.length === 1 ? '' : 's'}: ${inputs.join(' + ')}.`
      : 'No connected inputs. The persona has no source context in this illustration.';
    document.querySelector('.omni-board').classList.toggle('has-no-inputs', inputs.length === 0);
  }));

  const traceLabels = ['typed graph', 'rule match', 'scheduled event', 'replay packet'];
  const trace = document.querySelector('.trace-events');
  document.querySelector('.trace-step')?.addEventListener('click', () => {
    const step = (Number(trace.dataset.step) + 1) % traceLabels.length;
    trace.dataset.step = String(step);
    document.querySelector('.trace-step-label').textContent = `Current focus: ${traceLabels[step]}.`;
  });
}
