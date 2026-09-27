const projects = {
  rise: {
    number: '01', name: 'RISE', category: 'Audiovisual reader', accent: '#a68bff',
    headline: 'A text can become an experience.',
    intro: 'Read in time, move through a spatial page, and tune image and sound around the words. RISE turns reading into an instrument you control.',
    status: 'Live browser app · sign-in required',
    actions: [['Enter RISE ↗', 'https://rise.syberlabs.io/'], ['Watch the demo ↗', '/rise-demo/']],
    scene: 'rise',
    premise: 'Reading is more than scrolling.',
    featureHeading: 'Tune the Chamber.', flowHeading: 'Build a reading experience.',
    premiseText: 'The Chamber combines text, time, image, and sound. Bring a text or enter through the Library, then choose how it unfolds.',
    features: [
      ['01 / STREAM', 'Read through time', 'Set the pace and let words arrive unit by unit. Punctuation and phrasing shape the rhythm.'],
      ['02 / PAGE', 'See the text in space', 'Move to a spatial reading surface without abandoning the work you are reading.'],
      ['03 / CHAMBER', 'Tune the conditions', 'Combine the reading with visual fields and sound while keeping playback under your control.'],
    ],
    flow: ['Bring text or open the Library', 'Choose Stream or Page', 'Tune pace, image, and sound'],
    note: 'Text presentation and pacing run in the browser. The Chamber does not require a remote model decision or provider key.',
  },
  commons: {
    number: '02', name: 'Commons', category: 'Mission coordination', accent: '#adf19b',
    headline: 'Move a shared mission from need to outcome.',
    intro: 'Commons gives a human-directed mission a visible path: evidence, an approved plan, people and resources, execution, review, and an outcome others can learn from.',
    status: 'Local Phase 0 prototype · private repository',
    actions: [['Open private repository ↗', 'https://github.com/SyberLabs/commons']],
    scene: 'commons',
    premise: 'A mission needs a record, not another chat.',
    featureHeading: 'Give the mission structure.', flowHeading: 'Keep review in the loop.',
    premiseText: 'The prototype makes the handoffs explicit. A draft can be submitted for review, changed by a seeded reviewer, and inspected in audit history.',
    features: [
      ['01 / STRUCTURE', 'One mission, one path', 'Capture the need, evidence, plan, milestones, and outcome in a coherent workspace.'],
      ['02 / REVIEW', 'Human direction stays visible', 'A reviewer can request changes before a mission proceeds. The decision is part of the record.'],
      ['03 / REUSE', 'Learn from completed work', 'Turn an outcome into a reusable template instead of starting every effort from scratch.'],
    ],
    flow: ['Draft the mission', 'Submit for review', 'Inspect changes and history'],
    note: 'Phase 0 is a local demonstration using synthetic missions. It has no real authentication, funding, AI calls, chain transactions, or participant data.',
  },
  relay: {
    number: '03', name: 'Relay', category: 'Application workspace', accent: '#64e0da',
    headline: 'Your application history should survive every handoff.',
    intro: 'Relay keeps the job, research, facts, reviewed words, and next action together while you work across the assistants you already use.',
    status: 'Early release · source available',
    actions: [['Explore source ↗', 'https://github.com/SyberLabs/relay']],
    scene: 'relay',
    premise: 'The decision belongs to the person applying.',
    featureHeading: 'Make continuity a feature.', flowHeading: 'From posting to approved words.',
    premiseText: 'Research can change. A draft can be revised. Relay keeps the record of what was accepted for a particular job and version.',
    features: [
      ['01 / HISTORY', 'One record per job', 'Matching posting URLs rejoin earlier research without resetting status or accepted drafts.'],
      ['02 / WORDING', 'Accept exact text', 'A person reviews specific wording. Changing it requires review again.'],
      ['03 / HANDOFF', 'Carry context forward', 'Bring research and drafts from other tools into a version-bound workspace for human review.'],
    ],
    flow: ['Capture the job', 'Review evidence and draft', 'Accept exact wording'],
    note: 'Relay does not submit employer forms, verify every claim, or treat a staged draft as accepted. Human review remains the gate.',
  },
  omnios: {
    number: '04', name: 'OmniOS', category: 'Spatial AI workspace', accent: '#ef91d4',
    headline: 'See what an AI mind actually knows.',
    intro: 'Put live data blocks on a canvas, connect them to a persona, and ask a question. The answer has a visible path back to the wires that carried its context.',
    status: 'Local-first, single-user research project',
    actions: [['Explore source ↗', 'https://github.com/SyberLabs/OmniOS']],
    scene: 'omnios',
    premise: 'Context should be inspectable.',
    featureHeading: 'Build a visible mind.', flowHeading: 'See the path to an answer.',
    premiseText: 'A block shows a source. A wire says what feeds what. A persona receives exactly what its incoming wires carry.',
    features: [
      ['01 / BLOCKS', 'Bring in live signals', 'Arrange prediction markets, economic series, crypto, news, and research on one canvas.'],
      ['02 / WIRES', 'Make context explicit', 'Connect source blocks to personas so the inputs behind an answer stay visible.'],
      ['03 / SHELLS', 'Start from a working canvas', 'Saved shells can open with blocks and connections already in place.'],
    ],
    flow: ['Place source blocks', 'Wire a persona', 'Ask with visible context'],
    note: 'The canvas lives in the user’s browser. The project is local-first and has no application authentication for a public hosted instance.',
  },
  osahr: {
    number: '05', name: 'OSAHR', category: 'Simulation research', accent: '#f0c487',
    headline: 'Watch a system rewrite itself.',
    intro: 'OSAHR is a stochastic adaptive graph-rewrite kernel. It models typed relationships, chooses events in time, adapts parameters, and preserves a replayable record.',
    status: 'Open research kernel · Python 3.11+',
    actions: [['Explore source ↗', 'https://github.com/SyberLabs/OSAHR_Cell']],
    scene: 'osahr',
    premise: 'Mechanism first. Claims second.',
    featureHeading: 'Model, run, examine.', flowHeading: 'From rule to replay.',
    premiseText: 'Rules act on a typed directed hypergraph. Schedulers choose stochastic events; workbench packets let a result be reviewed and replayed.',
    features: [
      ['01 / GRAPH', 'Model structured relationships', 'Typed hypergraphs define the entities and connections that a rule may rewrite.'],
      ['02 / TIME', 'Let events compete', 'Three stochastic schedulers advance the model while adaptive parameters can change its behavior.'],
      ['03 / EVIDENCE', 'Replay the decision', 'Frozen experiment artifacts and decision packets keep claims tied to their conditions.'],
    ],
    flow: ['Define graph and rules', 'Run stochastic events', 'Review and replay evidence'],
    note: 'These experiments explore mechanism. They are not calibrated deployments or a replacement for a production simulation twin.',
  },
};

const slug = location.pathname.split('/').filter(Boolean).at(-1);
const p = projects[slug];
if (!p) location.replace('/');
else {
  document.title = `${p.name} — SyberLabs`;
  document.documentElement.style.setProperty('--accent', p.accent);
  document.querySelector('meta[name="description"]').content = p.intro;
  const art = {
    rise: `<div class="reading-space"><div class="reading-sheet sheet-back">READING / SPACE</div><div class="reading-sheet sheet-front"><span>01 : STREAM</span><div class="reading-lines"><b>Language</b><b>can move</b><b>through time.</b></div><i>TEXT · TIME · IMAGE · SOUND</i></div><div class="reading-playhead"></div></div>`,
    commons: `<div class="mission-space"><div class="mission-line"></div><div class="mission-card m-one"><small>01 / NEED</small><strong>What matters?</strong><span>Define the shared problem</span></div><div class="mission-card m-two"><small>02 / EVIDENCE</small><strong>What do we know?</strong><span>Make the basis visible</span></div><div class="mission-card m-three"><small>03 / REVIEW</small><strong>Who approves?</strong><span>Human direction on record</span></div><div class="mission-card m-four"><small>04 / OUTCOME</small><strong>What changed?</strong><span>Carry the learning forward</span></div></div>`,
    relay: `<div class="relay-space"><div class="relay-document doc-back"><small>JOB / 014</small><b>Research</b><span>Posting · Notes · Facts</span></div><div class="relay-document doc-middle"><small>VERSION 03</small><b>Draft</b><span>Prepared for review</span></div><div class="relay-document doc-front"><small>HUMAN REVIEW</small><b>Exact wording</b><span class="relay-accepted">✓ Accepted for this job</span></div><div class="relay-thread"></div></div>`,
    omnios: `<div class="omni-space"><svg viewBox="0 0 600 520" aria-hidden="true"><path d="M127 129 C240 130 210 256 338 258 M138 396 C245 400 220 290 338 258 M338 258 C445 235 445 354 513 360"/></svg><div class="omni-node data-one"><small>DATA BLOCK</small><strong>World Bank</strong><span>Economic series</span></div><div class="omni-node data-two"><small>DATA BLOCK</small><strong>Markets</strong><span>Live signal</span></div><div class="omni-node persona"><small>PERSONA</small><strong>Investor</strong><span>Context from 2 wires</span></div><div class="omni-node answer"><small>OUTPUT</small><strong>Answer</strong><span>Trace the inputs ↗</span></div></div>`,
    osahr: `<div class="osahr-space"><svg viewBox="0 0 600 520" aria-hidden="true"><path d="M108 123 L285 101 L449 189 L371 368 L167 402 Z M108 123 L371 368 M285 101 L167 402 M449 189 L167 402"/><path class="pulse-path" d="M108 123 L285 101 L449 189 L371 368"/></svg><span class="graph-node n1">A</span><span class="graph-node n2">B</span><span class="graph-node n3">R</span><span class="graph-node n4">C</span><span class="graph-node n5">D</span><div class="rewrite-chip">RULE 03 → EVENT 14</div></div>`,
  }[slug];
  document.getElementById('app').innerHTML = `
    <header><a class="brand" href="/">◉ SyberLabs</a><nav><a href="/#work">All projects</a><a href="mailto:syberlabs.software@gmail.com">Contact ↗</a></nav></header>
    <main><section class="hero"><div class="hero-copy"><p class="eyebrow">SYBERLABS / ${p.number} / ${p.category}</p><h1>${p.headline}</h1><p class="intro">${p.intro}</p><div class="actions">${p.actions.map(([label, url]) => `<a href="${url}">${label}</a>`).join('')}</div><p class="status"><span></span>${p.status}</p></div><div class="product-art art-${slug}" aria-label="Illustration of ${p.name} product concept" role="img">${art}</div></section>
    <section class="premise"><p class="eyebrow">THE IDEA</p><h2>${p.premise}</h2><p>${p.premiseText}</p></section>
    <section class="features"><div class="section-heading"><p class="eyebrow">INSIDE ${p.name.toUpperCase()}</p><h2>${p.featureHeading}</h2></div><div class="feature-grid">${p.features.map(([label,title,body]) => `<article><small>${label}</small><h3>${title}</h3><p>${body}</p></article>`).join('')}</div></section>
    <section class="flow"><div><p class="eyebrow">THE PATH</p><h2>${p.flowHeading}</h2></div><ol>${p.flow.map(step => `<li>${step}</li>`).join('')}</ol></section>
    <aside class="boundary"><span>WHAT EXISTS TODAY</span><p>${p.note}</p></aside></main>
    <footer><a href="/#work">← Explore the lab</a><span>© 2026 SyberLabs</span></footer>`;
}
