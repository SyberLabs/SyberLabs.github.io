import React from 'react';

// Rule-based map. The canvas is OmniOS's shipped Investor Shell template
// (src/core/shells/templates.ts). Wire status and context selection reproduce
// src/core/services/wire.service.ts. Which feed fails and which goes stale is
// illustrative, as are run numbers.

const sources = [
  { id: 'polymarket', n: ['Polymarket', 'live odds'], label: 'Polymarket', sub: 'polymarket_live_odds', x: 112, y: 96, m: [72, 96] },
  { id: 'crypto', n: ['CoinGecko', 'crypto prices'], label: 'CoinGecko', sub: 'coingecko_crypto', x: 112, y: 206, m: [200, 96] },
  { id: 'worldbank', n: ['World Bank', 'GDP growth'], label: 'World Bank', sub: 'US GDP growth', x: 112, y: 316, m: [328, 96] },
  { id: 'hn', n: ['Hacker News', 'tech feed'], label: 'Hacker News', sub: 'hackernews_feed', x: 112, y: 426, m: [328, 206] },
];

const nodes = [
  ...sources.map(s => ({ ...s, type: 'artifact', about: 'A data block: a live view of one source. Its data becomes context only through an active wire.', owner: 'The canvas, stored locally in IndexedDB.', evidence: 'Investor Shell · templates.ts' })),
  { id: 'analyst', n: ['Analyst', 'persona'], type: 'agent', label: 'Analyst', sub: 'persona_analyst', x: 440, y: 260, m: [120, 330], about: 'A persona. Its entire context is what its inbound active wires carry.', owner: 'Answers; cannot choose its own inputs.', evidence: 'README, The idea' },
  { id: 'strategist', n: ['Strategist', 'persona'], type: 'agent', label: 'Strategist', sub: 'persona_strategist', x: 700, y: 260, m: [280, 450], about: 'A second persona wired to the Analyst. It receives the Analyst’s last answer, cited by run.', owner: 'Answers; cannot choose its own inputs.', evidence: 'Investor Shell · templates.ts' },
  { id: 'you', n: ['You', 'asks'], type: 'human', label: 'You', sub: 'asks a question', x: 850, y: 96, m: [72, 450], about: 'The person at the keyboard places blocks, draws wires and asks questions.', owner: 'Owns the canvas and every wire.', evidence: 'README' },
  { id: 'runA', n: ['Analyst run'], type: 'record', label: 'Analyst answer', sub: 'not asked yet', x: 440, y: 440, m: [120, 560], about: 'One inference run, with the sources that fed it. With the optional Postgres ledger, it is stored as inference_run and inference_source rows.', owner: 'The server records runs; it held the key and made the call.', evidence: 'INFERENCE_LEDGER.md' },
  { id: 'runS', n: ['Strategist run'], type: 'record', label: 'Strategist answer', sub: 'not asked yet', x: 700, y: 440, m: [280, 640], about: 'Its source is the Analyst’s answer, recorded as kind inference with parentRunId naming that run.', owner: 'The server records runs.', evidence: 'wire.schema.ts ContextSource' },
];

const wireAbout = 'A wire says “this feeds that”, block to block. A wire is an admitted edge: declared ports are checked when it is created, and a mismatch is refused with a sentence naming both ports.';
const edges = [
  ...sources.map((s, i) => ({ id: `w-${s.id}`, from: s.id, to: 'analyst', label: 'wire', bend: [-18, -6, 6, 18][i], about: wireAbout, status: 'ok' })),
  { id: 'w-analyst', from: 'analyst', to: 'strategist', label: 'wire · inference', about: 'Persona to persona. The context carries the Analyst’s last answer and the id of that run.', status: 'ok' },
  { id: 'q1', from: 'you', to: 'analyst', label: 'asks', bend: 40, about: 'A question to one persona.' },
  { id: 'q2', from: 'you', to: 'strategist', label: 'asks', bend: -20, about: 'A question to one persona.' },
  { id: 'a1', from: 'analyst', to: 'runA', label: 'answers', about: 'The run and the sources that reached it.' },
  { id: 'a2', from: 'strategist', to: 'runS', label: 'answers', about: 'The run and the sources that reached it.' },
  { id: 'lin', from: 'runS', to: 'runA', label: 'parentRunId', style: 'lineage', about: 'The lineage edge: which run this answer consumed.', status: 'hidden' },
];

const frames = [
  { title: 'The Investor Shell is placed', grade: 'rule', outcome: '6 blocks, 5 wires', focus: ['analyst'], set: Object.fromEntries(sources.map(s => [s.id, 'ok'])),
    detail: 'The template spawns four data blocks and two personas, already wired: four sources into the Analyst, and the Analyst into the Strategist. Persisted wires are re-admitted on every load, so a wire that would be refused today is dropped rather than trusted.',
    authority: 'You. Blocks and wires stay local to your browser.', source: 'src/core/shells/templates.ts INVESTOR_SHELL' },
  { title: 'The Hacker News fetch fails', grade: 'illustrative', kind: 'refused', outcome: 'Wire status → error', focus: ['hn'], set: { hn: 'error' }, edges: { 'w-hn': 'error' },
    detail: 'When a source block is in error, updateWireStatuses marks its wires error. The wire still exists; it no longer counts as active.',
    authority: 'Wire status is derived by code from the source block.', source: 'wire.service.ts updateWireStatuses' },
  { title: 'World Bank data is over five minutes old', grade: 'illustrative', kind: 'stale', outcome: 'Wire status → stale', focus: ['worldbank'], set: { worldbank: 'stale' }, edges: { 'w-worldbank': 'stale' },
    detail: 'A source with no data, or last updated more than five minutes ago, makes its wire stale.',
    authority: 'Derived by code.', source: 'wire.service.ts updateWireStatuses' },
  { title: 'You ask the Analyst', grade: 'rule', outcome: '2 of 4 wired sources reach the answer', travel: ['q1', 'w-polymarket', 'w-crypto', 'a1'], focus: ['runA', 'polymarket', 'crypto'], set: { analyst: 'ok', runA: 'ok' }, sub: { runA: 'run 1 · 2 sources' },
    detail: 'aggregateWireContext keeps only active wires whose source returns data. Polymarket and CoinGecko reach the answer. World Bank (stale) and Hacker News (error) are wired but excluded.',
    authority: 'Code selects the context. The persona cannot add a source.', source: 'wire.service.ts aggregateWireContext' },
  { title: 'You ask the Strategist', grade: 'rule', outcome: 'Context: the Analyst’s run 1', travel: ['q2', 'w-analyst', 'a2'], focus: ['runS'], set: { strategist: 'ok', runS: 'ok' }, sub: { runS: 'run 2 · parent run 1' },
    detail: 'The Strategist’s only inbound wire comes from the Analyst. Its source is recorded as kind inference, citing the run whose answer it consumed, not just the block.',
    authority: 'Code selects the context.', source: 'wire.service.ts sourceKindFor, lastPersonaAnswer' },
  { title: 'Walk the lineage', grade: 'rule', outcome: 'run 2 → run 1 → 2 sources', travel: ['lin'], focus: ['runS', 'runA', 'polymarket', 'crypto'], edges: { lin: 'lineage' },
    detail: 'The Strategist’s answer depends on run 1, which depends on Polymarket and CoinGecko, and on nothing else on the canvas. With DATABASE_URL set, GET /api/inference-runs/:id/lineage walks this recursively; without it the ledger is off and the canvas shows one hop.',
    authority: 'Read-only.', source: 'INFERENCE_LEDGER.md · lineage route' },
  { title: 'Hacker News recovers', grade: 'illustrative', outcome: 'Wire status → active', focus: ['hn'], set: { hn: 'ok' }, edges: { 'w-hn': 'ok', lin: 'hidden' },
    detail: 'Once the block has data again, the next status pass sets the wire active.',
    authority: 'Derived by code.', source: 'wire.service.ts updateWireStatuses' },
  { title: 'You ask the Analyst again', grade: 'rule', outcome: '3 of 4 sources reach the answer', travel: ['q1', 'w-polymarket', 'w-crypto', 'w-hn', 'a1'], focus: ['runA', 'hn'], sub: { runA: 'run 3 · 3 sources' },
    detail: 'The same question now has a different context. The answer changed because the wires changed, and the record says which ones.',
    authority: 'Code selects the context.', source: 'wire.service.ts aggregateWireContext' },
];

const reach = [
  [], [], [], ['Polymarket', 'CoinGecko'], ['Polymarket', 'CoinGecko'], ['Polymarket', 'CoinGecko'], ['Polymarket', 'CoinGecko'], ['Polymarket', 'CoinGecko', 'Hacker News'],
];
const excluded = [[], ['Hacker News · error'], ['Hacker News · error', 'World Bank · stale'], ['Hacker News · error', 'World Bank · stale'], ['Hacker News · error', 'World Bank · stale'], ['Hacker News · error', 'World Bank · stale'], ['World Bank · stale'], ['World Bank · stale']];

function Readout({ index }) {
  return <div className="readout-grid">
    <div><span>REACHED THE ANALYST’S LAST ANSWER</span>{reach[index].length ? reach[index].map(r => <p key={r}>{r}</p>) : <p className="is-empty">No question asked yet.</p>}</div>
    <div><span>WIRED BUT EXCLUDED</span>{excluded[index].length ? excluded[index].map(r => <p key={r}>{r}</p>) : <p className="is-empty">None.</p>}</div>
    <div><span>RULE</span><p>status === 'active' and the source returns data</p></div>
    <div><span>BASIS</span><p>Rules from SyberLabs/Flyspace @ e95ae73 (wire status and context selection unchanged since 955a6ad). Feed failures and run numbers are illustrative.</p></div>
  </div>;
}

export default {
  id: 'omnios', name: 'FLYSPACE', form: 'Directed context graph', grade: 'rule',
  summary: 'Blocks, wires and personas on a canvas. Only active wires with data reach an answer, and the answer records which ones did.',
  wide: [960, 540], narrow: [400, 700],
  regions: [
    { id: 'canvas', label: 'CANVAS · LOCAL TO THE BROWSER', at: [18, 18, 924, 504], m: [8, 18, 384, 672] },
  ],
  nodes, edges, frames, Readout,
  evidence: ['SyberLabs/Flyspace @ e95ae73', 'src/core/services/wire.service.ts', 'src/core/stores/wireStore.ts admitWire', 'src/core/shells/templates.ts'],
};
