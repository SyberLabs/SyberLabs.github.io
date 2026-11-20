// The duel relay for PSYCHO SYBER: ARENA: a Worker on syberlabs.io/duel/* and one Durable Object per duel.
// The game's page opens a WebSocket here; the Worker checks where the request came from, counts it against the
// caller's address for a minute, and hands it to the room named by the duel's code. The room's rules are room.js.
// Nothing is stored: a room lives in memory while a player is connected, and the Worker writes no log.
//
//   GET /duel/new            (WebSocket)  open a room and take its first seat; the welcome carries the code
//   GET /duel/join/CODE      (WebSocket)  take the second seat
//   GET /duel/join/CODE?t=…  (WebSocket)  come back to a seat after a dropped connection
//
// A browser cannot read the status of a refused WebSocket, so every refusal after the origin check is sent as a
// message, ["e", why], on a socket that is then closed.
import { Room, makeCode } from './room.js';

const plain = (body, status) => new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });

function refuse(why, code) {
  const pair = new WebSocketPair(), client = pair[0], server = pair[1];
  server.accept(); server.send(JSON.stringify(['e', why])); server.close(code, why);
  return new Response(null, { status: 101, webSocket: client });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url), m = /^\/duel\/(?:(new)|join\/([A-HJKMNP-Z2-9]{6}))$/.exec(url.pathname);
    if (!m) return plain('Not found', 404);
    if (request.method !== 'GET' || (request.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') return plain('This address takes WebSocket connections from the game page.', 426);
    const allowed = String(env.ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!allowed.includes(request.headers.get('Origin') || '')) return plain('Forbidden', 403);
    // one counter per address and minute, held by Cloudflare's rate limiter; the address is not written anywhere
    const limiter = m[1] ? env.NEW_ROOMS : env.JOINS;
    if (limiter) {
      let ok = true; try { ok = (await limiter.limit({ key: request.headers.get('CF-Connecting-IP') || 'none' })).success; } catch (e) { ok = true; }
      if (!ok) return refuse('busy', 4429);
    }
    if (m[1]) {
      for (let i = 0; i < 5; i++) {
        const code = makeCode(crypto.getRandomValues(new Uint8Array(6)));
        const res = await env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(new Request('https://room/new/' + code, request));
        if (res.status !== 409) return res;
      }
      return refuse('busy', 4429);
    }
    const token = url.searchParams.get('t') || '';
    if (token && !/^[0-9a-f]{24}$/.test(token)) return refuse('none', 4404);
    return env.ROOMS.get(env.ROOMS.idFromName(m[2])).fetch(new Request('https://room/join/' + m[2] + (token ? '?t=' + token : ''), request));
  },
};

export class DuelRoom {
  constructor() {
    this.ticker = null;
    this.room = new Room({
      now: () => Date.now(),
      later: (ms, fn) => { const t = setTimeout(fn, ms); return () => clearTimeout(t); },
      token: () => [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, '0')).join(''),
    });
  }
  async fetch(request) {
    const url = new URL(request.url), [, kind, code] = url.pathname.split('/');
    if (kind === 'new' && this.room.open) return new Response('in use', { status: 409 });
    const pair = new WebSocketPair(), client = pair[0], server = pair[1];
    server.accept();
    const conn = { send: s => { try { server.send(s); } catch (e) { } }, close: (c, why) => { try { server.close(c, why); } catch (e) { } } };
    server.addEventListener('message', ev => { if (typeof ev.data === 'string') this.room.message(conn, ev.data); else conn.close(4400, 'text only'); });
    const gone = () => this.room.leave(conn);
    server.addEventListener('close', gone); server.addEventListener('error', gone);
    if (kind === 'new') this.room.create(conn, code); else this.room.join(conn, url.searchParams.get('t') || '');
    if (!this.ticker) this.ticker = setInterval(() => { this.room.tick(); if (!this.room.open) { clearInterval(this.ticker); this.ticker = null; } }, 5000);
    return new Response(null, { status: 101, webSocket: client });
  }
}
