/* Pointillism: one population of dots that keeps reorganising into different forms. The same dots spell SyberLabs,
   become a cloud that rains, a tree in the wind, a neural network that fires, a strange attractor and a spiral galaxy,
   then spell the name again. Each form keeps moving once it has formed (the rain falls, the branches sway, signals
   travel along the network's edges, the galaxy turns), and every change of form sends the dots on a short, staggered
   flight to their new places and colours.

   mountPointillism(canvas, { onForm, reduced }) -> { supported, show(i), next(), setPaused(b), destroy() }
     onForm(i)  Called whenever the form changes (by the cycle or by show()).
     reduced    Defaults to prefers-reduced-motion: each form is drawn once, still, and the cycle does not advance.

   Canvas 2D, 1 device pixel per CSS px up to 2x, at most 60 frames a second. Pauses off screen and in hidden tabs.
   The pointer gently parts the dots. Forms live in a unit space (x in ±1.3, y in ±1, y down) scaled to the canvas. */

export const FORMS = [
  { id: 'syberlabs', label: 'SyberLabs' },
  { id: 'rain', label: 'A cloud, raining' },
  { id: 'tree', label: 'A tree in the wind' },
  { id: 'network', label: 'A neural network, firing' },
  { id: 'attractor', label: 'A strange attractor' },
  { id: 'galaxy', label: 'A spiral galaxy' },
];

const FONT = '"Instrument Serif", Georgia, "Times New Roman", serif';
const HOLD = 5600, STAGGER = 0.75, GAP = 1000 / 60;
const TAU = Math.PI * 2;

const rng32 = seed => () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const C = {
  vellum: hex('#eef0ff'), mist: hex('#b4bbe2'), slate: hex('#7f8db5'), ice: hex('#90d8f0'), blue: hex('#4890f0'),
  violet: hex('#9a6bff'), lilac: hex('#c7a4ff'), magenta: hex('#ff58d6'), pink: hex('#f59be0'), amber: hex('#ffb54a'),
  cream: hex('#f2d9a6'), green: hex('#a6f08f'), leaf: hex('#6fd38a'), lime: hex('#c9f59a'), teal: hex('#62e3d8'),
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

function textForm(N, r, word = 'SyberLabs') {
  const f = form(N), W = 1200, H = 320, unit = W / 2 / 1.25;
  const ink = [];
  try {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    let fs = 250; g.font = `${fs}px ${FONT}`;
    const w = g.measureText(word).width; if (w > W * .94) { fs *= W * .94 / w; g.font = `${fs}px ${FONT}`; }
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(word, W / 2, H / 2);
    const d = g.getImageData(0, 0, W, H).data;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 140) ink.push(x, y);
  } catch (e) { /* no 2D text: the fallback ring below */ }
  const stops = [C.violet, C.blue, C.ice, C.pink, C.amber];
  for (let i = 0; i < N; i++) {
    if (ink.length) { const j = (r() * ink.length / 2 | 0) * 2; f.bx[i] = (ink[j] + r() * 2 - W / 2) / unit; f.by[i] = (ink[j + 1] + r() * 2 - H / 2) / unit; }
    else { const a = r() * TAU, d = .5 + r() * .1; f.bx[i] = Math.cos(a) * d; f.by[i] = Math.sin(a) * d; }
    paint(f, i, ramp(stops, (f.bx[i] + 1.15) / 2.3), r); f.sz[i] = .9 + r() * 1.1;
  }
  const ph = Float32Array.from({ length: N }, () => r() * TAU);
  f.step = (t, tx, ty, ta) => { for (let i = 0; i < N; i++) { tx[i] = f.bx[i] + Math.sin(t * 1.3 + ph[i]) * .004; ty[i] = f.by[i] + Math.cos(t * 1.1 + ph[i]) * .004; } ta.fill(1); };
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
    for (let k = 0; k < 3 && i + k < N; k++) { const j = i + k; x0[j] = x; p0[j] = p; sp[j] = s; sub[j] = k; f.sz[j] = .9 + (2 - k) * .25; paint(f, j, k ? C.blue : C.ice, r, .06); f.bx[j] = x; f.by[j] = .3; }
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

function attractorForm(N, r) {
  const f = form(N), [a, b, c, d] = [-1.4, 1.6, 1.0, .7], stops = [C.violet, C.blue, C.ice, C.pink, C.magenta, C.amber];
  let x = .1, y = .1;
  for (let k = 0; k < 300; k++) { const nx = Math.sin(a * y) + c * Math.cos(a * x); y = Math.sin(b * x) + d * Math.cos(b * y); x = nx; }
  for (let i = 0; i < N; i++) {
    let px = x, py = y;
    for (let k = 0; k < 3; k++) { px = x; py = y; const nx = Math.sin(a * y) + c * Math.cos(a * x); y = Math.sin(b * x) + d * Math.cos(b * y); x = nx; }
    f.bx[i] = x / 2 * 1.15; f.by[i] = y / 1.7 * .95; f.sz[i] = .8 + r() * 1.1;
    paint(f, i, ramp(stops, (Math.atan2(y - py, x - px) / TAU + .5)), r, .08);
  }
  f.step = (t, tx, ty, ta) => {
    const q = Math.sin(t * .25) * .16, s = 1 + .035 * Math.sin(t * .6), cq = Math.cos(q), sq = Math.sin(q);
    for (let i = 0; i < N; i++) { tx[i] = (f.bx[i] * cq - f.by[i] * sq) * s; ty[i] = (f.bx[i] * sq + f.by[i] * cq) * s; }
    ta.fill(1);
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

const BUILD = [textForm, rainForm, treeForm, networkForm, attractorForm, galaxyForm];

export function mountPointillism(canvas, { onForm, reduced } = {}) {
  const none = { supported: false, show() {}, next() {}, setPaused() {}, destroy() {} };
  const ctx = canvas?.getContext?.('2d');
  if (!ctx) return none;
  const still = reduced ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const r = rng32(0x5eb3);
  let W = 0, H = 0, S = 1, dpr = 1, N = 0, forms = [], cur = 0, prev = 0, switched = 0, lastAuto = 0, raf = 0, last = 0, t0 = performance.now();
  let onScreen = true, paused = false, dead = false, ptr = null;
  let px, py, vx, vy, cr, cg, cb, ca, cz, delay, tx, ty, ta, ox, oy, oa, lx, ly;

  const allocate = n => {
    N = n; forms = BUILD.map(b => b(N, rng32(0x51b + b.name.length * 977)));
    [px, py, vx, vy, tx, ty, ta, ox, oy, oa, lx, ly, ca, delay] = Array.from({ length: 14 }, () => new Float32Array(N));
    cr = new Float32Array(N); cg = new Float32Array(N); cb = new Float32Array(N); cz = Float32Array.from(forms[cur].sz);
    const f = forms[cur];
    for (let i = 0; i < N; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * 1.6; // the dots start as a loose cloud and gather into the first form
      px[i] = still ? f.bx[i] : Math.cos(a) * d; py[i] = still ? f.by[i] : Math.sin(a) * d * .7;
      cr[i] = f.col[i * 3]; cg[i] = f.col[i * 3 + 1]; cb[i] = f.col[i * 3 + 2]; ca[i] = still ? 1 : 0; delay[i] = r() * STAGGER;
    }
    lx.fill(NaN);
  };

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2); W = w; H = h;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    S = Math.min(W / 2.6, H / 2.2);
    const want = Math.max(900, Math.min(2600, Math.round(W * H / 190)));
    if (!N || Math.abs(want - N) / N > .3) allocate(want);
    if (still) render(performance.now());
  };

  const targets = (f, t, X, Y, A) => f.step(t, X, Y, A);

  function render(now) {
    const t = (now - t0) / 1000, e = (now - switched) / 1000, f = forms[cur];
    targets(f, still ? 0 : t, tx, ty, ta);
    const moving = !still && e < STAGGER + .05 && prev !== cur;
    if (moving) targets(forms[prev], t, ox, oy, oa);
    const dt = Math.min((now - (last || now)) / 1000, 1 / 30); last = now;
    const K = 70, D = 13, cs = Math.min(1, dt * 3.2), as = Math.min(1, dt * 6);
    for (let i = 0; i < N; i++) {
      const go = !moving || e >= delay[i];
      let x = go ? tx[i] : ox[i], y = go ? ty[i] : oy[i], a = go ? ta[i] : oa[i];
      if (still) { px[i] = x; py[i] = y; ca[i] = a; cr[i] = f.col[i * 3]; cg[i] = f.col[i * 3 + 1]; cb[i] = f.col[i * 3 + 2]; cz[i] = f.sz[i]; continue; }
      // a target that jumps (a raindrop or a signal starting over) is followed instantly, not flown to
      if (go && !moving && Math.abs(x - lx[i]) + Math.abs(y - ly[i]) > .3) { px[i] = x; py[i] = y; vx[i] = vy[i] = 0; ca[i] = 0; }
      lx[i] = x; ly[i] = y;
      let ax = (x - px[i]) * K - vx[i] * D, ay = (y - py[i]) * K - vy[i] * D;
      if (ptr) { const dx = px[i] - ptr[0], dy = py[i] - ptr[1], d2 = dx * dx + dy * dy; if (d2 < .09 && d2 > 1e-6) { const d = Math.sqrt(d2), k = (1 - d / .3) * 90; ax += dx / d * k; ay += dy / d * k; } }
      vx[i] += ax * dt; vy[i] += ay * dt; px[i] += vx[i] * dt; py[i] += vy[i] * dt;
      if (go) { cr[i] += (f.col[i * 3] - cr[i]) * cs; cg[i] += (f.col[i * 3 + 1] - cg[i]) * cs; cb[i] += (f.col[i * 3 + 2] - cb[i]) * cs; cz[i] += (f.sz[i] - cz[i]) * cs; }
      ca[i] += (a - ca[i]) * as;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
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
    raf = requestAnimationFrame(tick);
  };
  const start = () => { if (!still && !raf && !dead && onScreen && !document.hidden) { last = 0; raf = requestAnimationFrame(tick); } };

  function show(i, now = performance.now()) {
    if (i === cur || !N) return;
    prev = cur; cur = i; switched = lastAuto = now;
    for (let k = 0; k < N; k++) { delay[k] = r() * STAGGER; if (!still) { vx[k] += (r() - .5) * 1.4; vy[k] += (r() - .5) * 1.4; } }
    lx.fill(NaN);
    onForm?.(i);
    if (still) render(now);
  }

  const toUnit = e => { const b = canvas.getBoundingClientRect(); return [(e.clientX - b.left - W / 2) / S, (e.clientY - b.top - H / 2) / S]; };
  const move = e => { ptr = e.pointerType === 'touch' ? null : toUnit(e); };
  const leave = () => { ptr = null; };
  canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerleave', leave);
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null; ro?.observe(canvas);
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; if (onScreen) { lastAuto = Math.max(lastAuto, performance.now() - HOLD); start(); } }) : null; io?.observe(canvas);
  const vis = () => { if (!document.hidden) start(); };
  document.addEventListener('visibilitychange', vis);
  resize(); switched = lastAuto = performance.now();
  // the name is set in the site's serif: once the font has arrived, re-set it so the dots spell it in the right face
  document.fonts?.ready?.then(() => { if (dead || !N) return; forms[0] = textForm(N, rng32(0x51b + 'textForm'.length * 977)); if (still && cur === 0) render(performance.now()); });
  start();

  return {
    supported: true,
    show: i => show(i),
    next: () => show((cur + 1) % FORMS.length),
    setPaused: p => { paused = !!p; if (!paused) lastAuto = performance.now(); },
    destroy() { dead = true; cancelAnimationFrame(raf); ro?.disconnect(); io?.disconnect(); document.removeEventListener('visibilitychange', vis); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerleave', leave); },
  };
}
