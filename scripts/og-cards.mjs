// Renders a 1200x630 social-preview card for every page into og/<slug>.png: the SyberLabs lockup,
// the page's eyebrow, headline and one line of description, the status badge for projects, and a
// de Jong sigil (kit/v2/syber-sigil.js) seeded by the page in its accent colour. The project cards
// read projects/site-data.js, so a changed headline or status only needs `node scripts/og-cards.mjs`
// and a bump of the `?v=` on the og:image URLs. The PNGs are committed: they are the published assets.
//
// Rendering: headless Chromium through Playwright (SwiftShader, device scale factor 1). Google Fonts
// is not reachable from the render host, so the card declares the Atlas stacks and falls through to
// the system serif / sans / mono (Liberation Serif, DejaVu Sans, DejaVu Sans Mono on the build box);
// no webfont is embedded. Each PNG is then quantised to a 256-colour palette with ffmpeg when it
// would otherwise exceed 200 KB.
//
//   node scripts/og-cards.mjs            all cards
//   node scripts/og-cards.mjs omnios kev  only those slugs
//
// Playwright is resolved from OG_PLAYWRIGHT (a directory holding node_modules/playwright) or the
// scratchpad install used when the cards were first made; Chromium from OG_CHROME.
import { readFile, writeFile, mkdir, stat, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PW_DIR = process.env.OG_PLAYWRIGHT || '/tmp/claude-0/-home-user/84e350d3-bc45-5f90-a44c-428e08eb5b69/scratchpad/pw';
const CHROME = process.env.OG_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const LIMIT = 200 * 1024;

const { projects } = await import(pathToFileURL(resolve(root, 'projects/site-data.js')).href);

const ICE = '#90d8f0', RESEARCH = '#c7a4ff', RISE = '#f2d9a6';
const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// One entry per page. `seed` names the sigil (projects use their slug, so the card carries the same
// mark as the page); `line` is the single sentence under the headline.
const pages = [
  { slug: 'home', path: '/', eyebrow: 'Independent AI software lab', headline: 'Read. Think. Build.',
    line: 'An audiovisual reader, a canvas for thinking with AI over live data, and infrastructure that makes AI agents reviewable.', seed: 'syberlabs', accent: ICE },
  ...projects.map(p => ({
    slug: p.slug, path: `/projects/${p.slug}/`, eyebrow: `Project ${p.number} · ${p.category}`, headline: p.headline,
    // the whole intro when it fits four lines, otherwise its first sentence
    line: p.intro.length > 200 ? p.intro.replace(/\.\s[\s\S]*$/, '.') : p.intro, seed: p.slug, accent: p.accent, badge: p.status, name: p.name,
  })),
  { slug: 'jev-execution', path: '/research/jev-execution/', eyebrow: 'Research · Technical report · September 2026', headline: 'Beyond the typed decision.',
    line: 'GrokCell Execution: a Python and SQLite execution layer for AI agents, with durable evidence and crash-recovery tests.', seed: 'jev-execution', accent: RESEARCH },
  { slug: 'sybershoke', path: '/research/sybershoke/', eyebrow: 'Research · Research note · Revision 2', headline: 'Shock the run. Then count.',
    line: 'Sybershoke: deterministic shock tests for multi-agent systems, with predictions written first and limits stated.', seed: 'sybershoke', accent: RESEARCH },
  { slug: 'kev', path: '/kev/', eyebrow: 'RISE · Reader-owned AI', headline: 'Your model, your connection.',
    line: 'RISE spends no shared inference: Jev runs on the reader’s OpenRouter account, Kev-4B on the reader’s own machine.', seed: 'kev', accent: RISE },
  { slug: 'jev', path: '/jev/', eyebrow: 'RISE · AI integration · Case study', headline: 'AI decisions with clear limits.',
    line: 'The earlier Jev integration in RISE, kept as historical evidence while the reading-decision path moves to Kev.', seed: 'jev', accent: RISE },
  { slug: 'approach', path: '/approach/', eyebrow: 'SyberLabs · Approach', headline: 'Make the work observable.',
    line: 'Establish what a system knows, design what a person can do with it, and verify that they can review and change the result.', seed: 'approach', accent: ICE },
  { slug: 'services', path: '/services/', eyebrow: 'SyberLabs · Services', headline: 'An interactive way to read your text.',
    line: 'Scoped, paid interactive reading pilots for publishers and authors, built on RISE.', seed: 'services', accent: ICE },
  { slug: 'rise-demo', path: '/rise-demo/', eyebrow: 'Product demo · Audiovisual reader', headline: 'See RISE in motion.',
    line: 'A film edited from real RISE screen recordings, then the interactive sample to try yourself.', seed: 'rise', accent: RISE },
  { slug: 'privacy', path: '/privacy/', eyebrow: 'SyberLabs · Privacy', headline: 'What this site does with your data.',
    line: 'A static site with no accounts, forms, cookies or analytics.', seed: 'privacy', accent: ICE },
];

const logo = `data:image/png;base64,${(await readFile(resolve(root, 'syber-logo-96.png'))).toString('base64')}`;
// The sigil module, with its exports hoisted onto window so an inline module script can draw with it.
const sigil = (await readFile(resolve(root, 'kit/v2/syber-sigil.js'), 'utf8')).replace(/^export /gm, '') + '\nwindow.__sigil = { params, draw };';

const DOT = { live: '#6ff5a8', early: ICE, research: RESEARCH };

function card(p) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
/* Atlas tokens (kit/v2/syber-atlas.css). The webfonts are not loaded: see the note at the top of og-cards.mjs. */
:root { --ink: #06051a; --vellum: #eef0ff; --body: #dfe2fb; --mist: #b4bbe2; --dim: #8990bb; --rule: rgba(170,180,255,.16); --rule-2: rgba(170,180,255,.32);
  --accent: ${p.accent};
  --serif: "Instrument Serif", Georgia, "Liberation Serif", "Times New Roman", serif;
  --sans: "Instrument Sans", system-ui, "DejaVu Sans", "Liberation Sans", sans-serif;
  --mono: "JetBrains Mono", ui-monospace, "DejaVu Sans Mono", "Liberation Mono", monospace; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1200px; height: 630px; overflow: hidden; }
body { position: relative; color: var(--vellum); font: 400 17px/1.6 var(--sans); -webkit-font-smoothing: antialiased;
  background: radial-gradient(60% 80% at 82% 50%, color-mix(in srgb, var(--accent) 14%, transparent), #0000 70%),
    radial-gradient(40% 55% at 68% 48%, #2a1a7a55, #0000 70%), radial-gradient(30% 40% at 76% 40%, #0048f040, #0000 70%),
    radial-gradient(22% 30% at 60% 62%, #ff58d626, #0000 70%), var(--ink); }
.stars { position: absolute; inset: 0; background-image: radial-gradient(1px 1px at 12% 18%, #fff8 50%, #0000 51%), radial-gradient(1px 1px at 72% 34%, #cfe4ff99 50%, #0000 51%), radial-gradient(1px 1px at 38% 71%, #fff6 50%, #0000 51%), radial-gradient(1px 1px at 88% 82%, #e8c9ff88 50%, #0000 51%), radial-gradient(1px 1px at 55% 9%, #fff5 50%, #0000 51%); background-size: 420px 420px, 530px 530px, 610px 610px, 470px 470px, 700px 700px; }
.frame { position: absolute; inset: 0; display: grid; grid-template-columns: 1fr 440px; gap: 48px; padding: 56px 64px 52px; }
.copy { display: flex; flex-direction: column; min-width: 0; }
.lockup { display: inline-flex; align-items: center; gap: 12px; font: 600 15px/1 var(--sans); letter-spacing: .22em; text-transform: uppercase; color: var(--vellum); }
.lockup img { width: 26px; height: auto; }
.eyebrow { margin-top: 44px; font: 500 15px/1.4 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--mist); }
.headline { margin-top: 18px; font: 400 ${p.headline.length > 28 ? 64 : 76}px/1.02 var(--serif); letter-spacing: -.015em; color: var(--vellum); text-wrap: balance; }
.line { margin-top: 22px; font: 400 22px/1.4 var(--sans); color: var(--body); display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.foot { margin-top: auto; display: flex; align-items: center; gap: 18px; padding-top: 24px; }
.badge { display: inline-flex; align-items: center; gap: 10px; height: 36px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--rule-2); background: rgba(6,5,26,.6);
  font: 500 14px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--vellum); white-space: nowrap; }
.badge::before { content: ""; width: 9px; height: 9px; border-radius: 50%; background: var(--d); box-shadow: 0 0 10px var(--d); }
.url { font: 500 15px/1 var(--mono); letter-spacing: .06em; color: var(--dim); white-space: nowrap; }
.plate { position: relative; align-self: center; width: 440px; height: 440px; border-radius: 14px; border: 1px solid var(--rule); background: rgba(12,10,42,.55); overflow: hidden; }
.plate::before { content: ""; position: absolute; inset: 0; background: radial-gradient(60% 60% at 50% 50%, color-mix(in srgb, var(--accent) 12%, transparent), #0000 72%); }
.ring { position: absolute; inset: 22px; border-radius: 50%; border: 1px solid var(--rule); }
.ring::after { content: ""; position: absolute; inset: 20px; border-radius: 50%; border: 1px dashed var(--rule); }
canvas { position: absolute; inset: 0; width: 440px; height: 440px; display: block; }
.plate-cap { position: absolute; left: 0; right: 0; bottom: 14px; text-align: center; font: 500 12px/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--dim); }
</style></head><body>
<div class="stars"></div>
<div class="frame">
  <div class="copy">
    <div class="lockup"><img src="${logo}" alt="">SyberLabs</div>
    <p class="eyebrow">${esc(p.eyebrow)}</p>
    <h1 class="headline">${esc(p.headline)}</h1>
    <p class="line">${esc(p.line)}</p>
    <div class="foot">${p.badge ? `<span class="badge" style="--d:${DOT[p.badge.kind] || 'var(--mist)'}">${esc(p.badge.label)}</span>` : ''}<span class="url">syberlabs.io${esc(p.path === '/' ? '' : p.path)}</span></div>
  </div>
  <div class="plate"><div class="ring"></div><canvas id="sigil"></canvas><div class="plate-cap">${esc(p.name ? `${p.name} · de Jong map` : `${p.seed} · de Jong map`)}</div></div>
</div>
<script type="module">${sigil}</script>
</body></html>`;
}

async function optimise(file) {
  if ((await stat(file)).size <= LIMIT) return;
  const tmp = `${file}.q.png`;
  for (const colors of [256, 192, 128, 96, 64]) {
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-vf',
      `split[a][b];[a]palettegen=max_colors=${colors}:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a`, tmp]);
    if ((await stat(tmp)).size <= LIMIT) break;
  }
  await writeFile(file, await readFile(tmp));
  await rm(tmp);
}

const only = process.argv.slice(2);
const want = only.length ? pages.filter(p => only.includes(p.slug)) : pages;
if (!want.length) throw new Error(`og-cards: no page named ${only.join(', ')}`);
await mkdir(resolve(root, 'og'), { recursive: true });

const { chromium } = createRequire(resolve(PW_DIR, 'package.json'))('playwright');
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const p of want) {
    await page.setContent(card(p), { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__sigil);
    await page.evaluate(({ seed, color }) => window.__sigil.draw(document.getElementById('sigil'), seed, { color, animate: false }), { seed: p.seed, color: p.accent });
    const file = resolve(root, 'og', `${p.slug}.png`);
    await page.screenshot({ path: file, type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
    await optimise(file);
    console.log(`og/${p.slug}.png  ${Math.round((await stat(file)).size / 1024)} KB`);
  }
} finally {
  await browser.close();
}
