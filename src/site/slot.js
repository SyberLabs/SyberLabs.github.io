/* The hero headline as four slot reels: Creative systems. / Reliable agents. Each reel is a vertical strip of words
   (Creative / Generative / Reliable, humans / agents / systems) that spins once and stops on its word, staggered left
   to right and top to bottom. Mid-spin the reels pass real combinations ("Generative agents", "Reliable humans"):
   the same parts, recombined, settling on the two the lab ships.

   Everything that moves during the spin runs on the compositor, so a busy main thread (the hero field, a slow
   phone) cannot make it stutter: each strip's travel is one transform animation sampled from a velocity curve
   (a smooth start, a steady glide, a long ease-out, a small overshoot that settles back), and its motion blur is a
   pre-painted, vertically streaked copy of the words whose opacity follows the speed. Nothing changes layout while
   the reels spin: each reel is laid out at its final word's width and only paints wider while a longer word
   passes, and a noun waiting beside a wide adjective slides (transform) into place as that adjective lands. Once
   settled, the nouns hold a static spectrum and take a spark every few seconds; between sparks nothing runs.

   Markup (src/App.jsx Slot): .home-slot > .home-slot__line > .home-slot__reel > .home-slot__strip >
   (.home-slot__face, .home-slot__ghost) > .home-slot__w, the face's last word marked .is-final. Without JavaScript
   or under reduced motion only the final words show, as plain text. mountSlot(h1) -> { destroy() } */

const STOPS = [1050, 1400, 1750, 2100]; // ms from the start: when each reel lands
const LEAD = 45;                         // ms between reel starts, so the four never move as one block
const GLINT_MS = 7000, SWEEP_MS = 1500;  // a spark across the nouns every 7s, taking 1.5s to cross both

// Travel along a strip for u in [0, 1]: velocity rises smoothly over the first 16%, glides, then decays as
// (1 - x)^2 through the last half of the travel, which ends at 92% of the time a little past the stop; the last
// 8% settles back. Sampled into linear keyframes, so the curve is the same in every browser and runs off-thread.
const ACC = .16, DEC = .5, END = .92, OVER = .05; // OVER in em
const vel = s => s < ACC ? (1 - Math.cos(Math.PI * s / ACC)) / 2 : s < 1 - DEC ? 1 : (1 - (s - (1 - DEC)) / DEC) ** 2;
const travel = (() => {
  const N = 600, acc = [0]; let sum = 0;
  for (let i = 1; i <= N; i++) { sum += vel((i - .5) / N) / N; acc.push(sum); }
  return s => { const x = Math.min(N, Math.max(0, s * N)), i = Math.min(N - 1, Math.floor(x)); return (acc[i] + (acc[i + 1] - acc[i]) * (x - i)) / sum; };
})();
const pos = (u, D) => u <= END ? (D + OVER) * travel(u / END) : D + OVER * (1 + Math.cos(Math.PI * (u - END) / (1 - END))) / 2;
const speed = u => u <= END ? vel(u / END) : 0;

function keyframes(D, ms) {
  const n = Math.max(24, Math.round(ms / 14)), move = [], face = [], ghost = [];
  for (let i = 0; i <= n; i++) {
    const offset = i / n, v = speed(offset);
    move.push({ offset, transform: `translate3d(0, ${(-pos(offset, D)).toFixed(4)}em, 0)` });
    face.push({ offset, opacity: +(1 - .6 * v).toFixed(3) });
    ghost.push({ offset, opacity: +(.9 * v).toFixed(3) });
  }
  return { move, face, ghost };
}

export function mountSlot(h1) {
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!h1) return { destroy() {} };
  if (reduced || !h1.animate) { h1.classList.add('is-static'); return { destroy() {} }; }
  const reels = [...h1.querySelectorAll('.home-slot__reel')].map(r => {
    const strip = r.querySelector('.home-slot__strip'), face = r.querySelector('.home-slot__face'), ghost = r.querySelector('.home-slot__ghost');
    const words = face ? [...face.children] : [];
    return { r, strip, face, ghost, words, final: words[words.length - 1], D: 0, max: 0, fin: 0 };
  });
  if (reels.length !== 4 || reels.some(d => !d.ghost || !d.final)) { h1.classList.add('is-static'); return { destroy() {} }; }

  h1.classList.add('is-live');
  const anims = [], timers = [], at = (ms, fn) => timers.push(setTimeout(fn, ms));
  let raf = 0, dead = false, settled = false, sweepAt = 0;
  const nouns = [reels[1].final, reels[3].final];

  // each reel's box is as wide as its widest word, and a negative margin (--trim) hands the difference back to the
  // line, so the line is laid out once, at its final widths; after the stop the box is just its word
  const size = () => {
    for (const d of reels) {
      d.fin = d.final.offsetWidth; d.max = settled ? d.fin : Math.max(...d.words.map(w => w.offsetWidth));
      d.r.style.width = d.max + 'px'; d.r.style.setProperty('--trim', (d.fin - d.max) + 'px');
    }
  };
  size();
  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { if (settled) size(); }) : null;
  ro?.observe(h1);

  // the spark: a highlight crossing both nouns (line 2 a beat after line 1); rAF runs only while it crosses
  const resume = () => { if (!document.hidden && !dead) { document.removeEventListener('visibilitychange', resume); raf = requestAnimationFrame(sweep); } };
  const sweep = now => {
    raf = 0; if (dead) return;
    if (!sweepAt) sweepAt = now;
    const t = now - sweepAt;
    nouns.forEach((w, i) => {
      const W = w.offsetWidth || 1, p = Math.min(1, Math.max(0, (t - i * 300) / (SWEEP_MS - 300)));
      w.style.setProperty('--ww', W + 'px');
      w.style.backgroundPosition = `${(-W + 2 * W * p).toFixed(1)}px 0, 0 0`;
    });
    if (t < SWEEP_MS) { raf = requestAnimationFrame(sweep); return; }
    sweepAt = 0;
    at(GLINT_MS - SWEEP_MS, () => { if (document.hidden) document.addEventListener('visibilitychange', resume); else resume(); });
  };

  const start = () => {
    if (dead) return;
    size();
    const em = parseFloat(getComputedStyle(h1).fontSize) || 1;
    for (const d of reels) d.D = d.final.offsetTop / em; // the strip's travel, in em (words are spaced in CSS)
    reels.forEach((d, i) => {
      const delay = i * LEAD, ms = STOPS[i] - delay, k = keyframes(d.D, ms), opt = { duration: ms, delay, fill: 'both', easing: 'linear' };
      anims.push(d.strip.animate(k.move, opt), d.face.animate(k.face, opt), d.ghost.animate(k.ghost, opt));
      at(STOPS[i], () => d.r.classList.add('is-stopped'));
    });
    // a noun beside an adjective narrower than that adjective's widest word waits to its right, then slides into
    // place over the adjective's last 560ms
    [[0, 1], [2, 3]].forEach(([a, n]) => {
      const gap = reels[a].max - reels[a].fin;
      if (gap < 1) return;
      anims.push(reels[n].r.animate([
        { transform: `translate3d(${gap}px, 0, 0)` },
        { transform: `translate3d(${gap}px, 0, 0)`, offset: (STOPS[a] - 560) / STOPS[a], easing: 'cubic-bezier(.45, 0, .2, 1)' },
        { transform: 'translate3d(0, 0, 0)' },
      ], { duration: STOPS[a], fill: 'both' }));
    });
    // hand over to plain styles once the last reel has settled; the spark follows shortly after
    at(STOPS[3] + 80, () => {
      if (dead) return;
      settled = true;
      for (const d of reels) d.strip.style.transform = `translate3d(0, ${-d.D}em, 0)`;
      anims.forEach(a => a.cancel()); anims.length = 0;
      size(); h1.classList.add('is-rest');
      at(700, resume);
    });
  };
  // two frames after the fonts are in, so the first frame of the spin is never a style or layout frame
  const go = () => at(200, () => requestAnimationFrame(() => requestAnimationFrame(start)));
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); (document.fonts?.ready || Promise.resolve()).then(go); } }) : null;
  if (io) io.observe(h1); else go();

  return {
    destroy() {
      dead = true; timers.forEach(clearTimeout); if (raf) cancelAnimationFrame(raf);
      anims.forEach(a => a.cancel());
      io?.disconnect(); ro?.disconnect(); document.removeEventListener('visibilitychange', resume);
      h1.classList.remove('is-live', 'is-rest');
      for (const d of reels) { d.r.classList.remove('is-stopped'); d.r.style.width = ''; d.r.style.removeProperty('--trim'); d.strip.style.transform = ''; }
    },
  };
}
