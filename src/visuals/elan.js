/* SyberLabs: Elan, the homepage's one visual (src/home/). One rule: every finished duplex forks into two. Dot-matrix
   material. mount(canvas, opts): `pad` is the room kept free at the foot of the canvas (110px unless given), `fill`
   scales the finished figure inside the canvas (1 unless given; less leaves room for the drifting dots), and
   `zoom: false` keeps one scale throughout, where the default starts close and draws back as the figure grows.
   `maxDpr` and `minDpr` bound the pixels drawn for each CSS pixel (2 and 1 unless given): a small canvas can afford
   a phone's full density, and on a plain screen drawing it at twice its size keeps the smallest dots from twinkling.
   The canvas is never left cleared: whenever its size or density changes it is drawn again in the same frame. */
const root = typeof window !== 'undefined' ? window : globalThis;
var TAU = 6.283185307, V = 0.3, W0 = 0.062, DOCK = 0.6, START = -1.0, LAG = 0.16;
// lineage colours: vellum, electric-hi, electric, cantaloupe-hi, steel; 5 = the dim centre row
var COL = ['227,243,252', '76,192,245', '2,151,222', '253,146,115', '127,166,189', '118,150,172'];

function hsh(k, salt) { var x = Math.sin(k * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); }
function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function sstep(a, b, x) { x = cl((x - a) / (b - a)); return x * x * (3 - 2 * x); }
function back(p) { var c = 1.5; p -= 1; return 1 + (c + 1) * p * p * p + c * p * p; }

function build(spec, rot, w0) {
  w0 = w0 || W0;
  var th = spec.th * Math.PI / 180, seed = spec.n * 13 + spec.th, D = [];
  var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, tEnd = 0, sMax = 0;
  function dot(x, y, tj, s, c, r) {
    var id = D.length / 10, a = hsh(id, seed) * TAU, h2 = hsh(id, seed + 1), rad = 0.04 + 0.34 * h2 * h2;
    D.push(x, y, Math.cos(a) * rad, Math.sin(a) * rad, hsh(id, seed + 2), hsh(id, seed + 3), tj, s, c, r);
  }
  function add(x, y, phi, g, t0, cL, cR, S0, outer) {
    var L = Math.pow(spec.r, g), w = w0 * Math.pow(0.9, g), dur = L / V, p = w / 2;
    var dx = Math.cos(phi), dy = Math.sin(phi), nx = Math.sin(phi), ny = -Math.cos(phi);
    var n = Math.max(2, Math.round(L / p)), r = p * 0.31;
    var lagL = outer === 0 ? -LAG : outer === 1 ? LAG : 0, lagR = -lagL;
    for (var j = 0; j < n; j++) {
      var f = (j + 0.5) / n, px = x + dx * L * f, py = y + dy * L * f, tj = t0 + f * dur, s = S0 + f * L;
      dot(px + nx * w / 2, py + ny * w / 2, tj + lagL, s, cL, r);
      dot(px, py, tj, s, 5, r * 0.8);
      dot(px - nx * w / 2, py - ny * w / 2, tj + lagR, s, cR, r);
    }
    var ex = x + dx * L, ey = y + dy * L;
    x0 = Math.min(x0, x, ex); x1 = Math.max(x1, x, ex); y0 = Math.min(y0, y, ey); y1 = Math.max(y1, y, ey);
    tEnd = Math.max(tEnd, t0 + dur + LAG); sMax = Math.max(sMax, S0 + L);
    if (g === spec.d) { dot(ex + dx * p * 0.6, ey + dy * p * 0.6, t0 + dur + LAG, S0 + L, 1, r * 1.5); return; }
    var wd = w0 * Math.pow(0.9, g + 1), nc = 1 + (g % 4), pL = phi - th, pR = phi + th;
    add(ex + nx * w / 2 - Math.sin(pL) * wd / 2, ey + ny * w / 2 + Math.cos(pL) * wd / 2, pL, g + 1, t0 + dur, cL, nc, S0 + L, 0);
    add(ex - nx * w / 2 + Math.sin(pR) * wd / 2, ey - ny * w / 2 - Math.cos(pR) * wd / 2, pR, g + 1, t0 + dur, nc, cR, S0 + L, 1);
  }
  dot(0, 0, -0.5, 0, 3, 0.2 * w0);
  for (var i = 0; i < spec.n; i++) {
    var phi = rot + i * TAU / spec.n;
    add(Math.cos(phi) * 0.65 * w0, Math.sin(phi) * 0.65 * w0, phi, 0, 0, 0, 0, 0, -1);
  }
  return { spec: spec, D: new Float32Array(D), count: D.length / 10, tEnd: tEnd, sMax: sMax,
           cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, bw: x1 - x0 + 2 * w0, bh: y1 - y0 + 2 * w0 };
}

function fit(spec, W, H, pad, w0) {
  pad = pad == null ? 110 : pad;
  var a = build(spec, -Math.PI / 2, w0), b = build(spec, 0, w0);
  var sa = Math.min(W * 0.92 / a.bw, (H - pad) * 0.94 / a.bh), sb = Math.min(W * 0.92 / b.bw, (H - pad) * 0.94 / b.bh);
  var F = sa >= sb ? a : b; F.scale = Math.max(sa, sb); F.pad = pad; return F;
}

var NB = 12, bk = [];
for (var q = 0; q < NB; q++) bk.push([]);
// 0,1 dust tiers; 2 docking; 3..8 docked by colour; 9..11 light tiers

function render(ctx, W, H, F, tau, t, front, zoom) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, W, H);
  var zb = zoom === false ? 1 : sstep(0, F.tEnd * 0.72, tau), sc = F.scale * (1.9 - 0.9 * zb);
  var ox = W / 2 - F.cx * zb * sc, oy = (H - F.pad * 0.4) / 2 - F.cy * zb * sc;
  var D = F.D, n = F.count, i, o, b;
  for (i = 0; i < NB; i++) bk[i].length = 0;
  var c5 = Math.cos(t * 0.5), s5 = Math.sin(t * 0.5);
  for (i = 0; i < n; i++) {
    o = i * 10;
    var x = D[o], y = D[o + 1], r = D[o + 9], dtj = tau - D[o + 6], p = dtj / DOCK + 1;
    if (p >= 1) {
      b = bk[3 + D[o + 8]]; b.push(ox + x * sc, oy + y * sc, r * sc);
      var lit = dtj < 0.4 ? 1 - dtj / 0.4 : 0;
      if (front > -1) { var pd = Math.abs(D[o + 7] - front); if (pd < 0.11) lit = Math.max(lit, 1 - pd / 0.11); }
      if (lit > 0.04) { b = bk[lit > 0.66 ? 11 : lit > 0.33 ? 10 : 9]; b.push(ox + x * sc, oy + y * sc, r * sc * (1.15 + 1.5 * lit)); }
    } else {
      var h3 = D[o + 4], h4 = D[o + 5];
      var ph = h3 * TAU, fx = x + D[o + 2] + 0.016 * (Math.sin(ph) * c5 + Math.cos(ph) * s5);
      var ph2 = h4 * TAU, fy = y + D[o + 3] + 0.016 * (Math.cos(ph2) * c5 - Math.sin(ph2) * s5);
      if (p <= 0) { b = bk[h4 < 0.5 ? 0 : 1]; b.push(ox + fx * sc, oy + fy * sc, r * sc * (0.6 + 0.5 * h3)); }
      else { var e = back(p); bk[2].push(ox + (fx + (x - fx) * e) * sc, oy + (fy + (y - fy) * e) * sc, r * sc * (0.8 + 0.3 * e)); }
    }
  }
  function draw(a, style) {
    if (!a.length) return;
    ctx.beginPath();
    for (var k = 0; k < a.length; k += 3) {
      var rp = a[k + 2];
      if (rp < 1.05) { if (rp < 0.6) rp = 0.6; ctx.rect(a[k] - rp, a[k + 1] - rp, rp * 2, rp * 2); }
      else { ctx.moveTo(a[k] + rp, a[k + 1]); ctx.arc(a[k], a[k + 1], rp, 0, TAU); }
    }
    ctx.fillStyle = style; ctx.fill();
  }
  var dustA = sstep(START, START + 0.8, tau);
  draw(bk[0], 'rgba(' + COL[4] + ',' + (0.26 * dustA).toFixed(3) + ')');
  draw(bk[1], 'rgba(' + COL[4] + ',' + (0.5 * dustA).toFixed(3) + ')');
  draw(bk[8], 'rgba(' + COL[5] + ',0.6)');
  for (i = 0; i < 5; i++) draw(bk[3 + i], 'rgba(' + COL[i] + ',0.96)');
  draw(bk[2], 'rgba(253,160,130,0.96)');
  ctx.globalCompositeOperation = 'lighter';
  draw(bk[9], 'rgba(150,215,255,0.16)');
  draw(bk[10], 'rgba(180,228,255,0.34)');
  draw(bk[11], 'rgba(225,244,255,0.6)');
  ctx.globalCompositeOperation = 'source-over';
}

var FORMS = [
  { n: 3, th: 60, r: 0.618, d: 6 },
  { n: 2, th: 90, r: 0.7071, d: 7 },
  { n: 4, th: 45, r: 0.594, d: 6 },
  { n: 6, th: 60, r: 0.5, d: 5 }
];

function mount(canvas, opts) {
  opts = opts || {};
  var ctx = canvas.getContext('2d');
  var still = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var floor = opts.minDpr || 1, W = 0, H = 0, dpr, maxDpr = Math.max(floor, Math.min(root.devicePixelRatio || 1, opts.maxDpr || 2)), F, fi = 0;
  var clockNow = root.performance && root.performance.now ? function () { return root.performance.now(); } : function () { return 0; };
  var PULSE = 1.4, HOLD = 0.4, RELEASE = 2.2;
  function load() { F = fit(FORMS[fi], W, H, opts.pad); if (opts.fill) F.scale *= opts.fill; if (opts.onForm) opts.onForm(F.spec); }
  function size() {
    var r = canvas.getBoundingClientRect();
    var nw = Math.max(2, Math.round(r.width)), nh = Math.max(2, Math.round(r.height));
    if (nw === W && nh === H) return;
    W = nw; H = nh; dpr = maxDpr;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    load(); if (still) paintStill(); else if (drew) paint(lastFront);   // resizing clears a canvas: draw it again at once
  }
  function paint(front) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); render(ctx, W, H, F, tau, t, front, opts.zoom); lastFront = front; drew = true; }
  function paintStill() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); render(ctx, W, H, F, F.tEnd + 1, 0, -2, opts.zoom);
    if (opts.onState) opts.onState('alive', F.spec.d);
  }
  var tau = START, t = 0, mode = 0, clock = 0, from = 0, last = 0, tick = 0, lastLabel = '', lastGen = -1;
  var visible = false, slow = 0, fast = 0, drew = false, lastFront = -2;
  function release() { if (mode !== 3) { mode = 3; from = Math.min(tau, F.tEnd + 0.2); clock = 0; } }
  canvas.addEventListener('click', function () {
    if (still) { fi = (fi + 1) % FORMS.length; load(); paintStill(); } else release();
  });
  if ('IntersectionObserver' in root) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; last = 0; }, { threshold: 0.02 }).observe(canvas);
  else visible = true;
  if ('ResizeObserver' in root) new ResizeObserver(size).observe(canvas); else root.addEventListener('resize', size);

  function frame(now) {
    root.requestAnimationFrame(frame);
    if (!visible || document.hidden || !F) return;
    var raw = last ? (now - last) / 1000 : 0.016, dt = Math.min(raw, 0.05); last = now;
    t += dt;
    var front = -2;
    if (mode === 0) { tau += dt; if (tau >= F.tEnd + 0.15) { mode = 1; clock = 0; } }
    else if (mode === 1) { tau += dt; clock += dt; front = clock / PULSE * (F.sMax + 0.11); if (clock >= PULSE) { mode = 2; clock = 0; } }
    else if (mode === 2) { tau += dt; clock += dt; if (clock >= HOLD) release(); }
    else {
      var len = 0.8 + (RELEASE - 0.8) * Math.min(1, Math.max(0, from) / F.tEnd);
      clock += dt / len;
      var k = Math.min(1, clock), ek = k * k * (3 - 2 * k);
      tau = from * (1 - ek) + START * ek;
      if (k >= 1) { fi = (fi + 1) % FORMS.length; load(); tau = START; mode = 0; }
    }
    var began = clockNow();
    paint(front);
    // A device is slow when the drawing takes long or frames come more than 40ms apart. 33ms apart is not slow:
    // a browser saving power runs at 30 frames a second however little there is to draw.
    if (clockNow() - began > 10 || raw > 0.04) slow++; else fast++;
    if (slow + fast >= 50) {
      if (slow > 30 && dpr > floor) { dpr = Math.max(floor, dpr - 0.5); maxDpr = dpr; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); paint(front); }
      slow = fast = 0;
    }
    if ((tick++ & 7) === 0 && opts.onState) {
      var label = mode === 3 ? 'release' : tau < 0 ? 'latent' : mode === 0 ? 'assembling' : 'alive';
      var g = 0, acc = 0, s = F.spec;
      if (tau > 0) { while (g < s.d) { acc += Math.pow(s.r, g) / V; if (tau < acc) break; g++; } }
      if (label !== lastLabel || g !== lastGen) { opts.onState(label, g); lastLabel = label; lastGen = g; }
    }
  }
  size();
  if (!still) root.requestAnimationFrame(frame);
}

export { mount };
