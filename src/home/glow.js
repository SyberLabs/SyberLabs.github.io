// The light under the pointer. An element marked data-glow is told where the pointer is inside it (--gx, --gy),
// and src/home/home.css draws a soft light there and a bright point on its upper edge. Only a mouse points, so a
// finger gets nothing from this.
export function glow(root = document) {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let lit = null, x = 0, y = 0, frame = 0;
  const paint = () => {
    frame = 0;
    if (!lit) return;
    const box = lit.getBoundingClientRect();
    lit.style.setProperty('--gx', `${Math.round(x - box.left)}px`);
    lit.style.setProperty('--gy', `${Math.round(y - box.top)}px`);
  };
  root.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !event.target.closest) return;
    lit = event.target.closest('[data-glow]');
    x = event.clientX; y = event.clientY;
    if (lit && !frame) frame = requestAnimationFrame(paint);
  }, { passive: true });
}
