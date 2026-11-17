// Physics probe: measures what each form can clear, so stages are built inside those limits.
import { newGame, step, T, HUM, JAG } from '../game/sim.js';
const flat = (w, h, extra = []) => { const rows = []; for (let y = 0; y < h; y++) rows.push((y === h - 1 ? '#' : ' ').repeat(w)); for (const [x, y, ch] of extra) rows[y] = rows[y].slice(0, x) + ch + rows[y].slice(x + 1); return rows; };
const I = o => Object.assign({ left: 0, right: 0, up: 0, down: 0, jump: 0, fire: 0, alt: 0, jumpP: 0, spaceP: 0, fireP: 0, altP: 0, actP: 0, swapP: 0, aimX: 0, aimY: 0 }, o);
function run(g, frames, fn) { for (let i = 0; i < frames; i++) step(g, I(fn(i, g)), 1 / 60); }
for (const persona of ['syber', 'psycho']) {
  const rows = flat(80, 20, [[2, 18, '@']]);
  let g = newGame({ id: 'p', map: rows, persona });
  run(g, 30, () => ({}));
  const y0 = g.p.y; let top = y0;
  run(g, 90, i => { top = Math.min(top, g.p.y); return { jump: 1, jumpP: i === 0 }; });
  g = newGame({ id: 'p', map: rows, persona });
  run(g, 90, () => ({ right: 1 }));
  const x0 = g.p.x; let landed = null;
  run(g, 120, (i, gg) => { if (i > 5 && gg.p.onGround && landed === null) landed = gg.p.x; return { right: 1, jump: 1, jumpP: i === 0 }; });
  console.log(persona, 'jump height px', (y0 - top).toFixed(1), '=', ((y0 - top) / T).toFixed(2), 'tiles | running jump px', (landed - x0).toFixed(1), '=', ((landed - x0) / T).toFixed(2), 'tiles | top speed', g.p.vx.toFixed(0));
}
// jaguar: pounce reach from a running jump
{
  const g = newGame({ id: 'p', map: flat(120, 24, [[2, 22, '@']]), persona: 'psycho' });
  run(g, 60, () => ({ right: 1 }));
  const x0 = g.p.x; let landed = null, top = g.p.y;
  run(g, 200, (i, gg) => { top = Math.min(top, gg.p.y); if (i > 5 && gg.p.onGround && landed === null) landed = gg.p.x; return { right: 1, jump: 1, jumpP: i === 0, fireP: i === 18, aimX: gg.p.x + 200, aimY: gg.p.y - 60 }; });
  console.log('jaguar jump + pounce: distance', ((landed - x0) / T).toFixed(2), 'tiles, height', ((g.L.h * T - T - top) / T).toFixed(2), 'tiles');
}
// jaguar: wall climb
{
  const extra = [[2, 22, '@']]; for (let y = 4; y < 23; y++) extra.push([8, y, '#']);
  const g = newGame({ id: 'p', map: flat(40, 24, extra), persona: 'psycho' });
  run(g, 400, (i, gg) => ({ right: 1, up: 1, jump: i < 30, jumpP: i === 20 }));
  console.log('jaguar wall climb: reached y tile', (g.p.y / T).toFixed(2), 'x tile', (g.p.x / T).toFixed(2), 'cling', g.p.cling, 'ground', g.p.onGround);
}
// human: cord swing across a pit from a ring
{
  const rows = flat(60, 24, [[2, 22, '@'], [16, 12, 'o']]);
  rows[23] = '#'.repeat(10) + ' '.repeat(14) + '#'.repeat(36);
  const g = newGame({ id: 'p', map: rows, persona: 'syber' });
  let t = 0, out = null;
  run(g, 60, () => ({ right: 1 }));
  run(g, 400, (i, gg) => {
    const p = gg.p; if (out) return { right: 1 };
    if (i < 12) return { right: 1, jump: 1, jumpP: i === 0 };
    if (!p.rope && i < 30) return { right: 1, alt: 1, altP: 1, aimX: 16 * T + 8, aimY: 12 * T + 8 };
    if (p.rope && p.x > 20 * T && p.vy < 0) { out = { x: p.x / T, vx: p.vx, vy: p.vy }; return { right: 1 }; }
    return { right: 1, alt: 1, aimX: 16 * T + 8, aimY: 12 * T + 8 };
  });
  console.log('cord swing: released at', out, 'ended x tile', (g.p.x / T).toFixed(1), 'y', (g.p.y / T).toFixed(1), 'dead', g.p.dead, 'deaths', g.deaths);
}
