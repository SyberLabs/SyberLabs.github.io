// Writes static HTML for the homepage and project pages into dist/ so their text is
// present without JavaScript (crawlers, link previews, applicant-tracking tools).
// Run after `pnpm build` and scripts/assemble-dist.sh. The client scripts take over on load.
import { readFile, writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function inject(file, markerRe, replacement) {
  const html = await readFile(file, 'utf8');
  if (!markerRe.test(html)) throw new Error(`prerender: marker not found in ${file}`);
  await writeFile(file, replacement(html));
}

const { render } = await import(pathToFileURL(resolve('dist-ssr/entry-server.js')).href);
await inject(resolve('dist/index.html'), /<div id="root"><\/div>/, html => html.replace('<div id="root"></div>', `<div id="root">${render()}</div>`));
await rm('dist-ssr', { recursive: true, force: true });

const { projects, renderProject } = await import(pathToFileURL(resolve('projects/project-template.js')).href);
for (const p of projects) {
  if (p.slug === 'rise') continue; // The RISE landing page is authored as static HTML.
  const page = renderProject(p);
  await inject(resolve(`dist/projects/${p.slug}/index.html`), /<div id="app"><\/div>/, html => html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(page.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(page.description)}">`)
    .replace('<html lang="en">', `<html lang="en" style="--accent:${p.accent};--sy-accent:${p.accent}">`)
    .replace('<div id="app"></div>', `<div id="app">${page.body}</div>`));
}
console.log(`prerender: homepage and ${projects.length - 1} project pages (RISE is static)`);
