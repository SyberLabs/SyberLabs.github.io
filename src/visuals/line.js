/* SyberLabs: the Line, the homepage's first screen. A model, drawn as a small network, proposes changes. Each goes
   down a line of stations (Propose, Check, Review, Approve) and the ones that reach Approve wait there until the
   visitor approves them. Approved changes turn onto the published line at the foot. The rules are
   src/visuals/line-sim.js; this file draws them.

   The network is computed, not animated: each frame runs a forward pass through fixed weights, and what is drawn is
   each unit's activation and each connection's share of it. Two of its six inputs are the pointer's position, so
   the picture answers the visitor; three are slow oscillators and one is how full Approve is. Pointing at a unit
   shows its activation, and a press on the network sends a signal down from the input unit nearest the press, by
   the connections that carry most of the activation at that moment.

   The picture is an illustration and the page says so: its changes are invented. Station names are HTML, placed
   over the canvas by src/home/line.js from the positions onLayout reports. */
import { createSim, prng, QUEUE, TIME } from './line-sim.js';

const root = typeof window !== 'undefined' ? window : globalThis;
const TAU = Math.PI * 2;
const VELLUM = [241, 246, 249], BODY = [195, 207, 214], MIST = [147, 164, 174], STEEL = [127, 166, 189];
const ELECTRIC = [2, 151, 222], ELECTRIC_HI = [76, 192, 245], CANTALOUPE = [252, 115, 77];
const MONO = '500 13px "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SANS = '400 14px "Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif';
const SANS_NARROW = '400 13px "Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif';

const cl = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => { p = cl(p); return p * p * (3 - 2 * p); };
const out3 = p => 1 - Math.pow(1 - cl(p), 3);
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${cl(a).toFixed(3)})`;

// units in each layer, top to bottom, and how wide each layer is drawn (the last is the one output)
const LAYERS = [6, 10, 14, 10, 6, 1], SPREAD = [0.62, 0.9, 1, 0.84, 0.48, 0];
const CHIP_W = 64, CHIP_H = 26, STACK = 31, GRID = 26, REACH = 150, COMMIT = 34;
// The way down from the model's output, in steps: to Propose, to Check, to Review, to Approve (further off, because
// up to three changes wait above it) and to the published line. STEP is the least a step may measure, in pixels.
const WAY = [0.9, 1, 1, 1.9, 0.9], SPAN = WAY.reduce((a, b) => a + b, 0), STEP = 60;

function network(seed) {
  const rand = prng(seed), W = [], B = [];
  for (let k = 0; k < LAYERS.length - 1; k++) {
    const nin = LAYERS[k], scale = 2.1 / Math.sqrt(nin);
    W.push(Array.from({ length: LAYERS[k + 1] }, () => Float32Array.from({ length: nin }, () => (rand() * 2 - 1) * scale)));
    B.push(Float32Array.from({ length: LAYERS[k + 1] }, () => (rand() * 2 - 1) * 0.3));
  }
  return { W, B, A: LAYERS.map(n => new Float32Array(n)), scale: LAYERS.slice(0, -1).map(n => 2.1 / Math.sqrt(n)) };
}
function forward(net, input) {
  net.A[0].set(input);
  for (let k = 0; k < net.W.length; k++) {
    const a = net.A[k], o = net.A[k + 1], w = net.W[k], b = net.B[k];
    for (let j = 0; j < o.length; j++) { let s = b[j]; const wj = w[j]; for (let i = 0; i < a.length; i++) s += wj[i] * a[i]; o[j] = Math.tanh(s); }
  }
}

// Where everything is, in CSS pixels of the canvas. `zone` is the element whose box the picture is drawn in: beside
// the copy on wide screens, under it on narrow ones.
function geometry(canvas, zone) {
  const c = canvas.getBoundingClientRect(), z = zone.getBoundingClientRect();
  const W = Math.max(2, Math.round(c.width)), H = Math.max(2, Math.round(c.height));
  const zx = z.left - c.left, zy = z.top - c.top, zw = z.width, zh = z.height;
  const wide = zx > 60;
  const ax = Math.round(zx + zw * (wide ? 0.5 : 0.44));
  const top = zy + (wide ? 50 : 14), foot = wide ? 34 : 30, hw = Math.min(zw * (wide ? 0.47 : 0.42), 250);
  // the network takes two fifths of the box (a third on narrow screens), less when the stations need the room
  const nh = Math.max(120, Math.min(zh * (wide ? 0.4 : 0.34), zy + zh - foot - top - SPAN * STEP));
  const yOut = top + nh, yB = zy + zh - foot, g = (yB - yOut) / SPAN;
  const yP = yOut + g * WAY[0], yC = yP + g * WAY[1], yR = yC + g * WAY[2], yA = yR + g * WAY[3];
  const nodes = LAYERS.map((n, k) => {
    const y = top + nh * k / (LAYERS.length - 1);
    return Array.from({ length: n }, (_, i) => {
      const u = n > 1 ? i / (n - 1) * 2 - 1 : 0, bx = ax + u * hw * SPREAD[k], by = y + (u * u - 0.4) * 14 * SPREAD[k];
      return { bx, by, x: bx, y: by, lean: (k - 2.5) * SPREAD[k], phase: (k * 1.7 + i * 2.3) % TAU };
    });
  });
  return { W, H, zx, zy, zw, zh, wide, ax, top, nh, hw, yOut, yP, yC, yR, yA, yB, nodes, right: wide ? W : zx + zw };
}

// The ground: a light behind the network and a grid of dots, drawn once for each size.
function ground(G, dpr) {
  const off = document.createElement('canvas');
  off.width = Math.round(G.W * dpr); off.height = Math.round(G.H * dpr);
  const g = off.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cy = G.top + G.nh * 0.55, r = g.createRadialGradient(G.ax, cy, 0, G.ax, cy, G.nh * 1.5);
  r.addColorStop(0, rgba(ELECTRIC, 0.16)); r.addColorStop(0.45, rgba(ELECTRIC, 0.05)); r.addColorStop(1, rgba(ELECTRIC, 0));
  g.fillStyle = r; g.fillRect(0, 0, G.W, G.H);
  g.fillStyle = rgba(STEEL, 1);
  const fade = Math.max(G.W, G.H) * 0.62;
  for (let y = (G.yB % GRID) - GRID; y < G.H + GRID; y += GRID) for (let x = (G.ax % GRID) - GRID; x < G.W + GRID; x += GRID) {
    g.globalAlpha = 0.05 + 0.16 * cl(1 - Math.hypot(x - G.ax, y - cy) / fade);
    g.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
  }
  return off;
}

export function mount(canvas, { zone, surface, onLayout, onState } = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !zone) return null;
  const still = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sim = createSim(), S = sim.state, net = network(7), input = new Float32Array(LAYERS[0]);
  let G = null, back = null, dpr = 1, maxDpr = Math.min(root.devicePixelRatio || 1, 2);
  let t = 0, last = 0, visible = false, slow = 0, fast = 0, lastState = '';
  const pointer = { x: 0, y: 0, u: 0, v: 0, on: 0, seen: false };   // u, v: where the network's first two inputs are heading
  const pulses = [], rings = [], taps = [];
  let ambient = 0, dim = 1;
  const drawn = new Map();   // per change and per commit: the position it is drawn at, eased toward where the rules put it

  // ---------- the network ----------
  function think(dt) {
    const k = Math.min(1, dt * 5);
    if (pointer.on > 0.01) { input[0] += (pointer.u - input[0]) * k; input[1] += (pointer.v - input[1]) * k; }
    else { input[0] += (Math.sin(t * 0.31) * 0.8 - input[0]) * k; input[1] += (Math.cos(t * 0.23) * 0.8 - input[1]) * k; }
    input[2] = Math.sin(t * 0.7); input[3] = Math.cos(t * 0.45 + 1); input[4] = Math.sin(t * 0.27 + 2);
    input[5] = sim.waiting() / QUEUE * 2 - 1;
    forward(net, input);
    // the units lean a little toward the pointer, the upper layers one way and the lower the other, and drift
    for (const layer of G ? G.nodes : []) for (const n of layer) {
      n.x = n.bx + n.lean * 5 * input[0] * pointer.on + (still ? 0 : Math.sin(t * 0.6 + n.phase) * 1.2 * Math.abs(n.lean));
      n.y = n.by + n.lean * 2.5 * input[1] * pointer.on;
    }
  }
  // The strongest way down from one input unit: at each layer, the connection carrying most of the activation.
  function strongest(from) {
    const path = [from];
    for (let k = 0; k < net.W.length; k++) {
      const i = path[k], a = net.A[k][i]; let best = 0, bv = -1;
      for (let j = 0; j < LAYERS[k + 1]; j++) { const v = Math.abs(net.W[k][j][i] * a) + 0.12 * Math.abs(net.A[k + 1][j]) + ((i * 7 + j * 13 + (t * 3 | 0)) % 5) * 0.03; if (v > bv) { bv = v; best = j; } }
      path.push(best);
    }
    return path;
  }
  function pulse(bright, per, from = (Math.random() * LAYERS[0]) | 0, delay = 0, loud = false) { pulses.push({ path: strongest(from), seg: 0, p: -delay, per, bright, loud }); }
  // A press on the network: a signal goes down from the input unit nearest the press, and from its two neighbours.
  function press() {
    if (!G || Math.abs(pointer.x - G.ax) > G.hw + 48 || pointer.y < G.top - 36 || pointer.y > G.yOut + 14) return;
    taps.push({ x: pointer.x, y: pointer.y, at: t });
    const first = G.nodes[0]; let near = 0;
    first.forEach((n, i) => { if (Math.abs(n.x - pointer.x) < Math.abs(first[near].x - pointer.x)) near = i; });
    [near, Math.max(0, near - 1), Math.min(first.length - 1, near + 1)].forEach((from, n) => pulse(false, 0.17, from, n * 0.45, true));
  }
  const curve = (a, b, p, out) => {   // a point on the connection from unit a to unit b
    const d = b.y - a.y, q = 1 - p, c1y = a.y + d * 0.55, c2y = b.y - d * 0.55;
    out.x = q * q * q * a.x + 3 * q * q * p * a.x + 3 * q * p * p * b.x + p * p * p * b.x;
    out.y = q * q * q * a.y + 3 * q * q * p * c1y + 3 * q * p * p * c2y + p * p * p * b.y;
  };

  function drawNetwork() {
    const N = G.nodes, near = pointer.on;
    // connections, in six batches by strength so the canvas changes style six times, not three hundred
    const B = 6, batch = Array.from({ length: B }, () => []);
    for (let k = 0; k < net.W.length; k++) {
      const a = net.A[k], w = net.W[k], sc = net.scale[k];
      for (let j = 0; j < w.length; j++) for (let i = 0; i < a.length; i++) {
        let e = Math.min(1, Math.abs(w[j][i] * a[i]) / sc);
        if (near > 0.01) { const n = N[k][i], m = N[k + 1][j]; e = Math.min(1, e + 0.55 * near * Math.max(cl(1 - Math.hypot(n.x - pointer.x, n.y - pointer.y) / REACH), cl(1 - Math.hypot(m.x - pointer.x, m.y - pointer.y) / REACH))); }
        batch[Math.min(B - 1, (e * e * B) | 0)].push(N[k][i], N[k + 1][j]);
      }
    }
    ctx.lineWidth = 1; ctx.globalCompositeOperation = 'lighter';
    for (let b = 0; b < B; b++) {
      const list = batch[b]; if (!list.length) continue;
      ctx.strokeStyle = rgba(b > 3 ? ELECTRIC_HI : ELECTRIC, (0.055 + 0.6 * Math.pow(b / (B - 1), 1.6)) * dim);
      ctx.beginPath();
      for (let n = 0; n < list.length; n += 2) { const p = list[n], q = list[n + 1], d = q.y - p.y; ctx.moveTo(p.x, p.y); ctx.bezierCurveTo(p.x, p.y + d * 0.55, q.x, q.y - d * 0.55, q.x, q.y); }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    // units: size and light follow the activation; a negative activation is drawn hollow
    let probe = null, reach = 24;
    for (let k = 0; k < N.length; k++) for (let i = 0; i < N[k].length; i++) {
      const n = N[k][i], a = net.A[k][i], m = Math.abs(a), far = Math.hypot(n.x - pointer.x, n.y - pointer.y), lit = near * cl(1 - far / REACH);
      if (pointer.seen && near > 0.5 && far < reach) { reach = far; probe = { n, k, i, a }; }
      const r = 2 + 2.6 * m + 1.6 * lit;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(ELECTRIC, (0.1 * m + 0.2 * lit) * dim); ctx.beginPath(); ctx.arc(n.x, n.y, r * 3.2, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, TAU);
      if (a >= 0) { ctx.fillStyle = rgba(m > 0.6 || lit > 0.4 ? VELLUM : ELECTRIC_HI, (0.4 + 0.6 * m + 0.4 * lit) * dim); ctx.fill(); }
      else { ctx.fillStyle = 'rgb(2,7,10)'; ctx.fill(); ctx.strokeStyle = rgba(ELECTRIC_HI, (0.35 + 0.6 * m + 0.4 * lit) * dim); ctx.lineWidth = 1.2; ctx.stroke(); }
    }
    // the two inputs the visitor moves
    if (pointer.seen && G.wide) {
      const a = N[0][0], b = N[0][1], k = 0.35 + 0.65 * near;
      ctx.strokeStyle = rgba(MIST, 0.55 * k); ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(a.x - 6, a.y - 12); ctx.lineTo(a.x - 6, a.y - 17); ctx.lineTo(b.x + 6, b.y - 17); ctx.lineTo(b.x + 6, b.y - 12); ctx.stroke();
      ctx.font = MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = rgba(MIST, k);
      ctx.fillText('your pointer', (a.x + b.x) / 2, Math.min(a.y, b.y) - 24);
    }
    // the unit pointed at: its place in the network and its activation, as computed for this frame
    if (probe) {
      const { n, k, i, a } = probe, label = `unit ${k + 1}.${i + 1}   ${a < 0 ? '\u2212' : '+'}${Math.abs(a).toFixed(2)}`;
      ctx.strokeStyle = rgba(VELLUM, 0.9); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(n.x, n.y, 9, 0, TAU); ctx.stroke();
      ctx.font = MONO; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(label).width + 16, left = n.x + 16 + w > G.W - 8 ? n.x - 16 - w : n.x + 16;
      ctx.fillStyle = 'rgba(2,7,10,.9)'; ctx.fillRect(left, n.y - 12, w, 24); ctx.strokeStyle = 'rgba(140,200,235,.4)'; ctx.strokeRect(left + 0.5, n.y - 11.5, w - 1, 23);
      ctx.fillStyle = rgba(VELLUM, 1); ctx.fillText(label, left + 8, n.y + 0.5);
    }
    // signals on their way down
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const P = { x: 0, y: 0 }, Q = { x: 0, y: 0 };
    for (const s of pulses) {
      const a = N[s.seg][s.path[s.seg]], b = N[s.seg + 1][s.path[s.seg + 1]];
      for (let n = 0; n < 5; n++) {
        const p1 = cl(s.p - n * 0.07), p0 = cl(p1 - 0.07); if (p1 <= 0) break;
        curve(a, b, p0, P); curve(a, b, p1, Q);
        ctx.strokeStyle = rgba(s.bright ? VELLUM : ELECTRIC_HI, (s.bright ? 0.95 : s.loud ? 0.9 : 0.5) * (1 - n / 5) * (s.loud ? 1 : dim)); ctx.lineWidth = s.bright ? 2.4 : s.loud ? 2.1 : 1.5;
        ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(Q.x, Q.y); ctx.stroke();
      }
      if (s.bright) { curve(a, b, cl(s.p), Q); ctx.fillStyle = rgba(ELECTRIC_HI, 0.5); ctx.beginPath(); ctx.arc(Q.x, Q.y, 5, 0, TAU); ctx.fill(); }
    }
    for (let i = taps.length - 1; i >= 0; i--) {   // where the network was pressed
      const tap = taps[i], p = (t - tap.at) / 0.6; if (p >= 1) { taps.splice(i, 1); continue; }
      ctx.strokeStyle = rgba(ELECTRIC_HI, 0.85 * (1 - p)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(tap.x, tap.y, 6 + 40 * out3(p), 0, TAU); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------- the line ----------
  function drawLine() {
    const { ax, yOut, yP, yC, yR, yA, yB } = G, hair = 'rgba(140,200,235,.3)', hw = CHIP_W / 2, hh = CHIP_H / 2, top = yA - (QUEUE - 1) * STACK - hh - 7;
    ctx.lineWidth = 1; ctx.lineCap = 'butt';
    ctx.strokeStyle = hair; ctx.beginPath(); ctx.moveTo(ax + 0.5, yOut + 7); ctx.lineTo(ax + 0.5, yA + hh + 5); ctx.stroke();
    // from Approve to the published line the way is dashed: it is closed until a person approves
    ctx.setLineDash([3, 5]); ctx.strokeStyle = rgba(CANTALOUPE, 0.6); ctx.beginPath(); ctx.moveTo(ax + 0.5, yA + hh + 7); ctx.lineTo(ax + 0.5, yB - 10); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = hair; ctx.beginPath(); ctx.moveTo(ax + 0.5, yB - 10); ctx.quadraticCurveTo(ax + 0.5, yB + 0.5, ax + 10, yB + 0.5); ctx.lineTo(G.right, yB + 0.5); ctx.stroke();
    // Propose: a mark on the line
    ctx.fillStyle = rgba(ELECTRIC_HI, 0.9); ctx.beginPath(); ctx.moveTo(ax, yP - hh - 20); ctx.lineTo(ax + 4, yP - hh - 16); ctx.lineTo(ax, yP - hh - 12); ctx.lineTo(ax - 4, yP - hh - 16); ctx.fill();
    // Check: a gate the change stands in
    const busy = S.slot.check && S.slot.check.st === 'check' ? 1 : 0;
    ctx.strokeStyle = rgba(busy ? ELECTRIC_HI : STEEL, busy ? 0.95 : 0.5); ctx.lineWidth = 1.2; ctx.beginPath();
    for (const d of [-1, 1]) { ctx.moveTo(ax + d * (hw + 7), yC - hh - 6); ctx.lineTo(ax + d * (hw + 13), yC - hh - 6); ctx.lineTo(ax + d * (hw + 13), yC + hh + 6); ctx.lineTo(ax + d * (hw + 7), yC + hh + 6); }
    ctx.stroke();
    // Review: a second reader, drawn as a lens
    const read = S.slot.review && S.slot.review.st === 'review' ? 1 : 0;
    ctx.strokeStyle = rgba(read ? ELECTRIC_HI : STEEL, read ? 0.9 : 0.45); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(ax - hw + 16, yR, 30, Math.PI - 0.62, Math.PI + 0.62); ctx.stroke();
    ctx.beginPath(); ctx.arc(ax + hw - 16, yR, 30, -0.62, 0.62); ctx.stroke();
    // Approve: the dock where changes stop, in the colour of the person's action
    const full = sim.waiting() / QUEUE, beat = still ? 0 : 0.5 + 0.5 * Math.sin(t * 2.6);
    ctx.strokeStyle = rgba(CANTALOUPE, 0.55 + 0.4 * full * beat); ctx.lineWidth = 1.3; ctx.beginPath();
    for (const d of [-1, 1]) { ctx.moveTo(ax + d * (hw + 2), top); ctx.lineTo(ax + d * (hw + 10), top); ctx.lineTo(ax + d * (hw + 10), yA + hh + 6); ctx.lineTo(ax + d * (hw + 2), yA + hh + 6); }
    ctx.stroke();
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i], p = (t - r.at) / 0.7; if (p >= 1) { rings.splice(i, 1); continue; }
      ctx.strokeStyle = rgba(CANTALOUPE, 0.8 * (1 - p)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ax, yA, 20 + 48 * out3(p), 0, TAU); ctx.stroke();
    }
  }

  // The published line: one mark for each change a person approved, newest first, each under its id.
  function drawCommits(dt) {
    const { ax, yB } = G, room = Math.max(1, Math.floor((G.right - ax - 60) / COMMIT));
    ctx.font = MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = 0; i < S.commits.length && i <= room; i++) {
      const c = S.commits[i], key = 'k' + c.n, want = ax + 48 + i * COMMIT;
      let x = drawn.get(key); x = x === undefined ? ax + 48 : x + (want - x) * Math.min(1, dt * 9); drawn.set(key, x);
      const a = cl((G.right - 22 - x) / 70), age = S.t - c.at, warm = cl(1 - age / 2.4);
      ctx.fillStyle = rgba(ELECTRIC_HI, a); ctx.beginPath(); ctx.arc(x, yB + 0.5, 4, 0, TAU); ctx.fill();
      if (warm > 0) { ctx.strokeStyle = rgba(CANTALOUPE, warm * a); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, yB + 0.5, 7 + 3 * (1 - warm), 0, TAU); ctx.stroke(); }
      ctx.fillStyle = rgba(i ? MIST : VELLUM, a); ctx.fillText('c' + c.n, x, yB + 11);
    }
  }

  // What is said beside a change, and where the change is.
  function words(c) {
    switch (c.st) {
      case 'propose': return [`${G.wide ? 'claims tests passed' : 'claims passed'}, ${c.conf.toFixed(2)}`, BODY];
      case 'check': return c.p < 1 ? ['running the tests', MIST] : ['tests passed', VELLUM];
      case 'stopped': return [G.wide ? 'claimed passed, tests failed' : 'tests failed', VELLUM];
      case 'review': return c.p < 1 ? ['reviewer reading', MIST] : ['reviewed', VELLUM];
      case 'returned': return ['returned by the reviewer', VELLUM];
      default: return null;
    }
  }
  function drawChip(c, dt) {
    const { ax, yOut, yP, yC, yR, yA, yB } = G, p = ease(c.p), slot = yA - Math.max(0, c.q) * STACK;
    let x = ax, y = yP, a = 1, k = 1;
    switch (c.st) {
      case 'toPropose': y = lerp(yOut, yP, p); a = cl(c.p * 4); k = 0.5 + 0.5 * p; break;
      case 'toCheck': y = lerp(yP, yC, p); break;
      case 'check': case 'stopped': y = yC; break;
      case 'toReview': y = lerp(yC, yR, p); break;
      case 'review': case 'returned': y = yR; break;
      case 'toApprove': y = lerp(yR, slot, p); break;
      case 'approve': { const was = drawn.get(c.n); y = was === undefined ? slot : was + (slot - was) * Math.min(1, dt * 10); drawn.set(c.n, y); break; }
      case 'toPublish': { const l1 = yB - yA, d = p * (l1 + 48); if (d < l1) y = yA + d; else { y = yB + 0.5; x = ax + d - l1; } k = 1 - cl((d - l1 * 0.3) / (l1 * 0.7 + 30)); break; }
    }
    if (c.st === 'stopped' || c.st === 'returned') { x = ax + 20 * out3(c.p * 2.4); y += 10 * c.p * c.p; a = 1 - ease((c.p - 0.45) / 0.55); }
    if (c.st === 'toPublish' && k < 0.3) { ctx.fillStyle = rgba(ELECTRIC_HI, 1); ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); return; }

    const out = c.st === 'stopped' || c.st === 'returned', first = S.queue[0] === c && c.st === 'approve';
    const passed = c.okCheck && !['toPropose', 'propose', 'toCheck'].includes(c.st) && (c.st !== 'check' || c.p >= 1);
    const w = CHIP_W * k, h = CHIP_H * k, l = x - w / 2, tp = y - h / 2;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(l, tp, w, h, 4 * k); else ctx.rect(l, tp, w, h); ctx.fillStyle = `rgba(2,7,10,${(0.94 * a).toFixed(3)})`; ctx.fill();
    ctx.lineWidth = 1.2;
    if (out) { ctx.setLineDash([3, 3]); ctx.strokeStyle = rgba(MIST, 0.8 * a); }
    else ctx.strokeStyle = rgba(first || c.st === 'toPublish' ? CANTALOUPE : c.st === 'check' && c.p < 1 ? ELECTRIC_HI : passed ? ELECTRIC_HI : VELLUM, (first ? 1 : passed ? 0.8 : 0.55) * a);
    ctx.stroke(); ctx.setLineDash([]);
    if (c.st === 'check' && c.p < 1 && !still) {   // the tests running: a bar crosses the change
      const sx = l + 3 + (w - 6) * ((c.p * 2.6) % 1);
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(ELECTRIC_HI, 0.55); ctx.fillRect(sx - 1, tp + 2, 2, h - 4); ctx.fillStyle = rgba(ELECTRIC, 0.2); ctx.fillRect(sx - 6, tp + 2, 6, h - 4);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (k > 0.75) {
      ctx.font = MONO; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rgba(out ? MIST : VELLUM, a); ctx.fillText(c.id, l + 9, y + 0.5);
      const gx = l + w - 13; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      if (out) { ctx.strokeStyle = rgba(MIST, a); ctx.beginPath(); ctx.moveTo(gx - 3, y - 3); ctx.lineTo(gx + 3, y + 3); ctx.moveTo(gx + 3, y - 3); ctx.lineTo(gx - 3, y + 3); ctx.stroke(); }
      else if (passed) { ctx.strokeStyle = rgba(first ? CANTALOUPE : ELECTRIC_HI, a); ctx.beginPath(); ctx.moveTo(gx - 3.5, y); ctx.lineTo(gx - 1, y + 2.8); ctx.lineTo(gx + 3.5, y - 3); ctx.stroke(); }
      else { ctx.strokeStyle = rgba(MIST, 0.9 * a); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(gx, y, 2.6, 0, TAU); ctx.stroke(); }
      ctx.lineCap = 'butt';
    }
    const say = words(c);
    if (say) {
      const settle = c.st === 'propose' || c.st === 'check' || c.st === 'review' ? cl(c.p * 6 + (c.p >= 1 ? 1 : 0)) : 1;
      ctx.font = G.wide ? SANS : SANS_NARROW; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = rgba(say[1], a * settle);
      ctx.fillText(say[0], x + CHIP_W / 2 + (out ? 10 : 22), y + 0.5, Math.max(40, G.zx + G.zw - x - CHIP_W / 2 - 24));
    }
  }

  // ---------- one frame ----------
  function update(dt) {
    t += dt;
    sim.step(dt);
    for (const e of S.events.splice(0)) {
      if (e.type === 'thinking') pulse(true, TIME.think / (LAYERS.length - 1));
      else if (e.type === 'approved') { rings.push({ at: t }); drawn.delete(e.chip.n); }
    }
    const asleep = sim.stopped();
    dim += ((asleep ? 0.5 : 1) - dim) * Math.min(1, dt * 2);
    ambient -= dt;
    if (ambient <= 0 && !asleep) { pulse(false, 0.2); ambient = 0.2 + Math.random() * 0.28; }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const s = pulses[i]; s.p += dt / s.per;
      while (s.p >= 1.35 && s.seg < LAYERS.length - 2) { s.p -= 1; s.seg++; }
      if (s.p >= 1.35) pulses.splice(i, 1);
    }
    pointer.on += ((pointer.live ? 1 : 0) - pointer.on) * Math.min(1, dt * 6);
    think(dt);
    report();
  }
  function render(dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, G.W, G.H);
    if (back) ctx.drawImage(back, 0, 0, G.W, G.H);
    if (pointer.on > 0.01) {   // the grid answers the pointer
      ctx.fillStyle = rgba(ELECTRIC_HI, 1);
      const x0 = Math.floor((pointer.x - REACH - G.ax % GRID) / GRID) * GRID + G.ax % GRID, y0 = Math.floor((pointer.y - REACH - G.yB % GRID) / GRID) * GRID + G.yB % GRID;
      for (let y = y0; y <= pointer.y + REACH; y += GRID) for (let x = x0; x <= pointer.x + REACH; x += GRID) {
        const d = 1 - Math.hypot(x - pointer.x, y - pointer.y) / REACH; if (d <= 0) continue;
        ctx.globalAlpha = 0.6 * d * d * pointer.on; const s = 1.2 + 1.6 * d; ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    }
    drawLine();
    drawNetwork();
    drawCommits(dt);
    for (const c of S.chips) drawChip(c, dt);
  }

  // What the page says about the line, sent only when it changes.
  function report() {
    if (!onState) return;
    const ready = sim.ready(), c = S.counts, waiting = sim.waiting(), halted = sim.stopped();
    const key = [c.proposed, c.stopped, c.returned, c.published, waiting, ready ? ready.id : '', halted].join();
    if (key === lastState) return;
    lastState = key;
    onState({ ...c, waiting, ready: ready ? ready.id : null, halted });
  }

  function size() {
    const next = geometry(canvas, zone);
    if (G && next.W === G.W && next.H === G.H && next.zx === G.zx && next.zy === G.zy && next.zw === G.zw && next.zh === G.zh) return;
    G = next; dpr = maxDpr;
    canvas.width = Math.round(G.W * dpr); canvas.height = Math.round(G.H * dpr);
    back = ground(G, dpr); drawn.clear();
    if (onLayout) onLayout({ axis: G.ax - G.zx, model: G.yOut - G.zy, propose: G.yP - G.zy, check: G.yC - G.zy, review: G.yR - G.zy, approve: G.yA - G.zy, publish: G.yB - G.zy, wide: G.wide, units: LAYERS.reduce((a, b) => a + b, 0), inputs: LAYERS[0] });
    if (still) render(1);
  }

  // With reduced motion nothing moves by itself: the picture is drawn once, and a press moves the rules on and
  // draws it again.
  const skip = seconds => { for (let n = Math.round(seconds * 30); n > 0; n--) { t += 1 / 30; sim.step(1 / 30); } S.events.length = 0; think(1); report(); };

  if (surface && !still) {
    const move = e => {
      if (!G) return;
      const b = canvas.getBoundingClientRect();
      pointer.x = e.clientX - b.left; pointer.y = e.clientY - b.top; pointer.live = true; pointer.seen = pointer.seen || e.pointerType === 'mouse';
      pointer.u = cl(pointer.x / G.W) * 2 - 1; pointer.v = cl(pointer.y / G.H) * 2 - 1;
    };
    surface.addEventListener('pointermove', move, { passive: true });
    surface.addEventListener('pointerdown', e => { move(e); press(); }, { passive: true });
    surface.addEventListener('pointerleave', () => { pointer.live = false; }, { passive: true });
    surface.addEventListener('pointercancel', () => { pointer.live = false; }, { passive: true });
    root.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') pointer.live = false; }, { passive: true });
  }

  if ('IntersectionObserver' in root) new IntersectionObserver(en => { visible = en[0].isIntersecting; last = 0; }, { threshold: 0.01 }).observe(canvas);
  else visible = true;
  if ('ResizeObserver' in root) { const ro = new ResizeObserver(size); ro.observe(canvas); ro.observe(zone); } else root.addEventListener('resize', size);
  if (document.fonts && document.fonts.load) for (const font of [MONO, SANS, SANS_NARROW]) document.fonts.load(font).catch(() => {});

  function frame(now) {
    root.requestAnimationFrame(frame);
    if (!visible || document.hidden || !G || document.documentElement.classList.contains('sy-atlas-open')) { last = 0; return; }
    const raw = last ? (now - last) / 1000 : 0.016, dt = Math.min(raw, 0.05); last = now;
    update(dt); render(dt);
    if (raw > 0.024) slow++; else fast++;
    if (slow + fast >= 60) {   // a slow device draws fewer pixels
      if (slow > 36 && dpr > 1) { maxDpr = dpr = Math.max(1, dpr - 0.5); canvas.width = Math.round(G.W * dpr); canvas.height = Math.round(G.H * dpr); back = ground(G, dpr); }
      slow = fast = 0;
    }
  }

  skip(still ? 13 : 4.2);   // the page opens with the line already at work
  size();
  if (!still) root.requestAnimationFrame(frame);

  return {
    approve() {
      const chip = sim.approve();
      if (!chip) return null;
      if (still) { skip(3.4); render(1); } else report();
      return chip.id;
    },
  };
}
