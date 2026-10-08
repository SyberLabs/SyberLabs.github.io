// Mounts one system map (src/system-maps/) into a project page: <div data-system-map="osahr"></div>.
// Built unhashed as /system-map.js (vite.config.js) so the static project pages can load it. This entry is a
// few hundred bytes: React and the maps (src/system-map-mount.jsx) load when a host comes within about two
// screens of the viewport, so a visitor who never scrolls that far never pays for them. Without JavaScript
// the page keeps the paragraph the template put inside the host element.
const hosts = [...document.querySelectorAll('[data-system-map]')];
if (hosts.length) {
  let io = null, started = false;
  const start = () => {
    if (started) return;
    started = true; io?.disconnect();
    import('./system-map-mount.jsx').then(m => m.mountAll(hosts));
  };
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) start(); }, { rootMargin: '1200px 0px' });
    hosts.forEach(h => io.observe(h));
  } else start();
}
