// Homepage behaviours that are not the three canvas visuals: section titles that resolve out of glyphs, the rails'
// arrow buttons, and the live tiles. A tile loads its piece (media/home/pieces/*.html) only while it is the one in
// view, and unloads it when it leaves, so at most two or three pieces run at once and sound stops when you scroll on.

const GLYPHS = '∴∵∷⋮⋯◦○●◌·:+×';

function decode(el) {
  const word = el.dataset.word || (el.dataset.word = el.textContent);
  const t0 = performance.now(), dur = 900;
  (function step(now) {
    const k = Math.min(1, (now - t0) / dur);
    let out = '';
    for (let i = 0; i < word.length; i++) out += (i / word.length < k * 1.15 - 0.15 || word[i] === ' ') ? word[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    el.textContent = out;
    if (k < 1) requestAnimationFrame(step); else el.textContent = word;
  })(t0);
}

export function initHomeMotion(root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cleanups = [];

  // The visible text scrambles for under a second; the accessible name stays the real word (aria-label on the heading).
  if (!reduced && 'IntersectionObserver' in window) {
    const seen = new IntersectionObserver(entries => { for (const e of entries) if (e.isIntersecting) decode(e.target); }, { threshold: 0.6 });
    for (const el of root.querySelectorAll('[data-decode]')) seen.observe(el);
    cleanups.push(() => seen.disconnect());
  }

  for (const button of root.querySelectorAll('[data-rail]')) {
    button.addEventListener('click', () => {
      const rail = button.closest('.hv-railwrap').querySelector('.hv-rail'), tile = rail.querySelector('.hv-tile');
      rail.scrollBy({ left: +button.dataset.rail * (tile.offsetWidth + 14), behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  const tiles = [...root.querySelectorAll('.hv-tile[data-piece]')];
  const frames = new Map();   // tile -> iframe
  const timers = new Map();
  const wake = tile => {
    if (frames.has(tile)) return;
    const frame = document.createElement('iframe');
    frame.title = `${tile.dataset.name}, live`;
    frame.setAttribute('allow', 'autoplay');
    frame.src = `/media/home/pieces/${tile.dataset.piece}.html`;
    tile.insertBefore(frame, tile.querySelector('.hv-tile__shield'));
    frames.set(tile, frame);
  };
  const sleep = tile => { const frame = frames.get(tile); if (frame) { frame.remove(); frames.delete(tile); } };
  // A piece reports once it is drawing; until then (or if it never loads) its still image stays in place.
  const onMessage = event => {
    if (event.origin !== location.origin || !event.data || event.data.syb !== 'ready') return;
    for (const frame of frames.values()) if (frame.contentWindow === event.source) frame.classList.add('is-ready');
  };
  addEventListener('message', onMessage);
  cleanups.push(() => removeEventListener('message', onMessage));
  if (!reduced && 'IntersectionObserver' in window) {
    const live = new IntersectionObserver(entries => {
      for (const e of entries) {
        clearTimeout(timers.get(e.target));
        if (e.intersectionRatio >= 0.6) timers.set(e.target, setTimeout(() => wake(e.target), 350));
        else if (e.intersectionRatio < 0.25) sleep(e.target);
      }
    }, { threshold: [0, 0.25, 0.6, 1] });
    for (const tile of tiles) live.observe(tile);
    cleanups.push(() => { live.disconnect(); for (const tile of tiles) sleep(tile); });
  }
  return () => { for (const fn of cleanups) fn(); };
}
