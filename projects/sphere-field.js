// The portal sphere. Each project's engine lives on or inside a unit sphere,
// is turned by a slow spin plus the pointer, and is seen through glass.
// Geometry is 3D and projected orthographically, so the sphere reads as a volume, not a disc.

const COLORS = {
  rise: [178, 139, 255], commons: [173, 241, 155], relay: [100, 224, 218],
  omnios: [239, 145, 212], osahr: [240, 196, 135],
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
  // TEXT / SPACE: lines of words wrap the sphere like a score; a reading head on the facing meridian brings each word into focus.
  rise: {
    build() {
      const r = rng(11), bands = [];
      for (let i = 0; i < 13; i++) {
        const lat = -1.02 + i * (2.04 / 12), words = [];
        let lon = r() * TAU;
        const end = lon + TAU;
        while (lon < end - .06) { const len = .05 + r() * .17; if (lon + len > end) break; words.push([lon, len]); lon += len + .035 + r() * .03; }
        bands.push({ lat, words, speed: (.045 + r() * .03) * (i % 2 ? 1 : .86) });
      }
      return { bands };
    },
    draw(s, t, g, w) {
      for (const b of s.bands) {
        const cl = Math.cos(b.lat), sl = Math.sin(b.lat);
        for (const [lon0, len] of b.words) {
          const lon = lon0 + t * b.speed, n = Math.max(2, Math.ceil(len * 22)), pts = [];
          for (let k = 0; k <= n; k++) { const L = lon + len * k / n; pts.push([cl * Math.sin(L), sl, cl * Math.cos(L)]); }
          const mid = g.view(pts[n >> 1]);
          const focus = mid[2] > 0 ? Math.exp(-(mid[0] * mid[0]) / .012) : 0;
          g.poly(pts, (.3 + .75 * focus) * w, 1 + 1.1 * focus);
        }
      }
      // the reading head, fixed to the viewer
      const head = [];
      for (let k = 0; k <= 40; k++) { const y = -.9 + 1.8 * k / 40; head.push([0, y, Math.sqrt(1 - y * y)]); }
      g.polyView(head, .16 * w, 1);
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

  // JOB / CONTEXT: four revisions as parallel planes inside the glass; one thread of context pierces every layer.
  relay: {
    build() {
      const A = norm([.42, .3, 1]), [U, V] = tangent(A), layers = [];
      for (const d of [-.6, -.2, .2, .6]) {
        const R = Math.sqrt(1 - d * d) * .96, grid = [], ring = [];
        for (let u = -1; u <= 1.001; u += .105) for (let v = -1; v <= 1.001; v += .105) {
          if (u * u + v * v > R * R) continue;
          grid.push([u, v, [A[0] * d + U[0] * u + V[0] * v, A[1] * d + U[1] * u + V[1] * v, A[2] * d + U[2] * u + V[2] * v]]);
        }
        for (let k = 0; k <= 64; k++) { const a = k / 64 * TAU; ring.push([A[0] * d + (U[0] * Math.cos(a) + V[0] * Math.sin(a)) * R, A[1] * d + (U[1] * Math.cos(a) + V[1] * Math.sin(a)) * R, A[2] * d + (U[2] * Math.cos(a) + V[2] * Math.sin(a)) * R]); }
        layers.push({ d, grid, ring });
      }
      return { A, U, V, layers };
    },
    draw(s, t, g, w) {
      const tu = .38 * Math.sin(t * .23), tv = .3 * Math.sin(t * .31 + 1.1);
      const at = d => [s.A[0] * d + s.U[0] * tu + s.V[0] * tv, s.A[1] * d + s.U[1] * tu + s.V[1] * tv, s.A[2] * d + s.U[2] * tu + s.V[2] * tv];
      s.layers.forEach((L, li) => {
        g.poly(L.ring, (.18 + li * .05) * w, 1);
        for (const [u, v, p] of L.grid) {
          const dd = (u - tu) ** 2 + (v - tv) ** 2, glow = Math.exp(-dd / .03);
          g.dot(p, .9 + glow * 1.6, (.1 + li * .035 + .75 * glow) * w);
        }
        g.dot(at(L.d), 3.2, .95 * w, true);
      });
      const span = [];
      for (let k = 0; k <= 24; k++) span.push(at(-.84 + 1.68 * k / 24));
      g.poly(span, .7 * w, 1.3);
    },
  },

  // DATA / BLOCKS: sources wired to a persona; packets travel the wires; the answer leaves on one.
  omnios: {
    build() {
      const persona = onSphere(.1, -.6);
      const sources = [onSphere(.72, -1.55), onSphere(-.5, -1.4), onSphere(.48, .4)];
      const out = onSphere(-.6, .1);
      const wires = sources.map(sp => arc(sp, persona, 44, .06)).concat([arc(persona, out, 40, .06)]);
      const nodes = sources.concat([persona, out]);
      return { persona, sources, out, wires, nodes, bases: nodes.map(tangent) };
    },
    draw(s, t, g, w) {
      s.wires.forEach((pts, i) => {
        g.poly(pts, .3 * w, 1);
        for (let k = 0; k < 4; k++) {
          const q = (t * .13 + k / 4 + i * .17) % 1, idx = q * (pts.length - 1);
          for (let tr = 0; tr < 4; tr++) {
            const j = Math.max(0, Math.floor(idx) - tr * 2);
            g.dot(pts[j], 2.1 - tr * .4, (.9 - tr * .22) * w);
          }
        }
      });
      s.nodes.forEach((n, i) => {
        const big = n === s.persona;
        for (let j = 0; j < 10; j++) g.dot(offset(n, s.bases[i], j * TAU / 10 + t * (i % 2 ? -.35 : .35), big ? .13 : .075), 1, .38 * w);
        g.dot(n, big ? 6 + Math.sin(t * 1.6) * .7 : 3.4, w, true);
      });
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
  let rgb = '0,0,0';
  const g = {
    view,
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
    const t = still ? 8 : (now - t0) / 1000;
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
      ctx.globalAlpha = .5 * riseW;
      ctx.drawImage(poster, cx - s / 2 + ox, cy - h / 2 + oy, s, h);
      ctx.globalAlpha = 1;
    }

    ctx.globalCompositeOperation = 'lighter';
    rgb = `${r},${gg},${b}`;
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
