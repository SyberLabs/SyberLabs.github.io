// One header and footer for every static page, generated from projects/project-template.js (the same source
// as the project pages; the homepage renders the same markup in React from projects/site-data.js).
// `node scripts/site-chrome.mjs` rewrites the chrome in place after a navigation change.
// `node scripts/site-chrome.mjs --check` changes nothing and fails if any page is out of date (run in CI).
// The header keeps each page's current nav item (its aria-current) and skip-link target; the footer marks
// the link to the page itself.
import { readFile, writeFile } from 'node:fs/promises';
import { header, footer } from '../projects/project-template.js';

const pages = ['404.html', 'approach/index.html', 'stack/index.html', 'jev/index.html', 'kev/index.html', 'privacy/index.html',
  'rise-demo/index.html', 'services/index.html', 'plus/index.html', 'review/index.html', 'review/2026-10-08/index.html', 'research/index.html', 'research/jev-execution/index.html', 'research/sybershoke/index.html',
  'research/decision-arena/index.html',
  'projects/rise/index.html'];

const HEADER = /<a class="sy-skip" href="#(\w+)">Skip to content<\/a>\s*(?:<div class="sy-field-host"[\s\S]*?<\/div>\s*)?<header class="sy-header[\s\S]*?<\/header>(?:\s*<script type="module" src="\/syberlabs\.js"><\/script>)?/;
const FOOTER = /<footer class="sy-footer[\s\S]*?<\/footer>/;

function applyChrome(html, file) {
  const head = HEADER.exec(html);
  if (!head || !FOOTER.test(html)) throw new Error(`site-chrome: ${file} needs a skip link, header and footer`);
  const current = (head[0].match(/aria-current="page">(\w+)</) || [])[1]?.toLowerCase() || '';
  const self = file.endsWith('/index.html') ? `/${file.slice(0, -'index.html'.length)}` : '';
  return html
    .replace(HEADER, () => header(current).replace('href="#main"', `href="#${head[1]}"`))
    .replace(FOOTER, () => footer(self));
}

const check = process.argv.includes('--check');
const stale = [];
for (const file of pages) {
  const html = await readFile(file, 'utf8');
  const next = applyChrome(html, file);
  if (next === html) continue;
  stale.push(file);
  if (!check) await writeFile(file, next);
}
if (check && stale.length) {
  console.error(`site-chrome: out of date, run \`node scripts/site-chrome.mjs\`: ${stale.join(', ')}`);
  process.exit(1);
}
console.log(check ? `site-chrome: ${pages.length} pages up to date` : `site-chrome: updated ${stale.length} of ${pages.length} pages`);
