import React from 'react';
import trace from '../../barn-trace.json';

const ev = seq => trace.events.find(e => e.seq === seq);
const refused = code => trace.refusals.find(r => r.code === code);

const nodes = [
  { id: 'chief', n: ['Chief', '2 capabilities'], type: 'agent', label: 'Chief', sub: 'generalist, architecture', x: 150, y: 110, m: [110, 80], about: 'The run’s first agent. It proposes work and specialists and later verifies the specialist’s artifact.', owner: 'Proposes typed commands. Cannot write state.', evidence: 'barn/src/barn/demo.py' },
  { id: 'spec', n: ['Specialist'], type: 'agent', label: 'CRDT Specialist', sub: 'crdt', status: 'hidden', x: 150, y: 250, m: [290, 80], about: 'Exists only because unresolved work required the crdt capability. It retires when that work is resolved.', owner: 'Proposes typed commands. Cannot write state.', evidence: 'engine.py request_specialist' },
  { id: 'cmd', n: ['Command'], type: 'artifact', label: 'Typed command', sub: 'create_run', x: 150, y: 410, m: [200, 180], about: 'Agents act only through typed commands with idempotent command ids. A command is a proposal until the engine commits it.', owner: 'Issued by an agent.', evidence: 'barn/src/barn/api.py' },
  { id: 'engine', type: 'gate', label: 'BarnEngine', sub: 'the only writer', x: 440, y: 270, m: [200, 300], about: 'The deterministic transition engine. It licenses, rejects or refuses each command, and only licensed commands append events. No model call mutates state.', owner: 'Decides every mutation.', evidence: 'barn/src/barn/engine.py' },
  { id: 'goal', type: 'record', label: 'Goal', sub: 'collaborative editor', x: 730, y: 80, m: [110, 430], about: trace.goal, owner: 'Committed state.', evidence: 'RunState.work_items' },
  { id: 'sync', n: ['Sync'], type: 'record', label: 'Realtime sync', sub: 'needs [sync]', status: 'hidden', x: 730, y: 190, m: [290, 430], about: 'Implement realtime synchronization. Requires the sync capability.', owner: 'Committed state.', evidence: 'RunState.work_items' },
  { id: 'conflict', n: ['Conflict', '[crdt] · verify'], type: 'record', label: 'Conflict strategy', sub: 'needs [crdt] · verify', status: 'hidden', x: 730, y: 300, m: [110, 530], about: 'Choose conflict-resolution strategy. Requires crdt and independent verification.', owner: 'Committed state.', evidence: 'RunState.work_items' },
  { id: 'artifact', n: ['Artifact'], type: 'artifact', label: 'Design artifact', sub: 'crdt-strategy.md', status: 'hidden', x: 730, y: 410, m: [290, 530], about: 'A durable artifact. Work cannot resolve without one.', owner: 'Committed state.', evidence: 'engine.py submit_artifact' },
  { id: 'verify', n: ['Verification', 'Chief · passed'], type: 'record', label: 'Verification', sub: 'by Chief · passed', status: 'hidden', x: 730, y: 500, m: [200, 630], about: ev(7).payload.evidence, owner: 'Committed state. The verifier must not be the producer.', evidence: 'engine.py record_verification' },
];

const edges = [
  { id: 'cmd-e', from: 'cmd', to: 'engine', label: 'proposes', about: 'Every change starts as a command.' },
  { id: 'chief-c', from: 'chief', to: 'cmd', label: 'issues', bend: 180, mb: 0, about: 'The Chief issues a command.' },
  { id: 'spec-c', from: 'spec', to: 'cmd', label: 'issues', status: 'hidden', about: 'The specialist issues a command.' },
  { id: 'e-goal', from: 'engine', to: 'goal', label: 'commits', about: 'An appended event.' },
  { id: 'e-sync', from: 'engine', to: 'sync', label: 'commits', status: 'hidden', about: 'An appended event.' },
  { id: 'e-conf', from: 'engine', to: 'conflict', label: 'commits', status: 'hidden', about: 'An appended event.' },
  { id: 'e-spec', from: 'engine', to: 'spec', label: 'licenses', status: 'hidden', about: 'A specialist decision: spawned, reused or rejected.' },
  { id: 'e-art', from: 'engine', to: 'artifact', label: 'commits', status: 'hidden', about: 'An appended event.' },
  { id: 'e-ver', from: 'engine', to: 'verify', label: 'commits', status: 'hidden', about: 'An appended event.' },
  { id: 'goal-sync', from: 'goal', to: 'sync', label: 'parent of', status: 'hidden', style: 'lineage', about: 'Work decomposition.' },
  { id: 'sync-conf', from: 'sync', to: 'conflict', label: 'parent of', status: 'hidden', style: 'lineage', about: 'Work decomposition.' },
  { id: 'conf-spec', from: 'conflict', to: 'spec', label: 'spawned because', bend: 60, mb: -40, status: 'hidden', style: 'lineage', about: 'The causal reason this agent exists.' },
];

const commit = (seq, rest) => ({ grade: 'recorded', seq, source: `BarnEvent ${seq} · ${ev(seq).type}`, ...rest });

const frames = [
  commit(1, { title: 'Create the run', outcome: 'Event 1 · run.created', travel: ['chief-c', 'cmd-e', 'e-goal'], focus: ['goal'], set: { goal: 'ok', chief: 'ok' }, sub: { cmd: 'create_run' },
    detail: `The run starts with a goal and a budget of 4 active agents. The Chief is created with it: “${trace.goal}.”`, authority: 'Chief proposes; the engine commits.' }),
  commit(2, { title: 'Add work: realtime sync', outcome: 'Event 2 · work.created', travel: ['chief-c', 'cmd-e', 'e-sync'], focus: ['sync'], set: { sync: 'ok' }, edges: { 'e-sync': 'ok', 'goal-sync': 'lineage' }, sub: { cmd: 'add_work' },
    detail: 'A child work item requiring the sync capability.', authority: 'Chief proposes; the engine commits.' }),
  commit(3, { title: 'Add work: conflict strategy', outcome: 'Event 3 · work.created', travel: ['chief-c', 'cmd-e', 'e-conf'], focus: ['conflict'], set: { conflict: 'ok' }, edges: { 'e-conf': 'ok', 'sync-conf': 'lineage' }, sub: { cmd: 'add_work' },
    detail: 'Realtime sync exposed a convergence question. This item requires crdt, which no agent has, and it requires verification.', authority: 'Chief proposes; the engine commits.' }),
  commit(4, { title: 'A capability gap licenses a specialist', outcome: `Event 4 · ${ev(4).payload.decision.outcome}`, travel: ['chief-c', 'cmd-e', 'e-spec'], focus: ['spec', 'conflict'], set: { spec: 'ok' }, edges: { 'e-spec': 'ok', 'conf-spec': 'lineage', 'spec-c': 'idle' }, sub: { cmd: 'request_specialist' },
    detail: `Decision: ${ev(4).payload.decision.outcome}, reason ${ev(4).payload.decision.reason}. Unresolved work requires crdt, no active agent has it, and the budget allows one more.`, authority: 'The engine decides whether a specialist may exist.' }),
  commit(5, { title: 'A request for a capability no work needs', kind: 'recorded-refusal', outcome: `Event 5 · ${ev(5).payload.decision.outcome}`, travel: ['chief-c', 'cmd-e'], blocked: ['e-spec'], focus: ['engine'], sub: { cmd: 'request_specialist' },
    detail: `The Chief asks for another crdt specialist, this time for the sync item. Decision: rejected, ${ev(5).payload.decision.reason}. A rejected decision is itself a committed event, so it appears in the ledger.`, authority: 'The engine rejects.' }),
  { grade: 'recorded', kind: 'refused', title: 'Resolve before any artifact exists', outcome: 'TransitionError · nothing written', travel: ['spec-c'], blocked: ['cmd-e'], focus: ['engine'], sub: { cmd: 'resolve_work' },
    detail: `The specialist tries to close its work item with nothing to show. The engine raises ${refused('artifact_required').code}. No event is appended.`, authority: 'The engine refuses.', source: 'engine.py resolve_work' },
  commit(6, { title: 'Submit the design artifact', outcome: 'Event 6 · artifact.submitted', travel: ['spec-c', 'cmd-e', 'e-art'], focus: ['artifact'], set: { artifact: 'ok' }, edges: { 'e-art': 'ok' }, sub: { cmd: 'submit_artifact' },
    detail: 'memory://crdt-strategy.md, content hash demo-crdt-strategy-v1.', authority: 'Specialist proposes; the engine commits.' }),
  { grade: 'recorded', kind: 'refused', title: 'The specialist verifies its own artifact', outcome: 'TransitionError · nothing written', travel: ['spec-c'], blocked: ['cmd-e'], focus: ['engine'], sub: { cmd: 'record_verification' },
    detail: `The producer cannot be its own verifier: ${refused('independent_verifier_required').code}. No event is appended.`, authority: 'The engine refuses.', source: 'engine.py record_verification' },
  commit(7, { title: 'The Chief verifies independently', outcome: 'Event 7 · artifact.verified', travel: ['chief-c', 'cmd-e', 'e-ver'], focus: ['verify'], set: { verify: 'ok' }, edges: { 'e-ver': 'ok' }, sub: { cmd: 'record_verification' },
    detail: `“${ev(7).payload.evidence}”`, authority: 'Chief proposes; the engine commits.' }),
  commit(8, { title: 'Resolve the work', outcome: 'Event 8 · work.resolved', travel: ['spec-c', 'cmd-e', 'e-conf'], focus: ['conflict'], set: { conflict: 'done' }, sub: { cmd: 'resolve_work', conflict: 'resolved' },
    detail: 'Now an artifact exists and has passed independent verification, so resolution is licensed.', authority: 'Specialist proposes; the engine commits.' }),
  commit(9, { title: 'The specialist retires', outcome: 'Event 9 · agent.retired', travel: ['spec-c', 'cmd-e', 'e-spec'], focus: ['spec'], set: { spec: 'retired' }, edges: { 'spec-c': 'hidden' }, sub: { cmd: 'retire_agent', spec: 'retired' },
    detail: 'With no unresolved work assigned, the specialist leaves the active organization. The reason it existed stays in the ledger.', authority: 'The engine permits retirement.' }),
  { grade: 'recorded', title: 'Audit by replay', outcome: `${trace.stateHash} = ${trace.replayHash}`, focus: ['goal', 'sync', 'conflict', 'spec'], set: { engine: 'ok' },
    detail: `The materialized state hashes to ${trace.stateHash}. Replaying the 9 events from an empty state gives ${trace.replayHash}. Why does the specialist exist? ${trace.why.map(s => s.label).join(' → ')}.`,
    authority: 'Read-only.', source: 'barn/src/barn/audit.py audit_run · causal.py' },
];

function Readout({ index, frames: all }) {
  const upto = all.slice(0, index + 1);
  return <div className="readout-ledger">
    <span>APPEND-ONLY LEDGER · {trace.source.split(' ')[0]} @ {trace.commit}</span>
    <ol>{upto.map((f, i) => f.seq
      ? <li key={i} className={f.kind === 'recorded-refusal' ? 'is-rejected' : ''}><b>{f.seq}</b>{ev(f.seq).type}</li>
      : f.kind === 'refused' ? <li key={i} className="is-unwritten"><b>—</b>refused, not written</li> : null)}</ol>
  </div>;
}

export default {
  id: 'barn', name: 'Barn', form: 'Work graph + event ledger', grade: 'recorded',
  summary: 'Agents propose. A deterministic engine decides. Only licensed commands become events, and replaying the events rebuilds the state.',
  wide: [960, 560], narrow: [400, 700],
  regions: [
    { id: 'propose', kind: 'external', label: 'AGENTS · PROPOSE', at: [18, 18, 264, 524], m: [8, 18, 384, 206] },
    { id: 'decide', label: 'TRANSITION ENGINE · DECIDES', at: [300, 18, 280, 524], m: [8, 242, 384, 110] },
    { id: 'state', kind: 'state', label: 'COMMITTED STATE', at: [598, 18, 344, 524], m: [8, 370, 384, 318] },
  ],
  nodes, edges, frames, Readout,
  evidence: [`${trace.source} @ ${trace.commit}`, 'scripts/export-barn-trace.py'],
};
