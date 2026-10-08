// Renders system maps (src/system-maps/) into their hosts. Loaded on demand by src/system-map-embed.js, the
// /system-map.js entry, so React and the maps are only fetched and parsed when an Inspect section nears the
// viewport. The map stylesheet (imported by SystemMaps.jsx) is linked by Vite's preload helper, which waits
// for it before this module runs, so the map never paints unstyled.
import React from 'react';
import { createRoot } from 'react-dom/client';
import SystemMaps from './system-maps/SystemMaps.jsx';

export function mountAll(hosts) {
  for (const host of hosts) {
    host.replaceChildren();
    createRoot(host).render(<SystemMaps only={host.dataset.systemMap} />);
  }
}
