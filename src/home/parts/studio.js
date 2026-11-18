// Studio: the four pieces that move to sound, and the game. Each tile shows a still; pressing one runs the piece
// itself, one at a time (src/home/pieces.js).
import { esc, head } from './html.js';

const PIECES = [
  ['cymatica', 'Cymatica', 'Each note sets its own figure.'],
  ['plutonian-core', 'Plutonian Core', 'The kick strikes the core.'],
  ['kaleidos', 'Kaleidos', 'One attractor, folded 6 to 16 times.'],
  ['murmuration', 'Murmuration', 'Up to 20,000 birds, one flock.'],
];

export const studio = () => `<section id="studio" class="home-part" aria-labelledby="studio-title">
      <div class="sy-wrap">
        ${head('studio-title', 'Studio', '<span id="pieces-title">Four pieces that move to sound. Press one to run it.</span>')}
        <ul class="home-pieces" role="list" aria-labelledby="pieces-title">${PIECES.map(([slug, name, line]) => `
          <li><figure class="home-tile" data-piece="${slug}" data-name="${esc(name)}" data-glow>
            <img src="/media/home/posters/${slug}.jpg" width="960" height="1200" alt="" loading="lazy" decoding="async">
            <div class="home-tile__shield home-tile__shield--a"></div><div class="home-tile__shield home-tile__shield--b"></div>
            <figcaption><b>${esc(name)}</b><span>${esc(line)}</span></figcaption>
            <button class="home-tile__run" type="button" aria-label="Run ${esc(name)}">Run</button>
          </figure></li>`).join('')}
        </ul>
        <p class="home-note"><span class="home-label">Game</span><span><b>PSYCHO SYBER.</b> A side-scrolling game that runs in the browser. It has six stages: one for each of the four products, one for Lacuna Institute and a last one with no exit. It plays with a keyboard and a mouse, or by touch on a phone. <a href="/psycho-syber/">Play PSYCHO SYBER</a></span></p>
      </div>
    </section>`;
