/* The one script every static page loads, built unhashed to /syberlabs.js (vite.config.js, src/site/boot.js). The
   homepage's own script (src/home/main.js) calls boot() too. Every page reads and works without it: it adds the
   Menu's keyboard and focus behaviour (src/site/nav.js) and a back-to-top button. */
import { menu } from './nav.js';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function boot() {
  document.documentElement.classList.add('sy-js');   // src/styles/chrome.css and plus/plus.css read this
  menu();
  toTop();
}

/* "Back to top", on pages longer than two screens. On phones it sits over the text, so it shows only while the
   reader scrolls back up, or at the very end. */
function toTop() {
  if (document.querySelector('.sy-totop') || document.documentElement.scrollHeight < innerHeight * 2) return;
  const b = document.createElement('a');
  b.className = 'sy-totop'; b.href = '#'; b.setAttribute('aria-label', 'Back to top');
  b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M6 11l6-6 6 6"/></svg>';
  b.addEventListener('click', e => {
    e.preventDefault();
    scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
    const h = document.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  });
  document.body.appendChild(b);
  const narrow = matchMedia('(max-width: 640px)');
  let raf = 0, lastY = scrollY, up = false;
  const paint = () => {
    raf = 0;
    const y = scrollY, end = y + innerHeight >= document.documentElement.scrollHeight - 80;
    if (Math.abs(y - lastY) > 4) { up = y < lastY; lastY = y; }
    b.classList.toggle('is-on', y > innerHeight * 0.8 && (!narrow.matches || up || end));
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
  paint();
}
