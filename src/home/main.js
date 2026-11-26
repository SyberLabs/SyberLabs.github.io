// The homepage's script. The page is complete HTML before this runs (src/home/page.js); this file gives the Menu its
// keyboard and focus behaviour and mounts the one visual. Elan is drawn small and at one scale: the figure takes
// about three fifths of its canvas, which leaves the drifting dots room inside it, so nothing is cut at an edge.
// The canvas is small, so it is drawn at a phone's full pixel density and at no less than twice its size.
import { boot } from '../site/site.js';
import { mount } from '../visuals/elan.js';
import './home.css';

boot();

const canvas = document.querySelector('canvas[data-visual="elan"]');
if (canvas) mount(canvas, { pad: 0, fill: 0.62, zoom: false, maxDpr: 3, minDpr: 2 });
