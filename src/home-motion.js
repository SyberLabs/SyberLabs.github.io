// Homepage behaviours that are not the three canvas visuals: section titles that resolve out of glyphs, and the
// row of four pieces. One tile at a time loads its piece (media/home/pieces/*.html); the others show stills.

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

  // One piece runs at a time. The first starts when the row scrolls into view; pointing at a tile (mouse) or
  // pressing it (touch, keyboard) moves the running piece there, except that pointing never interrupts a piece
  // whose sound is on. Leaving the row stops the piece, and with it any sound.
  const row = root.querySelector('.hv-pieces');
  const tiles = row ? [...row.querySelectorAll('.hv-tile[data-piece]')] : [];
  let frame = null, live = null, pending = 0, sounding = false;
  const stop = () => {
    clearTimeout(pending);
    if (frame) frame.remove();
    if (live) live.classList.remove('is-live', 'is-waking');
    frame = live = null; sounding = false;
  };
  const run = tile => {
    if (live === tile) return;
    stop();
    live = tile; tile.classList.add('is-waking');
    frame = document.createElement('iframe');
    frame.title = `${tile.dataset.name}, running`;
    frame.setAttribute('allow', 'autoplay');
    frame.src = `/media/home/pieces/${tile.dataset.piece}.html`;
    tile.insertBefore(frame, tile.querySelector('.hv-tile__shield'));
  };
  // A piece reports once it is drawing; until then (or if it never loads) its still image stays in place.
  const onMessage = event => {
    if (event.origin !== location.origin || !event.data || !frame || frame.contentWindow !== event.source) return;
    if (event.data.syb === 'ready') { frame.classList.add('is-ready'); live.classList.replace('is-waking', 'is-live'); }
    if (event.data.syb === 'sound') sounding = !!event.data.on;   // while a piece is playing sound, only a press moves on
  };
  addEventListener('message', onMessage);
  cleanups.push(() => { removeEventListener('message', onMessage); stop(); });
  for (const tile of tiles) {
    tile.addEventListener('click', () => run(tile));
    if (!reduced) {
      // Only a mouse points without pressing; a finger's pointerenter is followed by its click.
      tile.addEventListener('pointerenter', event => { if (event.pointerType !== 'mouse' || sounding) return; clearTimeout(pending); pending = setTimeout(() => run(tile), 220); });
      tile.addEventListener('pointerleave', () => clearTimeout(pending));
    }
  }
  if (row && 'IntersectionObserver' in window) {
    const inView = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio < 0.1) stop();
      else if (entry.intersectionRatio >= 0.5 && !live && !reduced) { clearTimeout(pending); pending = setTimeout(() => run(tiles[0]), 400); }
    }, { threshold: [0, 0.1, 0.5, 1] });
    inView.observe(row);
    cleanups.push(() => inView.disconnect());
  }
  return () => { for (const fn of cleanups) fn(); };
}
