// The homepage's script. The page is complete HTML before this runs (src/home/page.js); this file adds what moves,
// and each thing that moves answers the visitor: the pointer's light, the Line in the first screen, the recorded
// run's output, the product marks, the globe, the field behind the contact part and the four pieces. The Line is
// in the first screen, so it is part of this file's bundle; everything else is fetched when it scrolls near.
import { boot } from '../site/site.js';
import { glow } from './glow.js';
import { line } from './line.js';
import './home.css';

boot();

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const $ = (sel, root = document) => root.querySelector(sel);
const visual = name => $(`canvas[data-visual="${name}"]`);

// Run `load` once, when `el` comes within `margin` of the viewport.
function near(el, load, margin = '50% 0px') {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { load(); return; }
  const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: margin });
  io.observe(el);
}

glow();
if ($('.home-hero')) line($('.home-hero'));

near($('#run'), () => import('./run.js').then(m => m.run($('#run'), reduced)));

// Product marks: one form of the branching rule each, drawn once and again after a resize.
near($('.home-rows'), () => import('../visuals/elan.js').then(m => {
  const draw = () => { for (const c of document.querySelectorAll('canvas[data-form]')) m.sigil(c, +c.dataset.form); };
  draw();
  let wait; addEventListener('resize', () => { clearTimeout(wait); wait = setTimeout(draw, 200); });
}));

near(visual('atlas'), () => import('./globe.js').then(m => m.globe(visual('atlas'), { site: $('[data-atlas-site]'), coords: $('[data-atlas-coords]'), link: $('[data-atlas-globe]') })));

near($('.home-pieces'), () => import('./pieces.js').then(m => m.pieces($('.home-pieces'), reduced)));

// The field behind the contact part. Without WebGL the part keeps its plain ground.
near(visual('field'), () => import('../visuals/phase.js').then(m => { if (!m.mount(visual('field'))) visual('field').hidden = true; }));
