/* The hero headline as four slot reels: Creative systems. / Reliable agents. Each reel is a vertical strip of words
   (Creative / Generative / Reliable, humans / agents / systems) that spins once and stops on its word, staggered left
   to right and top to bottom, with a small mechanical overshoot. Mid-spin the reels pass real combinations
   ("Generative agents", "Reliable humans"): the same parts, recombined, settling on the two the lab ships.

   The spin is a CSS transform transition (compositor-only); each reel's width eases from its widest word to its
   final one as it stops. Once settled, the two nouns carry a flowing spectrum and take a spark every few seconds.
   Markup (src/App.jsx Slot): .home-slot > .home-slot__line > .home-slot__reel > .home-slot__strip > .home-slot__w,
   the last word of each strip marked .is-final. Without JavaScript or under reduced motion only the final words
   show, as plain text. mountSlot(h1) -> { destroy() } */

const STOPS = [900, 1200, 1500, 1800];   // ms: when each reel lands (line 1 adjective, line 1 noun, line 2 adjective, line 2 noun)
const SPIN = 'cubic-bezier(.16, .72, .22, 1.06)'; // fast start, long glide, a touch of overshoot into the stop
const FLOW_MS = 16000, GLINT_MS = 7000, SWEEP = 0.22;

export function mountSlot(h1) {
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!h1) return { destroy() {} };
  if (reduced) { h1.classList.add('is-static'); return { destroy() {} }; }
  const reels = [...h1.querySelectorAll('.home-slot__reel')].map(r => {
    const strip = r.querySelector('.home-slot__strip'), words = [...strip.children];
    return { r, strip, words, last: words.length - 1, final: words[words.length - 1] };
  });
  if (reels.length !== 4) return { destroy() {} };

  h1.classList.add('is-live');
  // start state: every reel as wide as its widest word, showing its first word, with no transition
  const setup = () => {
    for (const d of reels) {
      d.r.classList.remove('is-stopped'); d.strip.style.transition = 'none'; d.strip.style.transform = 'translateY(0)';
      d.r.style.transition = 'none'; d.r.style.width = Math.max(...d.words.map(w => w.offsetWidth)) + 'px';
    }
  };
  setup();

  const timers = [], at = (ms, fn) => timers.push(setTimeout(fn, ms));
  let raf = 0, dead = false, restedAt = 0, lastWrite = 0, t0 = 0, settled = false;
  const nouns = [reels[1].final, reels[3].final];

  // after the stop: keep each reel exactly as wide as its word, also when the type size changes
  const fit = () => { if (settled) for (const d of reels) { d.r.style.transition = 'none'; d.r.style.width = d.final.offsetWidth + 'px'; } };
  const ro = 'ResizeObserver' in window ? new ResizeObserver(fit) : null;
  ro?.observe(h1);

  // the settled nouns: a flowing spectrum, and a spark across both (line 2 a beat after line 1) every GLINT_MS
  const frame = now => {
    raf = 0; if (dead) return;
    if (!document.hidden && (now - lastWrite > 31 || (now - restedAt) % GLINT_MS < GLINT_MS * (SWEEP + .06))) {
      lastWrite = now;
      nouns.forEach((w, i) => {
        const W = w.offsetWidth || 1, flow = -(((now - t0) % FLOW_MS) / FLOW_MS) * 2 * W;
        const g = now - restedAt - i * 300, p = g < 0 ? 1 : (g % GLINT_MS) / GLINT_MS;
        const glint = p < SWEEP ? -W + 2 * W * (p / SWEEP) : W;
        w.style.setProperty('--ww', W + 'px');
        w.style.backgroundPosition = `${glint.toFixed(1)}px 0, ${flow.toFixed(1)}px 0`;
      });
    }
    raf = requestAnimationFrame(frame);
  };

  const start = () => {
    if (dead) return;
    setup();
    void h1.offsetWidth; // commit the start state before the transitions begin
    h1.classList.add('is-spinning');
    reels.forEach((d, i) => {
      const ms = STOPS[i];
      d.r.style.setProperty('--spin', ms + 'ms');
      d.strip.style.transition = `transform ${ms}ms ${SPIN}`;
      d.strip.style.transform = `translateY(${-d.last}em)`;
      // the reel narrows to its final word as it glides into the stop
      d.r.style.transition = `width 520ms var(--sy-ease) ${Math.max(0, ms - 460)}ms`;
      d.r.style.width = d.final.offsetWidth + 'px';
      at(ms + 40, () => d.r.classList.add('is-stopped'));
    });
    at(STOPS[3] + 120, () => {
      settled = true; h1.classList.remove('is-spinning'); h1.classList.add('is-rest');
      t0 = restedAt = performance.now() - GLINT_MS * .6; // the first spark crosses shortly after the stop
      raf = requestAnimationFrame(frame);
    });
  };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); (document.fonts?.ready || Promise.resolve()).then(() => at(200, start)); } }) : null;
  if (io) io.observe(h1); else start();

  return {
    destroy() {
      dead = true; timers.forEach(clearTimeout); if (raf) cancelAnimationFrame(raf);
      io?.disconnect(); ro?.disconnect();
      h1.classList.remove('is-live', 'is-spinning', 'is-rest');
      for (const d of reels) d.r.classList.remove('is-stopped');
    },
  };
}
