// Writes the shared v2 header and footer (projects/project-template.js) into the static pages,
// so every page carries identical chrome. Run after changing navigation: `node scripts/site-chrome.mjs`.
import { readFile, writeFile } from 'node:fs/promises';
import { header, footer } from '../projects/project-template.js';

const pages = ['approach/index.html', 'commons/index.html', 'jev/index.html', 'rise-demo/index.html', 'services/index.html', 'research/jev-execution/index.html'];

for (const file of pages) {
  let html = await readFile(file, 'utf8');
  const current = (html.match(/<header[\s\S]*?aria-current="page">(\w+)</) || [])[1]?.toLowerCase() || '';
  const skip = /<a class="sy-skip" href="#(\w+)">Skip to content<\/a>\s*/.exec(html);
  const target = skip ? skip[1] : 'main';
  html = html.replace(/<a class="sy-skip"[^>]*>Skip to content<\/a>\s*/, '');
  html = html.replace(/<header class="sy-header[\s\S]*?<\/header>/, header(current).replace('href="#main"', `href="#${target}"`));
  html = html.replace(/<footer class="sy-footer[\s\S]*?<\/footer>/, footer());
  await writeFile(file, html);
  console.log(`site-chrome: ${file}${current ? ` (current: ${current})` : ''}`);
}
