#!/usr/bin/env node
// Adds each local stylesheet's and script's content hash to the links that name it, in every page of dist/:
// href="/syberlabs.css" becomes href="/syberlabs.css?v=1a2b3c4d". A browser that has an older copy cached then asks
// for the new address, so a changed file is never hidden by a stale one, and nobody keeps version tokens by hand.
// Run last (scripts/assemble-dist.sh does). Files under /assets/ already carry a hash in their name. The game and
// the Lacuna pages are left alone: the game versions its own module graph (psycho-syber/README.md). ARENA
// (psycho-syber/arena/) is stamped like any other page: its scripts are classic ones that import nothing.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';

const root = resolve(process.argv[2] || 'dist');
const SKIP = ['psycho-syber/', 'lacuna/', 'media/', 'kit/', 'rise-demo/assets/'];
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.html') ? [join(dir, e.name)] : []);
const hashes = new Map();
const hashOf = file => { if (!hashes.has(file)) hashes.set(file, createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8)); return hashes.get(file); };

let links = 0, pages = 0;
for (const page of walk(root)) {
  const rel = relative(root, page).split('\\').join('/');
  if (SKIP.some(prefix => rel.startsWith(prefix)) && !rel.startsWith('psycho-syber/arena/')) continue;
  const html = readFileSync(page, 'utf8');
  const next = html.replace(/(<(?:link|script)\b[^>]*?\s(?:href|src)=")([^"?#:]+\.(?:css|js))(?:\?v=[^"#]*)?(")/g, (tag, before, url, after) => {
    if (url.startsWith('//') || url.startsWith('/assets/')) return tag;
    const file = url.startsWith('/') ? join(root, url) : resolve(dirname(page), url);
    if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) return tag;
    links++;
    return `${before}${url}?v=${hashOf(file)}${after}`;
  });
  if (next !== html) { writeFileSync(page, next); pages++; }
}
console.log(`stamp: ${links} links in ${pages} pages, ${hashes.size} files hashed`);
