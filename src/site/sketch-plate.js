/* Plate IX · Living ink: a small drawable kaleidoscope that previews RISE Sketch (sketch.syberlabs.io).
   Drag inside the plate and the stroke folds into a 12-way dihedral mandala (6 turns × mirror), each fold in
   its own spectral hue; it then grows the way RISE Sketch Forms do, as fractal sprouts off the stroke and
   Ripple-style contour rings that breathe and beat into moiré. When nobody is drawing, a ghost hand does.

   Canvas 2D, no dependencies. Pauses off-screen and in hidden tabs. Reduced motion: strokes appear fully
   grown and nothing moves. The canvas is decorative (aria-hidden); the link beside it is the real action. */

const FOLDS = 6;                    // rotational order; each turn is also mirrored
const MAX_STROKES = 4;              // older strokes fade out beyond this
const GROW_MS = 2600;               // trunk → sprouts → rings
const IDLE_MS = 3800;               // ghost hand starts after this long without input
const TAU = Math.PI * 2;

/** Deterministic PRNG (mulberry32), so a stroke's sprouts never change while it lives. */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Resample a polyline to points `step` apart (plate units). */
function resample(pts, step) {
  if (pts.length < 2) return pts.slice();
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    let [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i];
    let seg = Math.hypot(x1 - x0, y1 - y0);
    while (carry + seg >= step) {
      const k = (step - carry) / seg;
      x0 += (x1 - x0) * k; y0 += (y1 - y0) * k; seg = Math.hypot(x1 - x0, y1 - y0);
      out.push([x0, y0]); carry = 0;
    }
    carry += seg;
  }
  const last = pts[pts.length - 1], tail = out[out.length - 1];
  if (Math.hypot(last[0] - tail[0], last[1] - tail[1]) > step * 0.3) out.push(last);
  return out;
}

/** Unit normals of a polyline (averaged at joints). */
function normals(pts) {
  return pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  });
}

/** Fractal sprouts: recursive branches off the stroke, each generation shorter and more curled. */
function sprouts(pts, nrm, seed) {
  const r = rng(seed), out = [];
  const grow = (x, y, ang, len, gen, born) => {
    const seg = [[x, y]], curl = (r() - 0.5) * 0.9, n = 7;
    for (let i = 1; i <= n; i++) { ang += curl / n; x += Math.cos(ang) * len / n; y += Math.sin(ang) * len / n; seg.push([x, y]); }
    out.push({ pts: seg, gen, born });
    if (gen >= 4) return;
    const kids = gen < 2 ? 2 : 1 + (r() < 0.5);
    for (let k = 0; k < kids; k++) grow(x, y, ang + (k ? -1 : 1) * (0.45 + r() * 0.5), len * (0.55 + r() * 0.15), gen + 1, born + 0.12);
  };
  for (let i = 2; i < pts.length - 1; i += 5 + Math.floor(r() * 4)) {
    const side = r() < 0.5 ? -1 : 1, [nx, ny] = nrm[i], a = Math.atan2(ny * side, nx * side);
    grow(pts[i][0], pts[i][1], a + (r() - 0.5) * 0.6, 0.06 + r() * 0.07, 1, i / pts.length * 0.45);
  }
  return out;
}

function makeStroke(raw, seed, hue, born) {
  const pts = resample(raw, 0.012), nrm = normals(pts);
  return { pts, nrm, hue, born, branches: sprouts(pts, nrm, seed) };
}

/** A ghost-hand gesture: a petal, spiral or wave, somewhere in one wedge of the mandala. */
function ghostPath(seed) {
  const r = rng(seed), kind = Math.floor(r() * 3), pts = [];
  const r0 = 0.12 + r() * 0.25, a0 = r() * TAU / FOLDS;
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    if (kind === 0) { const a = a0 + t * 1.6, rr = r0 + 0.32 * Math.sin(t * Math.PI); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    else if (kind === 1) { const a = a0 + t * 4.2, rr = 0.06 + t * (0.3 + r0 * 0.5); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    else { const rr = 0.1 + t * 0.62, a = a0 + 0.35 * Math.sin(t * 9 + r() * 0.2); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  }
  return pts;
}

const ease = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);

/**
 * Mount the plate on a canvas. Returns { destroy }.
 * reduced: strokes appear fully grown, drawn only on input; nothing animates.
 */
export function mountSketchPlate(canvas, { reduced = false } = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { destroy() {} };
  const GROWN = -Infinity;            // birth time of a stroke that appears fully grown
  let strokes = [], live = null, ghost = null, raf = 0, visible = true, lastInput = 0, seedN = 1, hue = 247;
  let W = 0, H = 0, R = 0, dpr = 1;
  // Lite mode: if frames run slow (no GPU canvas), drop the halo and the outer rings for good.
  let lite = false, slow = 0, lastFrame = 0;

  const size = () => {
    const b = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, Math.round(b.width * dpr)); H = Math.max(1, Math.round(b.height * dpr));
    canvas.width = W; canvas.height = H; R = Math.min(W, H) / 2;
    draw(performance.now());
  };

  const toPlate = e => {
    const b = canvas.getBoundingClientRect(), s = Math.min(b.width, b.height) / 2;
    return [(e.clientX - b.left - b.width / 2) / s, (e.clientY - b.top - b.height / 2) / s];
  };

  const commit = (raw, born) => {
    if (raw.length < 2) { const [x, y] = raw[0]; raw = [[x, y], [x + 0.002, y + 0.002]]; }
    strokes.push(makeStroke(raw, (seedN++ * 2654435761) >>> 0, hue, born));
    hue = (hue + 47) % 360;
    if (reduced) strokes = strokes.slice(-MAX_STROKES);
    else strokes.slice(0, -MAX_STROKES).forEach(s => (s.dying ??= born));
  };

  // ---- input
  const down = e => {
    if (e.button > 0) return;
    canvas.setPointerCapture?.(e.pointerId);
    live = [toPlate(e)]; ghost = null; lastInput = performance.now(); kick();
  };
  const move = e => { if (!live) return; const p = toPlate(e), q = live[live.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.006) live.push(p); lastInput = performance.now(); if (reduced) draw(lastInput); };
  const up = () => { if (!live) return; lastInput = performance.now(); commit(live, reduced ? GROWN : lastInput); live = null; if (reduced) draw(lastInput); };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  // ---- drawing
  const fold = (rot, k, mirror) => {
    const c = Math.cos(rot + k * TAU / FOLDS), s = Math.sin(rot + k * TAU / FOLDS), m = mirror ? -1 : 1;
    // plate units → device pixels, rotated by fold k, mirrored across the fold's axis
    ctx.setTransform(c * R, s * R, -s * R * m, c * R * m, W / 2, H / 2);
  };
  const path = (pts, upto = 1) => {
    const n = Math.min(pts.length, Math.max(2, Math.ceil(pts.length * upto)));
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  };
  const ring = (s, k, off, t) => {
    const amp = off * 0.16, lam = 9, lag = 0.55 * k;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      for (let i = 0; i < s.pts.length; i++) {
        const d = side * (off + amp * Math.sin(i / lam - lag + t * 0.0011 * (k % 2 ? 1 : -1)));
        const x = s.pts[i][0] + s.nrm[i][0] * d, y = s.pts[i][1] + s.nrm[i][1] * d;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  };

  // `inking` is the stroke still under the pen (the visitor's or the ghost's): trunk only, in the next hue.
  const draw = (now, inking = live) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const rot = reduced ? 0 : now * 0.00004, px = 1 / R * dpr; // one CSS pixel in plate units
    const all = inking ? [...strokes, { pts: resample(inking, 0.012), hue, born: now, branches: [] }] : strokes;
    for (const s of all) {
      const age = now - s.born;
      const fadeOut = s.dying ? Math.max(0, 1 - (now - s.dying) / 1200) : 1;
      if (fadeOut <= 0) continue;
      const gSprout = ease((age - GROW_MS * 0.2) / (GROW_MS * 0.6));
      const gRing = ease((age - GROW_MS * 0.35) / (GROW_MS * 0.65));
      for (let k = 0; k < FOLDS; k++) for (const mirror of [false, true]) {
        fold(rot, k, mirror);
        const foldHue = (s.hue + (k * 2 + (mirror ? 1 : 0)) * (360 / (FOLDS * 2)) + (reduced ? 0 : now * 0.006)) % 360;
        // rings (Ripple): wider apart outward, breathing, alternating brightness
        if (gRing > 0 && s.pts.length > 2) {
          for (let r = 0; r < (lite ? 3 : 5); r++) {
            const off = (0.022 * Math.pow(1.32, r)) * Math.min(1, gRing * 1.6 - r * 0.2);
            if (off <= 0) continue;
            ctx.strokeStyle = `hsla(${(foldHue + r * 18) % 360}, 95%, 64%, ${(r % 2 ? 0.09 : 0.18) * fadeOut})`;
            ctx.lineWidth = px * (r < 2 ? 0.8 : 1.4);
            ring(s, r, off, now);
          }
        }
        // sprouts (fractal botany), generation by generation
        if (gSprout > 0) for (let gen = 1; gen <= 4; gen++) {
          ctx.beginPath();
          let any = false;
          for (const b of s.branches) {
            if (b.gen !== gen) continue;
            const g = (gSprout - b.born) / (1 - b.born) * 4 - (b.gen - 1);
            if (g <= 0) continue;
            path(b.pts, Math.min(1, g)); any = true;
          }
          if (!any) continue;
          ctx.strokeStyle = `hsla(${(foldHue + gen * 14) % 360}, 100%, ${62 + gen * 4}%, ${0.38 * Math.pow(0.78, gen) * fadeOut})`;
          ctx.lineWidth = px * (2.4 - gen * 0.42);
          ctx.stroke();
        }
        // trunk: a soft halo, then the hot core
        if (s.pts.length > 1) {
          if (!lite) { ctx.strokeStyle = `hsla(${foldHue}, 100%, 60%, ${0.12 * fadeOut})`; ctx.lineWidth = px * 9; ctx.beginPath(); path(s.pts); ctx.stroke(); }
          ctx.strokeStyle = `hsla(${foldHue}, 100%, 72%, ${0.6 * fadeOut})`; ctx.lineWidth = px * 2.6; ctx.beginPath(); path(s.pts); ctx.stroke();
        }
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  };

  const frame = now => {
    raf = 0;
    if (!visible || document.hidden) { lastFrame = 0; return; }
    if (lastFrame && !lite) { slow = now - lastFrame > 45 ? slow + 1 : Math.max(0, slow - 1); if (slow > 30) lite = true; }
    lastFrame = now;
    strokes = strokes.filter(s => !s.dying || now - s.dying < 1200);
    // the ghost hand: when idle, trace a gesture point by point, then let it grow
    let inking = live;
    if (!live && now - lastInput > IDLE_MS) {
      ghost ??= { pts: ghostPath((seedN * 7919) >>> 0), t0: now };
      const n = 1 + Math.floor((now - ghost.t0) / 22);
      if (n >= ghost.pts.length) { commit(ghost.pts, now); ghost = null; lastInput = now - IDLE_MS + 2200; }
      else inking = ghost.pts.slice(0, n);
    }
    draw(now, inking);
    raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!reduced && !raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };

  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }, { rootMargin: '120px' }) : null;
  io?.observe(canvas);
  const onVis = () => kick();
  document.addEventListener('visibilitychange', onVis);
  const ro = 'ResizeObserver' in window ? new ResizeObserver(size) : null;
  ro?.observe(canvas);

  // seed the plate so it is never empty: two gestures, already grown
  commit(ghostPath(1000), GROWN); commit(ghostPath(1031), GROWN);
  lastInput = performance.now() - IDLE_MS + 1500;
  size();
  kick();

  return {
    destroy() {
      cancelAnimationFrame(raf); io?.disconnect(); ro?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up);
    },
  };
}
