/* SyberLabs site v3: motion layer. Pure DOM, no dependencies.
   - reveal(root): elements with [data-reveal] (and sections' direct children when the section has
     [data-reveal-children]) get .is-in when they scroll into view, staggered by order.
   - tilt(root): [data-tilt] elements lean toward the pointer in 3D (CSS vars --rx/--ry/--mx/--my).
   - progress(): a spectrum scroll-progress bar under the header (.sy-progress).
   - spy(): marks the header nav link whose section is on screen (aria-current="location").
   - header(): adds .is-scrolled to .sy-header after the first 24px.
   - magnetic(root): .sy-btn--solid buttons drift a few px toward the pointer.
   Everything is off under prefers-reduced-motion, and nothing here is needed to read the page. */

export const reducedMotion = () => !!(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
const fine = () => !!(typeof matchMedia === 'function' && matchMedia('(pointer:fine)').matches);

export function reveal(root = document) {
  const auto = [...root.querySelectorAll('[data-reveal-children]')].flatMap(s => [...s.children]);
  const items = [...new Set([...root.querySelectorAll('[data-reveal]'), ...auto])];
  items.forEach(el => el.classList.add('sy-reveal'));
  if (reducedMotion() || !('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('is-in')); return { disconnect() {} }; }
  let batch = [], flush = 0;
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); batch.push(e.target); }
    if (!flush) flush = requestAnimationFrame(() => {
      batch.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      batch.forEach((el, i) => { el.style.setProperty('--sy-delay', Math.min(i, 8) * 70 + 'ms'); el.classList.add('is-in'); });
      batch = []; flush = 0;
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  items.forEach(el => io.observe(el));
  // Safety net: anything on screen that the observer somehow missed is shown after a beat, and
  // everything is shown before printing. Copy must never stay hidden because of a decoration.
  const sweep = () => { for (const el of items) if (!el.classList.contains('is-in')) { const r = el.getBoundingClientRect(); if (r.top < innerHeight * 1.1 && r.bottom > 0) el.classList.add('is-in'); } };
  setTimeout(sweep, 1800); addEventListener('pageshow', sweep);
  addEventListener('beforeprint', () => items.forEach(el => el.classList.add('is-in')));
  return io;
}

export function tilt(root = document) {
  if (reducedMotion() || !fine()) return;
  for (const el of root.querySelectorAll('[data-tilt]')) {
    const max = parseFloat(el.dataset.tilt) || 7;
    let raf = 0, rx = 0, ry = 0, mx = 50, my = 50;
    const paint = () => { raf = 0; el.style.setProperty('--rx', rx.toFixed(2) + 'deg'); el.style.setProperty('--ry', ry.toFixed(2) + 'deg'); el.style.setProperty('--mx', mx.toFixed(1) + '%'); el.style.setProperty('--my', my.toFixed(1) + '%'); };
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      ry = (x - 0.5) * 2 * max; rx = -(y - 0.5) * 2 * max; mx = x * 100; my = y * 100;
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: true });
    el.addEventListener('pointerleave', () => { rx = ry = 0; mx = my = 50; if (!raf) raf = requestAnimationFrame(paint); });
    el.classList.add('sy-tilt');
  }
}

export function magnetic(root = document) {
  if (reducedMotion() || !fine()) return;
  for (const el of root.querySelectorAll('.sy-btn--solid, [data-magnetic]')) {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--tx', ((e.clientX - r.left) / r.width - 0.5) * 8 + 'px');
      el.style.setProperty('--ty', ((e.clientY - r.top) / r.height - 0.5) * 6 + 'px');
    }, { passive: true });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--tx', '0px'); el.style.setProperty('--ty', '0px'); });
    el.classList.add('sy-magnetic');
  }
}

export function progress() {
  const header = document.querySelector('.sy-header');
  if (!header) return;
  let bar = header.querySelector('.sy-progress');
  if (!bar) { bar = document.createElement('span'); bar.className = 'sy-progress'; bar.setAttribute('aria-hidden', 'true'); header.appendChild(bar); }
  let raf = 0;
  const paint = () => { raf = 0; const h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`; header.classList.toggle('is-scrolled', scrollY > 24); };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
  addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(paint); });
  paint();
}

export function spy() {
  const links = [...document.querySelectorAll('.sy-nav a[href^="/#"], .sy-nav a[href^="#"], aside nav a[href^="#"], .sy-toc a[href^="#"]')];
  if (!links.length || !('IntersectionObserver' in window)) return;
  const map = new Map();
  for (const a of links) { const id = a.getAttribute('href').split('#')[1]; const sec = id && document.getElementById(id); if (sec) map.set(sec, a); }
  if (!map.size) return;
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      const a = map.get(e.target);
      if (e.isIntersecting) { const group = a.closest('nav'); links.filter(l => l.closest('nav') === group).forEach(l => l.removeAttribute('aria-current')); a.setAttribute('aria-current', 'location'); }
    }
  }, { rootMargin: '-40% 0px -55% 0px' });
  map.forEach((_, sec) => io.observe(sec));
}

/* Split a heading into word spans so the words can rise in one by one. Keeps the original text for AT. */
export function splitWords(el) {
  if (!el || el.classList.contains('sy-split')) return;
  const label = el.textContent.trim().replace(/\s+/g, ' ');
  el.setAttribute('aria-label', label);
  const walk = node => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'sy-word'; w.setAttribute('aria-hidden', 'true');
          const i = document.createElement('span'); i.textContent = part; w.appendChild(i); frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && child.tagName !== 'BR') walk(child);
    }
  };
  walk(el);
  el.querySelectorAll('.sy-word').forEach((w, i) => w.style.setProperty('--i', i));
  el.classList.add('sy-split');
}

export function headerScroll() {
  const header = document.querySelector('.sy-header');
  if (!header) return;
  let lastY = scrollY, raf = 0;
  const paint = () => {
    raf = 0;
    const y = scrollY, down = y > lastY + 4, up = y < lastY - 4;
    if (y < 80) header.classList.remove('is-hidden');
    else if (down) header.classList.add('is-hidden');
    else if (up) header.classList.remove('is-hidden');
    lastY = y;
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
}

/* "Back to top" affordance that appears after the first screen. */
export function toTop() {
  if (document.querySelector('.sy-totop')) return;
  const b = document.createElement('a');
  b.className = 'sy-totop'; b.href = '#'; b.setAttribute('aria-label', 'Back to top');
  b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M6 11l6-6 6 6"/></svg>';
  b.addEventListener('click', e => { e.preventDefault(); scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' }); const h = document.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } });
  document.body.appendChild(b);
  let raf = 0;
  const paint = () => { raf = 0; b.classList.toggle('is-on', scrollY > innerHeight * 0.8); };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
  paint();
}

/* Hero parallax: [data-parallax] containers get --sy-py (px scrolled while the hero is on screen);
   children opt in with [data-depth="0.2"] and drift at that fraction. Off under reduced motion. */
export function parallax() {
  if (reducedMotion()) return;
  const hosts = [...document.querySelectorAll('[data-parallax]')];
  if (!hosts.length) return;
  for (const h of hosts) for (const c of h.querySelectorAll('[data-depth]')) c.classList.add('sy-depth');
  let raf = 0;
  const paint = () => { raf = 0; for (const h of hosts) { const r = h.getBoundingClientRect(); if (r.bottom < 0) continue; h.style.setProperty('--sy-py', Math.max(0, -r.top).toFixed(1)); h.style.setProperty('--sy-pf', Math.min(1, Math.max(0, -r.top / Math.max(1, r.height * 0.7))).toFixed(3)); } };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
  paint();
}
