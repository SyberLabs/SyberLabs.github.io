/* The Menu: a full-screen site map that opens from the header on every page and every screen size, and the site's
   one directory. The markup is a <details class="sy-menu"> that opens and closes without JavaScript and already
   marks the current page (projects/project-template.js). This module adds Esc, the close button and the backdrop
   to close it, closing after a link is chosen, focus kept inside the map and returned to the button, scroll lock,
   and the "/" keyboard shortcut.

   It also wakes the Menu's field (src/visuals/attractor.js) the first time the Menu opens: a cloud of points that
   is the name SyberLabs and then a strange attractor, moving on to the next attractor every few seconds. The field
   answers the visitor: the pointer turns it, each group of links has its own attractor and holds it while the
   pointer is there, pointing at "SyberLabs" in the Menu's head gathers the name again, and a press on empty ground
   shows the next attractor. Where there is no WebGL, or the visitor has asked to save data,
   the Menu is as it was. */
export function menu() {
  const el = document.querySelector('details.sy-menu');
  if (!el) return;
  const summary = el.querySelector('summary');
  const close = () => { el.open = false; summary.focus(); };
  const atlas = el.querySelector('.sy-atlas'), panel = el.querySelector('.sy-atlas__panel');
  let field = null, asked = false;
  // The field's script is fetched only when the Menu is first opened, so no page pays for it before then.
  const wake = () => {
    if (asked || !atlas || !panel) return;
    asked = true;
    if (navigator.connection && navigator.connection.saveData) return;
    import('../visuals/attractor.js').then(m => {
      const plate = document.createElement('p');
      plate.className = 'sy-atlas__plate'; plate.setAttribute('aria-hidden', 'true');
      const made = m.mount(atlas, { onForm(form, count) {
        plate.replaceChildren();
        const name = document.createElement('b'); name.textContent = form.name;
        const what = document.createElement('span'); what.className = 'sy-atlas__params'; what.textContent = form.text;
        const many = document.createElement('span'); many.textContent = `${count.toLocaleString('en-US')} points`;
        plate.append(name, ...(form.text ? [what] : []), many);
      } });
      if (!made) return;
      field = made;
      atlas.insertBefore(plate, panel);
      el.classList.add('sy-menu--live');
      el.querySelectorAll('.sy-atlas__group').forEach((group, i) => {
        group.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { field.show(i); field.pin(true); } });
        group.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') field.pin(false); });
        group.addEventListener('focusin', e => { if (e.target.matches(':focus-visible')) field.show(i); });
      });
      const name = el.querySelector('.sy-atlas__head .sy-eyebrow');
      if (name) {
        let back = 0;
        name.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') field.word(); });
        name.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') field.back(); });
        name.addEventListener('click', e => { e.stopPropagation(); field.word(); clearTimeout(back); back = setTimeout(() => field.back(), 2400); });
      }
      panel.addEventListener('click', e => { if (!e.target.closest('a, button, summary')) field.next(); });
      atlas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') field.aim(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1); }, { passive: true });
      if (el.open) field.open();
    }).catch(() => {});
  };
  const sync = () => {
    document.documentElement.classList.toggle('sy-atlas-open', el.open);
    summary.setAttribute('aria-expanded', String(el.open));
    if (el.open) { wake(); if (field) field.open(); } else if (field) field.close();
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
