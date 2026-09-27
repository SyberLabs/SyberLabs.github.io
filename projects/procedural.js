// A small projected-point field. Each product gives the same canvas a different geometry.
export function mountProcedural(canvas, kind) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const colors = { rise: [178, 139, 255], commons: [173, 241, 155], relay: [100, 224, 218], omnios: [239, 145, 212], osahr: [240, 196, 135] };
  const color = colors[kind] || colors.rise;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, raf = 0, visible = true, stopped = false;
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) draw(); });
  observer.observe(canvas);
  const sizeObserver = new ResizeObserver(() => draw());
  sizeObserver.observe(canvas);

  function dot(x, y, z, size = 1.5, alpha = .5) {
    const depth = 1 + z / 700;
    const px = canvas.clientWidth / 2 + x / depth;
    const py = canvas.clientHeight / 2 + y / depth;
    if (px < -10 || py < -10 || px > canvas.clientWidth + 10 || py > canvas.clientHeight + 10) return;
    ctx.fillStyle = `rgba(${color.join(',')},${alpha / depth})`;
    ctx.beginPath(); ctx.arc(px, py, size / depth, 0, Math.PI * 2); ctx.fill();
  }
  function line(a, b, alpha = .15) {
    ctx.strokeStyle = `rgba(${color.join(',')},${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(canvas.clientWidth / 2 + a[0], canvas.clientHeight / 2 + a[1]);
    ctx.lineTo(canvas.clientWidth / 2 + b[0], canvas.clientHeight / 2 + b[1]); ctx.stroke();
  }
  function geometry(t, scale) {
    if (kind === 'rise') {
      for (let i = 0; i < 260; i++) {
        const a = i * 2.39996 + t * .13, b = i * .097;
        const r = (90 + 45 * Math.sin(b * 3 + t)) * scale;
        dot(Math.cos(a) * r, Math.sin(a) * r * .63 + Math.sin(b * 2) * 35 * scale, Math.cos(b) * 120, i % 17 ? 1.2 : 2.7, .18 + (i % 7) * .08);
      }
    } else if (kind === 'commons') {
      const hubs = Array.from({ length: 5 }, (_, i) => {
        const a = i * Math.PI * 2 / 5 - .6 + t * .025;
        return [Math.cos(a) * 145 * scale, Math.sin(a) * 105 * scale];
      });
      hubs.forEach((p, i) => { line(p, hubs[(i + 1) % 5], .18); line([0, 0], p, .13); dot(p[0], p[1], -20, 5, .7); });
      for (let i = 0; i < 120; i++) { const h = hubs[i % 5], a = i * 2.39996 + t * .2, r = (i % 12) * 3 * scale; dot(h[0] + Math.cos(a) * r, h[1] + Math.sin(a) * r, 40, 1.2, .25); }
    } else if (kind === 'relay') {
      for (let layer = 0; layer < 4; layer++) {
        const x = (layer - 1.5) * 38 * scale, y = (layer - 1.5) * 28 * scale;
        for (let i = 0; i < 58; i++) {
          const row = Math.floor(i / 10), col = i % 10;
          dot(x + (col - 4.5) * 17 * scale, y + (row - 2.5) * 18 * scale, 110 - layer * 65, row === 0 ? 2 : 1, .12 + layer * .07);
        }
        line([x - 80 * scale, y - 52 * scale], [x + 80 * scale, y - 52 * scale], .17);
      }
    } else if (kind === 'omnios') {
      const hubs = [[-150, -95], [-170, 100], [25, 0], [170, 60]].map(([x, y]) => [x * scale, y * scale]);
      [[0, 2], [1, 2], [2, 3]].forEach(([a, b]) => line(hubs[a], hubs[b], .26));
      hubs.forEach((p, i) => { dot(p[0], p[1], -35, i === 2 ? 7 : 4, .8); for (let j = 0; j < 28; j++) { const a = j * 2.4 + t * (i % 2 ? -.16 : .16), r = (j % 7) * 8 * scale; dot(p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r, 20, 1.3, .3); } });
      for (let i = 0; i < 30; i++) { const q = i / 30, a = hubs[0], b = hubs[2]; dot(a[0] + (b[0] - a[0]) * ((q + t * .09) % 1), a[1] + (b[1] - a[1]) * ((q + t * .09) % 1), 0, 2, .5); }
    } else if (kind === 'osahr') {
      const nodes = Array.from({ length: 7 }, (_, i) => { const a = i * 2.39996 + t * .035; return [Math.cos(a) * (55 + i * 15) * scale, Math.sin(a) * (55 + i * 10) * scale]; });
      [[0, 1], [0, 3], [1, 4], [2, 4], [2, 5], [3, 6], [4, 6]].forEach(([a, b], i) => line(nodes[a], nodes[b], i === Math.floor(t) % 7 ? .6 : .18));
      nodes.forEach((p, i) => { dot(p[0], p[1], (i % 3) * 30, 3.5, .7); for (let j = 0; j < 12; j++) { const a = j * .52 + t * .18; dot(p[0] + Math.cos(a) * 16 * scale, p[1] + Math.sin(a) * 16 * scale, 0, 1, .2); } });
    }
  }
  function draw() {
    if (stopped || !visible || document.hidden) return;
    cancelAnimationFrame(raf);
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(rect.width * dpr)), height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, rect.width, rect.height);
    geometry(reduced.matches ? 0 : frame / 60, Math.min(rect.width / 700, rect.height / 550, 1.4));
    if (!reduced.matches) { frame++; raf = requestAnimationFrame(draw); }
  }
  const onVisibility = () => { if (!document.hidden) draw(); };
  document.addEventListener('visibilitychange', onVisibility);
  draw();
  return () => { stopped = true; cancelAnimationFrame(raf); observer.disconnect(); sizeObserver.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
}
