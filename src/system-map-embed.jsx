// Mounts one system map (src/system-maps/) into a project page: <div data-system-map="osahr"></div>.
// Built unhashed as /system-map.js (vite.config.js) so the static project pages can load it; the
// stylesheet travels inside the bundle so the page needs one tag. Without JavaScript the page keeps
// the paragraph the template put inside the host element.
import React from 'react';
import { createRoot } from 'react-dom/client';
import SystemMaps from './system-maps/SystemMaps.jsx';
import css from './system-maps/system-maps.css?inline';

const hosts = document.querySelectorAll('[data-system-map]');
if (hosts.length) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  for (const host of hosts) {
    host.replaceChildren();
    createRoot(host).render(<SystemMaps only={host.dataset.systemMap} />);
  }
}
