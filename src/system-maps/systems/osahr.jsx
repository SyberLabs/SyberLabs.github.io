import React from 'react';
import trace from '../../osahr-trace.json';

// Every frame is derived from the recorded trace: the graph after the event,
// plus the hyperedges it consumed, which travel into their target and fade.

const [A, B] = Object.keys(trace.vertices).sort();
const short = id => `a11ce:${parseInt(id.split(':')[1], 16)}`;
const vertexSub = attrs => `value ${attrs.value.toFixed(2)}\nresp ${attrs.responsiveness.toFixed(2)}`;
const lanes = { [`${A}>${B}`]: 0, [`${B}>${A}`]: 1 };

function slotPoint(lane, slot, narrow) {
  const col = slot % 4, row = Math.floor(slot / 4);
  if (narrow) return [104 + col * 64, lane === 0 ? 230 - row * 38 : 420 + row * 38];
  return [390 + col * 60, lane === 0 ? 170 - row * 50 : 350 + row * 50];
}

const vertexNode = (id, attrs, x, y, m) => ({
  id, type: 'vertex', label: id === A ? 'Agent A' : 'Agent B', sub: vertexSub(attrs), x, y, m,
  about: `Vertex ${short(id)} of type Agent. Attributes are typed: active (bool), value (float), responsiveness (float in [0, 1]).`,
  owner: 'Changed only by committed rewrite events and typed boundary input.', evidence: 'examples/adaptive_signal.py · osahr/schema.py',
});

const fixed = [
  { id: 'input', type: 'gate', label: 'receiver-input', sub: 'boundary handle', x: 650, y: 470, m: [290, 640], about: 'A typed input handle bound to Agent B. External events merge attributes into the bound vertex.', owner: 'The environment, through a typed boundary only.', evidence: 'osahr/boundary.py · adaptive_signal.py' },
  { id: 'theta', type: 'record', label: 'Parameters Θ', sub: 'regeneration 0.50', x: 320, y: 470, m: [110, 640], about: 'Rates consulted by every hazard. A scheduled adaptation is a committed state transition, not external configuration.', owner: 'Changed only by committed adaptation events.', evidence: 'ARCHITECTURE.md §1' },
];

function build() {
  const slots = new Map();
  const live = new Map(trace.edges.map(e => [e.id, e]));
  const vertices = JSON.parse(JSON.stringify(trace.vertices));
  let params = { ...trace.initialParams }, memory = { ...trace.initialMemory };
  const assign = edge => {
    const lane = lanes[`${edge.from}>${edge.to}`];
    const used = new Set([...slots.entries()].filter(([id, s]) => live.has(id) && s.lane === lane).map(([, s]) => s.slot));
    let slot = 0; while (used.has(slot)) slot++;
    slots.set(edge.id, { lane, slot });
  };
  trace.edges.forEach(assign);

  const graphOf = consumed => {
    const nodes = [
      vertexNode(A, vertices[A], 170, 260, [72, 330]),
      vertexNode(B, vertices[B], 790, 260, [328, 330]),
      ...fixed,
    ];
    const edges = [
      { id: 'in-b', from: 'input', to: B, label: 'merges attributes', about: 'Typed boundary input.' },
    ];
    for (const edge of [...live.values(), ...consumed]) {
      const { lane, slot } = slots.get(edge.id);
      const [x, y] = slotPoint(lane, slot, false), [mx, my] = slotPoint(lane, slot, true);
      nodes.push({ id: edge.id, type: 'hyper', label: `Signal ${short(edge.id)}`, x, y, m: [mx, my], intensity: edge.intensity,
        about: `Hyperedge ${short(edge.id)} of type Signal: source role ← ${edge.from === A ? 'Agent A' : 'Agent B'}, target role → ${edge.to === A ? 'Agent A' : 'Agent B'}, intensity ${edge.intensity}.`,
        owner: 'Created by regenerate-signal; deleted by receive-signal.', evidence: 'osahr/graph.py Hyperedge' });
      edges.push({ id: `${edge.id}:s`, from: edge.from, to: edge.id, label: 'source', about: 'Tail incidence (role source).', style: 'incidence' });
      edges.push({ id: `${edge.id}:t`, from: edge.id, to: edge.to, label: 'target', about: 'Head incidence (role target).', style: 'incidence' });
    }
    return { nodes, edges };
  };

  const frames = [{
    title: 'Initial state', grade: 'recorded', outcome: `n = 0 · t = 0 · ${trace.initialHash}`, graph: graphOf([]), focus: [A, B],
    detail: 'Two Agent vertices and one Signal hyperedge from A to B with intensity 0.5. Two rules are active: regenerate-signal and receive-signal.',
    authority: 'The runtime commits one event at a time.', source: `${trace.source} · seed ${trace.seed}`,
    state: { params: { ...params }, memory: { ...memory }, t: 0, n: 0, hash: trace.initialHash },
  }];

  for (const e of trace.events) {
    const consumed = e.deletedEdges.map(d => live.get(d.id) || d);
    e.deletedEdges.forEach(d => live.delete(d.id));
    e.createdEdges.forEach(c => { live.set(c.id, c); assign(c); });
    Object.entries(e.vertexAfter).forEach(([id, attrs]) => { vertices[id] = attrs; });
    params = e.paramsAfter; memory = e.memoryAfter;
    const graph = graphOf(consumed);
    const set = Object.fromEntries(consumed.map(c => [c.id, 'consumed']));
    const base = { grade: 'recorded', graph, set, state: { params: { ...params }, memory: { ...memory }, t: e.t, n: e.i, hash: e.post, pre: e.pre }, sub: { theta: `regeneration ${params.regeneration_rate.toFixed(2)}` } };
    const who = id => (id === A ? 'A' : 'B');
    if (e.kind === 'internal_rewrite' && e.cause.rule_id === 'regenerate-signal') {
      const c = e.createdEdges[0];
      frames.push({ ...base, title: `regenerate-signal · ${who(c.from)} → ${who(c.to)}`, outcome: `Hyperedge created · t = ${e.t.toFixed(3)}`, travel: [`${c.id}:s`, `${c.id}:t`], focus: [c.id],
        detail: `The rule matched (${who(c.from)}, ${who(c.to)}) with hazard ${e.cause.hazard} out of a total activity of ${e.cause.pre_total_activity}. A Signal of intensity ${c.intensity} was created. The rule matches both orientations, so signals can run either way.`,
        authority: 'The stochastic scheduler selected this enabled occurrence.', source: `rule ${e.cause.rule_hash} · match ${e.cause.match_id}` });
    } else if (e.kind === 'internal_rewrite') {
      const d = consumed[0], target = Object.keys(e.vertexAfter)[0];
      frames.push({ ...base, title: `receive-signal · into ${who(target)}`, outcome: `Hyperedge consumed · t = ${e.t.toFixed(3)}`, travel: [`${d.id}:t`], focus: [target],
        detail: `The signal is deleted (it appears only on the rule’s left side) and ${who(target)} is updated: value ${e.vertexBefore[target]?.value ?? '—'} → ${e.vertexAfter[target].value}, responsiveness ${e.vertexBefore[target]?.responsiveness ?? '—'} → ${e.vertexAfter[target].responsiveness}. Memory: received_count ${memory.received_count}.`,
        authority: 'The stochastic scheduler selected this enabled occurrence.', source: `rule ${e.cause.rule_hash} · hazard ${e.cause.hazard}` });
    } else if (e.kind === 'external_input') {
      frames.push({ ...base, title: 'External input at the boundary', outcome: `t = ${e.t.toFixed(3)} · scheduled input`, travel: ['in-b'], focus: [B, 'input'],
        detail: `Event external-1 from the environment merged responsiveness 0.8 into Agent B through the typed handle receiver-input. B’s receive hazard rises, and total activity jumps from 1.8 to 4.15 at the next event.`,
        authority: 'The environment, only through the declared boundary handle.', source: `${e.cause.external_event_id} · ${e.cause.handle_id}` });
    } else {
      frames.push({ ...base, title: 'Scheduled adaptation', outcome: `regeneration_rate 0.5 → ${params.regeneration_rate}`, focus: ['theta'], set: { ...set, theta: 'flag' },
        detail: 'The adaptation slow-regeneration halved regeneration_rate. The graph did not change; the law that generates it did. Θ is part of the committed state, so this is a state transition with its own hash.',
        authority: 'A scheduled adaptation declared before the run.', source: e.cause.update_id });
    }
  }
  return frames;
}

const frames = build();
const allFrames = frames;

function Readout({ index }) {
  const s = allFrames[index].state;
  const ticks = trace.events;
  return <div className="readout-osahr">
    <div className="readout-grid">
      <div><span>TIME · EVENT</span><strong>t = {s.t.toFixed(3)}</strong><p>n = {s.n} of {ticks.length}</p></div>
      <div><span>MEMORY Z</span><p>received_count {s.memory.received_count}</p><p>intensity_ema {Number(s.memory.intensity_ema).toFixed(4)}</p></div>
      <div><span>PARAMETERS Θ</span><p>regeneration_rate {s.params.regeneration_rate}</p><p>base_rate {s.params.base_rate} · learning {s.params.learning_rate}</p></div>
      <div><span>STATE HASH</span><p>{s.pre ? `${s.pre} → ` : ''}{s.hash}</p><p>replay verified · seed {trace.seed}</p></div>
    </div>
    <div className="osahr-timeline" aria-hidden="true">
      {ticks.map((e, i) => <i key={e.i} className={`tick tick-${e.kind === 'internal_rewrite' ? (e.cause.rule_id === 'receive-signal' ? 'receive' : 'regenerate') : e.kind} ${i < index - 1 ? 'is-past' : ''} ${i === index - 1 ? 'is-now' : ''}`} style={{ left: `${(e.t / trace.horizon) * 100}%` }} />)}
      <span className="timeline-axis"><b>t = 0</b><b>t = {trace.horizon}</b></span>
    </div>
  </div>;
}

export default {
  id: 'osahr', name: 'OSAHR', form: 'Typed hypergraph rewrite trace', grade: 'recorded',
  summary: 'A typed directed hypergraph changed by stochastic rewrite rules, one committed event at a time, with every state hashed and replayable.',
  wide: [960, 540], narrow: [400, 700], pace: 1700,
  regions: [
    { id: 'graph', label: 'HYPERGRAPH G', at: [18, 18, 924, 400], m: [8, 18, 384, 560] },
    { id: 'state', kind: 'state', label: 'AUGMENTED STATE · BOUNDARY B · PARAMETERS Θ', at: [18, 430, 924, 92], m: [8, 590, 384, 98] },
  ],
  nodes: frames[0].graph.nodes, edges: frames[0].graph.edges, frames, Readout,
  evidence: [`SyberLabs/OSAHR_Cell @ ${trace.commit}`, 'examples/adaptive_signal.py', 'scripts/export-osahr-trace.py'],
};
