import React from 'react';
import trace from '../../runtime-trace.json';

const step = title => trace.steps.find(s => s.title === title);
const ops = trace.operations;

const nodes = [
  { id: 'caller', type: 'agent', label: 'Caller', sub: 'agent or operator', x: 118, y: 280, m: [200, 76], about: 'Whoever calls the Runtime API: an agent or a person. It can request operations; it cannot write the log directly.', owner: 'Requests operations.', evidence: 'syberruntime.Runtime' },
  { id: 'thread', type: 'record', label: 'Thread', sub: 'Add a billing guard', status: 'hidden', x: 370, y: 90, m: [110, 230], about: 'A unit of work. Opening one appends a ThreadCreate operation.', owner: 'Committed by the kernel.', evidence: 'Runtime.create_thread' },
  { id: 'artifact', type: 'artifact', label: 'billing.py', sub: 'content-addressed', status: 'hidden', x: 610, y: 90, m: [290, 230], about: 'Generated code stored in the blob store by digest. Producing it is an implicit claim that it works.', owner: 'Committed by the kernel.', evidence: 'Runtime.record_feature' },
  { id: 'obligation', n: ['Obligation'], type: 'record', label: 'Floor obligation', sub: 'none', status: 'hidden', x: 610, y: 280, m: [290, 350], about: 'Verification debt = generative mass × blast radius × criticality × accrual rate = 2 × 1.5 × 1 × 1.0 = 3.0. The production profile makes it floor-required, so it blocks stabilization.', owner: 'Opened by accrual; discharged only by a passing check.', evidence: 'DebtLedger · policy profile production' },
  { id: 'verifier', n: ['Verifier', 'text check'], type: 'gate', label: 'Verifier', sub: 'text_contains', x: 370, y: 470, m: [110, 470], about: 'A deterministic check run against the artifact. Its exact payload is recorded, so the oracle stays reconstructable.', owner: 'Kernel code decides pass or fail.', evidence: 'DeterministicVerifier' },
  { id: 'stabilize', n: ['stabilize()'], type: 'gate', label: 'stabilize()', sub: 'fail-closed', x: 850, y: 280, m: [290, 470], about: 'Marks an artifact finished. Refuses with StabilizationBlockedError while any floor obligation for the artifact is open, before appending anything.', owner: 'The kernel. No caller can override it.', evidence: 'runtime.py stabilize' },
  { id: 'log', n: ['Log'], type: 'record', label: 'Operation log', sub: '0 entries', x: 850, y: 470, m: [200, 610], about: 'Append-only operations.jsonl. Each entry stores its own hash and its predecessor’s, so the log is a chain back to the first record.', owner: 'The kernel appends; nothing edits.', evidence: 'operation_log.py' },
];

const edges = [
  { id: 'c-thread', from: 'caller', to: 'thread', label: 'create_thread', about: 'Request to open a thread.' },
  { id: 'c-art', from: 'caller', to: 'artifact', label: 'record_feature', mb: 30, about: 'Request to record generated code.' },
  { id: 'accrue', from: 'artifact', to: 'obligation', label: 'accrues debt', status: 'hidden', about: 'Producing an artifact opens an obligation.' },
  { id: 'c-ver', from: 'caller', to: 'verifier', label: 'record_test', about: 'Request to run a check.' },
  { id: 'discharge', from: 'verifier', to: 'obligation', label: 'discharges', about: 'Only a passing check discharges.' },
  { id: 'c-stab', from: 'caller', to: 'stabilize', label: 'stabilize', bend: 90, mb: -70, about: 'Request to mark the artifact finished.' },
  { id: 'blocks', from: 'obligation', to: 'stabilize', label: 'blocks while open', status: 'hidden', style: 'lineage', about: 'An open floor obligation refuses stabilization.' },
  { id: 'a-log', from: 'stabilize', to: 'log', label: 'appends', transient: true, about: 'A Stabilize operation.' },
  { id: 't-log', from: 'thread', to: 'log', label: 'appends', transient: true, bend: 40, about: 'A ThreadCreate operation.' },
  { id: 'f-log', from: 'artifact', to: 'log', label: 'appends', transient: true, mb: -60, about: 'A Feature operation.' },
  { id: 'v-log', from: 'verifier', to: 'log', label: 'appends', transient: true, about: 'A Test operation, pass or fail.' },
];

const count = n => `${n} ${n === 1 ? 'entry' : 'entries'}`;
const s = trace.steps;
const frames = [
  { title: s[0].title, grade: 'recorded', outcome: `Appended · ${ops[0].type}`, travel: ['c-thread', 't-log'], focus: ['thread', 'log'], set: { thread: 'ok', log: 'ok' }, sub: { log: count(1) }, entries: 1,
    detail: 'A new thread for the intent “Add a billing guard”. Nothing has been claimed, so nothing is owed.', authority: 'Caller requests; the kernel appends.', source: 'Runtime.create_thread' },
  { title: s[1].title, grade: 'recorded', outcome: `Appended · debt ${s[1].residualDebt}`, travel: ['c-art', 'accrue', 'f-log'], focus: ['artifact', 'obligation'], set: { artifact: 'ok', obligation: 'refused' }, edges: { accrue: 'ok', blocks: 'lineage' }, sub: { obligation: `open · debt ${s[1].residualDebt}`, log: count(2) }, entries: 2,
    detail: `billing.py is stored and a Feature is appended. Debt accrues: 2 × 1.5 × 1 × 1.0 = ${s[1].residualDebt}. The production profile sets floor_required, so one blocking obligation opens.`, authority: 'The kernel computes the debt from policy.', source: 'Runtime.record_feature' },
  { title: s[2].title, grade: 'recorded', kind: 'refused', outcome: `${s[2].code} · nothing appended`, travel: ['c-stab'], blocked: ['a-log'], focus: ['stabilize', 'obligation'], set: { stabilize: 'refused' }, entries: 2,
    detail: `“${s[2].result.message.replace(/[0-9a-f]{64}/g, h => `${h.slice(0, 12)}…`)}” The refusal happens before the write.`, authority: 'The kernel refuses. The caller cannot override it.', source: 'runtime.py stabilize' },
  { title: s[3].title, grade: 'recorded', kind: 'flag', outcome: 'Appended · discharged 0', travel: ['c-ver', 'v-log'], blocked: ['discharge'], focus: ['verifier'], set: { verifier: 'flag', stabilize: 'idle' }, sub: { verifier: 'failed: “refund”', log: count(3) }, entries: 3,
    detail: `The check expects “refund”, which the code does not contain: ${s[3].result.details}. The Test is still appended; a failed attempt is part of the history. Debt stays ${s[3].residualDebt}.`, authority: 'The kernel records the result.', source: 'Runtime.record_test' },
  { title: s[4].title, grade: 'recorded', kind: 'refused', outcome: `${s[4].code} · nothing appended`, travel: ['c-stab'], blocked: ['a-log'], focus: ['stabilize', 'obligation'], set: { stabilize: 'refused' }, entries: 3,
    detail: 'Running a check is not passing one. The obligation is still open, so the same call is refused again.', authority: 'The kernel refuses.', source: 'runtime.py stabilize' },
  { title: s[5].title, grade: 'recorded', outcome: `Appended · discharged ${s[5].result.dischargedObligations}`, travel: ['c-ver', 'discharge', 'v-log'], focus: ['verifier', 'obligation'], set: { verifier: 'ok', obligation: 'done', stabilize: 'idle' }, edges: { blocks: 'hidden' }, sub: { verifier: 'passed: “raise ValueError”', obligation: `discharged · debt ${s[5].residualDebt}`, log: count(4) }, entries: 4,
    detail: `The check expects “raise ValueError”, which the code contains: ${s[5].result.details}. The obligation is discharged and residual debt falls to ${s[5].residualDebt}.`, authority: 'The kernel decides pass or fail.', source: 'Runtime.record_test' },
  { title: s[6].title, grade: 'recorded', outcome: `Appended · ${ops[4].type}`, travel: ['c-stab', 'a-log'], focus: ['stabilize', 'log'], set: { stabilize: 'ok' }, sub: { log: count(5) }, entries: 5,
    detail: 'The request refused twice now succeeds, only because the evidence exists. The Stabilize operation’s provenance leads back to the passing Test.', authority: 'Caller requests; the kernel appends.', source: 'runtime.py stabilize' },
  { title: s[7].title, grade: 'recorded', outcome: `replay deterministic: ${s[7].result.replayDeterministic}`, focus: ['log'], entries: 5,
    detail: `A Merkle tree over every entry hash gives root ${s[7].result.merkleRoot.replace(/[^0-9a-f]/g, '')}…. Folding the operation list twice produces identical state.`, authority: 'Read-only.', source: 'merkle_root_hash · replay_is_deterministic' },
];

function Readout({ index }) {
  const shown = ops.slice(0, frames[index].entries);
  return <div className="readout-ledger">
    <span>HASH-CHAINED OPERATION LOG · kernel {trace.kernelCommit} via cross-platform {trace.platformCommit}</span>
    <ol>{shown.map(o => <li key={o.index}><b>{o.index}</b>{o.type}<small>{o.hash}{o.prev ? ` ← ${o.prev}` : ' · genesis'}</small></li>)}</ol>
    <p className="readout-note">Hashes are from this recording; a new run produces a new chain with the same structure.</p>
  </div>;
}

export default {
  id: 'runtime', name: 'SyberRuntime', form: 'Operation log + obligation state', grade: 'recorded',
  summary: 'Generated code creates a debt. The kernel refuses to stabilize it until a passing check discharges that debt, and every step is a hash-chained operation.',
  wide: [960, 540], narrow: [400, 700],
  regions: [
    { id: 'caller', kind: 'external', label: 'CALLER · REQUESTS', at: [18, 18, 200, 504], m: [8, 18, 384, 110] },
    { id: 'kernel', label: 'KERNEL · DECIDES AND APPENDS', at: [236, 18, 706, 504], m: [8, 146, 384, 542] },
  ],
  nodes, edges, frames, Readout,
  evidence: [`${trace.kernel} @ ${trace.kernelCommit}`, `SyberLabs/cross-platform @ ${trace.platformCommit}`, 'scripts/export-runtime-trace.py'],
};
