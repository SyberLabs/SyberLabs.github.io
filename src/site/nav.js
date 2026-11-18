/* The Menu: a full-screen site map that opens from the header on every page and every screen size, and the site's
   one directory. The markup is a <details class="sy-menu"> that opens and closes without JavaScript and already
   marks the current page (projects/project-template.js). This module adds Esc, the close button and the backdrop
   to close it, closing after a link is chosen, focus kept inside the map and returned to the button, scroll lock,
   and the "/" keyboard shortcut. */
export function menu() {
  const el = document.querySelector('details.sy-menu');
  if (!el) return;
  const summary = el.querySelector('summary');
  const close = () => { el.open = false; summary.focus(); };
  const sync = () => {
    document.documentElement.classList.toggle('sy-atlas-open', el.open);
    summary.setAttribute('aria-expanded', String(el.open));
    if (el.open) { const first = el.querySelector('.sy-atlas a'); if (first) setTimeout(() => first.focus({ preventScroll: true }), 30); }
  };
  el.addEventListener('toggle', sync);
  el.addEventListener('click', e => { if (e.target.closest('.sy-atlas a')) el.open = false; });
  el.querySelector('.sy-atlas__close')?.addEventListener('click', close);
  el.querySelector('.sy-atlas__backdrop')?.addEventListener('click', close);
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && el.open) close();
    else if (e.key === '/' && !el.open && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '') && !document.activeElement?.isContentEditable && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); el.open = true; }
    else if (e.key === 'Tab' && el.open) {
      const f = [...el.querySelectorAll('.sy-atlas a, .sy-atlas button')].filter(x => x.offsetParent !== null);
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  sync();
}
