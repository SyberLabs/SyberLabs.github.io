/* SyberLabs Design System v2 "Atlas": sigils.
   A de Jong attractor seeded by hash(name) (FNV-1a -> mulberry32), filtered for structured shapes,
   log-density rendered in one accent; dense cores burn toward white. Same name -> same mark everywhere.
   Names are trimmed and lower-cased, so "RISE" and "rise" give the same mark.

   params(name)                          -> { P:[a,b,c,d], box:[cx,cy,size], caption }
   draw(canvas, name, { color, animate }) -> { P, caption, cancel() }
     color    '#rrggbb' | '#rgb' | 'rgb(r,g,b)'. Default: the canvas's --sy-accent (or --a), else vellum.
     animate  draw in over ~16 steps (default true). Off under prefers-reduced-motion.
     The orbit is iterated in a Web Worker when one can start (main thread otherwise); only painting runs on the page.
   drawAll(root = document)  draws every canvas[data-sigil] (name = data-sigil, color = data-color or
                             --sy-accent) when it scrolls into view. Returns { disconnect() }. */

const fmt = v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(3);
const line = P => 'a\u00a0' + fmt(P[0]) + ' · b\u00a0' + fmt(P[1]) + ' · c\u00a0' + fmt(P[2]) + ' · d\u00a0' + fmt(P[3]); // pairs never break
const reducedMotion = () => !!(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

function prng(a) { return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const dj = (P, n, f) => { let x = 0.1, y = 0.1; for (let i = 0; i < n + 100; i++) { const nx = Math.sin(P[0] * y) - Math.cos(P[1] * x); y = Math.sin(P[2] * x) - Math.cos(P[3] * y); x = nx; if (i >= 100) f(x, y); } };
const cache = new Map();

export function params(name) {
  const seed = String(name == null ? '' : name).trim().toLowerCase();
  if (cache.has(seed)) return cache.get(seed);
  let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const r = prng(h >>> 0);
  let res = { P: [1.641, 1.902, 0.316, 1.525], box: [0, 0, 4] };
  for (let k = 0; k < 800; k++) {
    const P = [0, 0, 0, 0].map(() => +(r() * 6 - 3).toFixed(3)), xs = [], ys = [];
    dj(P, 8000, (x, y) => { xs.push(x); ys.push(y); });
    const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, hh = Math.max(...ys) - y0;
    if (Math.min(w, hh) < 0.3 || w / hh > 1.7 || hh / w > 1.7) continue;
    const g = new Float32Array(1024); xs.forEach((x, i) => g[((x - x0) / w * 31.99 | 0) + ((ys[i] - y0) / hh * 31.99 | 0) * 32]++);
    let n = 0, m = 0, v = 0; g.forEach(c => { if (c) { n++; m += c; v += c * c; } });
    const mean = m / n, cvar = Math.sqrt(v / n - mean * mean) / mean, fill = n / 1024;
    // keep structured forms: reject collapsed orbits, dust, and shapeless fog
    if (fill > 0.3 && fill < 0.8 && cvar > 0.7 && cvar < 2) { res = { P, box: [x0 + w / 2, y0 + hh / 2, Math.max(w, hh)] }; break; }
  }
  res.caption = line(res.P);
  cache.set(seed, res);
  return res;
}

function rgb(c) {
  c = String(c || '').trim();
  let m = c.match(/^#([0-9a-f]{3})$/i);
  if (m) return [...m[1]].map(h => parseInt(h + h, 16));
  m = c.match(/^#([0-9a-f]{6})/i);
  if (m) return m[1].match(/\w\w/g).map(h => parseInt(h, 16));
  m = c.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  return m ? [+m[1], +m[2], +m[3]] : null;
}

// The orbit (millions of sin/cos per large sigil) runs off the main thread in a worker built from this
// function's own source, so the kit stays one file. The worker iterates one chunk per request and returns
// the hit-count histogram; the page only tones and paints it. Same arithmetic, so the same pixels.
function orbitWorker() {
  const runs = new Map();
  self.onmessage = ({ data: m }) => {
    if (m.op === 'drop') { runs.delete(m.id); return; }
    let r = runs.get(m.id);
    if (m.op === 'start') runs.set(m.id, (r = { ...m, hist: new Uint32Array(m.S * m.S), x: 0.1, y: 0.1, done: 0, max: 1 }));
    if (!r) return;
    const { P, S, k, ox, oy, hist } = r;
    let { x, y, max } = r;
    for (let i = 0; i < r.step; i++) {
      const nx = Math.sin(P[0] * y) - Math.cos(P[1] * x); y = Math.sin(P[2] * x) - Math.cos(P[3] * y); x = nx;
      const j = ((ox + x * k) | 0) + ((oy + y * k) | 0) * S; if (++hist[j] > max) max = hist[j];
    }
    r.x = x; r.y = y; r.max = max; r.done += r.step;
    const last = r.done >= r.total;
    if (last) runs.delete(m.id);
    const copy = hist.slice();
    self.postMessage({ id: m.id, hist: copy.buffer, max, last }, [copy.buffer]);
  };
}
let worker = null, broken = false, seq = 0;
const jobs = new Map();
function orbit() {
  if (broken || typeof Worker !== 'function' || typeof Blob !== 'function' || typeof URL === 'undefined' || !URL.createObjectURL) return null;
  if (!worker) {
    try { worker = new Worker(URL.createObjectURL(new Blob(['(' + orbitWorker + ')()'], { type: 'text/javascript' }))); }
    catch (e) { broken = true; return null; } // e.g. a CSP without blob: workers: draw on the main thread instead
    worker.onmessage = ({ data: d }) => {
      const j = jobs.get(d.id);
      if (!j) return;
      if (d.last) jobs.delete(d.id); else worker.postMessage({ id: d.id, op: 'next' });
      j.chunk(new Uint32Array(d.hist), d.max);
    };
    worker.onerror = e => { e.preventDefault?.(); broken = true; const left = [...jobs.values()]; jobs.clear(); left.forEach(j => j.fail()); };
  }
  return {
    run(spec, chunk, fail) {
      const id = ++seq;
      jobs.set(id, { chunk, fail });
      worker.postMessage({ id, op: 'start', ...spec });
      return () => { if (jobs.delete(id)) worker.postMessage({ id, op: 'drop' }); };
    },
  };
}

export function draw(canvas, name, opts = {}) {
  const { P, box, caption } = params(name);
  const cs = getComputedStyle(canvas);
  const col = rgb(opts.color) || rgb(cs.getPropertyValue('--sy-accent')) || rgb(cs.getPropertyValue('--a')) || [238, 240, 255];
  const S = Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2)) || 240;
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d'), img = ctx.createImageData(S, S);
  const animate = opts.animate !== false && !reducedMotion();
  const TOTAL = S * S * 4, STEP = animate ? TOTAL / 16 : TOTAL, k = S * 0.82 / box[2], ox = S / 2 - box[0] * k, oy = S / 2 - box[1] * k;
  // Pixels are written as packed RGBA through a 32-bit view; the tone depends only on a pixel's hit count,
  // so each pass computes it once per count (a few hundred values) instead of once per pixel.
  const px = new Uint32Array(img.data.buffer), le = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
  const pack = (r, g, b, a) => (le ? ((a << 24) | (b << 16) | (g << 8) | r) : ((r << 24) | (g << 16) | (b << 8) | a)) >>> 0;
  // ToUint8Clamp, the conversion a Uint8ClampedArray write applies (clamp, then round half to even), so the pixels match exactly
  const u8 = v => { if (!(v > 0)) return 0; if (v >= 255) return 255; const f = Math.floor(v), r = v - f; return r > 0.5 || (r === 0.5 && f % 2) ? f + 1 : f; };
  let lut = new Uint32Array(0), raf = 0, stop = null, latest = null;
  const tone = (hist, max) => {
    const L = Math.log(1 + max * 0.5);
    if (lut.length < max + 1) lut = new Uint32Array(max + 1);
    for (let h = 1; h <= max; h++) {
      const v = Math.min(1, Math.log(1 + h) / L), w = v * v * v * 0.9; // dense cores burn toward white
      lut[h] = pack(u8(col[0] + (255 - col[0]) * w), u8(col[1] + (255 - col[1]) * w), u8(col[2] + (255 - col[2]) * w), u8(255 * Math.min(1, 1.25 * Math.pow(v, 0.6))));
    }
    for (let j = 0; j < hist.length; j++) { const h = hist[j]; if (h) px[j] = lut[h]; }
    ctx.putImageData(img, 0, 0);
  };
  // fallback: the same chunks on the main thread, one per frame
  const local = () => {
    const hist = new Uint32Array(S * S);
    let done = 0, max = 1, x = 0.1, y = 0.1;
    (function chunk() {
      raf = 0;
      for (let i = 0; i < STEP; i++) {
        const nx = Math.sin(P[0] * y) - Math.cos(P[1] * x); y = Math.sin(P[2] * x) - Math.cos(P[3] * y); x = nx;
        const j = ((ox + x * k) | 0) + ((oy + y * k) | 0) * S; if (++hist[j] > max) max = hist[j];
      }
      done += STEP;
      tone(hist, max);
      if (done < TOTAL) raf = requestAnimationFrame(chunk);
    })();
  };
  const w = orbit();
  if (w) stop = w.run({ P, S, k, ox, oy, step: STEP, total: TOTAL },
    (hist, max) => { latest = [hist, max]; if (!raf) raf = requestAnimationFrame(() => { raf = 0; tone(...latest); }); }, // paint the newest chunk once per frame
    () => { if (raf) cancelAnimationFrame(raf); raf = 0; px.fill(0); local(); });
  else local();
  return { P, caption, cancel() { if (raf) cancelAnimationFrame(raf); raf = 0; stop?.(); } };
}

export function drawAll(root = document) {
  const list = [...root.querySelectorAll('canvas[data-sigil]')];
  const one = c => {
    const r = draw(c, c.dataset.sigil, { color: c.dataset.color, animate: c.dataset.animate !== 'false' });
    const cap = c.dataset.captionFor && document.getElementById(c.dataset.captionFor);
    if (cap) cap.textContent = r.caption;
  };
  if (!('IntersectionObserver' in window)) { list.forEach(one); return { disconnect() {} }; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); one(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
  list.forEach(c => io.observe(c));
  return { disconnect: () => io.disconnect() };
}
