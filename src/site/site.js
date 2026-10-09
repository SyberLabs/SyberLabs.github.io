/* SyberLabs site v3 "Observatory": the one script every static page loads, built unhashed to /syberlabs.js
   (vite.config.js). The homepage bundle (src/App.jsx) calls the same modules directly.
   Order: mark JS present -> chrome behaviours -> reveal/tilt -> the 3D field (lazy, so first paint never waits). */
import { reveal, tilt, magnetic, progress, spy, splitWords, toTop, reducedMotion } from './motion.js';
import { atlas } from './nav.js';
import { account as accountNav } from './account.js';
import { params as sigilParams } from '../../kit/v2/syber-sigil.js';

export function boot(root = document, fieldOpts) {
  document.documentElement.classList.add('sy-js');
  accountNav(root); atlas(); progress(); spy(); toTop(); counters(root);
  root.querySelectorAll('[data-split]').forEach(el => { splitWords(el); el.setAttribute('data-reveal', ''); });
  reveal(root); tilt(root); magnetic(root);
  mountFieldLazy(fieldOpts);
  mountSigils3d(root);
}

/* <b data-count="87">87</b> counts up from 0 when it scrolls in. */
export function counters(root = document) {
  const els = [...root.querySelectorAll('[data-count]')];
  if (!els.length || reducedMotion() || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    const el = e.target, t0 = performance.now(), dur = 1400;
    // data-count is read every frame: a live number that lands mid-count (factory-stats.js) ends the count where it should
    const tick = now => { const k = Math.min(1, (now - t0) / dur), v = Math.round(parseFloat(el.dataset.count) * (1 - Math.pow(1 - k, 3))); el.textContent = String(v); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }), { threshold: 0.4 });
  els.forEach(el => io.observe(el));
}

let field;
export function mountFieldLazy(fieldOpts = {}) {
  if (field || document.documentElement.dataset.field === 'off') return;
  let canvas = document.querySelector('canvas.sy-field');
  if (!canvas) {
    const host = document.createElement('div'); host.className = 'sy-field-host'; host.setAttribute('aria-hidden', 'true');
    canvas = document.createElement('canvas'); canvas.className = 'sy-field'; host.appendChild(canvas);
    document.body.prepend(host);
  }
  const density = fieldOpts.density || document.documentElement.dataset.field || 'full';
  const start = () => import('./field.js').then(m => {
    field = m.mountField(canvas, { ...fieldOpts, density });
    document.documentElement.classList.toggle('sy-field-live', field.supported);
  }).catch(() => { canvas.style.display = 'none'; });
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1200 }); else setTimeout(start, 120);
  return field;
}

/* canvas[data-sigil3d="seed"] inside a plate: the product's de Jong parameters spun as a 3D cloud. */
export function mountSigils3d(root = document) {
  const list = [...root.querySelectorAll('canvas[data-sigil3d]')];
  if (!list.length) return;
  import('./field.js').then(m => {
    for (const c of list) {
      const { P } = sigilParams(c.dataset.sigil3d);
      const r = m.sigil3d(c, P, { color: c.dataset.color || undefined });
      if (!r.supported) c.remove(); // the 2D sigil behind it stays
      else c.classList.add('is-live');
    }
  });
}

export { reducedMotion };
