// Screenshot every page of the built site (dist/, served at BASE) at desktop and phone widths, with the
// WebGL field forced on (window.SY_ALLOW_SOFTWARE_GL) so the 3D layer renders under headless SwiftShader.
// Usage: node scripts/shoot.mjs [outDir] [BASE]   (needs a Playwright install; the RISE repo's is used by default)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(process.env.PW_REQUIRE_FROM || '/Users/sethcarlson/Documents/SyberLabs/repos/RISE/package.json');
const { chromium } = require('playwright');
const out = process.argv[2] || 'shots', BASE = process.argv[3] || 'http://localhost:4173';
mkdirSync(out, { recursive: true });
const pages = ['/', '/projects/rise/', '/projects/relay/', '/projects/commons/', '/approach/', '/services/', '/research/sybershoke/', '/kev/', '/jev/', '/rise-demo/', '/privacy/', '/404.html'];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
for (const [label, vp] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: label === 'phone', hasTouch: label === 'phone' });
  await ctx.addInitScript(() => { window.SY_ALLOW_SOFTWARE_GL = true; });
  for (const path of pages) {
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`${label} ${path}: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`${label} ${path}: console ${m.text().slice(0, 300)}`); });
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2600);
    const name = path.replace(/[\/.]+/g, '_').replace(/^_|_$/g, '') || 'home';
    await page.screenshot({ path: `${out}/${label}-${name}-top.png` });
    if (process.argv.includes('--full')) await page.screenshot({ path: `${out}/${label}-${name}-full.png`, fullPage: true });
    // mid-page: scroll a screen and a half so reveals, tilt cards and the field's scroll response are visible
    await page.mouse.wheel(0, vp.height * 1.5); await page.waitForTimeout(1400);
    await page.screenshot({ path: `${out}/${label}-${name}-mid.png` });
    if (path === '/' || path === '/projects/relay/') {
      await page.mouse.wheel(0, -99999); await page.waitForTimeout(400);
      await page.click('.sy-menu summary'); await page.waitForTimeout(900);
      await page.screenshot({ path: `${out}/${label}-${name}-atlas.png` });
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'no page errors');
