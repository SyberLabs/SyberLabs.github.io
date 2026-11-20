// The rules of one duel room, with no Cloudflare API in them: index.js gives a Room its clock, its timers and its
// connections, and Node runs room.test.mjs against the same code.
//
// A room holds two seats. It relays each player's positions, shots and broken blocks to the other, and it keeps
// what decides a duel: the countdown, health, rounds and the score. A player's browser reports its own hits; the
// room caps what one hit and one second of hits can do, and ignores hits outside a live round. It does not check
// aim, so it limits a player who alters the game and does not stop them.
//
// Every message is a JSON array whose first item names it (README.md has the table).

export const V = 2;                    // protocol version, sent in the welcome
export const WIN = 5, HP = 100;
export const LIMITS = {
  hit: 60,                             // most damage one hit may do (the game's largest, a slam, does 55)
  dmgPerSec: 70, dmgBurst: 90,         // most damage one seat may do at once and over time: less than full health
  msgPerSec: 90, msgBurst: 180,        // most messages one connection may send (positions go 30 times a second)
  msgLen: 2600, blocks: 300,           // longest message, and most broken blocks in one message
  waitMs: 10 * 60e3,                   // how long a room waits for its second player
  roomMs: 45 * 60e3,                   // longest life of a room
  graceMs: 12e3,                       // how long a seat is held for a player whose connection dropped
  silentMs: 20e3,                      // a connection that says nothing for this long is treated as dropped
  readyMs: 700, countMs: 3000, endMs: 3200,
};
// 32 characters, so five bits of a random byte pick one with no bias. No I, O, 0 or 1: a code is read aloud and typed.
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const isCode = s => typeof s === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(s);
export function makeCode(bytes) { let s = ''; for (let i = 0; i < 6; i++) s += ABC[bytes[i] & 31]; return s; }

const num = v => typeof v === 'number' && Number.isFinite(v);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const r2 = v => Math.round(v * 100) / 100;

export class Room {
  // io: { now() -> ms, later(ms, fn) -> cancel(), token() -> string }
  constructor(io) { this.io = io; this.timers = new Set(); this.clear(); }

  clear() {
    for (const cancel of this.timers) cancel();
    this.timers.clear(); this.code = ''; this.seats = [null, null]; this.phase = 'empty'; this.opened = 0;
    this.round = 0; this.form0 = 0; this.score = [0, 0]; this.hp = [HP, HP]; this.step = null;
  }
  get open() { return this.phase !== 'empty'; }
  get players() { return this.seats.filter(s => s && s.conn).length; }

  later(ms, fn) { const cancel = this.io.later(ms, () => { this.timers.delete(cancel); fn(); }); this.timers.add(cancel); return () => { cancel(); this.timers.delete(cancel); }; }
  send(i, m) { const s = this.seats[i]; if (s && s.conn) s.conn.send(JSON.stringify(m)); }
  both(m) { this.send(0, m); this.send(1, m); }
  seatOf(conn) { return this.seats.findIndex(s => s && s.conn === conn); }
  sit(i, conn) {
    const t = this.io.now();
    this.seats[i] = { conn, token: this.io.token(), seen: t, msgs: LIMITS.msgBurst, dmg: LIMITS.dmgBurst, at: t, gone: null };
    this.send(i, ['w', V, i, this.code, this.seats[i].token, 0]);
  }
  refuse(conn, why, code) { conn.send(JSON.stringify(['e', why])); conn.close(code, why); }

  // the first player: false if the room is already in use (index.js then tries another code)
  create(conn, code) {
    if (this.open) return false;
    this.code = code; this.phase = 'wait'; this.opened = this.io.now(); this.sit(0, conn); return true;
  }
  // the second player, or a player coming back with the token their welcome carried
  join(conn, token) {
    if (!this.open) return this.refuse(conn, 'none', 4404);
    if (token) {
      const i = this.seats.findIndex(s => s && s.token === token);
      if (i < 0) return this.refuse(conn, 'none', 4404);
      const s = this.seats[i], old = s.conn;
      if (s.gone) { s.gone(); s.gone = null; }
      s.conn = conn; s.seen = this.io.now(); if (old && old !== conn) old.close(4000, 'replaced');
      this.send(i, ['w', V, i, this.code, s.token, 1]);
      this.send(i, ['S', this.round, this.form0, this.score[0], this.score[1], this.phase, this.hp[0], this.hp[1]]);
      this.send(1 - i, ['a', 1]);
      return;
    }
    if (this.seats[1]) return this.refuse(conn, 'full', 4409);
    this.sit(1, conn); this.send(0, ['n', 2]); this.startMatch();
  }

  startMatch() { this.score = [0, 0]; this.round = 0; this.phase = 'ready'; this.next(LIMITS.readyMs, () => this.startRound()); }
  next(ms, fn) { if (this.step) this.step(); this.step = this.later(ms, () => { this.step = null; fn(); }); }
  startRound() {
    this.round++; this.form0 = this.round % 2 === 1 ? 0 : 1; this.hp = [HP, HP]; this.phase = 'count';
    this.both(['R', this.round, this.form0, this.score[0], this.score[1], LIMITS.countMs]);
    this.next(LIMITS.countMs, () => { this.phase = 'live'; this.both(['G']); });
  }
  endRound(winner) {
    this.score[winner]++; const over = this.score[winner] >= WIN; this.phase = over ? 'over' : 'end';
    this.both(['E', winner, this.score[0], this.score[1], over ? 1 : 0]);
    if (over) { if (this.step) { this.step(); this.step = null; } } else this.next(LIMITS.endMs, () => this.startRound());
  }

  message(conn, text) {
    const i = this.seatOf(conn); if (i < 0) return;
    const s = this.seats[i], t = this.io.now(), dt = Math.max(0, t - s.at) / 1000; s.at = t; s.seen = t;
    s.msgs = Math.min(LIMITS.msgBurst, s.msgs + dt * LIMITS.msgPerSec) - 1;
    s.dmg = Math.min(LIMITS.dmgBurst, s.dmg + dt * LIMITS.dmgPerSec);
    if (s.msgs < 0) return this.drop(i, 4429, 'too many messages');
    if (typeof text !== 'string' || text.length > LIMITS.msgLen) return this.drop(i, 4400, 'bad message');
    let m; try { m = JSON.parse(text); } catch (e) { return this.drop(i, 4400, 'bad message'); }
    if (!Array.isArray(m) || typeof m[0] !== 'string') return this.drop(i, 4400, 'bad message');
    const k = m[0], inRound = this.phase === 'count' || this.phase === 'live' || this.phase === 'end';
    if (k === 's') { if (inRound && m.length === 19 && m.slice(1).every(v => num(v) && Math.abs(v) < 1e6)) this.send(1 - i, m); }
    else if (k === 'h') this.hit(i, m);
    else if (k === 'k') { if (inRound && m.length > 1 && m.length <= LIMITS.blocks + 1 && m.slice(1).every(v => Number.isInteger(v) && v >= 0 && v < 65536)) this.send(1 - i, m); }
    else if (k === 'b') { if (inRound && m.length === 6 && m.slice(1).every(num)) this.send(1 - i, ['b', m[1], m[2], m[3], clamp(m[4], 1, 16), m[5] ? 1 : 0]); }
    else if (k === 'r') { if (this.phase === 'live' && m.length === 7 && m.slice(1).every(num)) this.send(1 - i, m); }
    else if (k === 'x') { if (this.phase === 'over' && this.players === 2) this.startMatch(); }
    else if (k === 'q') this.forfeit(i);
    // 'p' and anything unknown: counted, otherwise ignored
  }
  hit(i, m) {
    if (this.phase !== 'live' || m.length !== 5 || !m.slice(1).every(num)) return;
    const s = this.seats[i], d = r2(Math.min(clamp(m[1], 0, LIMITS.hit), s.dmg)); if (!(d > 0)) return;
    s.dmg -= d; const j = 1 - i; this.hp[j] = r2(Math.max(0, this.hp[j] - d));
    this.both(['H', j, this.hp[j], d, clamp(m[2], -30, 30), clamp(m[3], -30, 30), clamp(m[4], -30, 30)]);
    if (this.hp[j] <= 0) this.endRound(i);
  }

  // a connection closed, by itself or by us: hold the seat for a while, then the other player wins the room
  leave(conn) {
    const i = this.seatOf(conn); if (i < 0) return;
    const s = this.seats[i]; s.conn = null; this.send(1 - i, ['a', 0]);
    if (!s.gone) s.gone = this.later(LIMITS.graceMs, () => { s.gone = null; this.forfeit(i); });
  }
  drop(i, code, why) { const c = this.seats[i].conn; this.leave(c); c.close(code, why); }
  // a player left for good: tell the other and empty the room
  forfeit(i) {
    const mine = this.seats[i], other = this.seats[1 - i];
    if (other && other.conn) { other.conn.send(JSON.stringify(['q'])); other.conn.close(1000, 'rival left'); }
    if (mine && mine.conn) mine.conn.close(1000, 'left');
    this.clear();
  }
  end(why) { for (const s of this.seats) if (s && s.conn) this.refuse(s.conn, why, 4408); this.clear(); }

  // every five seconds: keep connections warm, drop silent ones, and close rooms that have gone on too long
  tick() {
    if (!this.open) return;
    const t = this.io.now();
    if (t - this.opened > LIMITS.roomMs) return this.end('long');
    if (this.phase === 'wait' && t - this.opened > LIMITS.waitMs) return this.end('wait');
    for (let i = 0; i < 2; i++) {
      const s = this.seats[i]; if (!s || !s.conn) continue;
      if (t - s.seen > LIMITS.silentMs) this.drop(i, 4408, 'silent'); else this.send(i, ['p']);
    }
  }
}
