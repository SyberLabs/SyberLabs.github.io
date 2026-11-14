// Renders the engine plates in media/engines/ from the Engines repository, unmodified, then grades them
// into the Midnight theme (scripts/engine-grade.py). Each plate is seeded, so the same command gives the
// same picture. docs/ENGINE_PLATES.md records which engine and seed each page uses, and the licence.
//
//   git clone https://github.com/<engines repository> /path/to/engines     (see docs/ENGINE_PLATES.md)
//   node scripts/engine-plates.mjs /path/to/engines            all plates
//   node scripts/engine-plates.mjs /path/to/engines attest     only that plate
//
// Rendering: headless Chromium through Playwright (SwiftShader for the WebGL2 engine), device scale
// factor 1. Playwright is resolved from OG_PLAYWRIGHT (a directory holding node_modules/playwright), as
// in scripts/og-cards.mjs. The engine pages are served from the checkout on a local port; nothing is
// fetched from the network. The plates are committed: they are the published assets.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [enginesDir, ...only] = process.argv.slice(2);
if (!enginesDir) throw new Error('usage: node scripts/engine-plates.mjs /path/to/engines [plate...]');
const PW_DIR = process.env.OG_PLAYWRIGHT || '/opt/npm-tools';

// Sets the engine's own panel controls (ids ctl_<key>), the way a visitor would.
const setControls = (page, values) => page.evaluate(o => {
  for (const [k, v] of Object.entries(o)) {
    const e = document.getElementById('ctl_' + k);
    if (!e) throw new Error('no control ' + k);
    e.value = String(v); e.dispatchEvent(new Event('input'));
  }
}, values);
const VESTIGIA = { palette: 3, zoom: 0.72, ghostAlpha: 0.34, conAlpha: 0.1, bloom: 0.55, thickness: 1.35 };
const grown = page => page.waitForFunction(() => /nodes/.test(document.getElementById('status').textContent), null, { timeout: 180000 });

// name: the output file. work + hash: the engine page and its seed. view: the render size. canvas: what is captured.
// grade: [size, black point, gamma, round falloff], or wide: [width, height, black point, gamma] for a 16:9 plate.
const PLATES = [
  { name: 'vestigia-syberwork', work: 'vestigia', hash: 'SYBERWORK', view: [1400, 1400], canvas: '#c', grade: [1000, 0.06, 0.6, false],
    setup: async p => { await setControls(p, VESTIGIA); await p.waitForTimeout(600); await grown(p); await p.waitForTimeout(800); } },
  { name: 'vestigia-factory', work: 'vestigia', hash: 'FACTORY', view: [1400, 1400], canvas: '#c', grade: [1000, 0.06, 0.6, false],
    setup: async p => { await setControls(p, { ...VESTIGIA, zoom: 0.98 }); await p.waitForTimeout(600); await grown(p); await p.waitForTimeout(800); } },
  { name: 'interferentia-attest', work: 'interferentia', hash: 'ATTEST', view: [1400, 1400], canvas: '#c', grade: [1000, 0.06, 0.9, true],
    setup: async p => { await setControls(p, { palette: 3, warp: 0, width: 1.7, typeA: 0, typeB: 1, density: 1.5 }); await p.waitForTimeout(2500); } },
  { name: 'ostensoria-rise', work: 'ostensoria', hash: '', view: [1500, 1300], canvas: '#cv', grade: [1000, 0.2, 0.85, false], keepPage: true,
    setup: async p => {
      const idle = () => p.waitForFunction(() => !document.getElementById('btnRender').disabled, null, { timeout: 240000 });
      await p.fill('#seed', 'RISE'); await p.dispatchEvent('#seed', 'change'); await p.waitForTimeout(500); await idle();
      await p.selectOption('#palette', 'ice'); await p.waitForTimeout(500); await idle(); await p.waitForTimeout(500);
    } },
  { name: 'sophia-flyspace', work: 'sophia', hash: '', view: [1400, 1400], canvas: '#oracle', grade: [1000, 0.04, 0.8, true],
    setup: async p => { await p.mouse.move(700, 700); await p.waitForTimeout(6000); } },
  { name: 'civitas-services', work: 'civitas', hash: '7', view: [1800, 1000], canvas: '#stage', wide: [1600, 900, 0.03, 1.35],
    setup: async p => { await p.waitForTimeout(9000); } },
];
const HIDE = '#colophon,#panel,#keys,.engines-back,.panel,.title,#card,#oracle-cursor,#fallback{display:none!important}';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const path = join(resolve(enginesDir), decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!path.startsWith(resolve(enginesDir))) throw new Error('outside');
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' }); res.end(await readFile(path));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const port = server.address().port;

const want = only.length ? PLATES.filter(p => only.some(o => p.name.includes(o))) : PLATES;
if (!want.length) throw new Error(`engine-plates: no plate named ${only.join(', ')}`);
await mkdir(resolve(root, 'media/engines'), { recursive: true });
const tmp = await mkdtemp(join(tmpdir(), 'plates-'));
const { chromium } = createRequire(resolve(PW_DIR, 'package.json'))('playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const plate of want) {
    const page = await browser.newPage({ viewport: { width: plate.view[0], height: plate.view[1] }, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${port}/works/${plate.work}.html${plate.hash ? '#' + plate.hash : ''}`, { waitUntil: 'load' });
    if (!plate.keepPage) await page.addStyleTag({ content: HIDE });
    await plate.setup(page);
    const raw = join(tmp, `${plate.name}.png`);
    await page.locator(plate.canvas).screenshot({ path: raw });
    await page.close();
    const out = resolve(root, 'media/engines', `${plate.name}.webp`);
    const args = plate.wide ? ['--wide', ...plate.wide.map(String)] : [...plate.grade.slice(0, 3).map(String), ...(plate.grade[3] ? ['--round'] : [])];
    const { stdout } = await run('python3', [resolve(root, 'scripts/engine-grade.py'), raw, out, ...args]);
    console.log(stdout.trim());
  }
} finally {
  await browser.close(); server.close(); await rm(tmp, { recursive: true, force: true });
}
