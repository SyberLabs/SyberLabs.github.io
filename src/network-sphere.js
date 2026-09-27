// One adaptive sphere, from the SyberLabs Relay, OmniOS, and RISE network studies.
// Each topology lives inside the same 3D volume and crossfades between systems.
// Geometry is 3D and projected orthographically, so the sphere reads as a volume, not a disc.

const COLORS = {
  rise: [132, 175, 255], commons: [132, 175, 255], relay: [111, 200, 255],
  omnios: [136, 159, 255], osahr: [132, 175, 255],
};
const TAU = Math.PI * 2;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const norm = p => { const l = Math.hypot(p[0], p[1], p[2]) || 1; return [p[0] / l, p[1] / l, p[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const onSphere = (lat, lon, r = 1) => [r * Math.cos(lat) * Math.sin(lon), r * Math.sin(lat), r * Math.cos(lat) * Math.cos(lon)];
function tangent(h) {
  const e1 = norm(Math.abs(h[1]) > .95 ? cross(h, [1, 0, 0]) : cross(h, [0, 1, 0]));
  return [e1, cross(h, e1)];
}
function offset(h, basis, a, r) {
  const [e1, e2] = basis, c = Math.cos(a) * r, s = Math.sin(a) * r;
  return norm([h[0] + c * e1[0] + s * e2[0], h[1] + c * e1[1] + s * e2[1], h[2] + c * e1[2] + s * e2[2]]);
}
function arc(a, b, n, lift = 0) {
  const d = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
  const s = Math.sin(d) || 1e-6, out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, wa = Math.sin((1 - t) * d) / s, wb = Math.sin(t * d) / s, k = 1 + lift * Math.sin(Math.PI * t);
    out.push([(a[0] * wa + b[0] * wb) * k, (a[1] * wa + b[1] * wb) * k, (a[2] * wa + b[2] * wb) * k]);
  }
  return out;
}

// ---------- engines ----------
// Each engine: build() once, draw(state, t, g, w) every frame; g is the drawing api, w the crossfade weight.

const ENGINES = {
  // RISE: text branches into timing, spatial presentation, and sound before reaching the reader.
  // The topology and travelling signal adapt Relay's former provenance network.
  rise: {
    build() {
      const source = [0, 0, 0];
      const words = Array.from({ length: 18 }, (_, i) => {
        const y = 1 - 2 * (i + .5) / 18, q = Math.sqrt(1 - y * y), a = i * 2.39996;
        return [q * Math.cos(a) * .31, y * .31, q * Math.sin(a) * .31];
      });
      const systems = [onSphere(.72, -.25, .62), onSphere(-.42, 2.05, .62), onSphere(-.42, 4.35, .62)];
      const outputs = systems.map((hub, mode) => {
        const basis = tangent(norm(hub));
        return Array.from({ length: 12 }, (_, i) => {
          const a = i * TAU / 12 + mode * .3;
          return offset(norm(hub), basis, a, .37).map(v => v * .88);
        });
      });
      const edges = [];
      words.forEach(word => edges.push({ pts: [source, word], mode: -1 }));
      words.forEach((word, i) => edges.push({ pts: arc(norm(word), norm(words[(i + 3) % words.length]), 10).map(p => p.map(v => v * .31)), mode: -1 }));
      systems.forEach((hub, mode) => {
        words.forEach((word, i) => { if (i % 3 === mode) edges.push({ pts: arc(norm(word), norm(hub), 12).map((p, k) => p.map(v => v * (.31 + .31 * k / 12))), mode }); });
        outputs[mode].forEach(out => edges.push({ pts: arc(norm(hub), norm(out), 14).map((p, k) => p.map(v => v * (.62 + .26 * k / 14))), mode }));
        outputs[mode].forEach((out, i) => edges.push({ pts: arc(norm(out), norm(outputs[mode][(i + 1) % 12]), 8).map(p => p.map(v => v * .88)), mode }));
      });
      const paths = systems.map((hub, mode) => outputs[mode].map((out, i) => [source, words[(i * 3 + mode) % words.length], hub, out]));
      return { source, words, systems, outputs, edges, paths };
    },
    draw(s, t, g, w) {
      const phase = ((t / 2.8) % 3 + 3) % 3, active = Math.floor(phase), progress = phase % 1;
      const tones = ['188,215,255', '129,160,255', '117,220,255'];
      s.edges.forEach(edge => {
        g.tint(edge.mode < 0 ? null : tones[edge.mode]);
        const on = edge.mode === active, heat = on ? .55 + .45 * Math.sin(Math.PI * progress) : 0;
        g.poly(edge.pts, (.34 + heat * .65) * w, 1 + heat * 1.2);
      });
      g.tint();
      s.words.forEach((word, i) => g.dot(word, 1.9 + (i % 3 === active ? 1.2 : 0), (.48 + (i % 3 === active ? .4 : 0)) * w));
      s.systems.forEach((hub, mode) => {
        g.tint(tones[mode]);
        const on = mode === active, pulse = on ? .65 + .35 * Math.sin(Math.PI * progress) : 0;
        g.dot(hub, 4 + pulse * 2, (.56 + pulse * .44) * w, true);
        g.ring(hub, 9 + pulse * 5, (.28 + pulse * .46) * w);
        s.outputs[mode].forEach((out, i) => {
          const lit = on ? Math.max(0, 1 - Math.abs(progress * 7 - i) / 2) : 0;
          if (mode === 0) g.ring(out, 2.5 + lit * 2, (.35 + lit * .6) * w);
          else if (mode === 1) g.square(out, 1.8 + lit, (.4 + lit * .6) * w);
          else g.dot(out, 2.1 + lit * 1.8, (.48 + lit * .5) * w, lit > .3);
        });
      });
      const path = s.paths[active][((Math.floor(t / 2.8) % 12) + 12) % 12], segment = Math.min(2, Math.floor(progress * 3)), q = progress * 3 - segment;
      const a = path[segment], b = path[segment + 1];
      g.dot(a.map((v, i) => v + (b[i] - v) * q), 3.2, w, true);
      g.tint();
      g.dot(s.source, 6 + Math.sin(t * 1.3), w, true);
      g.ring(s.source, 11 + Math.sin(t * 1.3) * 2, .46 * w);
    },
  },

  // NEED / EVIDENCE: a need at the crown, five plans linked to it and to each other; evidence spirals into each plan.
  commons: {
    build() {
      const need = onSphere(1.05, .2), hubs = [];
      for (let i = 0; i < 5; i++) hubs.push(onSphere(.02 + .16 * Math.sin(i * 2.1), i * TAU / 5 + .2));
      const arcs = [];
      hubs.forEach((h, i) => { arcs.push([arc(need, h, 34), .5]); arcs.push([arc(h, hubs[(i + 1) % 5], 30), .3]); });
      return { need, hubs, arcs, bases: hubs.map(tangent) };
    },
    draw(s, t, g, w) {
      for (const [pts, a] of s.arcs) g.poly(pts, a * w, 1);
      s.hubs.forEach((h, i) => {
        for (let j = 0; j < 40; j++) {
          const ph = (t * .07 + j / 40) % 1, r = (1 - ph) * .28, a = j * 2.39996 + t * .25 * (i % 2 ? 1 : -1);
          g.dot(offset(h, s.bases[i], a, r), 1.2 + ph * .9, (.18 + .6 * ph) * w);
        }
        g.dot(h, 3.6, .9 * w, true);
      });
      g.dot(s.need, 5.2 + Math.sin(t * 1.3) * .6, w, true);
    },
  },

  // JOB / CONTEXT: a provenance tree grown outward from the job at the centre.
  // Shells are stages: research, then drafts, then approved revisions at the glass.
  // Each revision sends context out along its lineage; past lineages stay faintly lit.
  relay: {
    build() {
      const r = rng(23), nodes = [];
      [[0, 1], [.34, 8], [.61, 18], [.88, 36]].forEach(([rad, n], lvl) => {
        for (let i = 0; i < n; i++) {
          if (!rad) { nodes.push({ p: [0, 0, 0], lvl }); continue; }
          const y = 1 - 2 * (i + .5) / n, q = Math.sqrt(1 - y * y), a = i * 2.39996 + lvl * 1.7;
          const rr = rad * (1 + (r() - .5) * .14);
          nodes.push({ p: [q * Math.cos(a) * rr, y * rr, q * Math.sin(a) * rr], lvl });
        }
      });
      const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
      const edges = [];
      nodes.forEach((n, i) => {
        n.par = -1; if (!n.lvl) return;
        const prev = nodes.map((m, j) => [j, m]).filter(([, m]) => m.lvl === n.lvl - 1).sort((a, b) => d2(n.p, a[1].p) - d2(n.p, b[1].p));
        n.par = prev[0][0];
        edges.push([i, n.par, 1]);
        if (n.lvl > 1 && prev[1] && r() < .4) edges.push([i, prev[1][0], .45]); // a draft that drew on two sources
      });
      const leaves = nodes.map((n, i) => (n.lvl === 3 ? i : -1)).filter(i => i >= 0);
      const lineage = leaf => { const out = [leaf]; while (nodes[out[out.length - 1]].par >= 0) out.push(nodes[out[out.length - 1]].par); return out.reverse(); };
      const order = Array.from({ length: 48 }, () => lineage(leaves[Math.floor(r() * leaves.length)]));
      const curve = (a, b) => { const out = []; for (let k = 0; k <= 10; k++) { const q = k / 10, bow = 1 + .1 * Math.sin(Math.PI * q); out.push([(a[0] + (b[0] - a[0]) * q) * bow, (a[1] + (b[1] - a[1]) * q) * bow, (a[2] + (b[2] - a[2]) * q) * bow]); } return out; };
      // faint dust on each shell, so the stages read as nested volumes
      const dust = [];
      [[.34, 90], [.61, 150], [.88, 230]].forEach(([rad, n], si) => {
        for (let i = 0; i < n; i++) { const y = 1 - 2 * (i + .5) / n, q = Math.sqrt(1 - y * y), a = i * 2.39996 + si; dust.push([q * Math.cos(a) * rad, y * rad, q * Math.sin(a) * rad]); }
      });
      return { nodes, dust, edges: edges.map(([a, b, w]) => ({ a, b, w, pts: curve(nodes[b].p, nodes[a].p) })), order, key: (a, b) => a * 1000 + b };
    },
    draw(s, t, g, w) {
      const step = 1.9, ev = Math.floor(t / step), age = (t / step) % 1;
      const edgeHeat = new Map(), nodeHeat = new Float32Array(s.nodes.length);
      for (let back = 5; back >= 0; back--) {
        const path = s.order[((ev - back) % 48 + 48) % 48], hops = path.length - 1;
        const reach = back ? hops : age * 1.35 * hops; // the current revision travels outward
        const fade = back ? .34 * Math.pow(.66, back - 1) : 1;
        for (let h = 0; h < hops; h++) {
          const lit = Math.max(0, Math.min(1, reach - h)) * fade;
          const k = s.key(path[h + 1], path[h]);
          edgeHeat.set(k, Math.max(edgeHeat.get(k) || 0, lit));
          nodeHeat[path[h + 1]] = Math.max(nodeHeat[path[h + 1]], lit);
        }
        nodeHeat[path[0]] = Math.max(nodeHeat[path[0]], fade);
      }
      for (const p of s.dust) g.dot(p, .7, .11 * w);
      for (const e of s.edges) {
        const h = edgeHeat.get(s.key(e.a, e.b)) || 0;
        g.poly(e.pts, (.2 * e.w + .75 * h) * w, 1 + h * 1.3);
      }
      const size = [5.6, 3.2, 2.4, 1.9];
      s.nodes.forEach((n, i) => {
        const h = nodeHeat[i];
        g.dot(n.p, size[n.lvl] * (1 + h * .6), (.5 + .5 * h) * w, n.lvl < 2 || h > .5);
      });
      // the travelling packet of context, and the approval opening at the glass
      const path = s.order[(ev % 48 + 48) % 48], hops = path.length - 1, pos = age * 1.35 * hops;
      if (pos < hops) {
        const h = Math.floor(pos), q = pos - h, a = s.nodes[path[h]].p, b = s.nodes[path[h + 1]].p;
        g.dot([a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, a[2] + (b[2] - a[2]) * q], 2.6, w, true);
      } else {
        const open = Math.min(1, (pos - hops) / (.35 * hops));
        g.ring(s.nodes[path[hops]].p, 4 + open * 12, (1 - open) * .8 * w);
      }
      g.ring(s.nodes[0].p, 9 + 2 * Math.sin(t * 1.4), .35 * w);
    },
  },

  // DATA / BLOCKS: four personas at the vertices of a tetrahedron, each with its own cluster of data blocks,
  // all feeding one answer at the centre. Each query lights only the context that actually reached the answer.
  omnios: {
    build() {
      const r = rng(41), s3 = 1 / Math.sqrt(3);
      const personas = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(v => v.map(c => c * s3 * .57));
      const blocks = [];
      personas.forEach((P, k) => {
        for (let i = 0; i < 12; i++) {
          let p;
          do {
            const z = r() * 2 - 1, a = r() * TAU, q = Math.sqrt(1 - z * z), rad = .15 + r() * .22;
            p = [P[0] + q * Math.cos(a) * rad, P[1] + z * rad, P[2] + q * Math.sin(a) * rad];
          } while (Math.hypot(p[0], p[1], p[2]) > .93);
          blocks.push({ p, k });
        }
      });
      const bez = (a, b, pull) => {
        const c = [(a[0] + b[0]) / 2 * pull, (a[1] + b[1]) / 2 * pull, (a[2] + b[2]) / 2 * pull], out = [];
        for (let i = 0; i <= 12; i++) { const q = i / 12, u = 1 - q; out.push([u * u * a[0] + 2 * u * q * c[0] + q * q * b[0], u * u * a[1] + 2 * u * q * c[1] + q * q * b[1], u * u * a[2] + 2 * u * q * c[2] + q * q * b[2]]); }
        return out;
      };
      const wires = blocks.map((b, i) => ({ from: i, to: b.k, pts: bez(b.p, personas[b.k], .82), shared: false }));
      for (let i = 0; i < 7; i++) { // data shared across personas
        const bi = Math.floor(r() * blocks.length), to = (blocks[bi].k + 1 + Math.floor(r() * 3)) % 4;
        wires.push({ from: bi, to, pts: bez(blocks[bi].p, personas[to], .45), shared: true });
      }
      const spokes = personas.map(P => bez(P, [0, 0, 0], 1.25));
      const queries = Array.from({ length: 24 }, () => wires.map(() => r() < .34));
      return { personas, blocks, wires, spokes, queries };
    },
    draw(s, t, g, w) {
      // One continuous breath: context flows in to the answer, the answer fires it back out
      // along the wires the next query will use, and that query begins where the sparks land.
      const step = 3.4, ev = Math.floor(t / step), age = (t / step) % 1;
      const cur = s.queries[ev % 24], nxt = s.queries[(ev + 1) % 24];
      const IN = .38, HUB = .56, FIRE = .64, OUT = .82;
      const curOn = age < FIRE ? 1 : Math.max(0, 1 - (age - FIRE) / .12);
      const nxtOn = age < FIRE ? 0 : Math.min(1, (age - FIRE) / .1);
      const feedCur = new Float32Array(4), feedNxt = new Float32Array(4), blockLit = new Float32Array(s.blocks.length);
      s.wires.forEach((wr, i) => {
        if (cur[i]) { feedCur[wr.to] = 1; blockLit[wr.from] = Math.max(blockLit[wr.from], curOn); }
        if (nxt[i]) { feedNxt[wr.to] = 1; if (age > OUT) blockLit[wr.from] = Math.max(blockLit[wr.from], Math.min(1, (age - OUT) / .1)); }
      });
      const spark = (pts, q, reverse) => {
        const n = pts.length - 1;
        for (let tr = 0; tr < 4; tr++) {
          const u = Math.max(0, Math.min(1, q - tr * .045)), j = Math.round((reverse ? 1 - u : u) * n);
          g.dot(pts[j], 2 - tr * .38, (.95 - tr * .22) * w, tr === 0);
        }
      };
      s.wires.forEach((wr, i) => {
        const on = Math.max(cur[i] ? curOn : 0, nxt[i] ? nxtOn : 0);
        g.poly(wr.pts, ((wr.shared ? .09 : .14) + .62 * on) * w, 1 + on * .5);
        if (cur[i] && age < IN) spark(wr.pts, age / IN, false);                      // in, from the blocks
        if (nxt[i] && age > OUT) spark(wr.pts, (age - OUT) / (1 - OUT), true);        // back out, to the next blocks
      });
      s.spokes.forEach((sp, k) => {
        const on = Math.max(feedCur[k] * curOn, feedNxt[k] * nxtOn);
        g.poly(sp, (.2 + .6 * on) * w, 1.1 + on * .6);
        if (feedCur[k] && age > IN && age < HUB) spark(sp, (age - IN) / (HUB - IN), false); // down to the answer
        if (feedNxt[k] && age > FIRE && age < OUT) spark(sp, (age - FIRE) / (OUT - FIRE), true); // shot back out
      });
      s.blocks.forEach((b, i) => g.square(b.p, 1.7 + blockLit[i] * .9, (.34 + .66 * blockLit[i]) * w));
      s.personas.forEach((P, k) => {
        const lit = Math.max(feedCur[k] * curOn, feedNxt[k] * nxtOn);
        g.dot(P, 3.6 + lit * 1.2, (.6 + .4 * lit) * w, true);
        g.ring(P, 8 + Math.sin(t * .9 + k) * 1.2, (.2 + .3 * lit) * w);
      });
      // the answer gathers, holds, and fires
      const gather = age > HUB && age < FIRE ? (age - HUB) / (FIRE - HUB) : 0;
      const shock = age >= FIRE && age < OUT ? (age - FIRE) / (OUT - FIRE) : -1;
      g.dot([0, 0, 0], 5.6 + gather * 3.5 + (shock >= 0 ? (1 - shock) * 2 : 0), w, true);
      g.ring([0, 0, 0], 10 - gather * 3, (.3 + .45 * gather) * w);
      if (shock >= 0) g.ring([0, 0, 0], 8 + shock * 34, (1 - shock) * .75 * w);
    },
  },

  // GRAPH / STATE: a small graph inside the glass; stochastic rewrite events fire along its edges and leave a replayable trail.
  osahr: {
    build() {
      const r = rng(7), nodes = [];
      for (let i = 0; i < 10; i++) {
        const z = r() * 2 - 1, a = r() * TAU, rr = .62 + r() * .3, q = Math.sqrt(1 - z * z);
        nodes.push({ p: [q * Math.cos(a) * rr, z * rr, q * Math.sin(a) * rr], ph: r() * TAU, f: .3 + r() * .4 });
      }
      const edges = [], seen = new Set();
      nodes.forEach((n, i) => {
        nodes.map((m, j) => [j, Math.hypot(n.p[0] - m.p[0], n.p[1] - m.p[1], n.p[2] - m.p[2])]).filter(([j]) => j !== i)
          .sort((a, b) => a[1] - b[1]).slice(0, 2).forEach(([j]) => { const k = i < j ? `${i}-${j}` : `${j}-${i}`; if (!seen.has(k)) { seen.add(k); edges.push([i, j]); } });
      });
      return { nodes, edges, order: Array.from({ length: 64 }, () => Math.floor(r() * edges.length)) };
    },
    draw(s, t, g, w) {
      const pos = s.nodes.map(n => [n.p[0] + .035 * Math.sin(t * n.f + n.ph), n.p[1] + .035 * Math.sin(t * n.f * 1.3 + n.ph * 2), n.p[2] + .035 * Math.cos(t * n.f + n.ph)]);
      const step = 1.15, ev = Math.floor(t / step), age = (t / step) % 1;
      const heat = new Float32Array(s.edges.length);
      for (let back = 0; back < 6; back++) {
        const e = s.order[((ev - back) % 64 + 64) % 64];
        heat[e] = Math.max(heat[e], back === 0 ? 1 - age * .6 : .38 * Math.pow(.72, back));
      }
      const nodeHeat = new Float32Array(s.nodes.length);
      s.edges.forEach(([a, b], i) => {
        const pa = pos[a], pb = pos[b], seg = [];
        for (let k = 0; k <= 12; k++) { const q = k / 12; seg.push([pa[0] + (pb[0] - pa[0]) * q, pa[1] + (pb[1] - pa[1]) * q, pa[2] + (pb[2] - pa[2]) * q]); }
        g.poly(seg, (.24 + .8 * heat[i]) * w, 1 + heat[i] * 1.2);
        nodeHeat[a] = Math.max(nodeHeat[a], heat[i]); nodeHeat[b] = Math.max(nodeHeat[b], heat[i]);
      });
      pos.forEach((p, i) => {
        g.dot(p, 2.6 + nodeHeat[i] * 2.4, (.55 + .45 * nodeHeat[i]) * w, true);
        for (let j = 0; j < 9; j++) { const a = j * TAU / 9 + t * .3; g.dot([p[0] + Math.cos(a) * .06, p[1] + Math.sin(a) * .06, p[2]], .8, .2 * w); }
      });
    },
  },
};

// ---------- renderer ----------
export function mountSphereField(canvas, initialKind, pointer, options = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { setKind() {}, destroy() {} };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const states = {};
  const stateOf = k => (states[k] ||= ENGINES[k].build());
  let kind = ENGINES[initialKind] ? initialKind : 'rise', prev = null, switchAt = 0;
  let color = COLORS[kind].slice();
  let raf = 0, stopped = false, visible = true, t0 = performance.now();
  let yawOffset = 0, pitchOffset = 0;
  let W = 1, H = 1, cx = 0, cy = 0, R = 1, dpr = 1, k = 1;
  let cyw = 1, syw = 0, cp = 1, sp = 0;

  // RISE keeps its own imagery as the deepest layer of its sphere.
  const poster = new Image();
  let posterReady = false;
  if (options.riseImage) { poster.onload = () => { posterReady = true; }; poster.src = options.riseImage; }

  function view(p) {
    const x1 = p[0] * cyw + p[2] * syw, z1 = -p[0] * syw + p[2] * cyw, y1 = p[1];
    return [x1, y1 * cp - z1 * sp, y1 * sp + z1 * cp];
  }
  function depthAlpha(z) { return z > 0 ? .62 + .5 * z : .26 * (1 + z) + .06; }
  let rgb = '0,0,0', defaultRgb = rgb;
  const g = {
    view,
    tint(tone) { rgb = tone || defaultRgb; },
    dot(p, size, alpha, halo) {
      const v = view(p), a = alpha * depthAlpha(v[2]);
      if (a < .01) return;
      const x = cx + v[0] * R, y = cy - v[1] * R, s = size * (.85 + .25 * v[2]) * k;
      if (halo && v[2] > -.2) {
        ctx.fillStyle = `rgba(${rgb},${a * .13})`;
        ctx.beginPath(); ctx.arc(x, y, s * 3.4, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(${rgb},${a * .22})`;
        ctx.beginPath(); ctx.arc(x, y, s * 1.8, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = `rgba(${rgb},${a})`;
      if (s < .9) ctx.fillRect(x - s, y - s, s * 2, s * 2);
      else { ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill(); }
    },
    poly(pts, alpha, width = 1) {
      // front and back halves in two strokes, so depth reads without per-segment cost
      const front = new Path2D(), back = new Path2D();
      let prevV = view(pts[0]), fOpen = false, bOpen = false;
      for (let i = 1; i < pts.length; i++) {
        const v = view(pts[i]), z = (v[2] + prevV[2]) / 2;
        const path = z > 0 ? front : back;
        path.moveTo(cx + prevV[0] * R, cy - prevV[1] * R); path.lineTo(cx + v[0] * R, cy - v[1] * R);
        if (z > 0) fOpen = true; else bOpen = true;
        prevV = v;
      }
      ctx.lineWidth = width * k * .85;
      if (bOpen) { ctx.strokeStyle = `rgba(${rgb},${Math.min(1, alpha * .3)})`; ctx.stroke(back); }
      if (fOpen) { ctx.strokeStyle = `rgba(${rgb},${Math.min(1, alpha * 1.15)})`; ctx.stroke(front); }
    },
    ring(p, radius, alpha) {
      const v = view(p), a = alpha * depthAlpha(v[2]);
      if (a < .01) return;
      ctx.strokeStyle = `rgba(${rgb},${a})`; ctx.lineWidth = k * .8;
      ctx.beginPath(); ctx.arc(cx + v[0] * R, cy - v[1] * R, radius * k * (.85 + .2 * v[2]), 0, TAU); ctx.stroke();
    },
    square(p, size, alpha) {
      const v = view(p), a = alpha * depthAlpha(v[2]);
      if (a < .01) return;
      const s = size * (.85 + .25 * v[2]) * k, x = cx + v[0] * R, y = cy - v[1] * R;
      ctx.strokeStyle = `rgba(${rgb},${a})`; ctx.lineWidth = k * .75; ctx.strokeRect(x - s, y - s, s * 2, s * 2);
      ctx.fillStyle = `rgba(${rgb},${a * .35})`; ctx.fillRect(x - s, y - s, s * 2, s * 2);
    },
    polyView(pts, alpha, width = 1) {
      const path = new Path2D();
      pts.forEach((p, i) => { const x = cx + p[0] * R, y = cy - p[1] * R; i ? path.lineTo(x, y) : path.moveTo(x, y); });
      ctx.lineWidth = width * k * .85; ctx.strokeStyle = `rgba(${rgb},${alpha})`; ctx.stroke(path);
    },
  };

  const graticule = [];
  for (let lon = 0; lon < 180; lon += 30) { const m = []; for (let k = 0; k <= 72; k++) m.push(onSphere(-Math.PI / 2 + Math.PI * k / 72, lon * Math.PI / 180)); graticule.push(m); }
  for (let lat = -60; lat <= 60; lat += 30) { const m = []; for (let k = 0; k <= 96; k++) m.push(onSphere(lat * Math.PI / 180, TAU * k / 96)); graticule.push(m); }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(rect.width * dpr)); H = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    cx = W / 2; cy = H / 2; R = Math.min(W, H) / 2; k = dpr * Math.sqrt(R / dpr / 245);
  }

  function frame(now) {
    if (stopped) return;
    const still = reduced.matches;
    // A same-frame RAF timestamp can precede the mount's performance.now().
    // Clamp it so the first Relay lineage never indexes a negative step.
    const t = still ? 8 : Math.max(0, (now - t0) / 1000);
    const px = pointer?.current?.x || 0, py = pointer?.current?.y || 0;
    yawOffset += ((still ? 0 : px * .9) - yawOffset) * .06;
    pitchOffset += ((still ? 0 : py * .5) - pitchOffset) * .06;
    const yaw = .6 + (still ? 0 : t * .045) + yawOffset, pitch = .3 + pitchOffset;
    cyw = Math.cos(yaw); syw = Math.sin(yaw); cp = Math.cos(pitch); sp = Math.sin(pitch);

    const target = COLORS[kind];
    for (let i = 0; i < 3; i++) color[i] += (target[i] - color[i]) * .07;
    const [r, gg, b] = color.map(v => v | 0);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();

    // body: a lit volume, not a flat fill
    let grd = ctx.createRadialGradient(cx - R * .3, cy - R * .34, 0, cx - R * .08, cy - R * .08, R * 1.12);
    grd.addColorStop(0, `rgba(${r * .24 | 0},${gg * .24 | 0},${b * .26 | 0},1)`);
    grd.addColorStop(.5, `rgba(${r * .09 | 0},${gg * .09 | 0},${b * .11 | 0},1)`);
    grd.addColorStop(1, 'rgb(5,5,8)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

    const mix = prev ? Math.min(1, (now - switchAt) / 750) : 1;
    const wNew = mix * mix * (3 - 2 * mix), wOld = 1 - wNew;
    const riseW = (kind === 'rise' ? wNew : 0) + (prev === 'rise' ? wOld : 0);
    if (posterReady && riseW > .01) {
      // the poster sits deep inside and drifts against the turn: parallax of the interior
      const aspect = poster.height / poster.width, s = Math.max(R * 2 * (2850 / 490), R * 2.5 / aspect), h = s * aspect;
      const ox = -yawOffset * R * .3 + (still ? 0 : Math.sin(t * .05) * R * .08), oy = R * .16 + pitchOffset * R * .22;
      ctx.globalAlpha = .12 * riseW;
      ctx.drawImage(poster, cx - s / 2 + ox, cy - h / 2 + oy, s, h);
      ctx.globalAlpha = 1;
    }

    ctx.globalCompositeOperation = 'lighter';
    defaultRgb = `${r},${gg},${b}`;
    rgb = defaultRgb;
    for (const m of graticule) g.poly(m, .07, .8);
    if (prev && wOld > .01) ENGINES[prev].draw(stateOf(prev), t, g, wOld);
    if (!prev || mix >= 1) prev = null;
    ENGINES[kind].draw(stateOf(kind), t, g, wNew);

    // atmosphere: fresnel brightening toward the limb
    grd = ctx.createRadialGradient(cx, cy, R * .7, cx, cy, R);
    grd.addColorStop(0, `rgba(${rgb},0)`); grd.addColorStop(.82, `rgba(${rgb},.05)`); grd.addColorStop(1, `rgba(${rgb},.34)`);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

    // terminator: the far side of the light falls away
    ctx.globalCompositeOperation = 'source-over';
    grd = ctx.createRadialGradient(cx - R * .3, cy - R * .36, R * .2, cx - R * .1, cy - R * .12, R * 1.28);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(.66, 'rgba(0,0,0,.12)'); grd.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

    // specular, moving slightly against the turn
    ctx.globalCompositeOperation = 'screen';
    const sx = cx - R * (.38 + yawOffset * .08), sy = cy - R * (.44 - pitchOffset * .08);
    grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * .38);
    grd.addColorStop(0, 'rgba(255,255,255,.13)'); grd.addColorStop(.3, 'rgba(255,255,255,.04)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // rim light along the lit edge
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = dpr;
    ctx.strokeStyle = 'rgba(255,247,232,.26)';
    ctx.beginPath(); ctx.arc(cx, cy, R - dpr * .75, Math.PI * 1.02, Math.PI * 1.62); ctx.stroke();

    if (!still && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function start() { cancelAnimationFrame(raf); resize(); raf = requestAnimationFrame(frame); }
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); });
  io.observe(canvas);
  const ro = new ResizeObserver(start); ro.observe(canvas);
  const onVis = () => { if (!document.hidden) start(); };
  document.addEventListener('visibilitychange', onVis);
  reduced.addEventListener?.('change', start);
  start();

  return {
    setKind(next) {
      if (!ENGINES[next] || next === kind) return;
      prev = kind; kind = next; switchAt = performance.now();
      if (reduced.matches) { prev = null; color = COLORS[next].slice(); start(); }
    },
    destroy() {
      stopped = true; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      reduced.removeEventListener?.('change', start);
    },
  };
}
