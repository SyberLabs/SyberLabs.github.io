// The duel room's rules, run in Node with a clock and timers the test moves by hand:
//   node --test workers/duel/room.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room, LIMITS, WIN, V, makeCode, isCode } from './room.js';

function world() {
  let t = 1e6, n = 0; const timers = [];
  const io = { now: () => t, token: () => (++n).toString(16).padStart(24, '0'), later: (ms, fn) => { const e = { at: t + ms, fn, off: false }; timers.push(e); return () => { e.off = true; }; } };
  const pass = ms => { const end = t + ms; for (;;) { const e = timers.filter(x => !x.off && x.at <= end).sort((a, b) => a.at - b.at)[0]; if (!e) break; t = e.at; e.off = true; e.fn(); } t = end; };
  const conn = () => { const c = { got: [], closed: null, send: s => c.got.push(JSON.parse(s)), close: (code, why) => { if (!c.closed) c.closed = [code, why]; }, last: k => c.got.filter(m => m[0] === k).pop(), count: k => c.got.filter(m => m[0] === k).length }; return c; };
  return { io, pass, conn, room: new Room(io) };
}
// two players in a live first round
function live() {
  const w = world(), a = w.conn(), b = w.conn();
  w.room.create(a, 'ABCDEF'); w.room.join(b, '');
  w.pass(LIMITS.readyMs + LIMITS.countMs);
  return { ...w, a, b, say: (c, m) => w.room.message(c, JSON.stringify(m)) };
}
const POS = ['s', 1, 10, 0, 12, 0, 0, 0, 1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

test('a code is six characters from 32 that leave out I, O, 0 and 1, each as likely as the next', () => {
  for (let i = 0; i < 300; i++) { const c = makeCode(Uint8Array.from({ length: 6 }, (_, k) => (i * 37 + k * 101) % 256)); assert.ok(isCode(c), c); assert.ok(!/[IO01]/.test(c), c); }
  const seen = new Map(); for (let b = 0; b < 256; b++) { const ch = makeCode(Uint8Array.from([b, 0, 0, 0, 0, 0]))[0]; seen.set(ch, (seen.get(ch) || 0) + 1); }
  assert.equal(seen.size, 32); assert.ok([...seen.values()].every(n => n === 8), 'every character comes from eight of the 256 bytes');
  for (const bad of ['', 'ABCDE', 'ABCDEFG', 'abcdef', 'ABCDE1', 'ABCDEO', 'ABC DE', null, 123456]) assert.equal(isCode(bad), false);
});

test('the first player gets a seat, a code and a token; the second starts the duel', () => {
  const w = world(), a = w.conn(), b = w.conn();
  assert.equal(w.room.create(a, 'ABCDEF'), true);
  assert.deepEqual(a.got[0].slice(0, 4), ['w', V, 0, 'ABCDEF']); assert.match(a.got[0][4], /^[0-9a-f]{24}$/);
  assert.equal(w.room.create(w.conn(), 'ABCDEF'), false, 'a room in use is not opened again');
  w.room.join(b, '');
  assert.deepEqual(b.got[0].slice(0, 4), ['w', V, 1, 'ABCDEF']); assert.notEqual(a.got[0][4], b.got[0][4]);
  assert.deepEqual(a.last('n'), ['n', 2]);
  assert.equal(a.count('R'), 0); w.pass(LIMITS.readyMs);
  assert.deepEqual(a.last('R'), ['R', 1, 0, 0, 0, LIMITS.countMs]); assert.deepEqual(b.last('R'), a.last('R'));
  assert.equal(a.count('G'), 0); w.pass(LIMITS.countMs); assert.equal(a.count('G'), 1); assert.equal(b.count('G'), 1);
});

test('a code nobody opened, and a third player, are refused with a message', () => {
  const w = world(), x = w.conn();
  w.room.join(x, ''); assert.deepEqual(x.got, [['e', 'none']]); assert.equal(x.closed[0], 4404);
  const { room, conn } = live(), c = conn(); room.join(c, '');
  assert.deepEqual(c.got, [['e', 'full']]); assert.equal(c.closed[0], 4409);
  const d = conn(); room.join(d, 'f'.repeat(24)); assert.deepEqual(d.got, [['e', 'none']], 'a token that is not a seat\'s');
});

test('the room keeps health: hits count only in a live round, and one hit is capped', () => {
  const w = world(), a = w.conn(), b = w.conn(), say = (c, m) => w.room.message(c, JSON.stringify(m));
  w.room.create(a, 'ABCDEF'); w.room.join(b, ''); w.pass(LIMITS.readyMs + 100);
  say(a, ['h', 50, 0, 0, 0]); assert.equal(b.count('H'), 0, 'no hits during the countdown');
  w.pass(LIMITS.countMs);
  say(a, ['h', 30, 5, 99, -99]);
  assert.deepEqual(b.last('H'), ['H', 1, 70, 30, 5, 30, -30], 'the push is clamped'); assert.deepEqual(a.last('H'), b.last('H'));
  say(a, ['h', 5000, 0, 0, 0]); assert.deepEqual(b.last('H').slice(0, 4), ['H', 1, 70 - LIMITS.hit, LIMITS.hit]);
  for (const bad of [['h', -5, 0, 0, 0], ['h', 'x', 0, 0, 0], ['h', 10], ['h', NaN, 0, 0, 0], ['h', 10, 0, 0, 0, 0]]) { const n = b.count('H'); w.room.message(a, JSON.stringify(bad)); assert.equal(b.count('H'), n); }
});

test('one second of hits is capped, so health cannot be emptied at once', () => {
  const { a, b, say, pass } = live();
  for (let i = 0; i < 10; i++) say(a, ['h', 60, 0, 0, 0]);
  const done = () => b.got.filter(m => m[0] === 'H').reduce((s, m) => s + m[3], 0);
  assert.equal(done(), LIMITS.dmgBurst); assert.ok(LIMITS.dmgBurst < 100); assert.equal(b.count('E'), 0, 'the round is still on');
  pass(100); say(a, ['h', 60, 0, 0, 0]);
  assert.equal(done(), LIMITS.dmgBurst + LIMITS.dmgPerSec / 10, 'a tenth of a second buys a tenth of a second of damage');
  pass(1000); say(a, ['h', 60, 0, 0, 0]); assert.deepEqual(b.last('E'), ['E', 0, 1, 0, 0]);
});

test('health at zero ends the round; forms trade; the first to five wins and no round follows', () => {
  const { a, b, say, pass } = live();
  let round = 1;
  for (; round <= WIN; round++) {
    assert.deepEqual(a.last('R').slice(0, 3), ['R', round, round % 2 === 1 ? 0 : 1]);
    say(a, ['h', 60, 0, 0, 0]); pass(1000); say(a, ['h', 60, 0, 0, 0]);
    assert.deepEqual(b.last('E'), ['E', 0, round, 0, round === WIN ? 1 : 0]);
    pass(1000); say(a, ['h', 60, 0, 0, 0]); assert.equal(b.last('H')[2], 0, 'no hit after the round has ended');
    pass(LIMITS.endMs + LIMITS.countMs);
  }
  assert.equal(a.count('R'), WIN); pass(60e3); assert.equal(a.count('R'), WIN);
  say(b, ['x']); pass(LIMITS.readyMs);
  assert.deepEqual(a.last('R'), ['R', 1, 0, 0, 0, LIMITS.countMs], 'either player can call a rematch');
});

test('positions, blocks, blasts and rockets are passed on only when they are well formed', () => {
  const { a, b, say } = live();
  say(a, POS); assert.deepEqual(b.last('s'), POS); assert.equal(a.count('s'), 0);
  for (const bad of [POS.slice(0, 18), [...POS, 1], POS.map((v, i) => (i === 3 ? 'x' : v)), POS.map((v, i) => (i === 4 ? 1e9 : v)), POS.map((v, i) => (i === 5 ? null : v))]) say(a, bad);
  assert.equal(b.count('s'), 1);
  say(a, ['k', 4, 9, 300]); assert.deepEqual(b.last('k'), ['k', 4, 9, 300]);
  say(a, ['k', -1]); say(a, ['k', 1.5]); say(a, ['k', 70000]); say(a, ['k']); say(a, ['k', ...Array(LIMITS.blocks + 1).fill(1)]);
  assert.equal(b.count('k'), 1);
  say(a, ['b', 1, 2, 3, 99, 7]); assert.deepEqual(b.last('b'), ['b', 1, 2, 3, 16, 1]);
  say(a, ['r', 1, 2, 3, 0, 0, 1]); assert.deepEqual(b.last('r'), ['r', 1, 2, 3, 0, 0, 1]);
  say(a, ['r', 1, 2, 3]); say(a, ['zz', 1]); say(a, ['p']);
  assert.equal(b.count('r'), 1); assert.equal(b.closed, null); assert.equal(a.closed, null);
});

test('what is not a message closes the connection, and so does a flood', () => {
  for (const bad of ['not json', '{"a":1}', '[1,2]', '[]', 'x'.repeat(LIMITS.msgLen + 1)]) {
    const { a, b, room } = live(); room.message(a, bad);
    assert.equal(a.closed[0], 4400, bad.slice(0, 20)); assert.deepEqual(b.last('a'), ['a', 0]);
  }
  const { a, say } = live();
  for (let i = 0; i < LIMITS.msgBurst + 5 && !a.closed; i++) say(a, ['p']);
  assert.equal(a.closed[0], 4429);
});

test('a dropped connection keeps its seat for a while, and the token takes it back', () => {
  const { a, b, room, conn, pass, say } = live(), token = b.got[0][4];
  say(a, ['h', 40, 0, 0, 0]);
  room.leave(b); assert.deepEqual(a.last('a'), ['a', 0]);
  pass(LIMITS.graceMs - 1000); assert.equal(room.open, true);
  const b2 = conn(); room.join(b2, token);
  assert.deepEqual(b2.got[0], ['w', V, 1, 'ABCDEF', token, 1]);
  assert.deepEqual(b2.got[1], ['S', 1, 0, 0, 0, 'live', 100, 60]); assert.deepEqual(a.last('a'), ['a', 1]);
  pass(LIMITS.graceMs * 2); assert.equal(room.open, true, 'the old timer is gone');
  say(b2, ['h', 10, 0, 0, 0]); assert.equal(a.last('H')[2], 90, 'the seat plays on');
});

test('a player who does not come back, or who says they are leaving, ends the room for both', () => {
  const { a, b, room, pass } = live();
  room.leave(b); pass(LIMITS.graceMs + 1);
  assert.deepEqual(a.last('q'), ['q']); assert.equal(a.closed[0], 1000); assert.equal(room.open, false); assert.equal(room.code, '');
  const two = live(); two.say(two.a, ['q']);
  assert.deepEqual(two.b.last('q'), ['q']); assert.equal(two.room.open, false);
  const alone = world(), c = alone.conn(); alone.room.create(c, 'ABCDEF'); alone.room.leave(c); alone.pass(LIMITS.graceMs + 1);
  assert.equal(alone.room.open, false, 'a room whose only player left is emptied');
});

test('the tick keeps connections warm, drops silent ones and closes rooms that wait or run too long', () => {
  const { a, b, room, pass, say } = live();
  pass(5000); say(a, ['p']); say(b, ['p']); room.tick(); assert.equal(a.count('p'), 1);
  pass(LIMITS.silentMs - 5000); say(a, ['p']); pass(6000); room.tick();
  assert.equal(b.closed[0], 4408, 'the silent one'); assert.equal(a.closed, null); assert.deepEqual(a.last('a'), ['a', 0]);
  const w = world(), c = w.conn(); w.room.create(c, 'ABCDEF');
  for (let t = 0; t < LIMITS.waitMs; t += 5000) { w.pass(5000); w.room.message(c, '["p"]'); w.room.tick(); }
  w.pass(5000); w.room.tick();
  assert.deepEqual(c.last('e'), ['e', 'wait']); assert.equal(w.room.open, false);
  const long = live();
  for (let t = 0; t < LIMITS.roomMs; t += 5000) { long.pass(5000); long.say(long.a, ['p']); long.say(long.b, ['p']); long.room.tick(); if (!long.room.open) break; }
  assert.deepEqual(long.a.last('e'), ['e', 'long']); assert.equal(long.room.open, false);
});
