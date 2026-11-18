// The four pieces: one runs at a time, and only when asked. Pressing a tile (or resting a mouse on it) loads that
// piece into the tile (media/home/pieces/*.html); the others keep their stills. Pointing never interrupts a piece
// whose sound is on. Leaving the row stops the piece and its sound.
export function pieces(row, reduced) {
  if (!row) return;
  const tiles = [...row.querySelectorAll('.home-tile[data-piece]')];
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
    tile.insertBefore(frame, tile.querySelector('.home-tile__shield'));
  };
  // A piece reports once it is drawing; until then (or if it never loads) its still image stays in place.
  addEventListener('message', event => {
    if (event.origin !== location.origin || !event.data || !frame || frame.contentWindow !== event.source) return;
    if (event.data.syb === 'ready') { frame.classList.add('is-ready'); live.classList.replace('is-waking', 'is-live'); }
    if (event.data.syb === 'sound') sounding = !!event.data.on;
  });
  for (const tile of tiles) {
    tile.addEventListener('click', () => run(tile));
    // Only a mouse points without pressing; a finger's pointerenter is followed by its click.
    tile.addEventListener('pointerenter', event => { if (event.pointerType !== 'mouse' || sounding || reduced.matches) return; clearTimeout(pending); pending = setTimeout(() => run(tile), 220); });
    tile.addEventListener('pointerleave', () => clearTimeout(pending));
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) stop(); }).observe(row);
}
