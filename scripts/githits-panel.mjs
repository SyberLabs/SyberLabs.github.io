// GitHits dependency totals for /stack/, rendered at build time (scripts/prerender.mjs fills the
// <!-- stack:githits --> marker). Totals come from the same snapshots the product pages' dependency panels read
// (data/githits/<slug>.json, written by scripts/githits-snapshot.mjs; CI runs it before the build).
// Truth rules match those panels (projects/experience-v7.js): a fixture snapshot shows no numbers, and
// vulnerabilities are counted only if every package was checked, otherwise "not checked". Without a live snapshot
// the panel says so in one line: no empty table, no numbers. GitHits is a third-party tool we use: no logo, no
// partnership or endorsement wording. Styles live in stack/stack.css.
import { readFileSync, existsSync } from 'node:fs';
import { projects } from '../projects/site-data.js';

const esc = value => String(value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const file = name => { const path = new URL(`../data/githits/${name}.json`, import.meta.url); return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null; };

export function totals() {
  const index = file('index');
  const listed = new Set(Array.isArray(index?.projects) ? index.projects : []);
  const rows = projects.filter(p => listed.has(p.slug)).map(p => {
    const d = file(p.slug);
    const packages = Array.isArray(d?.packages) ? d.packages.filter(x => x && x.name) : [];
    const checked = packages.every(x => Array.isArray(x.vulnerabilities));
    return {
      slug: p.slug, name: p.name, accent: p.accent, href: `/projects/${p.slug}/#dependency-evidence`,
      live: d?.source === 'githits-api',
      packages: packages.length,
      affected: checked ? packages.filter(x => x.vulnerabilities.length).length : null,
      licenses: packages.map(x => x.license).filter(l => typeof l === 'string' && l),
    };
  });
  const live = index?.source === 'githits-api' && rows.length > 0 && rows.every(r => r.live);
  const all = rows.every(r => r.affected !== null);
  const date = new Date(index?.generatedAt);
  const valid = !Number.isNaN(date.getTime());
  return {
    live, rows,
    projects: rows.length,
    packages: rows.reduce((n, r) => n + r.packages, 0),
    affected: live && all ? rows.reduce((n, r) => n + r.affected, 0) : null,
    licenses: live ? new Set(rows.flatMap(r => r.licenses)).size : null,
    iso: valid ? date.toISOString() : null,
    day: valid ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : null,
  };
}

const ARROW = '<svg class="sy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path></svg>';

export function renderGitHits(g = totals()) {
  const day = g.day ? `<time dateTime="${esc(g.iso)}">${esc(g.day)}</time>`.replace('dateTime', 'datetime') : 'an unrecorded date';
  const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
  const row = r => !g.live ? 'Snapshot pending'
    : !r.packages ? 'No runtime dependencies declared'
    : `${plural(r.packages, 'package')} · ${r.affected === null ? 'vulnerabilities not checked' : r.affected ? `${r.affected} with known vulnerabilities` : 'known vulnerabilities: none reported'}`;
  const stats = [
    [g.packages, 'Packages checked', 'declared runtime dependencies'],
    [g.projects, 'Projects', 'each with a dependency panel'],
    [g.affected ?? 'Not checked', 'Known vulnerabilities', g.affected === null ? 'not every package was checked' : 'packages with advisories reported'],
    [g.licenses, 'Licenses', 'distinct, as GitHits reports them'],
  ];
  const body = g.live
    ? `<dl class="home-gh__stats">${stats.map(([value, term, note]) => `<div><dt class="sy-label">${esc(term)}</dt><dd><b class="${typeof value === 'number' ? '' : 'is-word'}">${esc(value)}</b><span>${esc(note)}</span></dd></div>`).join('')}</dl><ul class="home-gh__rows">${g.rows.map(r => `<li style="--sy-accent:${esc(r.accent)}"><a href="${esc(r.href)}"><span class="home-gh__name">${esc(r.name)}</span><span class="home-gh__val">${esc(row(r))}</span>${ARROW}</a></li>`).join('')}</ul><p class="sy-small home-gh__attr">Package data from GitHits, retrieved ${day}.</p>`
    : '<p class="home-gh__pending sy-label" role="note"><i aria-hidden="true"></i>No live GitHits snapshot has been published yet.</p>';
  return `<section class="stack-section" id="dependencies" aria-labelledby="dependencies-title"><div class="section-heading"><p class="eyebrow">DEPENDENCY CHECKS</p><h2 id="dependencies-title">What the panels report, across projects.</h2></div><div class="prose"><div class="home-gh__data" style="--sy-accent:var(--sy-ice)">${body}</div></div></section>`;
}
