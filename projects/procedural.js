// The field around the portal: a slow depth of dust in the active project's colour.
// The sphere acts as a lens. Each mote is drawn where a point lens would place its primary image,
// theta = (beta + sqrt(beta^2 + 4 thetaE^2)) / 2, brightened by its magnification and stretched
// along the tangent, so light gathers into a faint ring just outside the glass.
const COLORS = { rise: [178, 139, 255], commons: [173, 241, 155], relay: [100, 224, 218], omnios: [239, 145, 212], osahr: [240, 196, 135] };

export function mountProcedural(canvas, kind, getLens) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { setKind() {}, destroy() {} };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let target = COLORS[kind] || COLORS.rise, color = target.slice();
  let raf = 0, stopped = false, visible = true, W = 1, H = 1, dpr = 1, lens = null, lensAge = 0;
  const t0 = performance.now();

  let seed = 20260926;
  const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const motes = Array.from({ length: 460 }, () => ({ x: r(), y: r(), z: .15 + r() * .85, tw: r() * 6.283, s: r() }));

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 1.75);
    W = Math.max(1, Math.round(rect.width * dpr)); H = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    lens = null;
  }

  function frame(now) {
    if (stopped) return;
    const still = reduced.matches, t = still ? 0 : (now - t0) / 1000;
    if (!lens || ++lensAge > 45) { lens = getLens ? getLens() : null; lensAge = 0; }
    for (let i = 0; i < 3; i++) color[i] += (target[i] - color[i]) * .05;
    const rgb = color.map(v => v | 0).join(',');

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const lx = lens ? lens.x * dpr : -1e9, ly = lens ? lens.y * dpr : -1e9, lr = lens ? lens.r * dpr : 0;
    const thetaE = lr * 1.06, e2 = thetaE * thetaE;

    for (const m of motes) {
      // parallax drift: nearer motes move faster
      const x = ((m.x + t * .004 * m.z) % 1) * W, y = ((m.y + t * .0012 * m.z) % 1) * H;
      let px = x, py = y, mu = 1, tx = 0, ty = 0;
      if (lens) {
        const dx = x - lx, dy = y - ly, beta = Math.hypot(dx, dy) || 1e-3;
        const th = (beta + Math.sqrt(beta * beta + 4 * e2)) / 2;
        px = lx + dx / beta * th; py = ly + dy / beta * th;
        const q = thetaE / th;
        mu = Math.min(4, 1 / Math.max(.25, 1 - q * q * q * q));
        tx = -dy / beta; ty = dx / beta;
      }
      const tw = .65 + .35 * Math.sin(t * .6 + m.tw);
      const a = Math.min(.9, (.05 + .2 * m.z) * tw * mu);
      const size = (.5 + m.z * 1.1 + (m.s > .97 ? 1.2 : 0)) * dpr;
      ctx.fillStyle = `rgba(${rgb},${a})`;
      if (mu > 1.25) {
        const len = size * (mu - 1) * 2.2;
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = size * .9;
        ctx.beginPath(); ctx.moveTo(px - tx * len, py - ty * len); ctx.lineTo(px + tx * len, py + ty * len); ctx.stroke();
      } else {
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
      }
    }
    if (!still && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function start() { cancelAnimationFrame(raf); resize(); raf = requestAnimationFrame(frame); }
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); });
  io.observe(canvas);
  const ro = new ResizeObserver(start); ro.observe(canvas);
  const onVis = () => { if (!document.hidden) start(); };
  document.addEventListener('visibilitychange', onVis);
  start();

  return {
    setKind(next) { target = COLORS[next] || target; if (reduced.matches) { color = target.slice(); start(); } },
    destroy() { stopped = true; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); },
  };
}
