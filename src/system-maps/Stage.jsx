import React, { useEffect, useRef, useState } from 'react';

// Shared SVG stage for every system map. A map supplies nodes, edges, and
// authority regions; each step supplies the edges it traversed. Motion is
// limited to that traversal: a token runs along each traversed edge, and a
// refused attempt stops halfway at a mark. Nothing moves between steps.

const SIZE = {
  wide: { record: [156, 54], artifact: [156, 54], gate: [156, 54], human: [172, 50], agent: [172, 50], external: [164, 54], vertex: [60, 60], hyper: [15, 15] },
  narrow: { record: [118, 50], artifact: [118, 50], gate: [118, 50], human: [118, 46], agent: [118, 46], external: [118, 50], vertex: [52, 52], hyper: [13, 13] },
};

export function place(node, layout) {
  const narrow = layout === 'narrow';
  const [x, y] = narrow && node.m ? node.m : [node.x, node.y];
  const [w, h] = (SIZE[layout][node.type] || SIZE[layout].record);
  return { x, y, w, h, round: node.type === 'vertex' || node.type === 'hyper' };
}

function boundary(p, toward) {
  const dx = toward[0] - p.x, dy = toward[1] - p.y;
  if (!dx && !dy) return [p.x, p.y];
  if (p.round) {
    const l = Math.hypot(dx, dy), r = p.w * (p.w < 20 ? 1.1 : 1);
    return [p.x + dx / l * r, p.y + dy / l * r];
  }
  const sx = dx ? (p.w / 2) / Math.abs(dx) : Infinity, sy = dy ? (p.h / 2) / Math.abs(dy) : Infinity, s = Math.min(sx, sy);
  return [p.x + dx * s, p.y + dy * s];
}

export function geometry(edge, a, b, layout) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
  const bend = (layout === 'narrow' && edge.mb !== undefined ? edge.mb : edge.bend) || 0, c = [mx - dy / l * bend, my + dx / l * bend];
  const p0 = boundary(a, c), p1 = boundary(b, c);
  const at = t => [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]];
  const tangent = t => { const x = 2 * (1 - t) * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0]), y = 2 * (1 - t) * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1]), n = Math.hypot(x, y) || 1; return [x / n, y / n]; };
  return { d: `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}Q${c[0].toFixed(1)} ${c[1].toFixed(1)} ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`, at, tangent, end: p1 };
}

function arrow(g) {
  const [x, y] = g.end, [tx, ty] = g.tangent(1), s = 7;
  return `M${x} ${y}L${x - tx * s - ty * s * .55} ${y - ty * s + tx * s * .55}L${x - tx * s + ty * s * .55} ${y - ty * s - tx * s * .55}Z`;
}

function NodeShape({ node, p }) {
  const { w, h } = p;
  if (node.type === 'vertex') return <circle r={w} className="node-body" />;
  if (node.type === 'hyper') return <path d={`M0 ${-w}L${w} 0L0 ${w}L${-w} 0Z`} className="node-body" />;
  const rx = node.type === 'human' || node.type === 'agent' || node.type === 'external' ? h / 2 : 4;
  return <>
    <rect x={-w / 2 + 4} y={-h / 2 + 6} width={w} height={h} rx={rx} className="node-shadow" />
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={rx} className="node-body" />
    {node.type === 'record' && <rect x={-w / 2} y={-h / 2} width={4} height={h} className="node-bar" />}
    {node.type === 'artifact' && <path d={`M${w / 2 - 12} ${-h / 2}L${w / 2} ${-h / 2 + 12}`} className="node-fold" />}
    {node.type === 'gate' && <path d={`M${-w / 2 + 14} ${-7}L${-w / 2 + 21} 0L${-w / 2 + 14} 7L${-w / 2 + 7} 0Z`} className="node-mark" />}
    {node.type === 'human' && <circle cx={-w / 2 + 17} cy={0} r={5} className="node-mark" />}
    {node.type === 'agent' && <rect x={-w / 2 + 12} y={-5} width={10} height={10} rx={2} className="node-mark" />}
  </>;
}

// Estimated glyph widths (bold label, monospace sub). Text that would overflow is fitted to the box.
function fit(text, avail, perChar) {
  return text.length * perChar > avail ? { textLength: avail, lengthAdjust: 'spacingAndGlyphs' } : {};
}

function nodeText(node, p, sub, layout) {
  if (node.type === 'hyper') return null;
  const narrow = layout === 'narrow';
  const label = narrow && node.n ? node.n[0] : node.label;
  if (node.type === 'vertex') return <>
    <text className="node-label" y={-4} textAnchor="middle">{label}</text>
    {sub && sub.split('\n').map((line, i) => <text key={i} className="node-sub" y={p.w + 17 + i * 14} textAnchor="middle">{line}</text>)}
  </>;
  const pad = node.type === 'record' ? 14 : ['gate', 'human', 'agent'].includes(node.type) ? (narrow ? 26 : 30) : 12;
  const x = -p.w / 2 + pad, avail = p.w - pad - 9;
  return <>
    <text className="node-label" x={x} y={sub ? -4 : 5} {...fit(label, avail, narrow ? 7 : 7.6)}>{label}</text>
    {sub && <text className="node-sub" x={x} y={13} {...fit(sub, avail, narrow ? 5.75 : 6.35)}>{sub}</text>}
  </>;
}

export default function Stage({ map, graph, state, frame, index, animate, duration, layout, selected, onSelect, label }) {
  const [clock, setClock] = useState(1);
  const raf = useRef(0);
  const places = Object.fromEntries(graph.nodes.map(n => [n.id, place(n, layout)]));
  const moves = [...(frame.travel || []).map(id => ({ id, blocked: false })), ...(frame.blocked || []).map(id => ({ id, blocked: true }))];

  useEffect(() => {
    cancelAnimationFrame(raf.current);
    if (!animate || (!moves.length && !map.Extras)) { setClock(1); return undefined; }
    const start = performance.now();
    setClock(0);
    const tick = now => {
      // rAF timestamps can precede the start time; clamp so the first frame is never negative.
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      setClock(t);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [index, animate, map.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const segment = moves.length ? Math.max(0, Math.min(moves.length - 1, Math.floor(clock * moves.length))) : 0;
  const within = moves.length ? clock * moves.length - segment : 1;
  const running = clock < 1 && moves.length > 0;
  const done = id => { const k = moves.findIndex(m => m.id === id); return k >= 0 && (!running || k < segment); };
  const [vw, vh] = layout === 'narrow' ? map.narrow : map.wide;
  const overlay = [];
  const reach = layout === 'narrow' ? 54 : 44;

  let token = null;
  if (running) {
    const move = moves[segment], edge = move && graph.edges.find(e => e.id === move.id);
    if (edge && places[edge.from] && places[edge.to]) {
      const g = geometry(edge, places[edge.from], places[edge.to], layout);
      const t = move.blocked ? Math.min(within, .55) : within;
      const [x, y] = g.at(t);
      token = <g className={move.blocked ? 'token token-blocked' : 'token'} transform={`translate(${x} ${y})`}><circle r={11} className="token-halo" /><circle r={4.5} /></g>;
    }
  }

  return <svg className="map-svg" viewBox={`0 0 ${vw} ${vh}`} role="group" aria-label={label}>
    <defs>
      <radialGradient id="map-depth" cx="50%" cy="42%" r="75%"><stop offset="0" stopColor="#17305a" /><stop offset=".62" stopColor="#0d1a33" /><stop offset="1" stopColor="#081223" /></radialGradient>
      <pattern id="map-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#6f8fd6" strokeOpacity=".07" /></pattern>
      <filter id="map-glow" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="4" /></filter>
    </defs>
    <rect width={vw} height={vh} fill="url(#map-depth)" />
    <rect width={vw} height={vh} fill="url(#map-grid)" />
    {(map.regions || []).map(r => {
      const [x, y, w, h] = layout === 'narrow' && r.m ? r.m : r.at;
      return <g key={r.id} className={`region region-${r.kind || 'owner'}`}>
        <rect x={x} y={y} width={w} height={h} rx={6} />
        <text x={x + 12} y={y + 18}>{r.label}</text>
      </g>;
    })}
    <g className="edges">
      {graph.edges.map(edge => {
        const a = places[edge.from], b = places[edge.to];
        if (!a || !b) return null;
        const status = state.edges[edge.id] || edge.status || 'idle';
        const inStep = (frame.travel || []).includes(edge.id) || (frame.blocked || []).includes(edge.id);
        const endpointHidden = [edge.from, edge.to].some(id => (state.nodes[id] || graph.nodes.find(n => n.id === id)?.status) === 'hidden');
        const transient = edge.transient === true || (edge.transient === 'narrow' && layout === 'narrow');
        if (status === 'hidden' || endpointHidden || (transient && !inStep)) return null;
        const g = geometry(edge, a, b, layout);
        const traversed = done(edge.id) && (frame.travel || []).includes(edge.id);
        const blocked = done(edge.id) && (frame.blocked || []).includes(edge.id);
        const isSelected = selected?.kind === 'edge' && selected.id === edge.id;
        const cls = ['edge', `edge-${status}`, edge.style && `edge-${edge.style}`, traversed && 'is-traversed', blocked && 'is-blocked', isSelected && 'is-selected'].filter(Boolean).join(' ');
        const [lx, ly] = g.at(.5), [bx, by] = g.at(.55);
        if (blocked) overlay.push(<g key={`${edge.id}-stop`} className="edge-stop" transform={`translate(${bx} ${by})`}><circle r={9} /><path d="M-4 -4L4 4M4 -4L-4 4" /></g>);
        else if (traversed || isSelected) overlay.push(<g key={`${edge.id}-tag`} className="edge-tag" transform={`translate(${lx} ${ly})`}><rect x={-edge.label.length * 3.3 - 7} y={-10} width={edge.label.length * 6.6 + 14} height={19} rx={9.5} /><text textAnchor="middle" y={4}>{edge.label}</text></g>);
        const name = `${edge.label}: ${graph.nodes.find(n => n.id === edge.from)?.label} to ${graph.nodes.find(n => n.id === edge.to)?.label}`;
        return <g key={edge.id} className={cls}>
          <path d={g.d} className="edge-line" />
          <path d={arrow(g)} className="edge-head" />
          <path d={g.d} className="edge-hit" tabIndex={0} role="button" aria-label={name} aria-pressed={isSelected}
            onClick={() => onSelect({ kind: 'edge', id: edge.id })}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect({ kind: 'edge', id: edge.id }); } }} />
        </g>;
      })}
    </g>
    <g className="nodes">
      {graph.nodes.map(node => {
        const p = places[node.id];
        const status = state.nodes[node.id] || node.status || 'idle';
        const isSelected = selected?.kind === 'node' && selected.id === node.id;
        const focused = (frame.focus || []).includes(node.id);
        const sub = state.subs[node.id] ?? (layout === 'narrow' && node.n?.[1] !== undefined ? node.n[1] : node.sub);
        const cls = ['node', `node-${node.type}`, `is-${status}`, focused && 'is-focus', isSelected && 'is-selected'].filter(Boolean).join(' ');
        return <g key={node.id} className={cls} transform={`translate(${p.x} ${p.y})`} tabIndex={status === 'hidden' ? -1 : 0} role="button"
          aria-hidden={status === 'hidden' || undefined} aria-pressed={isSelected}
          aria-label={`${node.label}${sub ? `, ${sub.replace(/\n/g, ', ')}` : ''}. ${status === 'idle' ? '' : status}`}
          onClick={() => onSelect({ kind: 'node', id: node.id })}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect({ kind: 'node', id: node.id }); } }}>
          {focused && (p.round ? <circle r={p.w * 1.3} className="node-glow" filter="url(#map-glow)" /> : <rect x={-p.w / 2 - 6} y={-p.h / 2 - 6} width={p.w + 12} height={p.h + 12} rx={node.type === 'human' || node.type === 'agent' || node.type === 'external' ? p.h / 2 + 6 : 8} className="node-glow" filter="url(#map-glow)" />)}
          <NodeShape node={node} p={p} />
          {nodeText(node, p, sub, layout)}
          <rect className="node-hit" x={-Math.max(p.w, reach) / 2 - (p.round ? p.w / 2 : 0)} y={-Math.max(p.h, reach) / 2 - (p.round ? p.w / 2 : 0)} width={Math.max(p.w, reach) + (p.round ? p.w : 0)} height={Math.max(p.h, reach) + (p.round ? p.w : 0)} />
        </g>;
      })}
    </g>
    <g className="overlay" aria-hidden="true">{overlay}</g>
    {map.Extras && <g className="extras" aria-hidden="true"><map.Extras index={index} frame={frame} layout={layout} places={places} clock={clock} animate={animate} duration={duration} /></g>}
    {token}
  </svg>;
}
