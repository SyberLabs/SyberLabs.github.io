// GitHits on the homepage: totals computed at build time from the same snapshots the project pages read
// (data/githits/<slug>.json, written by scripts/githits-snapshot.mjs; CI runs it before `pnpm build`).
// Vite inlines the JSON into both the client and the SSR bundle, so the prerendered numbers and the hydrated
// numbers are the same. Truth rules match the project panels (projects/experience-v7.js): a fixture snapshot
// shows no numbers; vulnerabilities are counted only if every package was checked, otherwise "not checked".
import { projects } from '../projects/site-data.js';

const files = import.meta.glob(['../data/githits/*.json', '!../data/githits/targets.json'], { eager: true, import: 'default' });
const file = name => files[`../data/githits/${name}.json`] || null;

const index = file('index');
const listed = new Set(Array.isArray(index?.projects) ? index.projects : []);

const rows = projects
  .filter(p => listed.has(p.slug))
  .map(p => {
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

export const githits = {
  live,
  rows,
  projects: rows.length,
  packages: rows.reduce((n, r) => n + r.packages, 0),
  affected: live && all ? rows.reduce((n, r) => n + r.affected, 0) : null,
  licenses: live ? new Set(rows.flatMap(r => r.licenses)).size : null,
  iso: Number.isNaN(date.getTime()) ? null : date.toISOString(),
  day: Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
};
