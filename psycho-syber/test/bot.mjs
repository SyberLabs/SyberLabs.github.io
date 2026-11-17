// A tiny scripted player for the Node tests. A script is a list of [keys, until, opts]:
//   keys   letters: R L U D (held) · J jump (W) · S space · F fire · A alt/cord · E check/roar · X swap
//          J S F A are held for the whole entry and count as "pressed" on its first frame; E and X fire once.
//   until  seconds, or a function (g) => true when the entry is finished
//   opts   { aim: [tileX, tileY] | (g) => [px, py], max: seconds before the entry counts as failed }
import { step, T } from '../game/sim.js';
export function play(g, script, { log = false } = {}) {
  let frame = 0;
  for (let n = 0; n < script.length; n++) {
    const [keys, until, opts = {}] = script[n];
    const max = typeof until === 'number' ? until : (opts.max ?? 8), has = k => keys.includes(k);
    let t = 0, first = true;
    for (;;) {
      if (typeof until === 'function' ? until(g) : t >= until - 1e-9) break;
      if (t > max) return { ok: false, at: n, why: `entry ${n} [${keys}] timed out`, frame, x: g.p.x / T, y: g.p.y / T };
      let aim = opts.aim ? (typeof opts.aim === 'function' ? opts.aim(g) : [opts.aim[0] * T + 8, opts.aim[1] * T + 8]) : [g.p.x + g.p.face * 60, g.p.y - 12];
      step(g, {
        left: has('L'), right: has('R'), up: has('U') || has('J'), down: has('D'), jump: has('J') || has('S'), fire: has('F'), alt: has('A'),
        jumpP: first && (has('J') || has('S')), spaceP: first && has('S'), fireP: first && has('F'), altP: first && has('A'), actP: first && has('E'), swapP: first && has('X'),
        aimX: aim[0], aimY: aim[1],
      }, 1 / 60);
      first = false; t += 1 / 60; frame++;
      if (g.done) return { ok: true, done: true, frame, time: g.time };
    }
    if (log) console.log(`  ${String(n).padStart(3)} [${keys.padEnd(4)}] -> x ${(g.p.x / T).toFixed(2)} y ${(g.p.y / T).toFixed(2)} hp ${g.p.hp} ${g.persona}${g.p.dead ? ' DEAD' : ''}${g.p.rope ? ' rope' : ''}${g.p.cling ? ' cling' : ''}`);
    if (g.deaths && !opts.mayDie) return { ok: false, at: n, why: `died during entry ${n} [${keys}]`, frame, x: g.p.x / T, y: g.p.y / T };
  }
  return { ok: g.done, done: g.done, frame, why: g.done ? '' : 'script ended before the exit', x: g.p.x / T, y: g.p.y / T };
}
export const past = tx => g => g.p.x >= tx * T;
export const before = tx => g => g.p.x <= tx * T;
export const grounded = g => g.p.onGround;
export const above = ty => g => g.p.y <= ty * T;
export const all = (...f) => g => f.every(k => k(g));
