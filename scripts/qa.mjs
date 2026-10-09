#!/usr/bin/env node
// Quality sweep over the built site in dist/ (run after `pnpm build:site`; CI runs it in the validate job).
// Walks every dist/**/*.html and reports:
//   - internal links (href, src, poster, srcset) that resolve to no file in dist (a /x/ path means /x/index.html;
//     a path matched by a _redirects rule is a valid target)
//   - <img> without an alt attribute
//   - duplicate id attributes within one page
//   - heading-order jumps (h1 -> h3)
//   - external links that do not parse as http(s) URLs (syntax only; nothing is fetched)
//   - pages without <title>, meta description, canonical or an html lang (404.html and noindex pages skip the last two)
//   - <a target="_blank"> without rel="noopener"
//   - sitemap.xml URLs with no page, and pages (except 404.html and the kit demo) missing from the sitemap
//   - files the CI workflow tests for (`test -s dist/...`) that are missing
// Exits non-zero on broken internal links or missing files; everything else is a warning.
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { resolve, join, relative, posix } from 'node:path';

const root = resolve(process.argv[2] || 'dist');
const ORIGIN = 'https://syberlabs.io';
const SITEMAP_EXEMPT = new Set(['404.html', 'kit/v2/demo.html']);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function attrs(tag) {
  const out = {};
  const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`]+)))?/g;
  let m;
  const body = tag.replace(/^<\s*[a-zA-Z][\w:-]*/, '').replace(/\/?>$/, '');
  while ((m = re.exec(body))) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  return out;
}
function tags(html) {
  // Skip script, style and comment bodies so attribute-like text inside them is not read as markup.
  const stripped = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, m => m.replace(/>[\s\S]*</, '><'));
  const out = [];
  const re = /<([a-zA-Z][\w:-]*)\b([^>]*)>/g;
  let m;
  while ((m = re.exec(stripped))) out.push({ name: m[1].toLowerCase(), raw: m[0], attrs: attrs(m[0]), index: m.index });
  return out;
}

const redirects = existsSync(join(root, '_redirects'))
  ? (await readFile(join(root, '_redirects'), 'utf8')).split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => l.split(/\s+/)[0])
  : [];
const redirected = path => redirects.some(rule => rule.endsWith('/*') ? path.startsWith(rule.slice(0, -1)) || path === rule.slice(0, -2) : rule === path);

// Functions are valid navigation targets even though no static HTML is emitted.
const functionRoutes = existsSync(join(root, '_routes.json')) ? JSON.parse(await readFile(join(root, '_routes.json'), 'utf8')) : { include: [], exclude: [] };
const routeMatches = (rule, path) => rule.endsWith('*') ? path.startsWith(rule.slice(0, -1)) : path === rule;
const dynamicRoute = path => functionRoutes.include.some(rule => routeMatches(rule, path)) && !functionRoutes.exclude.some(rule => routeMatches(rule, path));

function resolves(target, fromFile) {
  // target is a path already stripped of query and hash
  let fsPath;
  if (target.startsWith('/')) fsPath = join(root, target);
  else fsPath = resolve(fromFile, '..', target);
  if (!fsPath.startsWith(root)) return false;
  if (existsSync(fsPath)) {
    const st = statSync(fsPath);
    if (st.isFile()) return true;
    if (st.isDirectory()) return target.endsWith('/') ? existsSync(join(fsPath, 'index.html')) : false;
  }
  return false;
}

const findings = [];   // { page, issue, fatal }
const report = (page, issue, fatal = false) => findings.push({ page, issue, fatal });

const pages = (await walk(root)).sort();
const pageUrls = new Set();
const ids = new Map();   // page -> Set of ids (for fragment checks)
const parsed = new Map();

for (const file of pages) {
  const rel = relative(root, file).split('\\').join('/');
  const html = await readFile(file, 'utf8');
  const list = tags(html);
  parsed.set(rel, { html, list });
  const idSet = new Set();
  const seen = new Map();
  for (const t of list) if (t.attrs.id !== undefined) {
    const id = t.attrs.id;
    seen.set(id, (seen.get(id) || 0) + 1);
    idSet.add(id);
  }
  ids.set(rel, idSet);
  for (const [id, n] of seen) if (n > 1) report(rel, `duplicate id "${id}" (${n} times)`);
  if (rel.endsWith('index.html')) pageUrls.add(`${ORIGIN}/${rel.slice(0, -'index.html'.length)}`);
}

for (const [rel, { html, list }] of parsed) {
  const file = join(root, rel);
  // Document metadata
  const htmlTag = list.find(t => t.name === 'html');
  if (!htmlTag || !htmlTag.attrs.lang) report(rel, 'html has no lang attribute');
  if (!/<title>[^<]+<\/title>/i.test(html)) report(rel, 'no <title>');
  // The 404 page and noindex pages (the kit demo) are not meant to be indexed, so they carry no description or canonical.
  const noindex = rel === '404.html' || list.some(t => t.name === 'meta' && (t.attrs.name || '').toLowerCase() === 'robots' && /\bnoindex\b/i.test(t.attrs.content || ''));
  if (!noindex && !list.some(t => t.name === 'meta' && (t.attrs.name || '').toLowerCase() === 'description' && t.attrs.content)) report(rel, 'no meta description');
  if (!noindex && !list.some(t => t.name === 'link' && /\bcanonical\b/i.test(t.attrs.rel || ''))) report(rel, 'no canonical link');

  // Images without alt
  for (const t of list) if (t.name === 'img' && t.attrs.alt === undefined) report(rel, `img without alt: ${t.attrs.src || t.raw.slice(0, 80)}`);

  // target=_blank without noopener
  for (const t of list) if (t.name === 'a' && (t.attrs.target || '').toLowerCase() === '_blank' && !/\bnoopener\b/i.test(t.attrs.rel || '')) report(rel, `target=_blank without rel=noopener: ${t.attrs.href}`);

  // Heading order
  let last = 0;
  for (const t of list) {
    const m = /^h([1-6])$/.exec(t.name);
    if (!m) continue;
    const level = +m[1];
    if (last && level > last + 1) report(rel, `heading jump h${last} -> h${level}: ${decode(html.slice(t.index + t.raw.length, t.index + t.raw.length + 160).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 70)}`);
    last = level;
  }

  // Internal links
  const refs = [];
  for (const t of list) {
    for (const key of ['href', 'src', 'poster']) if (t.attrs[key] !== undefined) refs.push([key, t.attrs[key]]);
    if (t.attrs.srcset) for (const part of t.attrs.srcset.split(',')) refs.push(['srcset', part.trim().split(/\s+/)[0]]);
  }
  for (const [key, rawValue] of refs) {
    const value = decode(rawValue).trim();
    if (!value || /^(mailto:|tel:|javascript:|data:|#$)/i.test(value)) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) {
      // External links are checked syntactically only (no network): they must parse as http(s) URLs.
      try {
        const u = new URL(value.startsWith('//') ? 'https:' + value : value);
        if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.') || /\s/.test(value)) report(rel, `malformed external link (${key}): ${value}`);
      } catch { report(rel, `malformed external link (${key}): ${value}`); }
      if (value.startsWith(ORIGIN + '/')) {
        // Absolute self-links behave like internal ones
        const path = value.slice(ORIGIN.length).split('#')[0].split('?')[0];
        if (!resolves(path, file) && !redirected(path) && !dynamicRoute(path)) report(rel, `broken internal link (${key}): ${value}`, true);
      }
      continue;
    }
    const [pathAndQuery, hash] = value.split('#');
    const path = pathAndQuery.split('?')[0];
    if (path === '') {
      if (hash && !ids.get(rel).has(hash)) report(rel, `fragment #${hash} not found on page`);
      continue;
    }
    if (!resolves(path, file)) {
      if (redirected(path)) continue;
      report(rel, `broken internal link (${key}): ${value}`, true);
      continue;
    }
    if (hash) {
      // Check the fragment on the target page when it is a page we parsed
      let target = path.startsWith('/') ? path.slice(1) : posix.join(posix.dirname(rel), path);
      if (target.endsWith('/') || target === '') target += 'index.html';
      const targetIds = ids.get(target);
      if (targetIds && !targetIds.has(hash)) report(rel, `fragment #${hash} not found on ${target}`);
    }
  }
}

// Sitemap
const sitemapFile = join(root, 'sitemap.xml');
if (existsSync(sitemapFile)) {
  const sitemap = await readFile(sitemapFile, 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  for (const loc of locs) if (!pageUrls.has(loc)) report('sitemap.xml', `sitemap URL has no page: ${loc}`, true);
  for (const [rel] of parsed) {
    if (SITEMAP_EXEMPT.has(rel) || !rel.endsWith('index.html')) continue;
    const url = `${ORIGIN}/${rel.slice(0, -'index.html'.length)}`;
    if (!locs.includes(url)) report('sitemap.xml', `page missing from sitemap: ${url}`);
  }
} else report('sitemap.xml', 'sitemap.xml missing from dist', true);

// Files the CI workflow tests for
const workflow = resolve('.github/workflows/cloudflare-pages.yml');
if (existsSync(workflow)) {
  const yml = await readFile(workflow, 'utf8');
  for (const m of yml.matchAll(/test -s (dist\/[^\s"]+)/g)) {
    if (!existsSync(resolve(m[1]))) report('ci', `file required by the workflow is missing: ${m[1]}`, true);
  }
  const loop = /for project in ([^;]+); do test -s "dist\/projects\/\$project\/index.html"/.exec(yml);
  if (loop) for (const p of loop[1].trim().split(/\s+/)) if (!existsSync(resolve(`dist/projects/${p}/index.html`))) report('ci', `file required by the workflow is missing: dist/projects/${p}/index.html`, true);
}

// Output
const fatal = findings.filter(f => f.fatal);
const warn = findings.filter(f => !f.fatal);
for (const f of findings) console.log(`${f.fatal ? 'ERROR' : 'warn '}  ${f.page}: ${f.issue}`);
console.log(`qa: ${pages.length} pages, ${fatal.length} errors, ${warn.length} warnings`);
process.exit(fatal.length ? 1 : 0);
