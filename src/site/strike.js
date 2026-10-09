/* The runtime strike (homepage, RISE Composer card): Compose -> Admit -> Experience as light.
   Canvas 2D, additive ('lighter'), seeded so every visit draws the same picture, played once and then frozen on its
   last frame; nothing runs after that. The scene is a pure function of time, so resizing redraws the same instant.

   Lightning: midpoint-displacement fractals subdivided below 2 px, with recursive branches down to hair-thin
   filaments. Each bolt propagates as a stepped leader, flashes white on the return stroke, re-strikes twice and
   settles to a residual glow. Strokes are drawn in passes (wide glow, mid band, hot core) with chromatic fringes.
   Burst: core flash, halo, a dispersed chromatic ring, eight diffraction spikes split into three colour channels,
   a field of hairline rays, and a particle splash that decelerates under drag (fast particles run blue, slow ones
   magenta and amber, as in dispersion) and freezes mid-flight as fine streaks. The splash leans left, away from the
   stage text; anything aimed right stays short.

   mountStrike(canvas) -> { layout(pts, w, h), play(), still(), destroy() }
     pts: the three node centres [x, y, radius] in the flow's own coordinates; w, h: the flow's size. */

const PAD_X = 190, PAD_Y = 150;                  // the canvas overhangs the flow so the splash has room
// The rhythm: (beat) 1 -> 2 (beat) 2 -> 3 (tiny beat) splash.
//   0-750 node 1 charges | 750-1200 bolt 1 | 1200-2100 node 2 holds | 2100-2550 bolt 2 | 2550-2850 node 3 swells | 2850 burst
const LEADER = 450;                               // ms for a stepped leader to reach the next node
const BURST = 1500;                               // ms for the burst to reach its frozen extent
const T = { bolt1: 750, bolt2: 2100, burst: 2850, end: 2850 + BURST + 100 };

const rng32 = seed => () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const easeOut = x => 1 - Math.pow(1 - clamp01(x), 3);
const STOPS = [[0, [144, 216, 240]], [0.3, [72, 144, 240]], [0.55, [154, 107, 255]], [0.8, [255, 88, 214]], [1, [255, 181, 74]]];
function spectral(u) {
  u = clamp01(u);
  for (let i = 1; i < STOPS.length; i++) if (u <= STOPS[i][0]) {
    const [u0, a] = STOPS[i - 1], [u1, b] = STOPS[i], k = (u - u0) / (u1 - u0);
    return a.map((v, j) => Math.round(v + (b[j] - v) * k));
  }
  return STOPS[STOPS.length - 1][1];
}
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a < 0 ? 0 : a > 1 ? 1 : a.toFixed(3)})`;
const whiten = (c, k) => c.map(v => Math.round(v + (255 - v) * k));
function hsl(h, s, l) { // degrees, 0..1, 0..1 -> [r,g,b]
  h = ((h % 360) + 360) % 360 / 360; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return Math.round(255 * (t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p)); };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}

/* ---------- fractal lightning ---------- */
function subdivide(a, b, rng, rough, minLen) {
  let pts = [a, b];
  for (;;) {
    const next = [pts[0]]; let split = false;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i], dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy);
      if (len > minLen) {
        split = true; const off = (rng() - .5) * len * rough;
        next.push([(p[0] + q[0]) / 2 - dy / len * off, (p[1] + q[1]) / 2 + dx / len * off]);
      }
      next.push(q);
    }
    pts = next; if (!split) return pts;
  }
}
const arc = pts => { const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); const L = s[s.length - 1] || 1; return s.map(v => v / L); };

// one bolt: a main channel and recursive branches; every line knows where on the main channel it starts (s0)
function bolt(a, b, seed, railX) {
  const rng = rng32(seed), lines = [];
  // keep the channel off the stage text: rightward excursions are squashed, leftward ones run free
  const keep = p => { const dx = p[0] - railX; return [railX + (dx > 0 ? Math.min(dx * .5, 14) : Math.max(dx, -60)), p[1]]; };
  const main = subdivide(a, b, rng, .5, 1.8).map(keep);
  const mainLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
  lines.push({ pts: main, s: arc(main), s0: 0, span: 1, w: 1, a: 1 });
  const grow = (pts, s0base, spanBase, depth, len, w, alpha) => {
    for (let k = 3; k < pts.length - 3; k++) {
      if (rng() > [0, .055, .045, .03][depth]) continue;
      const p = pts[k], q = pts[k + 2], dir = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const left = rng() < .82 ? 1 : -1; // most branches fork towards the open gutter on the left
      const ang = dir + left * (.35 + rng() * .75), L = len * (.22 + rng() * .4);
      let e = [p[0] + Math.cos(ang) * L, p[1] + Math.sin(ang) * L];
      if (e[0] > railX + 18) e = [railX + 18 - (e[0] - railX - 18) * .3, e[1]];
      const bp = subdivide(p, e, rng, .58, 1.4).map(keep);
      const s0 = s0base + spanBase * (k / pts.length);
      lines.push({ pts: bp, s: arc(bp), s0, span: L / mainLen, w: w, a: alpha, depth });
      if (depth < 3) grow(bp, s0, L / mainLen, depth + 1, L, w * .6, alpha * .72);
    }
  };
  grow(main, 0, 1, 1, mainLen, .55, .8);
  return lines;
}

function strokeLine(ctx, pts, s, upto) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    if (s[i] > upto) { const k = (upto - s[i - 1]) / ((s[i] - s[i - 1]) || 1); ctx.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k); break; }
    ctx.lineTo(pts[i][0], pts[i][1]);
  }
  ctx.stroke();
}

// leader position (0..1) and brightness of a bolt that starts at t0
function boltState(t, t0) {
  if (t < t0) return null;
  const dt = t - t0;
  if (dt < LEADER) return { leader: easeOut(dt / LEADER) * 1.02, bright: .5 };
  const r = dt - LEADER;
  let bright = .4 + 1.5 * Math.exp(-r / 130);
  if (r > 70 && r < 100) bright += .7;     // re-strikes
  if (r > 180 && r < 205) bright += .45;
  return { leader: 1.02, bright };
}

function drawBolt(ctx, lines, st, colorAt) {
  const { leader, bright } = st;
  for (const ln of lines) {
    const vis = ln.depth ? clamp01((leader - ln.s0) / (ln.span * .6 + .04)) : clamp01(leader);
    if (vis <= 0) continue;
    const c = colorAt(ln.pts[0][1]), b = bright * ln.a, hot = whiten(c, .55 + .35 * clamp01(bright - 1));
    if (!ln.depth || ln.depth === 1) { ctx.strokeStyle = rgba(c, .05 * b); ctx.lineWidth = 9 * ln.w; strokeLine(ctx, ln.pts, ln.s, vis); }
    ctx.strokeStyle = rgba(c, .16 * b); ctx.lineWidth = 2.8 * ln.w; strokeLine(ctx, ln.pts, ln.s, vis);
    // chromatic fringes either side of the core
    ctx.save(); ctx.translate(-.8, 0); ctx.strokeStyle = rgba([80, 200, 255], .28 * b); ctx.lineWidth = .9 * ln.w + .25; strokeLine(ctx, ln.pts, ln.s, vis); ctx.restore();
    ctx.save(); ctx.translate(.8, 0); ctx.strokeStyle = rgba([255, 70, 200], .28 * b); ctx.lineWidth = .9 * ln.w + .25; strokeLine(ctx, ln.pts, ln.s, vis); ctx.restore();
    ctx.strokeStyle = rgba(hot, .9 * Math.min(1.2, b)); ctx.lineWidth = Math.max(.35, 1.05 * ln.w); strokeLine(ctx, ln.pts, ln.s, vis);
  }
}

/* ---------- glows, coronas ---------- */
function glow(ctx, x, y, r, c, a) {
  if (a <= 0 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(whiten(c, .8), a)); g.addColorStop(.25, rgba(c, a * .45)); g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
function corona(x, y, r, seed) { // short fractal sparks around a charging node (r: the node's radius)
  const rng = rng32(seed), out = [];
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (.55 + rng() * .95) + (rng() < .25 ? Math.PI : 0), L = 8 + rng() * 15, r0 = r + 2;
    const p = [x + Math.cos(a) * r0, y + Math.sin(a) * r0], q = [x + Math.cos(a) * (r0 + L), y + Math.sin(a) * (r0 + L)];
    const pts = subdivide(p, q, rng, .7, 1.2); out.push({ pts, s: arc(pts), ph: rng() * 6.28 });
  }
  return out;
}

/* ---------- the burst ---------- */
function burstModel(seed) {
  const rng = rng32(seed), right = a => Math.cos(a) > .15;
  const rays = [], parts = [], spikes = [];
  for (let i = 0; i < 260; i++) {
    const a = rng() * Math.PI * 2, L = 16 + Math.pow(rng(), 2.2) * 120;
    const h = (a * 180 / Math.PI) * 1.4 + rng() * 40;
    rays.push({ a, L: right(a) ? L * .4 : L, key: `${Math.floor(((h % 360) + 360) % 360 / 15)}|${rng() < .5 ? 0 : 1}` });
  }
  for (let i = 0; i < 1100; i++) {
    let a = rng() * Math.PI * 2; if (right(a) && rng() < .62) a = Math.PI - a; // lean left
    const v = 50 + Math.pow(rng(), 2.6) * 330, k = 2.6 + rng() * 1.6;
    // dispersion: hue follows speed (fast = blue/cyan, slow = magenta/amber) with a spread, so the splash runs the spectrum
    const h = 185 + (.55 * rng() + .45 * (1 - v / 380)) * 215;
    const hot = rng() < .12, wide = rng() < .45;
    parts.push({ a, v, k, sh: right(a) ? .38 : 1, wide, key: hot ? `hot|${wide ? 1 : 0}` : `${Math.floor(((h % 360) + 360) % 360 / 15)}|${rng() < .5 ? 0 : 1}|${wide ? 1 : 0}` });
  }
  const base = .21;
  for (let i = 0; i < 8; i++) {
    const a = base + i * Math.PI / 4, primary = i % 2 === 0, L = (primary ? 112 : 62) * (right(a) ? .42 : 1);
    spikes.push({ a, L, w: primary ? 1.15 : .7 });
  }
  return { rays, parts, spikes };
}

function drawBurst(ctx, x, y, tau, m) {
  if (tau < 0) return;
  const u = clamp01(tau / BURST), e = easeOut(u), ts = tau / 1000;
  // core flash, then a held core
  const flash = Math.exp(-tau / 160);
  glow(ctx, x, y, 90 * (.35 + .65 * e), [154, 107, 255], .16 + .2 * flash);
  glow(ctx, x, y, 46 * (.4 + .6 * e), [255, 88, 214], .22 + .3 * flash);
  glow(ctx, x, y, 16 + 14 * flash, [255, 214, 160], .75 + .25 * flash);
  // chromatic ring (dispersed halo)
  if (ctx.createConicGradient) {
    const g = ctx.createConicGradient(0, x, y);
    [[0, '#90d8f0'], [.17, '#4890f0'], [.34, '#9a6bff'], [.5, '#ff58d6'], [.67, '#ffb54a'], [.84, '#6ff5a8'], [1, '#90d8f0']].forEach(([o, c]) => g.addColorStop(o, c));
    ctx.save(); ctx.globalAlpha = .38 * (.4 + .6 * e); ctx.strokeStyle = g; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(x, y, 12 + 16 * e, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = .16 * e; ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(x, y, 24 + 22 * e, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  // hairline ray field: 24 hue buckets x 2 strengths; each ray is a brighter inner half and a faint outer half
  const rb = new Map();
  for (const r of m.rays) {
    const L = r.L * e; if (L < 1) continue;
    let g = rb.get(r.key); if (!g) rb.set(r.key, g = { inner: new Path2D(), outer: new Path2D() });
    const ca = Math.cos(r.a), sa = Math.sin(r.a);
    g.inner.moveTo(x, y); g.inner.lineTo(x + ca * L * .5, y + sa * L * .5);
    g.outer.moveTo(x + ca * L * .5, y + sa * L * .5); g.outer.lineTo(x + ca * L, y + sa * L);
  }
  ctx.lineWidth = .5;
  for (const [key, g] of rb) {
    const [hb, strong] = key.split('|').map(Number), c = hsl(hb * 15 + 7, 1, .72), al = strong ? .2 : .09;
    ctx.strokeStyle = rgba(c, al); ctx.stroke(g.inner); ctx.strokeStyle = rgba(c, al * .35); ctx.stroke(g.outer);
  }
  // diffraction spikes, each split into three dispersed channels
  const chans = [[[255, 120, 90], 1, .006], [[120, 255, 170], .93, 0], [[110, 150, 255], .86, -.006]];
  for (const s of m.spikes) for (const [c, lk, da] of chans) {
    const L = s.L * lk * e, a = s.a + da, ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
    const g = ctx.createLinearGradient(x, y, ex, ey);
    g.addColorStop(0, rgba([255, 255, 255], .55)); g.addColorStop(.12, rgba(c, .32)); g.addColorStop(1, rgba(c, 0));
    ctx.strokeStyle = g; ctx.lineWidth = s.w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
  }
  // the splash: drag-decelerated particles as streaks (faint tail, bright head), stroked per colour bucket
  const fade = .55 + .45 * Math.exp(-ts * 1.6), pb = new Map();
  for (const p of m.parts) {
    const d = t => p.v / p.k * (1 - Math.exp(-p.k * t)) * p.sh;
    const d1 = d(ts); if (d1 < 2) continue;
    const d0 = d(ts * .3) * .7, dm = d0 + (d1 - d0) * .6, ca = Math.cos(p.a), sa = Math.sin(p.a);
    let g = pb.get(p.key); if (!g) pb.set(p.key, g = { tail: new Path2D(), head: new Path2D(), dots: new Path2D() });
    g.tail.moveTo(x + ca * d0, y + sa * d0); g.tail.lineTo(x + ca * dm, y + sa * dm);
    g.head.moveTo(x + ca * dm, y + sa * dm); g.head.lineTo(x + ca * d1, y + sa * d1);
    if (p.wide) { g.dots.moveTo(x + ca * d1 + .7, y + sa * d1); g.dots.arc(x + ca * d1, y + sa * d1, .7, 0, Math.PI * 2); }
  }
  for (const [key, g] of pb) {
    const k = key.split('|'), hot = k[0] === 'hot', wide = k[k.length - 1] === '1', strong = hot || k[1] === '1';
    const c = hot ? [255, 244, 230] : hsl(+k[0] * 15 + 7, 1, .66), al = (strong ? .9 : .5) * fade;
    ctx.lineWidth = wide ? 1.15 : .6;
    ctx.strokeStyle = rgba(c, al * .3); ctx.stroke(g.tail);
    ctx.strokeStyle = rgba(c, al); ctx.stroke(g.head);
    if (wide) { ctx.fillStyle = rgba(whiten(c, .6), al * .75); ctx.fill(g.dots); }
  }
}

export function mountStrike(canvas) {
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return { layout() {}, play() {}, still() {}, destroy() {} };
  let pts = null, W = 0, H = 0, dpr = 1, bolts = [], coronas = [], model = burstModel(20261008), t = -1, raf = 0, t0 = 0, dead = false;
  const colorAt = y => { const y0 = pts[0][1], y1 = pts[2][1]; return spectral((y - y0) / ((y1 - y0) || 1)); };

  function scene(time) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!pts) return;
    ctx.setTransform(dpr, 0, 0, dpr, PAD_X * dpr, PAD_Y * dpr);
    ctx.strokeStyle = 'rgba(170,180,255,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.stroke(); // the rail
    if (time < 0) return;
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const [n1, n2, n3] = pts;
    // node 1 charges; node 2 flashes when the first bolt lands; both keep a residual glow
    const c1 = clamp01(time / T.bolt1), land1 = time - (T.bolt1 + LEADER), land2 = time - (T.bolt2 + LEADER);
    glow(ctx, n1[0], n1[1], 30, spectral(0), .35 * c1 + (time < T.bolt1 + LEADER ? .25 * c1 * (1 + Math.sin(time / 23)) * .5 : 0));
    for (const s of coronas[0]) { const a = (time < T.bolt1 + 200 ? c1 * (.4 + .6 * Math.abs(Math.sin(time / 37 + s.ph))) : .22) * .8; ctx.strokeStyle = rgba(whiten(spectral(0), .4), a); ctx.lineWidth = .55; strokeLine(ctx, s.pts, s.s, 1); }
    if (land1 > 0) { glow(ctx, n2[0], n2[1], 34, spectral(.55), .3 + .7 * Math.exp(-land1 / 200)); for (const s of coronas[1]) { ctx.strokeStyle = rgba(whiten(spectral(.55), .4), .2 + .5 * Math.exp(-land1 / 260)); ctx.lineWidth = .55; strokeLine(ctx, s.pts, s.s, 1); } }
    const b1 = boltState(time, T.bolt1), b2 = boltState(time, T.bolt2);
    if (b1) drawBolt(ctx, bolts[0], b1, colorAt);
    if (b2) drawBolt(ctx, bolts[1], b2, colorAt);
    // the tiny beat: node 3 swells with the arrived charge, then bursts
    if (land2 > 0 && time < T.burst + 160) { const k = clamp01(land2 / (T.burst - T.bolt2 - LEADER)); glow(ctx, n3[0], n3[1], 18 + 22 * k, [255, 181, 74], (.25 + .55 * k) * (.85 + .15 * Math.sin(time / 19))); }
    if (time >= T.burst - 16) drawBurst(ctx, n3[0], n3[1], time - T.burst, model);
    ctx.globalCompositeOperation = 'source-over';
  }

  function frame(now) {
    raf = 0; if (dead) return;
    t = Math.min(T.end, now - t0);
    scene(t);
    if (t < T.end) raf = requestAnimationFrame(frame);
  }

  return {
    layout(p, w, h) {
      pts = p; W = w; H = h; dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.left = -PAD_X + 'px'; canvas.style.top = -PAD_Y + 'px';
      canvas.style.width = W + 2 * PAD_X + 'px'; canvas.style.height = H + 2 * PAD_Y + 'px';
      canvas.width = Math.round((W + 2 * PAD_X) * dpr); canvas.height = Math.round((H + 2 * PAD_Y) * dpr);
      const railX = p[0][0];
      bolts = [bolt([p[0][0], p[0][1] + p[0][2]], [p[1][0], p[1][1] - p[1][2]], 101, railX), bolt([p[1][0], p[1][1] + p[1][2]], [p[2][0], p[2][1] - p[2][2]], 202, railX)];
      coronas = [corona(p[0][0], p[0][1], p[0][2], 7), corona(p[1][0], p[1][1], p[1][2], 13)];
      scene(t);
    },
    play() { if (raf || t >= T.end) return; t0 = performance.now() - Math.max(0, t); raf = requestAnimationFrame(frame); },
    still() { if (raf) cancelAnimationFrame(raf); raf = 0; t = T.end; scene(t); },
    destroy() { dead = true; if (raf) cancelAnimationFrame(raf); },
  };
}
