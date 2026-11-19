// PSYCHO SYBER: ARENA, the duel's invite and reply codes.
// Two browsers open a direct WebRTC link by exchanging two session descriptions. No server of ours carries them:
// the first player sends an invite (the offer) and the second sends back a reply (the answer), as links or as text.
// This file turns a description into a short code and back. It has no DOM and no network; Node runs its test
// (psycho-syber/test/arena.mjs).
//
// A code is: version "1", kind "o" (offer) or "a" (answer), "z" (deflate-raw) or "p" (plain), then base64url.
(root => {
'use strict';
const VERSION = '1', MAX_CODE = 6000, MAX_SDP = 12000;

const toB64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromB64 = text => { const s = atob(text.replace(/-/g, '+').replace(/_/g, '/')); const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; };

async function pipe(bytes, stream) {
  const w = stream.writable.getWriter(); w.write(bytes); w.close();
  const parts = []; let n = 0; const r = stream.readable.getReader();
  for (;;) { const { done, value } = await r.read(); if (done) break; parts.push(value); n += value.length; if (n > MAX_SDP) throw new Error('too long'); }
  const out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out;
}

// Drop the lines a data-channel link never uses: TCP candidates, which browsers do not dial between two home networks.
function slim(sdp) {
  return String(sdp).split(/\r?\n/).filter(l => l && !/^a=candidate:\S+ \d+ tcp /i.test(l)).join('\r\n') + '\r\n';
}

async function pack(kind, sdp) {
  if (kind !== 'o' && kind !== 'a') throw new Error('kind');
  const raw = new TextEncoder().encode(slim(sdp));
  if (typeof CompressionStream === 'function') {
    try { const z = await pipe(raw, new CompressionStream('deflate-raw')); if (z.length < raw.length) return VERSION + kind + 'z' + toB64(z); } catch (e) { /* fall through to plain */ }
  }
  return VERSION + kind + 'p' + toB64(raw);
}

// Returns { kind, sdp } or null. Never throws on bad input: a pasted code is whatever the other person sent.
async function unpack(code) {
  try {
    code = String(code || '').trim();
    if (code.length < 8 || code.length > MAX_CODE || code[0] !== VERSION || !/^[oa][zp][A-Za-z0-9_-]+$/.test(code.slice(1))) return null;
    const kind = code[1]; let bytes = fromB64(code.slice(3));
    if (code[2] === 'z') { if (typeof DecompressionStream !== 'function') return null; bytes = await pipe(bytes, new DecompressionStream('deflate-raw')); }
    if (bytes.length > MAX_SDP) return null;
    const sdp = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (!/^v=0\r?\n/.test(sdp) || !/\nm=application /.test(sdp) || /\nm=(audio|video) /.test(sdp)) return null;   // a data channel and nothing else
    return { kind, sdp };
  } catch (e) { return null; }
}

// Pull a code out of what was pasted: a whole link ("...#d=CODE" or "...#r=CODE") or the bare code.
function find(text) {
  const t = String(text || '').trim(), m = /#[dr]=([A-Za-z0-9_-]+)/.exec(t);
  return m ? m[1] : /^[A-Za-z0-9_-]+$/.test(t) ? t : '';
}

// True when a description offers an address another network can reach (a "srflx" candidate from STUN).
const reachable = sdp => /^a=candidate:.* typ (srflx|relay) /m.test(String(sdp));

root.ArenaLink = { VERSION, pack, unpack, find, slim, reachable };
})(typeof window !== 'undefined' ? window : globalThis);
