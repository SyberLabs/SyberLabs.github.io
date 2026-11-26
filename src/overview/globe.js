// The Lacuna globe (src/visuals/atlas.js) and the words beside it. The globe names each site in turn; the caption
// and both links follow it, so a press opens the site named. The link over the globe's disc is also its handle:
// dragging it sideways turns the globe, and so do the left and right arrow keys while it has focus. A drag is not a
// press, so it does not follow the link.
import { mount } from '../visuals/atlas.js';
import { position } from './page-format.js';

export function globe(canvas, { site, coords, link }) {
  const view = mount(canvas, { onSite(s) {
    const href = `/lacuna/#${s.id}`;
    site.textContent = s.name; site.href = href;
    coords.textContent = position(s.lat, s.lon);
    link.href = href; link.setAttribute('aria-label', `Open ${s.name} on the Lacuna Atlas`);
  } });
  if (!view || !link) return;
  let id = null, lastX = 0, lastT = 0, speed = 0, moved = 0;
  link.addEventListener('dragstart', event => event.preventDefault());
  link.addEventListener('pointerdown', event => {
    if (event.button) return;
    id = event.pointerId; lastX = event.clientX; lastT = event.timeStamp; speed = 0; moved = 0;
    view.grab(); link.classList.add('is-held');
    try { link.setPointerCapture(id); } catch { /* a pointer that is already gone */ }
  });
  link.addEventListener('pointermove', event => {
    if (event.pointerId !== id) return;
    const dx = event.clientX - lastX, dt = Math.max(1, event.timeStamp - lastT);
    moved += Math.abs(dx); view.turn(dx);
    speed = 0.6 * speed + 0.4 * (dx / dt * 1000);
    lastX = event.clientX; lastT = event.timeStamp;
  });
  const end = event => {
    if (event.pointerId !== id) return;
    id = null; link.classList.remove('is-held');
    view.release(event.timeStamp - lastT > 90 ? 0 : speed);
  };
  link.addEventListener('pointerup', end);
  link.addEventListener('pointercancel', end);
  link.addEventListener('click', event => { if (moved > 6) event.preventDefault(); moved = 0; });
  link.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    view.grab(); view.turn(event.key === 'ArrowLeft' ? 36 : -36); view.release(0);
  });
}
