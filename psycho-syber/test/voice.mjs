// Makes the narrator's recordings with ElevenLabs, one for each line of the story, and writes what the game needs
// to keep its words in step with them. Run it from the repository root. The key is read from the environment and
// is never written anywhere.
//
//   node psycho-syber/test/voice.mjs --list        print every line and count the characters; calls nothing
//   ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... node psycho-syber/test/voice.mjs
//                                                  make each line that has no recording, or whose words have changed
//   ... voice.mjs --all                            make every line again (after choosing another voice)
//   ... voice.mjs --only steps                     the lines of one stage ("abduct" and "end" are the other two sets)
//   ... voice.mjs --mock                           stand-in murmurs made with ffmpeg, to try the page without the service
//   ... voice.mjs --clear                          remove the recordings: the story is shown without a voice
//
// Optional: ELEVENLABS_MODEL (eleven_multilingual_v2), VOICE_SPEED (0.82; the service allows 0.7 to 1.2),
// VOICE_STABILITY (0.55), VOICE_STYLE (0.25).
//
// It writes psycho-syber/voice/<line>.mp3 and psycho-syber/game/voice.js, puts the paragraph that says the voice is
// synthetic into the page (or takes it out when no recording is left), and gives every game import one new ?v=
// token. Then run node psycho-syber/test/run.mjs, listen on the page, and commit the lot together.
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { STAGES, TOLD } from '../game/levels.js';

// What the page says once there are recordings. run.mjs fails if recordings and this paragraph are not there together.
export const ABOUT = `<h3 class="ps-sub">Narrator</h3>
        <p>A voice reads the story lines: the introduction to each stage, two lines before the hidden scene and the four lines of the ending. The voice is synthetic. It was generated with ElevenLabs text to speech from the lines shown on the picture, and the recordings are files on this site. While the voice reads, each word appears as the voice reaches it and the pace control does not apply. With the sound off the story appears without the voice.</p>`;
const OPEN = '<!-- narrator: written by psycho-syber/test/voice.mjs -->', CLOSE = '<!-- /narrator -->';

export const said = text => createHash('sha256').update(text).digest('hex').slice(0, 10);   // which words a recording speaks
// every line the narrator can speak, in order: the stage introductions, then the two sets in TOLD
export const LINES = [...STAGES.map(d => [d.id, d.intro]), ...Object.entries(TOLD)].flatMap(([key, ls]) => {
  const plain = ls.map(l => l.replaceAll(' | ', ' '));
  return plain.map((text, i) => ({ id: `${key}.${i}`, key, text, before: plain.slice(0, i).join(' '), after: plain.slice(i + 1).join(' ') }));
});

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) await main();   // not when run.mjs imports the list

async function main() {
  const arg = name => process.argv.includes('--' + name), after = name => { const i = process.argv.indexOf('--' + name); return i < 0 ? '' : process.argv[i + 1] || ''; };
  const dir = new URL('../voice/', import.meta.url), listFile = new URL('../game/voice.js', import.meta.url), page = new URL('../index.html', import.meta.url);
  const fileOf = e => new URL(e.src.split('?')[0], dir);

  if (arg('list')) {
    for (const l of LINES) console.log(`${l.id.padEnd(10)} ${l.text}`);
    console.log(`\n${LINES.length} lines, ${LINES.reduce((n, l) => n + l.text.length, 0)} characters`);
    return;
  }

  let have = {};
  try { have = JSON.parse(readFileSync(listFile, 'utf8').match(/export const VOICE = (\{[\s\S]*\});/)[1]); } catch { /* none yet */ }
  if (arg('clear')) { rmSync(dir, { recursive: true, force: true }); have = {}; }
  else {
    const mock = arg('mock'), only = after('only'), key = process.env.ELEVENLABS_API_KEY, voice = process.env.ELEVENLABS_VOICE_ID;
    if (!mock && (!key || !voice)) { console.error('Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID, or use --list, --mock or --clear.'); process.exit(1); }
    mkdirSync(dir, { recursive: true });
    const stale = l => !have[l.id] || have[l.id].said !== said(l.text) || !existsSync(fileOf(have[l.id]));
    const todo = LINES.filter(l => (!only || l.key === only) && (arg('all') || mock || stale(l)));
    // when each word starts and ends, from the service's timing of every character
    const wordTimes = al => { const out = []; let a = null, b = 0; al.characters.forEach((ch, i) => { if (/\s/.test(ch)) { if (a !== null) { out.push([a, b]); a = null; } } else { if (a === null) a = al.character_start_times_seconds[i]; b = al.character_end_times_seconds[i]; } }); if (a !== null) out.push([a, b]); return out.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]); };
    // one request for one line; a busy or failing service is asked again, three times at most
    const ask = async l => {
      for (let i = 0; ; i++) {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}/with-timestamps?output_format=mp3_44100_128`, {
          method: 'POST', headers: { 'xi-api-key': key, 'content-type': 'application/json' },
          body: JSON.stringify({ text: l.text, model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2', previous_text: l.before || undefined, next_text: l.after || undefined,
            voice_settings: { stability: +(process.env.VOICE_STABILITY || 0.55), similarity_boost: 0.75, style: +(process.env.VOICE_STYLE || 0.25), speed: +(process.env.VOICE_SPEED || 0.82), use_speaker_boost: true } }),
        });
        if (res.ok || i === 3 || (res.status !== 429 && res.status < 500)) return res;
        await new Promise(r => setTimeout(r, 1500 * 2 ** i));
      }
    };
    for (const l of todo) {
      const n = l.text.split(' ').length, name = l.id.replace('.', '-'); let words, file;
      if (mock) {   // a murmur in the band a voice uses, as long as a slow reading, and word times to match
        let t = 0.15; words = l.text.split(' ').map(w => { const a = t, d = 0.22 + w.replace(/[^a-z]/gi, '').length * 0.075; t += d + (/[,.]$/.test(w) ? 0.34 : 0.1); return [+a.toFixed(3), +(a + d).toFixed(3)]; });
        file = name + '.wav';
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `anoisesrc=d=${(t + 0.2).toFixed(2)}:c=pink:a=0.5:s=${1 + l.id.length}`, '-af', 'highpass=f=300,lowpass=f=3400,tremolo=f=3.5:d=0.9,volume=1.8', '-ar', '22050', '-ac', '1', new URL(file, dir).pathname]);
      } else {
        const res = await ask(l);
        if (!res.ok) { console.error(`${l.id}: the service answered ${res.status}: ${(await res.text()).slice(0, 300)}`); process.exit(1); }
        const out = await res.json(), al = out.alignment || out.normalized_alignment;
        words = al ? wordTimes(al) : [];
        file = name + '.mp3';
        writeFileSync(new URL(file, dir), Buffer.from(out.audio_base64, 'base64'));
      }
      if (words.length !== n) { console.error(`${l.id}: ${words.length} timed words for ${n} written ones. The line is kept without a voice.`); delete have[l.id]; continue; }
      // the address carries a mark of the file's contents, so a browser never pairs new word times with an old recording
      have[l.id] = { src: `${file}?v=${createHash('sha256').update(readFileSync(new URL(file, dir))).digest('hex').slice(0, 8)}`, said: said(l.text), words };
      console.log(`${l.id.padEnd(10)} ${words[words.length - 1][1].toFixed(1)} s  ${l.text}`);
    }
  }
  const ordered = Object.fromEntries(LINES.filter(l => have[l.id] && have[l.id].said === said(l.text) && existsSync(fileOf(have[l.id]))).map(l => [l.id, have[l.id]]));
  const count = Object.keys(ordered).length;
  if (existsSync(dir)) {   // a recording nothing points to is not published
    const kept = new Set(Object.values(ordered).map(e => e.src.split('?')[0]));
    for (const f of readdirSync(dir)) if (!kept.has(f)) rmSync(new URL(f, dir));
    if (!readdirSync(dir).length) rmSync(dir, { recursive: true });
  }
  writeFileSync(listFile, `// Written by psycho-syber/test/voice.mjs. One entry for each narrated line: its file in ../voice/, a mark of the words
// it speaks, and when each word starts and ends, in seconds. While this is empty the story is shown without a voice
// and the game asks for no file.
export const VOICE = ${JSON.stringify(ordered)};
`);
  // the page says the voice is synthetic exactly while there are recordings
  let html = readFileSync(page, 'utf8'); const a = html.indexOf(OPEN), b = html.indexOf(CLOSE);
  if (a < 0 || b < a) { console.error(`The page has lost its narrator markers: put "${OPEN}${CLOSE}" back after the Music paragraph.`); process.exit(1); }
  html = html.slice(0, a + OPEN.length) + (count ? ABOUT : '') + html.slice(b);
  // every game import, and the page's two links, take one new token so a returning browser fetches the new list
  const game = new URL('../game/', import.meta.url), old = html.match(/game\/main\.js\?v=([0-9a-z]+)/)[1], token = 'v' + Date.now().toString(36);
  writeFileSync(page, html.replaceAll('?v=' + old, '?v=' + token));
  for (const f of readdirSync(game).filter(n => n.endsWith('.js')).map(n => new URL(n, game))) writeFileSync(f, readFileSync(f, 'utf8').replaceAll('?v=' + old, '?v=' + token));
  const secs = Object.values(ordered).reduce((n, e) => n + e.words[e.words.length - 1][1], 0), bytes = Object.values(ordered).reduce((n, e) => n + statSync(fileOf(e)).size, 0);
  console.log(`\n${count} of ${LINES.length} lines have a recording: ${secs.toFixed(0)} seconds of speech in ${(bytes / 1024).toFixed(0)} KB. Every game import now carries ?v=${token}.`);
  if (count) console.log('The page now says the voice is synthetic. Next: node psycho-syber/test/run.mjs, then listen on the page.');
}
