import React from 'react';
import trace from '../../barn-trace.json';

const ev = seq => trace.events.find(e => e.seq === seq);
const refused = code => trace.refusals.find(r => r.code === code);
const caps = role => trace.agents.find(a => a.role === role).capabilities;

const nodes = [
  { id: 'chief', type: 'agent', label: 'Chief', sub: 'first agent', x: 150, y: 86, m: [110, 80], about: 'The run’s first agent. It proposes work and specialists and later verifies the specialist’s artifact.', owner: 'Proposes typed commands. Cannot write state.', evidence: 'barn/src/barn/demo.py' },
  { id: 'spec', n: ['Specialist'], type: 'agent', label: 'CRDT Specialist', sub: 'spawned for a gap', status: 'hidden', x: 150, y: 414, m: [290, 80], about: 'Exists only because unresolved work required the crdt capability. It retires when that work is resolved.', owner: 'Proposes typed commands. Cannot write state.', evidence: 'engine.py request_specialist' },
  { id: 'cmd', n: ['Command'], type: 'artifact', label: 'Typed command', sub: 'create_run', x: 150, y: 250, m: [200, 186], about: 'Agents act only through typed commands with idempotent command ids. A command is a proposal until the engine commits it.', owner: 'Issued by an agent.', evidence: 'barn/src/barn/api.py' },
  { id: 'engine', type: 'gate', label: 'BarnEngine', sub: 'the only writer', x: 440, y: 196, m: [110, 300], about: 'The deterministic transition engine. It licenses, rejects or refuses each command, and only licensed commands append events. No model call mutates state.', owner: 'Decides every mutation.', evidence: 'barn/src/barn/engine.py' },
  { id: 'goal', type: 'record', label: 'Goal', sub: 'collaborative editor', x: 668, y: 72, m: [110, 494], about: trace.goal, owner: 'Committed state.', evidence: 'RunState.work_items' },
  { id: 'sync', n: ['Sync'], type: 'record', label: 'Realtime sync', sub: 'ready', status: 'hidden', x: 698, y: 160, m: [290, 494], about: 'Implement realtime synchronization. Requires the sync capability, which no agent in this run holds, so it stays ready.', owner: 'Committed state.', evidence: 'RunState.work_items' },
  { id: 'conflict', n: ['Conflict'], type: 'record', label: 'Conflict strategy', sub: 'ready', status: 'hidden', x: 728, y: 248, m: [110, 604], about: 'Choose conflict-resolution strategy. Requires crdt and independent verification.', owner: 'Committed state.', evidence: 'RunState.work_items' },
  { id: 'artifact', n: ['Artifact'], type: 'artifact', label: 'Design artifact', sub: 'crdt-strategy.md', status: 'hidden', x: 728, y: 336, m: [290, 604], about: 'A durable artifact. Work cannot resolve without one.', owner: 'Committed state.', evidence: 'engine.py submit_artifact' },
  { id: 'verify', n: ['Verification', 'Chief · passed'], type: 'record', label: 'Verification', sub: 'by Chief · passed', status: 'hidden', x: 728, y: 424, m: [200, 700], about: ev(7).payload.evidence, owner: 'Committed state. The verifier must not be the producer.', evidence: 'engine.py record_verification' },
];

const edges = [
  { id: 'cmd-e', from: 'cmd', to: 'engine', label: 'proposes', about: 'Every change starts as a command.' },
  { id: 'chief-c', from: 'chief', to: 'cmd', label: 'issues', about: 'The Chief issues a command.' },
  { id: 'spec-c', from: 'spec', to: 'cmd', label: 'issues', about: 'The specialist issues a command.' },
  { id: 'e-goal', from: 'engine', to: 'goal', label: 'commits', about: 'An appended event.' },
  { id: 'e-sync', from: 'engine', to: 'sync', label: 'commits', about: 'An appended event.' },
  { id: 'e-conf', from: 'engine', to: 'conflict', label: 'commits', about: 'An appended event.' },
  { id: 'e-spec', from: 'engine', to: 'spec', label: 'licenses', bend: -20, about: 'A specialist decision: spawned, reused or rejected.' },
  { id: 'e-art', from: 'engine', to: 'artifact', label: 'commits', about: 'An appended event.' },
  { id: 'e-ver', from: 'engine', to: 'verify', label: 'commits', about: 'An appended event.' },
  { id: 'goal-sync', from: 'goal', to: 'sync', label: 'parent of', style: 'lineage', bend: 12, about: 'Work decomposition.' },
  { id: 'sync-conf', from: 'sync', to: 'conflict', label: 'parent of', style: 'lineage', bend: 12, about: 'Work decomposition.' },
  { id: 'conf-spec', from: 'conflict', to: 'spec', label: 'spawned because', bend: 30, mb: -40, transient: 'narrow', style: 'lineage', about: 'The causal reason this agent exists.' },
];

const commit = (seq, rest) => ({ grade: 'recorded', seq, source: `BarnEvent ${seq} · ${ev(seq).type}`, decision: ['COMMITTED', ev(seq).type, 'commit'], ...rest });

const frames = [
  commit(1, { title: 'Create the run', outcome: 'Event 1 · run.created', travel: ['chief-c', 'cmd-e', 'e-goal'], focus: ['goal'], set: { goal: 'ok', chief: 'ok' }, sub: { cmd: 'create_run' },
    detail: `The run starts with a goal and a budget of ${trace.maxActiveAgents} active agents. The Chief is created with it: “${trace.goal}.”`, authority: 'Chief proposes; the engine commits.' }),
  commit(2, { title: 'Add work: realtime sync', outcome: 'Event 2 · work.created', travel: ['chief-c', 'cmd-e', 'e-sync'], focus: ['sync'], set: { sync: 'ok' }, edges: { 'goal-sync': 'lineage' }, sub: { cmd: 'add_work' },
    detail: 'A child work item that requires the sync capability. No agent holds sync, and the demo never requests one, so the gap stays open and the item stays ready.', authority: 'Chief proposes; the engine commits.' }),
  commit(3, { title: 'Add work: conflict strategy', outcome: 'Event 3 · work.created', travel: ['chief-c', 'cmd-e', 'e-conf'], focus: ['conflict'], set: { conflict: 'ok' }, edges: { 'sync-conf': 'lineage' }, sub: { cmd: 'add_work' },
    detail: 'Realtime sync exposed a convergence question. This item requires crdt, which no active agent holds (the coral gap), and it requires independent verification.', authority: 'Chief proposes; the engine commits.' }),
  commit(4, { title: 'A capability gap licenses a specialist', outcome: `Event 4 · ${ev(4).payload.decision.outcome}`, decision: ['LICENSED', ev(4).payload.decision.reason, 'license'], travel: ['chief-c', 'cmd-e', 'e-spec'], focus: ['spec', 'conflict'], set: { spec: 'ok' }, edges: { 'conf-spec': 'lineage' }, sub: { cmd: 'request_specialist' },
    detail: `Decision: ${ev(4).payload.decision.outcome}, reason ${ev(4).payload.decision.reason}. Unresolved work requires crdt, no active agent has it, and the budget allows another agent. The gap closes.`, authority: 'The engine decides whether a specialist may exist.' }),
  commit(5, { title: 'A request for a capability the work does not need', kind: 'recorded-refusal', outcome: `Event 5 · ${ev(5).payload.decision.outcome}`, decision: ['REJECTED', ev(5).payload.decision.reason, 'reject'], travel: ['chief-c', 'cmd-e'], blocked: ['e-sync'], focus: ['engine', 'sync'], sub: { cmd: 'request_specialist' },
    detail: `The Chief asks for another crdt specialist, this time for the sync item. That item requires sync, not crdt: ${ev(5).payload.decision.reason}. A rejected decision is itself committed, so it enters the ledger.`, authority: 'The engine rejects.' }),
  { grade: 'recorded', kind: 'refused', title: 'Resolve before any artifact exists', outcome: 'TransitionError · nothing written', decision: ['REFUSED', refused('artifact_required').code, 'refuse'], travel: ['spec-c', 'cmd-e'], focus: ['engine'], sub: { cmd: 'resolve_work' },
    detail: `The specialist tries to close its work item with nothing to show. The engine raises ${refused('artifact_required').code}. No event is appended.`, authority: 'The engine refuses.', source: 'engine.py resolve_work' },
  commit(6, { title: 'Submit the design artifact', outcome: 'Event 6 · artifact.submitted', travel: ['spec-c', 'cmd-e', 'e-art'], focus: ['artifact'], set: { artifact: 'ok' }, sub: { cmd: 'submit_artifact' },
    detail: 'memory://crdt-strategy.md, content hash demo-crdt-strategy-v1.', authority: 'Specialist proposes; the engine commits.' }),
  { grade: 'recorded', kind: 'refused', title: 'The specialist verifies its own artifact', outcome: 'TransitionError · nothing written', decision: ['REFUSED', refused('independent_verifier_required').code, 'refuse'], travel: ['spec-c', 'cmd-e'], focus: ['engine'], sub: { cmd: 'record_verification' },
    detail: `The producer cannot be its own verifier: ${refused('independent_verifier_required').code}. No event is appended.`, authority: 'The engine refuses.', source: 'engine.py record_verification' },
  commit(7, { title: 'The Chief verifies independently', outcome: 'Event 7 · artifact.verified', travel: ['chief-c', 'cmd-e', 'e-ver'], focus: ['verify'], set: { verify: 'ok' }, sub: { cmd: 'record_verification' },
    detail: `“${ev(7).payload.evidence}” The verification requirement on the conflict item is now met.`, authority: 'Chief proposes; the engine commits.' }),
  commit(8, { title: 'Resolve the work', outcome: 'Event 8 · work.resolved', travel: ['spec-c', 'cmd-e', 'e-conf'], focus: ['conflict'], set: { conflict: 'done' }, sub: { cmd: 'resolve_work', conflict: 'resolved' },
    detail: 'An artifact exists and has passed independent verification, so resolution is licensed.', authority: 'Specialist proposes; the engine commits.' }),
  commit(9, { title: 'The specialist retires', outcome: 'Event 9 · agent.retired', travel: ['spec-c', 'cmd-e', 'e-spec'], focus: ['spec'], set: { spec: 'retired' }, sub: { cmd: 'retire_agent', spec: 'retired' },
    detail: 'With no unresolved work assigned, the specialist leaves the active organization and frees its budget slot. The reason it existed stays in the ledger.', authority: 'The engine permits retirement.' }),
  { grade: 'recorded', kind: 'ok', title: 'Audit by replay', outcome: `${trace.stateHash} = ${trace.replayHash}`, decision: ['REPLAYED', 'state hashes match', 'audit'], focus: ['engine'], set: { engine: 'ok' }, replay: true,
    detail: `Replaying the 9 events from an empty state rebuilds the organization. Its hash, ${trace.replayHash}, equals the materialized state’s, ${trace.stateHash}. Refused commands left nothing to replay.`,
    authority: 'Read-only.', source: 'barn/src/barn/audit.py audit_run' },
  { grade: 'recorded', kind: 'ok', title: 'Why does the specialist exist?', outcome: `${trace.why.length} causal steps`, decision: ['EXPLAINED', 'why_agent_exists', 'audit'], travel: ['goal-sync', 'sync-conf', 'conf-spec'], focus: ['spec'],
    why: true, detail: trace.why.map(s => s.label).join(' → '), authority: 'Read-only.', source: 'barn/src/barn/causal.py why_agent_exists' },
];

// ---- derived per step from the recorded run ----

const appended = index => frames.slice(0, index + 1).filter(f => f.seq).map(f => f.seq);
const refusalsBy = index => frames.slice(0, index + 1).map((f, i) => ({ f, i })).filter(({ f }) => f.kind === 'refused').map(({ f, i }) => ({ code: f.decision[1], at: i, after: appended(i).length }));
const specActive = index => index >= 3 && index < 10;
const active = index => 1 + (specActive(index) ? 1 : 0);

function chipsAt(index) {
  const out = { chief: caps('Chief').map(c => [c, 'held']) };
  if (index >= 3) out.spec = caps('CRDT Specialist').map(c => [c, index >= 10 ? 'done' : 'held']);
  if (index >= 1) out.sync = [['sync', 'unmet']];
  if (index >= 2) out.conflict = [
    ['crdt', index >= 9 ? 'done' : specActive(index) ? 'met' : 'unmet'],
    ['verify', index >= 9 ? 'done' : index >= 8 ? 'met' : 'pending'],
  ];
  return out;
}

const W = { slot: k => [40 + k * 98, 538, 86, 44], engineOut: [440, 223], rail: 520, refuseStop: 474, stamp: [440, 262], budget: [440, 400], result: [480, 662], labelRows: [602, 618] };
const N = { slot: k => [15 + (k % 5) * 76, 788 + Math.floor(k / 5) * 44, 66, 34], stamp: [282, 298], budget: [282, 364], result: [200, 898] };

const clamp = v => Math.max(0, Math.min(1, v));
function along(points, t) {
  const segs = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let d = t * segs.reduce((a, b) => a + b, 0);
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) { const k = segs[i] ? Math.min(1, d / segs[i]) : 1, a = points[i], b = points[i + 1]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
    d -= segs[i];
  }
  return points[points.length - 1];
}

function Chip({ x, y, text, state }) {
  const w = text.length * 6 + 14;
  return <g className={`chip chip-${state}`} transform={`translate(${x} ${y})`}>
    <rect width={w} height={16} rx={8} />
    <text x={w / 2} y={11.5} textAnchor="middle">{state === 'done' ? `${text} ✓` : text}</text>
  </g>;
}

function Extras({ index, frame, layout, places, clock, animate, duration }) {
  const narrow = layout === 'narrow', L = narrow ? N : W;
  const moves = [...(frame.travel || []), ...(frame.blocked || [])];
  const k = moves.indexOf('cmd-e');
  const arrive = k >= 0 ? (k + 1) / moves.length : 0;
  const phase = animate ? clamp((clock - arrive) / Math.max(.2, 1 - arrive)) : 1;
  const seqs = appended(index), newest = frame.seq;
  const [verb, code, tone] = frame.decision;

  // Capability chips: under each agent, beside each work item (below it on narrow screens).
  const chips = [];
  Object.entries(chipsAt(index)).forEach(([id, list]) => {
    const p = places[id]; if (!p) return;
    const isAgent = id === 'chief' || id === 'spec';
    let x = isAgent || narrow ? p.x - p.w / 2 + 4 : p.x + p.w / 2 + 10;
    const y = isAgent || narrow ? p.y + p.h / 2 + 7 : p.y - 8;
    if (isAgent && narrow) x = p.x - list.reduce((s, [t]) => s + t.length * 6 + 18, -4) / 2;
    list.forEach(([text, state]) => { chips.push(<Chip key={`${id}-${text}`} x={x} y={y} text={text} state={state} />); x += text.length * 6 + 18; });
  });

  // Ledger: one block per committed event; empty slots show what has not happened yet.
  const blocks = seqs.map((seq, i) => {
    const [x, y, w, h] = L.slot(i), [a, b] = ev(seq).type.split('.');
    const entering = animate && seq === newest && phase < 1;
    const replayed = (frame.replay && (!animate || i < Math.floor(clock * (seqs.length + 1)))) || (frame.why && seq <= 4);
    const cls = ['block', seq === 5 && 'block-rejected', seq === newest && 'block-new', replayed && 'block-replayed'].filter(Boolean).join(' ');
    return <g key={seq} className={cls} transform={`translate(${x} ${y - (entering ? 18 * (1 - phase) : 0)})`} opacity={entering ? phase : 1}>
      {!narrow && i > 0 && <path d={`M-12 ${h / 2}H0`} className="block-link" />}
      <rect width={w} height={h} rx={3} />
      <text className="block-seq" x={7} y={narrow ? 13 : 17}>{seq}</text>
      <text className="block-type" x={narrow ? 17 : 20} y={narrow ? 13 : 17} {...(a.length * 5.7 > w - 26 ? { textLength: w - 26, lengthAdjust: 'spacingAndGlyphs' } : {})}>{a}</text>
      <text className="block-type" x={7} y={narrow ? 27 : 34}>{b}</text>
    </g>;
  });
  for (let i = seqs.length; i < 9; i++) { const [x, y, w, h] = L.slot(i); blocks.push(<rect key={`empty-${i}`} className="block-empty" x={x} y={y} width={w} height={h} rx={3} />); }

  // Refusals leave a mark where an event would have gone, and nothing else.
  const marks = refusalsBy(index).map((r, j) => {
    if (animate && r.at === index && phase < 1) return null;
    const [x, y, w] = L.slot(r.after - 1), mx = narrow ? x + w - 2 : x + w + 6, my = narrow ? y + 2 : y + 22;
    return <g key={r.code} className="ledger-mark">
      <g transform={`translate(${mx} ${my})`}><circle r={7} /><path d="M-3 -3L3 3M3 -3L-3 3" /></g>
      {!narrow && <text x={mx} y={W.labelRows[j]} textAnchor="middle">{r.code} · not written</text>}
    </g>;
  });

  // The engine's output travelling to the ledger: a commit arrives, a refusal stops short.
  let courier = null;
  if (animate && phase > 0 && phase < 1 && !narrow && (newest || frame.kind === 'refused')) {
    const [sx, sy] = W.engineOut;
    const [x0, y0, w0] = W.slot(Math.max(0, seqs.length - 1));
    const pts = newest ? [[sx, sy], [sx, W.rail], [x0 + w0 / 2, W.rail], [x0 + w0 / 2, y0]] : [[sx, sy], [sx, W.refuseStop]];
    const [x, y] = along(pts, newest ? Math.min(1, phase * 1.25) : phase);
    courier = <g className={`token ${newest ? '' : 'token-blocked'}`} transform={`translate(${x} ${y})`}><circle r={10} className="token-halo" /><circle r={4} /></g>;
  }
  const stop = frame.kind === 'refused' && !narrow && (!animate || phase >= 1) &&
    <g className="edge-stop" transform={`translate(${W.engineOut[0]} ${W.refuseStop + 8})`}><circle r={9} /><path d="M-4 -4L4 4M4 -4L-4 4" /></g>;

  const e = places.engine, n = active(index), [bx, by] = L.budget;
  const showStamp = !animate || arrive === 0 || clock >= arrive;
  const replayDone = frame.replay && (!animate || clock > .92);

  return <>
    {chips}
    {animate && <rect key={`pulse-${index}`} className={`engine-pulse pulse-${tone}`} x={e.x - e.w / 2 - 4} y={e.y - e.h / 2 - 4} width={e.w + 8} height={e.h + 8} rx={8} style={{ animationDelay: `${Math.round(arrive * duration)}ms` }} />}
    {showStamp && <g transform={`translate(${L.stamp[0]} ${L.stamp[1]})`}><g key={`stamp-${index}`} className={`stamp stamp-${tone}`}>
      <text className="stamp-verb" textAnchor="middle">{verb}</text>
      <text className="stamp-code" y={narrow ? 16 : 19} textAnchor="middle">{code}</text>
    </g></g>}
    <g className="budget" transform={`translate(${bx} ${by})`}>
      <text textAnchor="middle" className="budget-label">ACTIVE AGENTS {n} / {trace.maxActiveAgents}</text>
      {Array.from({ length: trace.maxActiveAgents }, (_, i) => <circle key={i} cx={(i - (trace.maxActiveAgents - 1) / 2) * 20} cy={17} r={6} className={i < n ? 'pip pip-on' : 'pip'} />)}
    </g>
    {blocks}
    {marks}
    {stop}
    {courier}
    {replayDone && <text className="replay-result" x={L.result[0]} y={L.result[1]} textAnchor="middle">{narrow ? `replay ${trace.replayHash} = state ${trace.stateHash} ✓` : `replayed from 9 events  ${trace.replayHash}   =   materialized state  ${trace.stateHash}   ✓`}</text>}
  </>;
}

function Readout({ index }) {
  const upto = frames.slice(0, index + 1);
  return <div className="readout-ledger">
    <span>APPEND-ONLY LEDGER · {trace.source.split(' ')[0]} @ {trace.commit} · ACTIVE AGENTS {active(index)} / {trace.maxActiveAgents}</span>
    <ol>{upto.map((f, i) => f.seq
      ? <li key={i} className={f.kind === 'recorded-refusal' ? 'is-rejected' : ''}><b>{f.seq}</b>{ev(f.seq).type}</li>
      : f.kind === 'refused' ? <li key={i} className="is-unwritten"><b>—</b>{f.decision[1]}, not written</li> : null)}</ol>
    <p className="readout-note">State hashes differ between recordings because Barn assigns fresh ids. Within one run, replay always equals the materialized state.</p>
  </div>;
}

export default {
  id: 'barn', name: 'Barn', form: 'Work graph + event ledger', grade: 'recorded',
  summary: 'Agents propose. A deterministic engine decides. Only licensed commands become events, and replaying the events rebuilds the state.',
  wide: [960, 700], narrow: [400, 912],
  regions: [
    { id: 'propose', kind: 'external', label: 'AGENTS · PROPOSE', at: [18, 18, 264, 462], m: [8, 18, 384, 206] },
    { id: 'decide', label: 'TRANSITION ENGINE · DECIDES', at: [300, 18, 280, 462], m: [8, 242, 384, 178] },
    { id: 'state', kind: 'state', label: 'COMMITTED STATE · CAPABILITIES', at: [598, 18, 344, 462], m: [8, 438, 384, 300] },
    { id: 'ledger', kind: 'ledger', label: 'APPEND-ONLY LEDGER · COMMITTED EVENTS ONLY', at: [18, 498, 924, 184], m: [8, 756, 384, 150] },
  ],
  nodes, edges, frames, Readout, Extras,
  evidence: [`${trace.source} @ ${trace.commit}`, 'scripts/export-barn-trace.py'],
};
