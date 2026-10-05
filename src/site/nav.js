/* SyberLabs site v3: the Atlas, a full-screen site map that opens from the header's Menu button on
   every page and every screen size. The markup is a <details class="sy-menu"> (works without JS);
   this module adds: Esc to close, closing after a link is chosen, a focus return, scroll lock,
   the "/" keyboard shortcut, and the sigils drawn when it opens. */
import { drawAll } from '../../kit/v2/syber-sigil.js';

export function atlas() {
  const menu = document.querySelector('details.sy-menu');
  if (!menu) return;
  const summary = menu.querySelector('summary');
  let drawn = false;
  const sync = () => {
    const open = menu.open;
    document.documentElement.classList.toggle('sy-atlas-open', open);
    summary.setAttribute('aria-expanded', String(open));
    if (open && !drawn) { drawn = true; drawAll(menu); }
    if (open) { const first = menu.querySelector('.sy-atlas a'); first && setTimeout(() => first.focus({ preventScroll: true }), 30); }
  };
  menu.addEventListener('toggle', sync);
  menu.addEventListener('click', e => { if (e.target.closest('a')) { menu.open = false; } });
  menu.querySelector('.sy-atlas__close')?.addEventListener('click', () => { menu.open = false; summary.focus(); });
  menu.querySelector('.sy-atlas__backdrop')?.addEventListener('click', () => { menu.open = false; summary.focus(); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.open) { menu.open = false; summary.focus(); }
    else if (e.key === '/' && !menu.open && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '') && !e.metaKey && !e.ctrlKey) { e.preventDefault(); menu.open = true; }
    else if (e.key === 'Tab' && menu.open) {
      const f = [...menu.querySelectorAll('summary, .sy-atlas a, .sy-atlas button')].filter(x => x.offsetParent !== null || x === summary);
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  // mark where we are
  const here = location.pathname.replace(/index\.html$/, '');
  for (const a of menu.querySelectorAll('.sy-atlas a[href]')) {
    const href = a.getAttribute('href');
    if (href === here || (href !== '/' && here.startsWith(href) && href.length > 1 && !href.includes('#'))) a.setAttribute('aria-current', 'page');
  }
  sync();
}
