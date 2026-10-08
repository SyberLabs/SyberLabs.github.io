/* Grown in RISE Sketch: real timelapses from the engine, each a link that opens that exact drawing in
   RISE Sketch (its remix link). Videos are muted loops that play only while on screen; reduced motion
   leaves the poster still. */
import { reducedMotion } from './motion.js';

export function mountSketchGallery(root) {
  const videos = [...root.querySelectorAll('video[data-sketch-loop]')];
  if (!videos.length || reducedMotion() || !('IntersectionObserver' in window)) return { destroy() {} };
  const io = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
  }), { threshold: 0.35 });
  videos.forEach(v => io.observe(v));
  return { destroy() { io.disconnect(); } };
}
