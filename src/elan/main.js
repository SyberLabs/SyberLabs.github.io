// Elan, full screen (/elan/). The page is complete HTML before this runs (elan/index.html); this file mounts the
// visual over the whole screen with its own motion: the view starts close on the seed and draws back as the figure
// grows, which the small canvas on the homepage does not do. A press on the figure lets it go and starts the next
// form. The close mark and Esc go to the homepage.
import { mount } from '../visuals/elan.js';
import './elan.css';

const canvas = document.querySelector('canvas[data-visual="elan"]');
if (canvas) mount(canvas, { pad: 0, fill: 0.86 });

addEventListener('keydown', event => {
  if (event.key === 'Escape' && !event.metaKey && !event.ctrlKey && !event.altKey) location.assign('/');
});
