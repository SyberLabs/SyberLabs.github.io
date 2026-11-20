// PSYCHO SYBER: ARENA, the checks that run without a browser (CI runs this file):
//   node psycho-syber/test/arena.mjs
// 1. The page and the game's script agree: every element the script looks up is in the page.
// 2. The rules CLAUDE.md sets for the page hold: no form, nothing loaded from another origin, no address in the
//    script but the site's own relay, storage keys that begin psycho-syber.arena., no banned word, nothing below 12px.
// 3. The game and the relay (workers/duel/) agree on the protocol, and the relay keeps its own rules: one allowed
//    origin, one route, no log and no storage.
// 4. vendor/three.min.js is the file three@0.160.0 publishes.
// The relay's rules of play have their own test (workers/duel/room.test.mjs). The runs that play a wave and a duel
// need a browser: psycho-syber/test/arena-browser.mjs.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const dir = new URL('../arena/', import.meta.url);
const read = name => readFileSync(new URL(name, dir), 'utf8');
let failed = 0;
const rule = (name, ok, extra = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${!ok && extra ? ': ' + extra : ''}`); };

const html = read('index.html'), game = read('game.js'), css = read('arena.css');
const relayDir = new URL('../../workers/duel/', import.meta.url), relay = name => readFileSync(new URL(name, relayDir), 'utf8');

{ // 1. the page and the script agree
  const ids = new Set([...game.matchAll(/\$\('([a-z0-9-]+)'\)/g)].map(m => m[1]));
  for (const m of game.matchAll(/\[((?:'[a-z0-9-]+'(?:, )?)+)\]/g)) if (/^'(s|duel|go)-?[a-z]/.test(m[1])) for (const k of m[1].matchAll(/'([a-z0-9-]+)'/g)) ids.add(k[1]);
  const missing = [...ids].filter(id => !html.includes(`id="ar-${id}"`));
  rule(`every element game.js looks up is in the page (${ids.size} ids)`, ids.size > 60 && missing.length === 0, missing.join(', '));
  const dup = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]).filter((id, i, all) => all.indexOf(id) !== i);
  rule('no id is used twice in the page', dup.length === 0, dup.join(', '));
  const scripts = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map(m => m[1]).filter(s => s.includes('/arena/'));
  rule('the page loads three.js, then game.js, each deferred and without a ?v= token (scripts/stamp.mjs adds the hash)',
    scripts.join(' ') === '/psycho-syber/arena/vendor/three.min.js /psycho-syber/arena/game.js' && (html.match(/<script defer src="\/psycho-syber\/arena\//g) || []).length === 2);
}

{ // 2. the rules for the page
  rule('the page has no form', !/<form/i.test(html));
  rule('the page loads no script, stylesheet or font from another origin', !/<script[^>]+src=["']?(https?:)?\/\//i.test(html) && !/<link[^>]+rel=["']?(stylesheet|preconnect|preload|modulepreload)[^>]+href=["']?(https?:)?\/\//i.test(html) && !/url\(\s*["']?(https?:)?\/\//i.test(css) && !/@import/i.test(css));
  rule('the script names no address: the relay is a path of the site the page came from', !/[a-z]:\/\/[A-Za-z0-9]/i.test(game) && game.includes("location.origin.replace(/^http/, 'ws')) + '/duel/'"));
  rule('only a copy of the page served from this machine may name another relay', game.includes("const LOCAL = /^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname);") && (game.match(/__arenaRelay/g) || []).length === 2 && game.includes("LOCAL && typeof window.__arenaRelay === 'string' ? window.__arenaRelay"));
  const net = game.match(/\bfetch\(|XMLHttpRequest|EventSource|sendBeacon|importScripts|\.src\s*=|document\.cookie|indexedDB|RTCPeerConnection|BroadcastChannel|['"`](?:stun|turn)s?:/g);
  rule('the script opens one WebSocket and nothing else: no fetch, no direct link between browsers, no cookie', !net && (game.match(/new WebSocket\(/g) || []).length === 1, String(net));
  const keys = [...game.matchAll(/localStorage\.(?:get|set|remove)Item\('([^']+)'/g)].map(m => m[1]);
  rule('storage keys begin psycho-syber.arena.', keys.length > 0 && keys.every(k => k.startsWith('psycho-syber.arena.')), keys.join(' '));
  const all = html.replace(/<header class="sy-header[\s\S]*?<\/header>|<footer class="sy-footer[\s\S]*?<\/footer>/g, '') + game + css + relay('index.js') + relay('room.js');
  rule('the banned word is in none of the page, the script, the styles or the relay', !/\bhosts?\b/i.test(all), (all.match(/.{30}\bhosts?\b.{30}/i) || [''])[0]);
  rule('no em dash in the page or in the lines the game shows', !/[—–]/.test(html + game));
  const names = (all + read('vendor/three.LICENSE.txt')).match(/mateo|robles|sykosyber|sdcarlson|automateon|hello\.mateorobles/i);   // the workflow's guard, for these files
  rule('no personal name or handle in the page, the script, the styles or the relay', !names, String(names));
  const sizes = [...css.matchAll(/font(?:-size)?:\s*([^;}]+)/g)].flatMap(m => [...m[1].matchAll(/(?<![\w.(-])(\d+(?:\.\d+)?)px/g)].slice(0, 1).map(n => +n[1])).filter(n => n < 12);
  rule('nothing in arena.css is set below 12px', sizes.length === 0, sizes.join(' '));
  rule('the page says the arena is invented and lists the four products and Lacuna Institute', /are invented/.test(html) && ['/projects/syberwork/', '/projects/attest/', '/projects/rise/', '/projects/flyspace/', '/lacuna/'].every(h => html.includes(`<a href="${h}">`)));
  rule('the page says what a duel sends, what the relay keeps and what it does not check', html.includes('id="sent"') && html.includes('The two browsers do not connect to each other') && html.includes('The relay writes no log and stores nothing') && html.includes('It does not check aim'));
}

{ // 3. the game and the relay
  const room = await import(new URL('room.js', relayDir)), toml = relay('wrangler.toml'), worker = relay('index.js');
  const netV = +(game.match(/const NET_V = (\d+), WIN = (\d+)/) || [])[1], win = +(game.match(/const NET_V = (\d+), WIN = (\d+)/) || [])[2];
  rule('the game and the relay speak the same version and play to the same number of rounds', netV === room.V && win === room.WIN, `${netV} ${room.V} ${win} ${room.WIN}`);
  const CODE = '[A-HJ-NP-Z2-9]{6}';
  rule('a duel code is the same thing to the game, the Worker and the room', game.includes('#J=(' + CODE + ')$') && game.includes('^(' + CODE + ')$') && worker.includes('join\\/(' + CODE + ')') && room.isCode('K7M2QX') && !room.isCode('K7M2Q0'));
  rule('every refusal the relay can send has words in the game', ['none', 'full', 'busy', 'wait', 'long'].every(k => new RegExp('\\b' + k + ": '").test(game)) && [...(worker + relay('room.js')).matchAll(/(?:refuse\(conn, |refuse\(|end\()'([a-z]+)'/g)].every(m => ['none', 'full', 'busy', 'wait', 'long'].includes(m[1])));
  rule('the relay takes requests from the site alone, on one path of it', /^ORIGINS = "https:\/\/syberlabs\.io"$/m.test(toml) && /^routes = \[\{ pattern = "syberlabs\.io\/duel\/\*", zone_name = "syberlabs\.io" \}\]$/m.test(toml) && /^workers_dev = false$/m.test(toml) && worker.includes("if (!allowed.includes(request.headers.get('Origin') || '')) return plain('Forbidden', 403);"));
  const kept = (worker + relay('room.js')).match(/console\.|\.storage\b|\.put\(|caches\.|\bKV\b|\[\[(d1_databases|kv_namespaces|r2_buckets)\]\]/g), stores = toml.match(/\[\[(d1_databases|kv_namespaces|r2_buckets|queues|analytics_engine_datasets)|\[observability\]|logpush/g);
  rule('the relay writes no log and has no storage', !kept && !stores, String(kept) + ' ' + String(stores));
  rule('the relay counts new duels and joins per address', /name = "NEW_ROOMS"[\s\S]*?limit = 6\s+period = 60/.test(toml) && /name = "JOINS"[\s\S]*?limit = 30\s+period = 60/.test(toml) && html.includes('more than 6 new duels or 30 joins'));
}

{ // 4. the vendored library
  const sha = createHash('sha256').update(readFileSync(new URL('vendor/three.min.js', dir))).digest('hex');
  rule('vendor/three.min.js is three@0.160.0 build/three.min.js, byte for byte', sha === '170c6789f43217c96b3170f4b42fafe135de7f7cd48497a4218f9757ee1d49fa', sha);
}

console.log(failed ? `arena: ${failed} check(s) failed` : 'arena: all checks passed');
process.exit(failed ? 1 : 0);
