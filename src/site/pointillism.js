/* Pointillism: a short loop about interconnectedness, told by one population of dots. The same points are scattered
   apart, gather into a cloud that rains, rise as a tree, branch again as a neuron, reach for one another as a neural
   network, find the same spiral as a galaxy, and finally become an eye with a galaxy for a pupil: imagination, the
   faculty that sees it is all one. Then they come apart and the loop begins again. Each form keeps moving once it has
   formed (drift, rain, wind, signals, rotation, a blink), and every change of form sets off as a wave across the field.

   mountPointillism(canvas, { onForm, reduced }) -> { supported, show(i), next(), setPaused(b), destroy() }
     onForm(i)  Called whenever the form changes (by the cycle or by show()).
     reduced    Defaults to prefers-reduced-motion: each form is drawn once, still, and the cycle does not advance.

   Canvas 2D, 1 device pixel per CSS px up to 2x, at most 60 frames a second. Pauses off screen and in hidden tabs.
   Pause stops the loop (the forms' clock and the cycle); the last frame stays. The pointer gently parts the dots. Forms live in a unit space (x in ±1.3, y in ±1, y down) scaled to the canvas. */

// The loop: seven beats, one sentence each. sweep is the direction the dots set off in when the beat begins
// (down: from the top; up: from the bottom; out: from the centre; in: from the edge), so a change reads as a flow:
// the rain rises into the tree, the network gathers into a sky.
export const FORMS = [
  { id: 'apart', label: 'Apart', line: 'Look closely. Everything seems apart.', sweep: 'out' },
  { id: 'rain', label: 'Rain', line: 'A cloud lets go, and becomes rain.', sweep: 'down' },
  { id: 'tree', label: 'Tree', line: 'The rain rises again as a tree.', sweep: 'up' },
  { id: 'thought', label: 'Thought', line: 'Its branching returns as a thought.', sweep: 'out' },
  { id: 'mind', label: 'Mind', line: 'Thoughts reach for one another.', sweep: 'out' },
  { id: 'sky', label: 'Sky', line: 'Reaching outward, they find the same spiral in the sky.', sweep: 'in' },
  { id: 'imagination', label: 'Imagination', line: 'Imagination is the eye that sees it is all one.', sweep: 'in' },
];

const HOLD = 6200, STAGGER = 1.5, GAP = 1000 / 60; // ms a beat holds; s a change of form takes to set off, across the field
const TAU = Math.PI * 2, CAP = 70; // px kept clear under the forms for the beat's sentence

const rng32 = seed => () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// The site's Midnight theme: the cool roles are Electric Blue (#0297de) and its tints, the warm roles Cantaloupe
// (#fc734d) and its tints. The tree keeps its own greens and browns.
const C = {
  vellum: hex('#f1f6f9'), mist: hex('#a8c3d2'), slate: hex('#5f7d8f'), ice: hex('#6cc6f5'), blue: hex('#0297de'),
  violet: hex('#1e74c8'), lilac: hex('#9fd8f7'), magenta: hex('#fc734d'), pink: hex('#fda58c'), amber: hex('#fe9f78'),
  cream: hex('#ffe3d4'), green: hex('#a6f08f'), leaf: hex('#6fd38a'), lime: hex('#c9f59a'), teal: hex('#62e3d8'),
  bark: hex('#8a5a3c'), oak: hex('#b98352'),
};
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const ramp = (stops, k) => { k = Math.max(0, Math.min(1, k)) * (stops.length - 1); const i = Math.min(stops.length - 2, k | 0); return mix(stops[i], stops[i + 1], k - i); };
const ss = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

// A form: base positions, colours and sizes for N dots, and a step(t, tx, ty, ta) that writes this moment's targets.
function form(N) {
  const f = { bx: new Float32Array(N), by: new Float32Array(N), col: new Float32Array(N * 3), sz: new Float32Array(N), ta: 1 };
  f.step = (t, tx, ty, ta) => { tx.set(f.bx); ty.set(f.by); ta.fill(1); };
  return f;
}
// Pointillist paint: every dot a slightly different shade of its colour.
const paint = (f, i, c, r, jitter = 0.12) => { const k = 1 + (r() - 0.5) * 2 * jitter; f.col[i * 3] = Math.min(255, c[0] * k); f.col[i * 3 + 1] = Math.min(255, c[1] * k); f.col[i * 3 + 2] = Math.min(255, c[2] * k); };
const gauss = r => { let u = 0; for (let k = 0; k < 4; k++) u += r(); return (u - 2) / 0.577; };

// Apart: points scattered evenly through the field, each drifting on its own.
function apartForm(N, r) {
  const f = form(N), ph = new Float32Array(N), stops = [C.violet, C.blue, C.ice, C.pink, C.amber, C.green];
  for (let i = 0; i < N; i++) {
    const a = r() * TAU, d = Math.sqrt(r());
    f.bx[i] = Math.cos(a) * d * 1.25; f.by[i] = Math.sin(a) * d * .88; ph[i] = r() * TAU;
    f.sz[i] = .7 + r() * 1.5; paint(f, i, stops[r() * stops.length | 0], r, .15);
  }
  f.step = (t, tx, ty, ta) => { for (let i = 0; i < N; i++) { tx[i] = f.bx[i] + Math.sin(t * .31 + ph[i]) * .035; ty[i] = f.by[i] + Math.cos(t * .27 + ph[i] * 1.7) * .03; ta[i] = .55 + .45 * Math.sin(t * .8 + ph[i]) ** 2; } };
  return f;
}

// A neuron: dendrites branching out of the cell body like a tree's crown, and an axon carrying signals away.
function neuronForm(N, r) {
  const f = form(N), cx = -.3, cy = 0, segs = [];
  const branch = (x, y, a, len, d) => {
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; segs.push([x, y, x2, y2, d]);
    if (d) for (let k = 0; k < 2; k++) branch(x2, y2, a + (k - .5) * (.38 + r() * .34) + (r() - .5) * .3, len * (.62 + r() * .3), d - 1);
  };
  for (let k = 0; k < 6; k++) { const a = Math.PI * (.6 + k / 5 * .8) + (r() - .5) * .25; branch(cx + Math.cos(a) * .1, cy + Math.sin(a) * .1, a, .16 + r() * .12, 5); }
  // thick limbs near the cell body carry most of the dots, so the branching reads; twigs are a light dusting
  const cum = []; let tot = 0; for (const [x, y, x2, y2, d] of segs) cum.push(tot += Math.hypot(x2 - x, y2 - y) * (d + 1) ** 1.6);
  const pickSeg = () => { const v = r() * tot; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = lo + hi >> 1; if (cum[m] < v) lo = m + 1; else hi = m; } return segs[lo]; };
  const ax = u => -.2 + u * 1.25, ay = u => Math.sin(u * Math.PI * 1.4) * .07; // the axon, u in 0..1
  const ends = []; const tip = (x, y, a, len, d) => { const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; ends.push([x, y, x2, y2]); if (d) for (let k = 0; k < 2; k++) tip(x2, y2, a + (k - .5) * .9, len * .7, d - 1); };
  tip(ax(1), ay(1), 0, .1, 3);
  const nSoma = N * .14 | 0, nDend = N * .4 | 0, nAxon = N * .2 | 0, nSig = N * .12 | 0, kind = new Uint8Array(N), u0 = new Float32Array(N), ph = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    ph[i] = r() * TAU;
    if (i < nSoma) { const a = r() * TAU, d = r() < .5 ? .1 : Math.sqrt(r()) * .09; f.bx[i] = cx + Math.cos(a) * d; f.by[i] = cy + Math.sin(a) * d; f.sz[i] = 1.3 + r() * 1.4; paint(f, i, r() < .5 ? C.pink : C.magenta, r); }
    else if (i < nSoma + nDend) { const [x, y, x2, y2, d] = pickSeg(), u = r(); f.bx[i] = x + (x2 - x) * u + (r() - .5) * .006 * (d + 1); f.by[i] = y + (y2 - y) * u + (r() - .5) * .006 * (d + 1); f.sz[i] = .8 + r() * 1.1; paint(f, i, d > 2 ? C.lilac : r() < .6 ? C.violet : C.ice, r); kind[i] = 1; }
    else if (i < nSoma + nDend + nAxon) { const u = r(); f.bx[i] = ax(u) + (r() - .5) * .02; f.by[i] = ay(u) + (r() - .5) * .025; f.sz[i] = .8 + r() * .9; paint(f, i, Math.sin(u * 40) > .6 ? C.vellum : C.blue, r, .08); kind[i] = 2; }
    else if (i < nSoma + nDend + nAxon + nSig) { u0[i] = r(); f.sz[i] = 1.6 + r() * .9; paint(f, i, C.ice, r, .05); kind[i] = 3; }
    else { const [x, y, x2, y2] = ends[r() * ends.length | 0], u = r(); f.bx[i] = x + (x2 - x) * u; f.by[i] = y + (y2 - y) * u; f.sz[i] = 1 + r() * 1.2; paint(f, i, r() < .7 ? C.amber : C.cream, r); kind[i] = 4; }
  }
  f.step = (t, tx, ty, ta) => {
    const beat = 1 + .06 * Math.sin(t * 2.2);
    for (let i = 0; i < N; i++) {
      const k = kind[i];
      if (k === 3) { const u = (u0[i] + t * .32) % 1; tx[i] = ax(u); ty[i] = ay(u); ta[i] = Math.sin(Math.PI * u); continue; }
      if (k === 0) { tx[i] = cx + (f.bx[i] - cx) * beat; ty[i] = cy + (f.by[i] - cy) * beat; }
      else { const w = k === 1 ? Math.hypot(f.bx[i] - cx, f.by[i] - cy) : 0; tx[i] = f.bx[i] + Math.sin(t * .9 + ph[i] * .2) * .012 * w; ty[i] = f.by[i] + Math.cos(t * .8 + ph[i] * .2) * .012 * w; }
      ta[i] = 1;
    }
  };
  return f;
}

// An eye: lids, an iris of radial fibres and, where the pupil would be, a small turning galaxy. It blinks.
function eyeForm(N, r) {
  const f = form(N), lid = x => Math.max(0, 1 - (x / 1.18) ** 2) ** .85;
  const nLid = N * .2 | 0, nIris = N * .38 | 0, nCore = N * .22 | 0, nGlint = N * .02 | 0;
  const kind = new Uint8Array(N), rad = new Float32Array(N), th = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    if (i < nLid) { const x = (r() * 2 - 1) * 1.18, up = r() < .55; f.bx[i] = x; f.by[i] = (up ? -.6 : .48) * lid(x) + (r() - .5) * .02; f.sz[i] = .9 + r() * 1.2; paint(f, i, up ? C.vellum : C.mist, r, .08); }
    else if (i < nLid + nIris) {
      const spoke = (r() * 90 | 0) / 90 * TAU + (r() - .5) * .03; rad[i] = .15 + Math.pow(r(), .8) * .27; th[i] = spoke; kind[i] = 1;
      f.sz[i] = .8 + r() * 1.2; paint(f, i, rad[i] > .4 ? C.violet : ramp([C.amber, C.cream, C.ice, C.blue, C.teal], (rad[i] - .15) / .25), r);
    } else if (i < nLid + nIris + nCore) {
      const core = r() < .25; rad[i] = core ? Math.abs(gauss(r)) * .025 : .015 + Math.pow(r(), .8) * .12; th[i] = core ? r() * TAU : (i % 2) * Math.PI + rad[i] * 32 + gauss(r) * .25; kind[i] = 2;
      f.sz[i] = .7 + r() * 1; paint(f, i, core ? C.cream : r() < .5 ? C.lilac : C.pink, r);
    } else if (i < nLid + nIris + nCore + nGlint) { f.bx[i] = -.15 + gauss(r) * .02; f.by[i] = -.16 + gauss(r) * .02; f.sz[i] = 1.2 + r(); paint(f, i, C.vellum, r, .02); kind[i] = 3; }
    else { // the white of the eye: sparse and faint
      let x, y; do { x = (r() * 2 - 1) * 1.1; y = (r() * 2 - 1) * .6; } while (y < -.6 * lid(x) + .04 || y > .48 * lid(x) - .04 || x * x + y * y < .2);
      f.bx[i] = x; f.by[i] = y; f.sz[i] = .6 + r() * .7; paint(f, i, C.slate, r); kind[i] = 4;
    }
  }
  f.step = (t, tx, ty, ta) => {
    const c = t % 6.5, blink = c > 4.6 && c < 4.95 ? .08 + .92 * Math.abs(Math.cos((c - 4.6) / .35 * Math.PI)) : 1; // one blink every 6.5 s
    const gx = Math.sin(t * .35) * .07, gy = Math.sin(t * .23) * .03;
    for (let i = 0; i < N; i++) {
      const k = kind[i]; let x, y;
      if (k === 1) { const a = th[i] + t * .03; x = gx + Math.cos(a) * rad[i]; y = gy + Math.sin(a) * rad[i]; }
      else if (k === 2) { const a = th[i] + t * .5 / (.03 + rad[i]) * .05; x = gx + Math.cos(a) * rad[i]; y = gy + Math.sin(a) * rad[i] * .9; }
      else if (k === 3) { x = f.bx[i] + gx; y = f.by[i] + gy; }
      else { x = f.bx[i]; y = f.by[i]; }
      tx[i] = x; ty[i] = y * blink; ta[i] = k === 4 ? .45 : k === 1 || k === 2 || k === 3 ? (blink < .5 ? .25 : 1) : 1;
    }
  };
  return f;
}

function rainForm(N, r) {
  const f = form(N), nCloud = N * .6 | 0;
  const puffs = [[-.66, -.3, .26], [-.36, -.5, .34], [.04, -.6, .4], [.44, -.48, .33], [.76, -.3, .24], [-.22, -.24, .3], [.3, -.22, .32]];
  const inside = (x, y) => y < -.06 && puffs.some(([cx, cy, cr]) => (x - cx) ** 2 + (y - cy) ** 2 < cr * cr);
  for (let i = 0; i < nCloud; i++) {
    let x, y; do { x = -1.02 + r() * 2.04; y = -1 + r() * .94; } while (!inside(x, y));
    f.bx[i] = x; f.by[i] = y; f.sz[i] = 1.2 + r() * 1.6;
    paint(f, i, r() < .07 ? C.ice : ramp([C.vellum, C.mist, C.slate], (y + 1) / .94), r, .08);
  }
  const x0 = new Float32Array(N), p0 = new Float32Array(N), sp = new Float32Array(N), sub = new Uint8Array(N);
  for (let i = nCloud; i < N; i += 3) {
    const x = -.82 + r() * 1.64, p = r(), s = .5 + r() * .22;
    for (let k = 0; k < 3 && i + k < N; k++) { const j = i + k; x0[j] = x; p0[j] = p; sp[j] = s; sub[j] = k; f.sz[j] = .9 + (2 - k) * .25; paint(f, j, k ? C.blue : C.ice, r, .06); f.bx[j] = x; f.by[j] = p; }
  }
  f.step = (t, tx, ty, ta) => {
    for (let i = 0; i < nCloud; i++) { tx[i] = f.bx[i] + Math.sin(t * .5 + f.by[i] * 3) * .014; ty[i] = f.by[i] + Math.sin(t * .7 + f.bx[i] * 2) * .007; ta[i] = 1; }
    for (let i = nCloud; i < N; i++) {
      const ph = (p0[i] + t * sp[i]) % 1;
      tx[i] = x0[i] - ph * .07; ty[i] = .0 + ph * 1 - sub[i] * .035;
      ta[i] = ss(0, .08, ph) * (1 - ss(.82, 1, ph));
    }
  };
  return f;
}

function treeForm(N, r) {
  const f = form(N), segs = [], tips = [];
  const branch = (x, y, a, len, w, d) => {
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    segs.push([x, y, x2, y2, w]);
    if (d <= 4) tips.push([x, y, x2, y2]); // leaves gather along the upper branches, not only at their ends
    if (d === 0) return;
    const n = d > 6 ? 2 : r() < .35 ? 3 : 2;
    for (let k = 0; k < n; k++) { const b = a + (k - (n - 1) / 2) * (.5 + r() * .26) + (r() - .5) * .18; branch(x2, y2, b + (-Math.PI / 2 - b) * .1, len * (.76 + r() * .08), w * .64, d - 1); } // branches lean back toward the light
  };
  branch(0, 1, -Math.PI / 2, .36, .12, 8);
  const weights = segs.map(([x, y, x2, y2, w]) => Math.hypot(x2 - x, y2 - y) * (w ** 1.5 + .0004)), total = weights.reduce((a, b) => a + b, 0);
  const nWood = N * .34 | 0;
  let i = 0;
  const wood = (s, n) => {
    const [x, y, x2, y2, w] = s, L = Math.hypot(x2 - x, y2 - y) || 1, nx = -(y2 - y) / L, ny = (x2 - x) / L;
    for (let j = 0; j < n && i < nWood; j++, i++) {
      const u = r(), o = (r() - .5) * w;
      f.bx[i] = x + (x2 - x) * u + nx * o; f.by[i] = y + (y2 - y) * u + ny * o; f.sz[i] = 1 + r() * 1.2;
      paint(f, i, r() < .12 ? C.amber : r() < .5 ? C.oak : C.bark, r, .1);
    }
  };
  segs.forEach((s, k) => wood(s, Math.round(weights[k] / total * nWood)));
  while (i < nWood) wood(segs[0], nWood - i); // what rounding left over goes to the trunk
  for (; i < N; i++) {
    const [x, y, x2, y2] = tips[r() * tips.length | 0], u = r();
    f.bx[i] = x + (x2 - x) * u + gauss(r) * .075; f.by[i] = y + (y2 - y) * u + gauss(r) * .065; f.sz[i] = 1.2 + r() * 1.7;
    const q = r(); paint(f, i, q < .05 ? C.pink : q < .1 ? C.teal : q < .45 ? C.green : q < .75 ? C.leaf : C.lime, r, .1);
  }
  const ph = Float32Array.from({ length: N }, () => r() * TAU);
  f.step = (t, tx, ty, ta) => {
    const wind = Math.sin(t * .9) * .6 + Math.sin(t * 2.1) * .2;
    for (let j = 0; j < N; j++) {
      const h = Math.max(0, Math.min(1, (1 - f.by[j]) / 1.75)), leafy = j >= nWood;
      tx[j] = f.bx[j] + wind * .045 * h * h + (leafy ? Math.sin(t * 2.6 + ph[j]) * .007 : 0);
      ty[j] = f.by[j] + (leafy ? Math.cos(t * 2.2 + ph[j]) * .005 : 0);
    }
    ta.fill(1);
  };
  return f;
}

function networkForm(N, r) {
  const f = form(N), layers = [4, 6, 6, 3], xs = [-1.08, -.36, .36, 1.08], nodes = [];
  layers.forEach((n, l) => { for (let j = 0; j < n; j++) nodes.push([xs[l], (j - (n - 1) / 2) * .29, l]); });
  const edges = []; let a0 = 0;
  for (let l = 0; l < layers.length - 1; l++) { const a1 = a0 + layers[l]; for (let a = a0; a < a1; a++) for (let b = a1; b < a1 + layers[l + 1]; b++) edges.push([a, b]); a0 = a1; }
  const nNode = N * .3 | 0, nEdge = N - nNode, nSignal = nEdge * .32 | 0;
  const node = new Int16Array(N), ang = new Float32Array(N), rad = new Float32Array(N), edge = new Int16Array(N), u0 = new Float32Array(N), sp = new Float32Array(N);
  const layerCol = [C.ice, C.lilac, C.violet, C.pink];
  for (let i = 0; i < nNode; i++) {
    node[i] = i % nodes.length; ang[i] = r() * TAU; rad[i] = r() < .6 ? .075 + (r() - .5) * .012 : Math.sqrt(r()) * .062;
    const [x, y, l] = nodes[node[i]]; f.bx[i] = x + Math.cos(ang[i]) * rad[i]; f.by[i] = y + Math.sin(ang[i]) * rad[i];
    f.sz[i] = 1.3 + r() * 1.3; paint(f, i, l === 3 && r() < .4 ? C.amber : layerCol[l], r);
  }
  for (let i = nNode; i < N; i++) {
    edge[i] = r() * edges.length | 0; u0[i] = r(); sp[i] = .32 + r() * .22;
    const [a, b] = edges[edge[i]]; f.bx[i] = nodes[a][0] + (nodes[b][0] - nodes[a][0]) * u0[i]; f.by[i] = nodes[a][1] + (nodes[b][1] - nodes[a][1]) * u0[i];
    const signal = i < nNode + nSignal; f.sz[i] = signal ? 1.5 + r() * .8 : .7 + r() * .5;
    paint(f, i, signal ? (r() < .7 ? C.ice : C.magenta) : C.violet, r, .08);
  }
  f.step = (t, tx, ty, ta) => {
    for (let i = 0; i < nNode; i++) {
      const [x, y, l] = nodes[node[i]], k = 1 + .1 * Math.sin(t * 2.4 - l * 1.1);
      tx[i] = x + Math.cos(ang[i]) * rad[i] * k; ty[i] = y + Math.sin(ang[i]) * rad[i] * k; ta[i] = 1;
    }
    for (let i = nNode; i < N; i++) {
      const [a, b] = edges[edge[i]], signal = i < nNode + nSignal, u = signal ? (u0[i] + t * sp[i]) % 1 : u0[i];
      tx[i] = nodes[a][0] + (nodes[b][0] - nodes[a][0]) * u; ty[i] = nodes[a][1] + (nodes[b][1] - nodes[a][1]) * u;
      ta[i] = signal ? Math.sin(Math.PI * u) : .38;
    }
  };
  return f;
}

function galaxyForm(N, r) {
  const f = form(N), rad = new Float32Array(N), th = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const core = i < N * .18;
    rad[i] = core ? Math.abs(gauss(r)) * .13 : .1 + Math.pow(r(), .75) * .95;
    th[i] = core ? r() * TAU : (i % 2) * Math.PI + rad[i] * 4.8 + gauss(r) * .13 * (1 - rad[i] * .3);
    f.sz[i] = core ? 1.2 + r() * 1.3 : .8 + r() * 1.3;
    const q = r(); paint(f, i, core ? (q < .5 ? C.cream : C.amber) : rad[i] < .4 ? (q < .5 ? C.vellum : C.ice) : q < .4 ? C.violet : q < .7 ? C.blue : q < .9 ? C.pink : C.ice, r);
    f.bx[i] = Math.cos(th[i]) * rad[i] * 1.2; f.by[i] = Math.sin(th[i]) * rad[i] * .74;
  }
  f.step = (t, tx, ty, ta) => {
    for (let i = 0; i < N; i++) { const a = th[i] + t * .3 / (.35 + rad[i]); tx[i] = Math.cos(a) * rad[i] * 1.2; ty[i] = Math.sin(a) * rad[i] * .74; }
    ta.fill(1);
  };
  return f;
}

const BUILD = [apartForm, rainForm, treeForm, neuronForm, networkForm, galaxyForm, eyeForm];

export function mountPointillism(canvas, { onForm, reduced } = {}) {
  const none = { supported: false, show() {}, next() {}, setPaused() {}, destroy() {} };
  const ctx = canvas?.getContext?.('2d');
  if (!ctx) return none;
  const still = reduced ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const r = rng32(0x5eb3);
  let W = 0, H = 0, S = 1, dpr = 1, N = 0, forms = [], cur = 0, prev = 0, switched = 0, lastAuto = 0, raf = 0, last = 0, clock = 0, settleUntil = 0;
  let onScreen = true, paused = false, dead = false, ptr = null;
  let px, py, vx, vy, cr, cg, cb, ca, cz, delay, tx, ty, ta, ox, oy, oa, lx, ly;

  const allocate = n => {
    N = n; forms = BUILD.map(b => b(N, rng32(0x51b + b.name.length * 977)));
    // dot i takes the i-th point of every form counted from the top (roughly), so a dot keeps its height from form to
    // form: the top of the cloud becomes the crown of the tree, the rain its trunk, and changes read as flows
    const jr = rng32(0x7ee);
    forms.forEach(f => { const key = Float32Array.from(f.by, y => y + (jr() - .5) * .3); f.map = Int32Array.from({ length: N }, (_, i) => i).sort((a, b) => key[a] - key[b]); });
    [px, py, vx, vy, tx, ty, ta, ox, oy, oa, lx, ly, ca, delay] = Array.from({ length: 14 }, () => new Float32Array(N));
    cr = new Float32Array(N); cg = new Float32Array(N); cb = new Float32Array(N); cz = new Float32Array(N);
    const f = forms[cur], M = f.map;
    for (let i = 0; i < N; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * 1.6; // the dots start as a loose cloud and gather into the first form
      const j = M[i]; px[i] = still ? f.bx[j] : Math.cos(a) * d; py[i] = still ? f.by[j] : Math.sin(a) * d * .7;
      cr[i] = f.col[j * 3]; cg[i] = f.col[j * 3 + 1]; cb[i] = f.col[j * 3 + 2]; cz[i] = f.sz[j]; ca[i] = still ? 1 : 0; delay[i] = r() * STAGGER * .6;
    }
    lx.fill(NaN);
  };

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2); W = w; H = h;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    S = Math.min(W / 2.6, (H - CAP) / 2.2);
    const want = Math.max(900, Math.min(2600, Math.round(W * H / 190)));
    if (!N || Math.abs(want - N) / N > .3) allocate(want);
    if (still || paused) render(performance.now()); // a frozen frame is redrawn at the new size, not advanced
  };

  const targets = (f, t, X, Y, A) => f.step(t, X, Y, A);

  function render(now) {
    if (!N) return; // A hidden stage can receive its first frame before ResizeObserver allocates it.
    // the forms' own clock (rain, wind, signals, rotation) stands still while paused
    const dt = Math.min((now - (last || now)) / 1000, 1 / 30); last = now;
    if (!paused) clock += dt;
    const t = clock, e = (now - switched) / 1000, f = forms[cur];
    targets(f, still ? 0 : t, tx, ty, ta);
    const moving = !still && e < STAGGER + .05 && prev !== cur;
    if (moving) targets(forms[prev], t, ox, oy, oa);
    const K = 70, D = 13, cs = Math.min(1, dt * 3.2), as = Math.min(1, dt * 6), M = f.map, PM = forms[prev].map;
    for (let i = 0; i < N; i++) {
      const go = !moving || e >= delay[i], j = M[i], q = PM[i];
      let x = go ? tx[j] : ox[q], y = go ? ty[j] : oy[q], a = go ? ta[j] : oa[q];
      if (still) { px[i] = x; py[i] = y; ca[i] = a; cr[i] = f.col[j * 3]; cg[i] = f.col[j * 3 + 1]; cb[i] = f.col[j * 3 + 2]; cz[i] = f.sz[j]; continue; }
      // a target that jumps (a raindrop or a signal starting over) is followed instantly, not flown to
      if (go && !moving && Math.abs(x - lx[i]) + Math.abs(y - ly[i]) > .3) { px[i] = x; py[i] = y; vx[i] = vy[i] = 0; ca[i] = 0; }
      lx[i] = x; ly[i] = y;
      let ax = (x - px[i]) * K - vx[i] * D, ay = (y - py[i]) * K - vy[i] * D;
      if (ptr) { const dx = px[i] - ptr[0], dy = py[i] - ptr[1], d2 = dx * dx + dy * dy; if (d2 < .09 && d2 > 1e-6) { const d = Math.sqrt(d2), k = (1 - d / .3) * 90; ax += dx / d * k; ay += dy / d * k; } }
      vx[i] += ax * dt; vy[i] += ay * dt; px[i] += vx[i] * dt; py[i] += vy[i] * dt;
      if (go) { cr[i] += (f.col[j * 3] - cr[i]) * cs; cg[i] += (f.col[j * 3 + 1] - cg[i]) * cs; cb[i] += (f.col[j * 3 + 2] - cb[i]) * cs; cz[i] += (f.sz[j] - cz[i]) * cs; }
      ca[i] += (a - ca[i]) * as;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = (H - CAP) / 2;
    for (let i = 0; i < N; i++) {
      if (ca[i] < .02) continue;
      ctx.globalAlpha = Math.min(1, ca[i]);
      ctx.fillStyle = `rgb(${cr[i] | 0},${cg[i] | 0},${cb[i] | 0})`;
      const s = cz[i] * (S / 220) ** .5, x = cx + px[i] * S, y = cy + py[i] * S;
      ctx.beginPath(); ctx.arc(x, y, Math.max(.6, s), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const tick = now => {
    raf = 0; if (dead || !onScreen || document.hidden) return;
    if (now - last >= GAP - 1) {
      if (!paused && now - lastAuto > HOLD + STAGGER * 1000) show((cur + 1) % FORMS.length, now);
      render(now);
    }
    // paused: the loop stops and the last frame stays on the canvas. A form picked while paused flies into place
    // (its clock still stopped) and then holds.
    if (paused && now >= settleUntil) return;
    raf = requestAnimationFrame(tick);
  };
  const start = () => { if (!still && !raf && !dead && onScreen && !document.hidden) { last = 0; raf = requestAnimationFrame(tick); } };

  function show(i, now = performance.now()) {
    if (i === cur || !N) return;
    prev = cur; cur = i; switched = lastAuto = now;
    // the change sets off as a wave in the beat's direction, measured from where each dot is now
    const sweep = FORMS[i].sweep;
    for (let k = 0; k < N; k++) {
      const v = Math.min(1, Math.max(0, (py[k] + 1) / 2)), o = Math.min(1, Math.hypot(px[k] / 1.3, py[k]));
      const w = sweep === 'down' ? v : sweep === 'up' ? 1 - v : sweep === 'in' ? 1 - o : o;
      delay[k] = (w * .78 + r() * .22) * STAGGER;
      if (!still) { vx[k] += (r() - .5) * .8; vy[k] += (r() - .5) * .8; }
    }
    lx.fill(NaN); settleUntil = now + (STAGGER + 1.4) * 1000;
    onForm?.(i);
    if (still) render(now); else start();
  }

  const toUnit = e => { const b = canvas.getBoundingClientRect(); return [(e.clientX - b.left - W / 2) / S, (e.clientY - b.top - (H - CAP) / 2) / S]; };
  const move = e => { ptr = e.pointerType === 'touch' ? null : toUnit(e); };
  const leave = () => { ptr = null; };
  canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerleave', leave);
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null; ro?.observe(canvas);
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; if (onScreen) { lastAuto = Math.max(lastAuto, performance.now() - HOLD); start(); } }) : null; io?.observe(canvas);
  const vis = () => { if (!document.hidden) start(); };
  document.addEventListener('visibilitychange', vis);
  resize(); switched = lastAuto = performance.now();
  start();

  return {
    supported: true,
    show: i => show(i),
    next: () => show((cur + 1) % FORMS.length),
    setPaused: p => { paused = !!p; if (!paused) { lastAuto = performance.now(); start(); } },
    destroy() { dead = true; cancelAnimationFrame(raf); ro?.disconnect(); io?.disconnect(); document.removeEventListener('visibilitychange', vis); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerleave', leave); },
  };
}
