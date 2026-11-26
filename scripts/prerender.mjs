// Writes static HTML for the product pages and the /stack/ dependency totals into dist/, so their text is present
// without JavaScript (crawlers and link previews). The homepage and the overview page are written by the Vite build itself (vite.config.js).
// Run after `pnpm build` and scripts/assemble-dist.sh.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { renderGitHits } from './githits-panel.mjs';

const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function inject(file, markerRe, replacement) {
  const html = await readFile(file, 'utf8');
  if (!markerRe.test(html)) throw new Error(`prerender: marker not found in ${file}`);
  await writeFile(file, replacement(html));
}

// /stack/ carries the GitHits dependency totals, built from the same snapshots as the product pages' panels.
await inject(resolve('dist/stack/index.html'), /<!-- stack:githits -->/, html => html.replace('<!-- stack:githits -->', renderGitHits()));

const { projects, renderProject, renderSections, others } = await import(pathToFileURL(resolve('projects/project-template.js')).href);
for (const p of projects) {
  if (p.slug === 'rise') {
    // The RISE landing page is authored as static HTML; its sections below the hero come from the same data.
    await inject(resolve('dist/projects/rise/index.html'), /<!-- rise:sections -->/, html => html.replace('<!-- rise:sections -->', renderSections(p) + others(p)));
    continue;
  }
  const page = renderProject(p);
  // The social preview tags carry the same title and description as the page, and the card from scripts/og-cards.mjs.
  const image = `https://syberlabs.io/og/${p.slug}.png?v=20261113`;
  await inject(resolve(`dist/projects/${p.slug}/index.html`), /<div id="app"><\/div>/, html => html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(page.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(page.description)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(page.title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(page.description)}">`)
    .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${image}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(page.title)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(page.description)}">`)
    .replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${image}">`)
    .replace('<html lang="en">', `<html lang="en" style="--accent:${p.accent};--sy-accent:${p.accent}">`)
    .replace('<div id="app"></div>', `<div id="app">${page.body}</div>`));
}
console.log(`prerender: ${projects.length - 1} product pages, the RISE sections and the /stack/ dependency totals`);
