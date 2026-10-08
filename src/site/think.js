/* The hero's "Think.": a thought forming, then thinking.
   Each letter paints its own slice of one continuous spectrum (background-clip: text per letter), so the word
   survives per-letter transforms and filters in every engine. A gradient clipped on a parent with transformed
   children renders blank in WebKit, which is what used to happen on phones.

   Entrance (CSS, src/home.css .home-think): the letters condense out of scattered, defocused light into focus.
   Thinking (here): the spectrum flows through the letters, a spark sweeps the word every 7 s and the full stop
   fires as it passes (the stop's own CSS animation, think-fire, is the clock, so the two stay in step and pause
   together), and on a fine pointer a spotlight follows the cursor. Only each letter's background-position is
   written: every frame during the sweep, 30 times a second otherwise (the spectrum drifts about 1 px per update,
   which reads as smooth), so the word costs a fraction of a millisecond; nothing runs while the hero is off screen.

   Without JavaScript or under reduced motion the word keeps the kit's static spectrum, which renders everywhere.
   mountThink(em) -> { destroy() } */

const FLOW_MS = 16000;              // one full pass of the mirrored spectrum
const GLINT_MS = 7000, GLINT_AT = 1050, SWEEP = 0.22; // matches think-fire's 7 s cycle and its 1.95 s delay in home.css

export function mountThink(em) {
  const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!em || reduced) return { destroy() {} };
  const letters = [...em.querySelectorAll('.home-think__l')], dot = em.querySelector('.home-think__dot');
  if (!letters.length) return { destroy() {} };

  // where each letter sits inside the word, so its slice of the spectrum lines up with its neighbours'
  let W = 1, X = [];
  const measure = () => {
    W = Math.max(1, em.offsetWidth); X = letters.map(l => l.offsetLeft);
    em.style.setProperty('--think-w', W + 'px');
    letters.forEach((l, i) => l.style.setProperty('--think-x', X[i] + 'px'));
  };
  measure();
  em.classList.add('is-live');
  const ro = 'ResizeObserver' in window ? new ResizeObserver(measure) : null;
  ro?.observe(em);
  document.fonts?.ready.then(measure);

  // the clock: the stop's think-fire animation (starts when the title is revealed, pauses with the hero)
  let clock = null, tIn = 0;
  const now = () => {
    if (!clock || clock.playState === 'idle') clock = dot?.getAnimations?.().find(a => a.animationName === 'think-fire') || null;
    if (clock && clock.currentTime != null) return +clock.currentTime;
    if (!em.closest('.is-in')) return null;
    return tIn ? performance.now() - tIn : ((tIn = performance.now()), 0);
  };

  // spotlight, eased toward the cursor on a fine pointer
  const fine = matchMedia('(pointer: fine)').matches;
  let px = -9999, tpx = -9999, spot = 0, tspot = 0;

  let raf = 0, visible = true, dead = false, lastPos = '', lastWrite = 0;
  const frame = () => {
    raf = 0; if (dead) return;
    const t = now(), wall = performance.now();
    if (t != null) {
      const flow = -((t % FLOW_MS) / FLOW_MS) * 2 * W;
      const g = t - GLINT_AT, p = g < 0 ? 1 : (g % GLINT_MS) / GLINT_MS, sweeping = p < SWEEP + 0.01, glint = p < SWEEP ? -W + 2 * W * (p / SWEEP) : W;
      const key = `${flow.toFixed(1)}|${glint.toFixed(1)}`;
      if (key !== lastPos && (sweeping || wall - lastWrite > 31)) {
        lastPos = key; lastWrite = wall;
        letters.forEach((l, i) => { l.style.backgroundPosition = `${(glint - X[i]).toFixed(1)}px 0, 0 0, ${(flow - X[i]).toFixed(1)}px 0`; });
      }
    }
    if (fine && (Math.abs(tpx - px) > 0.5 || Math.abs(tspot - spot) > 0.01)) {
      px = px < -9000 ? tpx : px + (tpx - px) * 0.18; spot += (tspot - spot) * 0.12;
      em.style.setProperty('--think-px', px.toFixed(1) + 'px'); em.style.setProperty('--think-spot', spot.toFixed(3));
    }
    go();
  };
  const go = () => { if (!dead && !raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };

  const host = em.closest('section') || em;
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; em.classList.toggle('is-paused', !visible); go(); }) : null;
  io?.observe(host);
  const onVis = () => go();
  document.addEventListener('visibilitychange', onVis);
  const onMove = e => {
    const r = em.getBoundingClientRect();
    tspot = e.clientY > r.top - r.height * 1.5 && e.clientY < r.bottom + r.height * 1.5 ? 1 : 0;
    if (tspot) tpx = e.clientX - r.left;
  };
  const onLeave = () => { tspot = 0; };
  if (fine) { host.addEventListener('pointermove', onMove, { passive: true }); host.addEventListener('pointerleave', onLeave); }
  go();

  return {
    destroy() {
      dead = true; if (raf) cancelAnimationFrame(raf);
      ro?.disconnect(); io?.disconnect(); document.removeEventListener('visibilitychange', onVis);
      host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerleave', onLeave);
      em.classList.remove('is-live', 'is-paused');
      letters.forEach(l => { l.style.backgroundPosition = ''; });
    },
  };
}
