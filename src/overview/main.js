// The overview page's script. The page is complete HTML before this runs (src/overview/page.js); this file adds
// motion: the hero's clip, the canvas visuals (each loaded when it scrolls near), the Line in its card and the four
// pieces.
import { boot } from '../site/site.js';
import { HERO } from './media.js';
import './overview.css';

boot();

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const $ = (sel, root = document) => root.querySelector(sel);

// Run `load` once, when `el` comes within `margin` of the viewport.
function near(el, load, margin = '50% 0px') {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { load(); return; }
  const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: margin });
  io.observe(el);
}

// ---------- hero: the Gyre clip over its poster ----------
// The clip is added only when motion is allowed. It plays while the hero is on screen, the tab is visible and the
// Menu is closed. If the browser refuses autoplay (iOS in Low Power Mode), the poster stays and the first tap or
// key press starts the clip. A media error leaves the poster in place.
function heroClip(hero) {
  if (!hero || reduced.matches) return;
  const narrow = matchMedia('(max-width: 600px)');
  const video = document.createElement('video');
  Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'none', tabIndex: -1 });
  video.className = 'home-hero__clip'; video.setAttribute('aria-hidden', 'true'); video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'home-hero__motion'; button.textContent = 'Pause motion'; button.setAttribute('aria-pressed', 'false');
  let paused = false, inView = true, blocked = false, failed = false;
  const setSource = () => { const src = narrow.matches ? HERO.portrait : HERO.landscape; if (video.getAttribute('src') !== src) { video.classList.remove('is-ready'); video.src = src; } };
  const attempt = () => video.play().then(() => { blocked = false; }).catch(error => {
    if (error.name === 'NotAllowedError') { blocked = true; button.hidden = true; } else if (error.name !== 'AbortError') fail();
  });
  const sync = () => {
    if (failed) return;
    const covered = document.documentElement.classList.contains('sy-atlas-open');
    if (paused || !inView || document.hidden || covered) video.pause(); else attempt();
  };
  const fail = () => { failed = true; video.remove(); button.remove(); };
  video.addEventListener('playing', () => { video.classList.add('is-ready'); button.hidden = false; });
  video.addEventListener('error', fail);
  button.addEventListener('click', () => { paused = !paused; button.textContent = paused ? 'Play motion' : 'Pause motion'; button.setAttribute('aria-pressed', String(paused)); sync(); });
  const gesture = () => { if (blocked && !paused) attempt(); };
  addEventListener('pointerdown', gesture, { passive: true }); addEventListener('keydown', gesture);
  narrow.addEventListener('change', () => { setSource(); sync(); });
  reduced.addEventListener('change', () => { if (reduced.matches) fail(); });
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }).observe(hero);
  setSource();
  hero.querySelector('.home-hero__media').append(video);
  hero.append(button);
  sync();
}
heroClip($('.home-hero'));

// ---------- canvas visuals: each module is fetched when its canvas scrolls near ----------
const visual = name => $(`canvas[data-visual="${name}"]`);

near(visual('factory'), () => import('../visuals/factory.js').then(m => m.mount(visual('factory'))));

// The Line, in its card in Factory: the model proposes, and nothing is published until the visitor presses Approve.
near($('[data-line]'), () => import('./line.js').then(m => m.line($('[data-line]'))));

// The globe names each site in turn; the caption and both links follow it, so a press opens the site named. It can
// be turned by dragging it or with the arrow keys (src/overview/globe.js).
near(visual('atlas'), () => import('./globe.js').then(m => m.globe(visual('atlas'), { site: $('[data-atlas-site]'), coords: $('[data-atlas-coords]'), link: $('[data-atlas-globe]') })));

// The field behind the contact section. Without WebGL the section keeps its plain ground.
near(visual('field'), () => import('../visuals/phase.js').then(m => { if (!m.mount(visual('field'))) visual('field').hidden = true; }));

// ---------- the four pieces: one runs at a time, and only when asked ----------
// Pressing a tile (or resting a mouse on it) loads that piece into the tile (media/home/pieces/*.html); the others
// keep their stills. Pointing never interrupts a piece whose sound is on. Leaving the row stops the piece and its sound.
(function pieces(row) {
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
})($('.home-pieces'));
