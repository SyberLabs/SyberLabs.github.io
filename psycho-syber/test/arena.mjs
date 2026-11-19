// PSYCHO SYBER: ARENA, the checks that run without a browser (CI runs this file):
//   node psycho-syber/test/arena.mjs
// 1. link.js packs an invite and a reply and reads them back, and refuses what is not one.
// 2. The page and the game's script agree: every element the script looks up is in the page.
// 3. The rules CLAUDE.md sets for the page hold: no form, nothing loaded from another origin, one STUN server and
//    no other address, storage keys that begin psycho-syber.arena., no banned word, nothing set below 12px.
// 4. vendor/three.min.js is the file three@0.160.0 publishes.
// The runs that play a wave and a duel need a browser: psycho-syber/test/arena-browser.mjs.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const dir = new URL('../arena/', import.meta.url);
const read = name => readFileSync(new URL(name, dir), 'utf8');
let failed = 0;
const rule = (name, ok, extra = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${!ok && extra ? ': ' + extra : ''}`); };

await import(new URL('link.js', dir));
const L = globalThis.ArenaLink;
const html = read('index.html'), game = read('game.js'), link = read('link.js'), css = read('arena.css');

{ // 1. invite and reply codes
  const sdp = kind => ['v=0', 'o=- 8828159057707503512 2 IN IP4 127.0.0.1', 's=-', 't=0 0', 'a=group:BUNDLE 0', 'a=extmap-allow-mixed', 'a=msid-semantic: WMS',
    'm=application 45277 UDP/DTLS/SCTP webrtc-datachannel', 'c=IN IP4 192.0.2.2',
    'a=candidate:4257727762 1 udp 2113937151 0f3d5b0e-6f0e-4c62-9a55-6a0f6d3c1a11.local 45277 typ host generation 0 network-cost 999',
    'a=candidate:842163049 1 udp 1677729535 198.51.100.7 45277 typ srflx raddr 0.0.0.0 rport 0 generation 0 network-cost 999',
    'a=candidate:3345412090 1 tcp 1518280447 192.0.2.2 9 typ host tcptype active generation 0 network-cost 999',
    'a=ice-ufrag:jfiX', 'a=ice-pwd:b+pAAx4MFa25vzj2yrBzzp9t', 'a=ice-options:trickle',
    'a=fingerprint:sha-256 5E:D8:F3:E3:C8:3A:EF:F5:CA:98:EE:7A:56:09:29:43:73:F4:B4:9F:41:9A:57:AC:50:B8:5E:9F:17:FF:2F:07',
    `a=setup:${kind === 'o' ? 'actpass' : 'active'}`, 'a=mid:0', 'a=sctp-port:5000', 'a=max-message-size:262144', ''].join('\r\n');
  for (const kind of ['o', 'a']) {
    const code = await L.pack(kind, sdp(kind)), back = await L.unpack(code), what = kind === 'o' ? 'an invite' : 'a reply';
    rule(`${what}, packed, reads back as it was written, less its TCP candidate`, !!back && back.kind === kind && back.sdp === L.slim(sdp(kind)) && !/ tcp /.test(back.sdp) && back.sdp.includes('typ srflx'), code.slice(0, 24));
    rule(`the code for ${what} is letters, digits, - and _ and under 1000 characters`, /^1[oa][zp][A-Za-z0-9_-]+$/.test(code) && code.length < 1000, String(code.length));
    rule(`find() takes the code for ${what} out of a link, or takes the bare code`, L.find(`https://syberlabs.io/psycho-syber/arena/#${kind === 'o' ? 'd' : 'r'}=${code}`) === code && L.find('  ' + code + '\n') === code);
  }
  const plain = '1op' + Buffer.from(L.slim(sdp('o'))).toString('base64url');
  rule('an uncompressed code reads back too', (await L.unpack(plain))?.sdp === L.slim(sdp('o')));
  const bad = ['', 'hello', '2oz' + 'A'.repeat(40), '1xz' + 'A'.repeat(40), '1oz!!!!!!!!!!!!', '1op' + Buffer.from('not a session description').toString('base64url'),
    '1op' + Buffer.from(sdp('o').replace('m=application', 'm=audio')).toString('base64url'), '1op' + Buffer.from(sdp('o') + 'm=video 9 UDP/TLS/RTP/SAVPF 96\r\n').toString('base64url'),
    '1oz' + Buffer.from('truncated deflate').toString('base64url'), '1op' + 'A'.repeat(7000)];
  const got = await Promise.all(bad.map(b => L.unpack(b)));
  rule('what is not an invite or a reply is refused without an error', got.every(g => g === null), JSON.stringify(got.map(g => g === null)));
  rule('find() returns nothing for text that holds no code', L.find('see you at 8?') === '' && L.find('https://syberlabs.io/psycho-syber/arena/') === '');
  rule('reachable() is true only with an address from STUN', L.reachable(sdp('o')) && !L.reachable(sdp('o').split('\r\n').filter(l => !l.includes('srflx')).join('\r\n')));
}

{ // 2. the page and the script agree
  const ids = new Set([...game.matchAll(/\$\('([a-z0-9-]+)'\)/g)].map(m => m[1]));
  for (const m of game.matchAll(/\[((?:'[a-z0-9-]+'(?:, )?)+)\]/g)) if (/^'(s|duel|go)-?[a-z]/.test(m[1])) for (const k of m[1].matchAll(/'([a-z0-9-]+)'/g)) ids.add(k[1]);
  const missing = [...ids].filter(id => !html.includes(`id="ar-${id}"`));
  rule(`every element game.js looks up is in the page (${ids.size} ids)`, ids.size > 60 && missing.length === 0, missing.join(', '));
  const dup = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]).filter((id, i, all) => all.indexOf(id) !== i);
  rule('no id is used twice in the page', dup.length === 0, dup.join(', '));
  const scripts = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map(m => m[1]).filter(s => s.includes('/arena/'));
  rule('the page loads three.js, then link.js, then game.js, each deferred and without a ?v= token (scripts/stamp.mjs adds the hash)',
    scripts.join(' ') === '/psycho-syber/arena/vendor/three.min.js /psycho-syber/arena/link.js /psycho-syber/arena/game.js' && (html.match(/<script defer src="\/psycho-syber\/arena\//g) || []).length === 3);
}

{ // 3. the rules for the page
  rule('the page has no form', !/<form/i.test(html));
  rule('the page loads no script, stylesheet or font from another origin', !/<script[^>]+src=["']?(https?:)?\/\//i.test(html) && !/<link[^>]+rel=["']?(stylesheet|preconnect|preload|modulepreload)[^>]+href=["']?(https?:)?\/\//i.test(html) && !/url\(\s*["']?(https?:)?\/\//i.test(css) && !/@import/i.test(css));
  const urls = [...(game + link).matchAll(/\b(?:https?|wss?|stuns?|turns?):[^\s'"`)]+/g)].map(m => m[0]);
  rule('the scripts name one address, the STUN server, and no relay', urls.length === 1 && urls[0] === 'stun:stun.cloudflare.com:3478', urls.join(' '));
  const net = (game + link).match(/\bfetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts|\.src\s*=|document\.cookie|indexedDB/g);
  rule('the scripts fetch nothing, set no cookie and load no further script', !net, String(net));
  const keys = [...game.matchAll(/localStorage\.(?:get|set|remove)Item\('([^']+)'/g)].map(m => m[1]);
  rule('storage keys begin psycho-syber.arena.', keys.length > 0 && keys.every(k => k.startsWith('psycho-syber.arena.')), keys.join(' '));
  rule('the channel between tabs is named psycho-syber.arena', (game.match(/new BroadcastChannel\('([^']+)'\)/) || [])[1] === 'psycho-syber.arena');
  const all = html.replace(/<header class="sy-header[\s\S]*?<\/header>|<footer class="sy-footer[\s\S]*?<\/footer>/g, '') + game + link + css;
  rule('the banned word is in none of the page, the scripts or the styles', !/\bhosts?\b/i.test(all), (all.match(/.{30}\bhosts?\b.{30}/i) || [''])[0]);
  rule('no em dash in the page or in the lines the game shows', !/[—–]/.test(html + game));
  const names = (all + read('vendor/three.LICENSE.txt')).match(/mateo|robles|sykosyber|sdcarlson|automateon|hello\.mateorobles/i);   // the workflow's guard, for these files
  rule('no personal name or handle in the page, the scripts or the styles', !names, String(names));
  const sizes = [...css.matchAll(/font(?:-size)?:\s*([^;}]+)/g)].flatMap(m => [...m[1].matchAll(/(?<![\w.(-])(\d+(?:\.\d+)?)px/g)].slice(0, 1).map(n => +n[1])).filter(n => n < 12);
  rule('nothing in arena.css is set below 12px', sizes.length === 0, sizes.join(' '));
  rule('the page says the arena is invented and lists the four products and Lacuna Institute', /are invented/.test(html) && ['/projects/syberwork/', '/projects/attest/', '/projects/rise/', '/projects/flyspace/', '/lacuna/'].every(h => html.includes(`<a href="${h}">`)));
  rule('the page says what a duel sends, and that it has no relay', html.includes('id="sent"') && html.includes('a STUN server run by Cloudflare') && html.includes('There is no relay'));
}

{ // 4. the vendored library
  const sha = createHash('sha256').update(readFileSync(new URL('vendor/three.min.js', dir))).digest('hex');
  rule('vendor/three.min.js is three@0.160.0 build/three.min.js, byte for byte', sha === '170c6789f43217c96b3170f4b42fafe135de7f7cd48497a4218f9757ee1d49fa', sha);
}

console.log(failed ? `arena: ${failed} check(s) failed` : 'arena: all checks passed');
process.exit(failed ? 1 : 0);
