// Scripted play-throughs: proof that each stage can be finished, run by test/run.mjs. A key is a stage id, or
// 'id:route' for another way through the same stage. A route named 'weaver' must never take the jaguar's form.
import { T, wordFresh, wordActive, gateActive, bodyDark } from '../game/sim.js';
import { past, before, grounded, all } from './bot.mjs';
const ent = (g, type, k = 0) => g.ents.filter(e => e.type === type)[k];
const aimAt = (type, k = 0) => g => { const e = ent(g, type, k); return [e.x, e.y]; };
const gone = (type, k = 0) => g => ent(g, type, k).dead;
const rising = g => g.p.vy >= 0;
// run to the takeoff point, jump, land
const leap = (fromX, hold = 'R') => [[hold, past(fromX)], [hold + 'J', 0.34], [hold, grounded, { max: 2 }]];
// a short hop from standing: `t` seconds of push, then drift
const hop = (t, dir = 'R') => [[dir + 'J', t], ['J', 0.34 - t], ['', grounded, { max: 2 }]];
const fresh = k => g => wordFresh(g, ent(g, 'word', k));
// jump straight up n times: a stair of beams two tiles apart
const climb = n => Array.from({ length: n }, () => [['J', 0.34], ['', grounded, { max: 2 }]]).flat();
// aim a thrown glass at a walking target: lead it by the flight time and lift for the fall
const lead = (type, k = 0) => g => { const e = ent(g, type, k), t = Math.hypot(e.x - g.p.x, e.y - (g.p.y - 13)) / 330; return [e.x + (e.vx || 0) * t, e.y - 55 * t * t]; };
// a blinking gate that has just gone dark
const dark = k => g => { const e = ent(g, 'gate', k), ph = (g.wt + e.ph) % e.period; return !gateActive(g, e) && ph < e.duty * e.period + 0.3; };
const near = (type, k, d) => g => { const e = ent(g, type, k); return Math.hypot(e.x - g.p.x, e.y - (g.p.y - 12)) < d; };

// THE ANOMALOUS SYSTEM
const off = k => g => !gateActive(g, ent(g, 'gate', k));
const lensDark = k => g => bodyDark(g, ent(g, 'eye', k));
// climb the turning face on the right as the jaguar, to its top at row `top`
const scale = top => [['RJ', 0.3], ['RU', g => g.p.onGround && g.p.y <= top * T + 1, { max: 8 }]];
// wait on top for gate k to go dark, then run on and land past tile x
const over = (k, x) => [['', off(k), { max: 8 }], ['R', all(grounded, past(x)), { max: 5 }]];
// an alert whose dialog starts at tile x: arrive as the jaguar, leave two copies at its foot, climb, cross
const alertAt = (x, k, land) => [['R', past(x - 0.5)], ['X', 0.1], ['', 0.3], ['X', 0.1], ...scale(12), ...over(k, land)];

export const SCRIPTS = {
  steps: [
    // B: change form at the standing stone. The warden on the beam turns to the weaver left behind and the jaguar
    // goes under it, through the thread, unseen (test/run.mjs checks that it was watched and never seen)
    ['R', past(20.5)], ['X', 0.1], ['R', past(49)],
    // C: the same wall, the jaguar's way: up its face
    ['R', past(51.3)], ['RJ', 0.3], ['RU', g => g.p.onGround && g.p.y <= 15 * T + 1, { max: 8 }],
    ['R', past(62.5)], ['R', all(grounded, past(63))],
    // D: the thorns, the jaguar's way: a jump, and a pounce in the air
    ['R', past(77)], ['RJ', 0.3], ['RF', 0.25, { aim: g => [g.p.x + 200, g.p.y - 30] }], ['R', all(grounded, past(87)), { max: 3 }],
    // E: the warden behind the crate. Two changes of form leave a double and keep the jaguar: the warden turns to
    // the double, and the pounce comes from where it is not looking
    ['R', past(107.4)], ...leap(107.5), ['R', all(grounded, past(111.4))],
    ['X', 0.3], ['X', 0.1],
    ['R', g => Math.abs(ent(g, 'warden', 1).x - g.p.x) < 56, { max: 6 }],
    ['RF', 0.3, { aim: aimAt('warden', 1) }], ['', gone('warden', 1), { max: 0.1 }],
    ['R', past(126.4)], ...leap(126.5), ['R', all(grounded, past(131))],
    // F: under the wall and up the cliff
    ['R', past(149.8)],
    ['RJ', 0.3], ['RU', g => g.p.onGround && g.p.y <= 12 * T + 1, { max: 8 }],
    // G: over the spirit bridge and down the terraces
    ['R', past(183.5)], ['R', all(grounded, past(196.6))],
    // H: pounce the warden
    ['R', g => Math.abs(ent(g, 'warden', 2).x - g.p.x) < 80, { max: 4 }],
    ['RF', 0.3, { aim: aimAt('warden', 2) }], ['', gone('warden', 2), { max: 0.1 }],
    ['R', past(214.4)], ...leap(214.5), ['R', all(grounded, past(219.5))],
    // I: back to yourself, run the check, climb the steps
    ['X', 0.1], ['E', 0.1], ['R', past(222.4)],
    ['RJ', 0.34], ['R', grounded, { max: 2 }], ['', 0.05],                        // tread 0
    ...hop(0.2), ...hop(0.2),                                                    // treads 1, 2 (stale)
    ...hop(0.2),                                                                 // tread 3
    ['L', g => g.p.x <= 230.6 * T, { max: 1 }], ...leap(231.7),                  // over broken tread 4 to tread 5
    ['', 0.05], ...hop(0.2), ...hop(0.2),                                        // treads 6 (stale), 7
    ['L', g => g.p.x <= 238.6 * T, { max: 1 }], ...leap(239.7),                  // over broken tread 8 to tread 9
    ['', 0.05], ...hop(0.2), ...hop(0.2), ...hop(0.25),                          // treads 10, 11, the landing
    ['R', past(250.5)], ['E', 0.1, { aim: aimAt('terminal', 0) }],
    ['R', () => false, { max: 6 }],
  ],
  machu: [
    // A: seven words, one per beat
    ['R', past(11.4)], ['', fresh(0), { max: 8 }], ['RJ', 0.34], ['R', grounded, { max: 2 }],
    ...[1, 2, 3, 4, 5, 6].flatMap(k => [['', fresh(k), { max: 8 }], [(k % 2 ? 'L' : 'R') + 'J', 0.34], [k % 2 ? 'L' : 'R', grounded, { max: 2 }]]),
    ['R', past(15.2)], ['RJ', 0.34], ['R', all(grounded, past(17)), { max: 2 }],
    // B: roar while the four words are lit, and run
    ['R', past(23.6)], ['X', 0.1], ['', fresh(7), { max: 8 }], ['E', 0.05], ['R', all(grounded, past(42)), { max: 5 }],
    // C: five words, three tiles apart
    ['R', past(43.9)],
    ...[0, 1, 2, 3, 4].flatMap(k => [['', fresh(11 + k), { max: 8 }], ...hop(0.2, k === 0 || k % 2 ? 'R' : 'L')]),
    ['RJ', 0.34], ['R', all(grounded, past(50)), { max: 3 }],
    ['R', () => false, { max: 4 }],
  ],
  lines: [
    // A: cord to the ring, onto the column, check the source, walk through the dead gate
    ['R', past(13)], ['A', g => !!g.p.rope, { aim: aimAt('ring', 0), max: 1 }],
    ['AU', g => g.p.y < 15 * T - 6 && g.p.x > 16 * T, { aim: aimAt('ring', 0), max: 5 }],
    ['R', all(grounded, past(17.5)), { max: 3 }], ['E', 0.1, { aim: aimAt('source', 0) }],
    ['R', all(grounded, past(36)), { max: 8 }],
    // B: the Visitor among the villagers
    ['R', past(42.4)], ...leap(42.5), ['R', all(grounded, past(46.4))],
    ['R', g => Math.abs(ent(g, 'warden', 0).x - g.p.x) < 96, { max: 6 }],
    ...Array.from({ length: 8 }, () => [['F', 0.05, { aim: aimAt('warden', 0) }], ['', 0.22]]).flat(),
    ['', gone('warden', 0), { max: 0.1 }],
    ['R', past(62.4)], ...leap(62.5), ['R', all(grounded, past(70))],
    // C: up the tower as the jaguar, check the source as the weaver, glass the Visitor from above
    ['X', 0.1], ['R', past(75.8)], ['RJ', 0.3], ['RU', g => g.p.onGround && g.p.y <= 8 * T + 1, { max: 10 }],
    ['X', 0.1], ['E', 0.1, { aim: aimAt('source', 1) }], ['R', past(84)], ['', 0.3],
    ...Array.from({ length: 10 }, () => [['F', 0.05, { aim: lead('warden', 1) }], ['', 0.3]]).flat(),
    ['', gone('warden', 1), { max: 0.1 }],
    ['R', all(grounded, past(106)), { max: 12 }],
    // D: the two sources with lines; the one on the crate is watched
    ['R', past(110)], ['E', 0.1, { aim: aimAt('source', 3) }],
    ['R', past(114.4)], ...leap(114.5), ['R', all(grounded, past(119))], ['', 0.3],
    ['E', 0.1, { aim: aimAt('source', 5) }],
    ['R', () => false, { max: 10 }],
  ],
  works: [
    // PROPOSE: through each gate as it goes dark
    ['R', past(11.5)], ['', dark(0), { max: 4 }], ['R', past(19.5)], ['', dark(1), { max: 4 }], ['R', past(33.5)],
    // CHECK: turn the sentinel, let it drop the Visitor, cross the hall
    ['', near('sentinel', 0, 128), { max: 14 }], ['E', 0.1, { aim: aimAt('sentinel', 0) }],
    ['', gone('warden', 0), { max: 10 }],
    ['R', past(42.4)], ...leap(42.5), ['R', all(grounded, past(46.4))],
    ['R', past(58.4)], ...leap(58.5), ['R', all(grounded, past(70))],
    // REVIEW: break the eye from outside its reach, then under the bulkhead as the jaguar
    ...Array.from({ length: 4 }, () => [['F', 0.05, { aim: lead('eye', 0) }], ['', 0.3]]).flat(),
    ['', gone('eye', 0), { max: 0.1 }],
    ['R', past(94.3)], ['X', 0.1], ['R', past(104.5)],
    // APPROVE: the source on the floor, the one on the block, the one under the dais
    ['X', 0.1], ['R', past(107.5)], ['E', 0.1, { aim: aimAt('source', 0) }],
    ['R', past(113)], ['A', g => !!g.p.rope, { aim: aimAt('ring', 0), max: 1 }],
    ['AU', g => g.p.y < 15 * T - 6 && g.p.x > 116 * T, { aim: aimAt('ring', 0), max: 5 }],
    ['R', all(grounded, past(117.5)), { max: 3 }], ['E', 0.1, { aim: aimAt('source', 1) }],
    ['R', all(grounded, past(123)), { max: 4 }], ['X', 0.1], ['R', past(136.5), { max: 4 }],
    ['X', 0.1], ['E', 0.1, { aim: aimAt('source', 2) }], ['', 0.2],
    ['X', 0.1], ['L', before(127.4), { max: 4 }], ['LJ', 0.34], ['L', all(grounded, before(125)), { max: 2 }],
    // the Approver is open: break it, cross the dais, approve at the terminal, publish
    ['X', 0.1], ['', 0.2],
    ...Array.from({ length: 3 }, () => [['F', 0.05, { aim: lead('core', 0) }], ['', 0.4]]).flat(),
    ['', gone('core', 0), { max: 0.1 }],
    ['R', past(125.1)], ['RJ', 0.34], ['R', grounded, { max: 2 }],
    ['R', past(130.4)], ...leap(130.5), ['R', all(grounded, past(148.5)), { max: 6 }],
    ['E', 0.1, { aim: aimAt('terminal', 0) }],
    ['R', () => false, { max: 8 }],
  ],
  record: [
    // A: read the first two lots
    ['R', past(10)], ['E', 0.1, { aim: aimAt('lot', 0) }], ['R', past(20)], ['', 0.3], ['E', 0.1, { aim: aimAt('lot', 1) }],
    // B: cord to the ring, read the lot on the wall
    ['R', past(37)], ['A', g => !!g.p.rope, { aim: aimAt('ring', 0), max: 1 }],
    ['AU', g => g.p.y < 15 * T - 6 && g.p.x > 40 * T, { aim: aimAt('ring', 0), max: 5 }],
    ['R', all(grounded, past(43)), { max: 3 }], ['E', 0.1, { aim: aimAt('lot', 2) }],
    ['R', all(grounded, past(51)), { max: 6 }],
    // C: under the wall as the jaguar, read; up the cliff, read
    ['R', past(66)], ['X', 0.1], ['R', past(77.5)], ['X', 0.1], ['E', 0.1, { aim: aimAt('lot', 3) }], ['', 0.2],
    ['X', 0.1], ['R', past(83.8)], ['RJ', 0.3], ['RU', g => g.p.onGround && g.p.y <= 12 * T + 1, { max: 8 }],
    ['R', past(88)], ['X', 0.1], ['E', 0.1, { aim: aimAt('lot', 4) }], ['', 0.2], ['X', 0.1],
    // D: over the spirit bridge, read, down the terraces
    ['R', all(grounded, past(108.5)), { max: 5 }], ['X', 0.1], ['E', 0.1, { aim: aimAt('lot', 5) }],
    ['R', all(grounded, past(128)), { max: 10 }],
    // E: the last lot, then the far door
    ['R', past(138)], ['E', 0.1, { aim: aimAt('lot', 6) }],
    ['R', () => false, { max: 8 }],
  ],
  'machu:weaver': [
    // A: the stair inside the wall
    ['R', past(19)], ...climb(8),
    // B: off the terrace, down the ravine, set the pace to slow, back up the ladder
    ['R', all(grounded, past(30)), { max: 8 }], ['E', 0.1, { aim: aimAt('pacer', 0) }],
    ['L', before(26.4)], ...climb(4), ['LJ', 0.34], ['L', all(grounded, before(24.6)), { max: 2 }],
    ['', fresh(7), { max: 14 }], ['R', all(grounded, past(42)), { max: 7 }],
    // C: the stone stair
    ['R', past(54)], ...climb(9),
    ['L', () => false, { max: 3 }],
  ],
  // ---------------------------------------------------------------- the weaver's ways: no change of form
  'steps:weaver': [
    // B: the warden on the beam cannot see as far as the standing stone, and glass reaches it from there
    ['R', past(22)],
    ...Array.from({ length: 8 }, () => [['F', 0.05, { aim: lead('warden', 0) }], ['', 0.3]]).flat(),
    ['', gone('warden', 0), { max: 0.1 }],
    ['R', past(49)],
    ['A', g => !!g.p.rope, { aim: aimAt('ring', 0), max: 1 }],
    ['AU', g => g.p.y < 15 * T - 6 && g.p.x > 52 * T, { aim: aimAt('ring', 0), max: 5 }],
    ['R', all(grounded, past(54))], ['R', past(62.5)], ['R', all(grounded, past(63))],
    ['R', past(76.4)],
    ['RA', g => !!g.p.rope, { aim: [81, 13], max: 1 }],
    ['RA', past(86.6), { aim: [81, 13], max: 5 }],
    ['R', all(grounded, past(87))],
    ['R', past(107.4)], ...leap(107.5), ['R', all(grounded, past(111.4))],
    ['R', g => Math.abs(ent(g, 'warden', 1).x - g.p.x) < 96, { max: 6 }],
    ...Array.from({ length: 8 }, () => [['F', 0.05, { aim: aimAt('warden', 1) }], ['', 0.22]]).flat(),
    ['', gone('warden', 1), { max: 0.1 }],
    ['R', past(126.4)], ...leap(126.5), ['R', all(grounded, past(131))],
    // F: the terminal opens the doors above the tunnel; then the steps cut beside the cliff
    ['R', past(134.5)], ['E', 0.1, { aim: aimAt('terminal', 0) }],
    ['R', past(150.5)], ...climb(3), ['RJ', 0.34], ['R', all(grounded, past(153)), { max: 2 }],
    // G: down into the gap under the spirit bridge, and up the steps on its far side
    ['R', all(grounded, past(176.3)), { max: 10 }], ...climb(3), ['RJ', 0.34], ['R', all(grounded, past(179)), { max: 2 }],
    ['R', all(grounded, past(196.6)), { max: 10 }],
    // H: the second warden, with glass
    ['R', g => Math.abs(ent(g, 'warden', 2).x - g.p.x) < 96, { max: 6 }],
    ...Array.from({ length: 8 }, () => [['F', 0.05, { aim: aimAt('warden', 2) }], ['', 0.22]]).flat(),
    ['', gone('warden', 2), { max: 0.1 }],
    ['R', past(214.4)], ...leap(214.5), ['R', all(grounded, past(219.5))],
    // I: the steps
    ['E', 0.1], ['R', past(222.4)],
    ['RJ', 0.34], ['R', grounded, { max: 2 }], ['', 0.05],
    ...hop(0.2), ...hop(0.2), ...hop(0.2),
    ['L', g => g.p.x <= 230.6 * T, { max: 1 }], ...leap(231.7),
    ['', 0.05], ...hop(0.2), ...hop(0.2),
    ['L', g => g.p.x <= 238.6 * T, { max: 1 }], ...leap(239.7),
    ['', 0.05], ...hop(0.2), ...hop(0.2), ...hop(0.25),
    ['R', past(250.5)], ['E', 0.1, { aim: aimAt('terminal', 1) }],
    ['R', () => false, { max: 6 }],
  ],
  'lines:weaver': [
    ['R', past(13)], ['A', g => !!g.p.rope, { aim: aimAt('ring', 0), max: 1 }],
    ['AU', g => g.p.y < 15 * T - 6 && g.p.x > 16 * T, { aim: aimAt('ring', 0), max: 5 }],
    ['R', all(grounded, past(17.5)), { max: 3 }], ['E', 0.1, { aim: aimAt('source', 0) }],
    ['R', all(grounded, past(36)), { max: 8 }],
    ['R', past(42.4)], ...leap(42.5), ['R', all(grounded, past(46.4))],
    ['R', g => Math.abs(ent(g, 'warden', 0).x - g.p.x) < 96, { max: 6 }],
    ...Array.from({ length: 8 }, () => [['F', 0.05, { aim: aimAt('warden', 0) }], ['', 0.22]]).flat(),
    ['', gone('warden', 0), { max: 0.1 }],
    ['R', past(62.4)], ...leap(62.5), ['R', all(grounded, past(70))],
    // C: the steps beside the tower
    ['R', past(76.2)], ...climb(5), ['RJ', 0.34], ['R', all(grounded, past(78.7)), { max: 2 }],
    ['E', 0.1, { aim: aimAt('source', 1) }], ['R', past(84)], ['', 0.3],
    ...Array.from({ length: 10 }, () => [['F', 0.05, { aim: lead('warden', 1) }], ['', 0.3]]).flat(),
    ['', gone('warden', 1), { max: 0.1 }],
    ['R', all(grounded, past(106)), { max: 12 }],
    ['R', past(110)], ['E', 0.1, { aim: aimAt('source', 3) }],
    ['R', past(114.4)], ...leap(114.5), ['R', all(grounded, past(119))], ['', 0.3],
    ['E', 0.1, { aim: aimAt('source', 5) }],
    ['R', () => false, { max: 10 }],
  ],
  'works:weaver': [
    ['R', past(11.5)], ['', dark(0), { max: 4 }], ['R', past(19.5)], ['', dark(1), { max: 4 }], ['R', past(33.5)],
    ['', near('sentinel', 0, 128), { max: 14 }], ['E', 0.1, { aim: aimAt('sentinel', 0) }],
    ['', gone('warden', 0), { max: 10 }],
    ['R', past(42.4)], ...leap(42.5), ['R', all(grounded, past(46.4))],
    ['R', past(58.4)], ...leap(58.5), ['R', all(grounded, past(70))],
    ...Array.from({ length: 4 }, () => [['F', 0.05, { aim: lead('eye', 0) }], ['', 0.3]]).flat(),
    ['', gone('eye', 0), { max: 0.1 }],
    // the terminal opens the duct above the tunnel: through the bulkhead on foot
    ['R', past(86)], ['E', 0.1, { aim: aimAt('terminal', 0) }], ['R', past(107.5)], ['E', 0.1, { aim: aimAt('source', 0) }],
    ['R', past(113)], ['A', g => !!g.p.rope, { aim: aimAt('ring', 0), max: 1 }],
    ['AU', g => g.p.y < 15 * T - 6 && g.p.x > 116 * T, { aim: aimAt('ring', 0), max: 5 }],
    ['R', all(grounded, past(117.5)), { max: 3 }], ['E', 0.1, { aim: aimAt('source', 1) }],
    ['R', all(grounded, past(123)), { max: 4 }],
    // over the hole, onto the dais, and the third source through the grate
    ['R', past(125.1)], ['RJ', 0.34], ['R', grounded, { max: 2 }],
    ['R', past(130.4)], ...leap(130.5), ['R', past(136.9), { max: 3 }], ['', 0.3],
    ['E', 0.1, { aim: aimAt('source', 2) }], ['', 0.2],
    ...Array.from({ length: 3 }, () => [['F', 0.05, { aim: lead('core', 0) }], ['', 0.4]]).flat(),
    ['', gone('core', 0), { max: 0.1 }],
    ['R', all(grounded, past(148.5)), { max: 6 }],
    ['E', 0.1, { aim: aimAt('terminal', 1) }],
    ['R', () => false, { max: 8 }],
  ],
  'record:weaver': [
    ['R', past(10)], ['E', 0.1, { aim: aimAt('lot', 0) }], ['R', past(20)], ['', 0.3], ['E', 0.1, { aim: aimAt('lot', 1) }],
    ['R', past(37)], ['A', g => !!g.p.rope, { aim: aimAt('ring', 0), max: 1 }],
    ['AU', g => g.p.y < 15 * T - 6 && g.p.x > 40 * T, { aim: aimAt('ring', 0), max: 5 }],
    ['R', all(grounded, past(43)), { max: 3 }], ['E', 0.1, { aim: aimAt('lot', 2) }],
    ['R', all(grounded, past(51)), { max: 6 }],
    // the terminal opens the doors above the tunnel; the steps beside the cliff; down and up under the bridge
    ['R', past(64.5)], ['E', 0.1, { aim: aimAt('terminal', 0) }], ['R', past(78)], ['E', 0.1, { aim: aimAt('lot', 3) }],
    ['R', past(84.3)], ...climb(3), ['RJ', 0.34], ['R', all(grounded, past(87)), { max: 2 }],
    ['R', past(88)], ['E', 0.1, { aim: aimAt('lot', 4) }],
    ['R', all(grounded, past(106.3)), { max: 10 }], ...climb(3), ['RJ', 0.34], ['R', all(grounded, past(108.6)), { max: 2 }],
    ['E', 0.1, { aim: aimAt('lot', 5) }],
    ['R', all(grounded, past(128)), { max: 10 }],
    ['R', past(138)], ['E', 0.1, { aim: aimAt('lot', 6) }],
    ['R', () => false, { max: 8 }],
  ],
  // THE ANOMALOUS SYSTEM. Each alert is planted at its foot, climbed as it turns and crossed when its gate is dark.
  anomaly: [
    // BOOT: change form against the panel, watch it turn, climb it as the jaguar. The system wakes on the way down.
    ['R', past(8.2)], ['X', 0.1], ['', 0.9], ...scale(15), ['R', all(grounded, past(13)), { max: 3 }],
    // then the boot block: two copies at its foot, up its face as it turns, across when its gate is dark
    ['R', past(18.4)], ['X', 0.1], ['', 0.3], ['X', 0.1], ...scale(8), ...over(0, 26.5),
    // DESKTOP: drop the Visitor among the records, turn the second window so its eye goes dark, plant the alert
    ['R', g => Math.abs(ent(g, 'warden', 0).x - g.p.x) < 80, { max: 6 }], ['RF', 0.3, { aim: aimAt('warden', 0) }], ['', gone('warden', 0), { max: 0.1 }],
    // stand still beside the second window's frame, wherever the Visitor fell, and change form at the top of a jump
    ['L', before(40.5), { max: 5 }], ['', 0.2], ['R', past(40.6)], ['', 0.25],
    ['J', 0.2], ['X', 0.05], ['', grounded, { max: 2 }], ['', lensDark(0), { max: 6 }], ['X', 0.1],
    ...alertAt(60, 1, 64.5),
    // REGISTRY: the weaver's copy turns the racks, the jaguar goes under them, and a roar carries it past the eye
    ['X', 0.1], ['R', past(71.4)], ['', 0.2], ['X', 0.1], ['R', past(77)], ['E', 0.05], ['R', past(88.5)],
    ...alertAt(92, 2, 96.5),
    // DEFRAG: three leaps from block to block
    ...leap(101.5), ...leap(108.6), ...leap(115.7), ['R', all(grounded, past(121.5)), { max: 2 }],
    ...alertAt(125, 3, 129.5),
    // FIREWALL: through the first gate as it goes dark, check the source that feeds the second, roar past the eye
    ['R', past(133.5)], ['', dark(4), { max: 4 }], ['R', past(138.6)],
    ['X', 0.1], ['E', 0.1, { aim: aimAt('source', 0) }], ['', 0.2], ['X', 0.1],
    ['R', past(145.6)], ['E', 0.05], ['R', past(154.5)],
    ...alertAt(157, 7, 161.5),
    // CORE: the three sources, then glass
    ['X', 0.1], ['R', past(163)], ['E', 0.1, { aim: aimAt('source', 2) }], ['', 0.75], ['E', 0.1, { aim: aimAt('source', 3) }], ['', 0.75],
    ...leap(167), ...leap(169.5), ['E', 0.1, { aim: aimAt('source', 4) }], ['', 0.75],
    ...Array.from({ length: 3 }, () => [['F', 0.05, { aim: aimAt('core', 0) }], ['', 0.3]]).flat(),
    ['', gone('core', 0), { max: 0.1 }],
    ['R', () => false, { max: 8 }],
  ],
};
