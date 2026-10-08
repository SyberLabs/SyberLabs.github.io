// Generates llms.txt and llms-full.txt (https://llmstxt.org/) at the repository root, so coding agents
// can read what SyberLabs is and what each project has and has not shown.
// Every project claim comes from projects/site-data.js, and every page description from that page's own
// <meta name="description">: nothing here is hand-copied, so the files cannot say more than the site does.
// `node scripts/llms.mjs` rewrites both files; `node scripts/llms.mjs --check` changes nothing and fails if
// either is out of date (scripts/assemble-dist.sh runs it, so CI's `pnpm build:site` fails on drift).
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://syberlabs.io';
const dataFile = resolve(root, 'projects/site-data.js');
const { projects, siteMap } = await import(pathToFileURL(dataFile).href);

const abs = href => (href.startsWith('/') ? ORIGIN + href : href);
const decode = s => s.replace(/&(amp|lt|gt|quot|#39|apos);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'" }[e]));

// One-line description of a page on this site, read from the page itself.
async function describe(href) {
  if (href === '/kit/v2/') {
    // The kit is served as demo.html (see _redirects); its README is the description and is published next to it.
    const readme = await readFile(resolve(root, 'kit/v2/README.md'), 'utf8');
    const files = readme.match(/^Files: (.*)$/m);
    return `${readme.match(/^# (.*)$/m)[1]}. ${files ? `Files: ${files[1]}` : ''}`.trim();
  }
  const file = resolve(root, href.replace(/^\//, ''), 'index.html');
  if (!existsSync(file)) return null;
  const meta = (await readFile(file, 'utf8')).match(/<meta name="description" content="([^"]*)"/);
  return meta ? decode(meta[1]) : null;
}

// The evidence vocabulary, from the header comment of site-data.js.
const header = (await readFile(dataFile, 'utf8')).match(/^(?:\/\/.*\n)+/)[0].replace(/^\/\/ ?/gm, '').replace(/\s*\n\s*/g, ' ');
const discipline = header.slice(header.indexOf('Every project claim')).trim();

const homeDescription = await describe('/');
const source = p => p.facts.find(([k]) => k === 'Source')?.[1]?.href;
const sections = Object.fromEntries(siteMap.map(s => [s.title, s.items]));

// Pages that explain how SyberLabs builds. /stack/ is listed once its page exists.
const HOW = ['/approach/', '/stack/'];
const SKIP = new Set(['/', '/#about', '/kit/v2/', ...HOW, ...projects.map(p => `/projects/${p.slug}/`)]);

async function linkList(items) {
  const out = [];
  for (const it of items) {
    if (SKIP.has(it.href) || it.href.startsWith('mailto:')) continue;
    const local = it.href.startsWith('/') && !it.href.includes('.') ? await describe(it.href) : null;
    out.push(`- [${it.label}](${abs(it.href)}): ${local ?? it.note}`);
  }
  return out;
}

function projectSummary(p) {
  const lines = [`- [${p.name}](${ORIGIN}/projects/${p.slug}/): ${p.category}. ${p.intro}`,
    `  - Status: ${p.status.label}`,
    `  - Reflects: ${p.reflects}`];
  if (source(p)) lines.push(`  - Source: ${source(p)}`);
  if (p.live) lines.push(`  - Live: ${p.live.href} (${p.live.note})`);
  for (const [state, text] of p.evidence) lines.push(`  - Evidence, ${state}: ${text}`);
  return lines.join('\n');
}

const fact = v => (typeof v === 'string' ? v : `[${v.label}](${abs(v.href)})`);

// Every text field of a project. An unknown field fails the build rather than being dropped silently.
const RENDER = {
  slug: null, number: null, accent: null, name: null, category: null, reflects: null, status: null, intro: null,
  pageTitle: v => `Page title: ${v}`,
  headline: v => `Headline: ${v}`,
  summary: v => v,
  primary: v => `Primary link: [${v.label}](${abs(v.href)})`,
  secondary: v => `Secondary link: [${v.label}](${abs(v.href)})`,
  ghost: v => `Also: [${v.label}](${abs(v.href)})`,
  live: v => `Live at [${v.label}](${v.href}): ${v.note}`,
  video: v => `### ${v.title}\n\nVideo: ${abs(v.src)}\n\n${v.caption}`,
  why: v => `### ${v.title}\n\n${v.paragraphs.join('\n\n')}`,
  use: v => `### ${v.title}\n\n${v.note}\n\n${v.steps.map(([n, t, d]) => `- ${n}, ${t}: ${d}`).join('\n')}`,
  run: v => `### ${v.title}\n\n${v.note}\n\n\`\`\`\n$ ${v.command}\n${v.output}\n\`\`\`\n\n${v.caption}`,
  gallery: v => [`### ${v.eyebrow}: ${v.title}`, v.note, v.link && `Recording: [${v.link.label}](${abs(v.link.href)})`,
    v.items.map(i => `- ${i.label ? `${i.label}: ` : ''}${i.caption} (${abs(i.src)})`).join('\n')].filter(Boolean).join('\n\n'),
  map: v => `### ${v.title}\n\n${v.note}\n\nText version of the interactive map: ${v.fallback}`,
  design: v => `### ${v.title}\n\n${v.items.map(([t, d]) => `- ${t}: ${d}`).join('\n')}`,
  evidence: v => `### Evidence\n\n${v.map(([s, t]) => `- ${s}: ${t}`).join('\n')}`,
  facts: v => `### Facts\n\n${v.map(([k, x]) => `- ${k}: ${fact(x)}`).join('\n')}`,
};

function projectFull(p) {
  const parts = [`## ${p.name}: ${p.category}`,
    `Page: ${ORIGIN}/projects/${p.slug}/\nStatus: ${p.status.label}\nReflects: ${p.reflects}${source(p) ? `\nSource: ${source(p)}` : ''}`,
    p.intro];
  for (const [k, v] of Object.entries(p)) {
    if (!(k in RENDER)) throw new Error(`llms: projects/site-data.js field "${k}" (${p.slug}) has no renderer in scripts/llms.mjs`);
    if (RENDER[k]) parts.push(RENDER[k](v));
  }
  return parts.join('\n\n');
}

// The site-wide caveat that opens README.md, if there is one.
const readmeNote = ((await readFile(resolve(root, 'README.md'), 'utf8')).match(/^(?:> .*\n)+/) ?? [''])[0].trim();

const head = [
  '# SyberLabs',
  `> ${homeDescription}`,
  readmeNote,
  'This file is generated from the site’s own data (projects/site-data.js in github.com/SyberLabs/SyberLabs.github.io) by scripts/llms.mjs. '
    + `Each project line carries a "Reflects" stamp: the repository commit and date its claims were checked against. ${discipline}`,
].filter(Boolean).join('\n\n');

const whenTo = [
  '## When to use this file',
  '',
  '- Use it to learn what SyberLabs is, which projects exist, what state each one has reached, and where its page, source and live app are.',
  '- Use the "Reflects" commit as the version to read: for code-level questions, read the source repository at that commit (for example with a code index such as GitHits, where the repository is public).',
  '- Quote the evidence lines as written. A project that is implemented or tested is not thereby deployed or measured, and "not yet" lines are part of the claim.',
  `- Read the [full text](${ORIGIN}/llms-full.txt) for every field each project page shows, including demo captions and run output.`,
  '',
  '## When not to use this file',
  '',
  '- Do not treat it as newer than the Reflects stamp. If a repository has moved on, the repository is the authority for code and this file for what the site claims.',
  '- Do not infer capabilities, users, metrics or deployments that are not stated here; the site states its limits on purpose.',
  '- It describes a website. It is not an API, SDK or package, and it carries no credentials. Never send keys or private data to the contact address.',
].join('\n');

const kitSections = 'Sections: ' + [...(await readFile(resolve(root, 'kit/v2/README.md'), 'utf8')).matchAll(/^## (.*)$/gm)].map(m => m[1]).join(', ');

async function tail() {
  const how = [];
  for (const href of HOW) {
    // Listed only once the page exists in the repository, under its site-map label.
    const d = await describe(href);
    const item = siteMap.flatMap(s => s.items).find(i => i.href === href);
    if (d) how.push(`- [${item?.label ?? href}](${abs(href)}): ${d}`);
  }
  return [
    `## Research\n\n${(await linkList(sections.Research)).join('\n')}`,
    `## Design system\n\n- [Atlas kit v2](${ORIGIN}/kit/v2/): ${await describe('/kit/v2/')}\n- [Kit README](${ORIGIN}/kit/v2/README.md): ${kitSections}.`,
    `## How we build\n\n${how.join('\n')}`,
    `## Use now\n\n${(await linkList(sections.Use)).join('\n')}`,
    `## Contact\n\n${sections.Contact.map(it => `- [${it.label}](${abs(it.href)}): ${it.note}`).join('\n')}`,
    `## Optional\n\n${(await linkList(sections.Lab)).join('\n')}\n- [Full text for agents](${ORIGIN}/llms-full.txt): Every project field in one file.`,
  ].join('\n\n');
}

const rest = await tail();
const outputs = {
  'llms.txt': [head, whenTo, `## Projects\n\n${projects.map(projectSummary).join('\n')}`, rest].join('\n\n') + '\n',
  'llms-full.txt': [head, whenTo, '# Projects', ...projects.map(projectFull), rest].join('\n\n') + '\n',
};

const check = process.argv.includes('--check');
const stale = [];
for (const [name, text] of Object.entries(outputs)) {
  const file = resolve(root, name);
  if ((existsSync(file) ? await readFile(file, 'utf8') : null) === text) continue;
  stale.push(name);
  if (!check) await writeFile(file, text);
}
if (check && stale.length) {
  console.error(`llms: out of date, run \`node scripts/llms.mjs\`: ${stale.join(', ')}`);
  process.exit(1);
}
console.log(check ? 'llms: llms.txt and llms-full.txt up to date' : `llms: wrote ${stale.length ? stale.join(', ') : 'nothing (up to date)'}`);
