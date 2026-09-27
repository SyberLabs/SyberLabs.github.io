// One header and footer for every static page, generated from projects/project-template.js
// (the same source as the project pages; the homepage renders the same markup in React).
// Each page marks the regions:  <!-- shell:header current=work --> … <!-- /shell:header -->
//                               <!-- shell:footer current=/services/ --> … <!-- /shell:footer -->
// `node scripts/shell.mjs` rewrites the regions in place; `--check` fails if any page is out of date (CI).
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { header, footer } from '../projects/project-template.js';

export const pages = ['404.html', 'approach/index.html', 'jev/index.html', 'privacy/index.html',
  'research/jev-execution/index.html', 'rise-demo/index.html', 'services/index.html'];

const indent = (html, pad) => html.split('\n').map(line => line ? pad + line : line).join('\n');
const region = /([ \t]*)<!-- shell:(header|footer) current=(\S*) -->[\s\S]*?<!-- \/shell:\2 -->/g;

export function applyShell(html, file = 'page') {
  let found = 0;
  const out = html.replace(region, (_m, pad, kind, current) => {
    found += 1;
    const body = (kind === 'header' ? header : footer)(current);
    return `${pad}<!-- shell:${kind} current=${current} -->\n${indent(body.trim(), pad)}\n${pad}<!-- /shell:${kind} -->`;
  });
  if (found !== 2) throw new Error(`shell: ${file} needs one header and one footer region (found ${found})`);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = resolve(fileURLToPath(import.meta.url), '../..');
  const check = process.argv.includes('--check');
  const stale = [];
  for (const page of pages) {
    const file = resolve(root, page);
    const html = await readFile(file, 'utf8');
    const next = applyShell(html, page);
    if (next === html) continue;
    stale.push(page);
    if (!check) await writeFile(file, next);
  }
  if (check && stale.length) {
    console.error(`shell: out of date, run \`node scripts/shell.mjs\`: ${stale.join(', ')}`);
    process.exit(1);
  }
  console.log(check ? `shell: ${pages.length} pages up to date` : `shell: updated ${stale.length} of ${pages.length} pages`);
}
