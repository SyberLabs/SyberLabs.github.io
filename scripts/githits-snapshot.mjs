#!/usr/bin/env node
// GitHits dependency snapshot for the project pages.
//
//   node scripts/githits-snapshot.mjs --targets   regenerate data/githits/targets.json from the
//                                                 project manifests at each repo's default-branch
//                                                 head (needs network: GitHub; CI runs it per build)
//   node scripts/githits-snapshot.mjs             write data/githits/<slug>.json + index.json
//
// Truth rule (projects/site-data.js): nothing here is invented. targets.json records the exact
// manifest, the full commit it was read at (the repo's default-branch head when --targets ran, so
// the panel shows the dependencies the project ships today, not those of the page's older
// `reflects` commit; the panel names its own repo@commit), and
// where each version came from. Snapshot mode only copies fields GitHits returned; without
// GITHITS_API_TOKEN every GitHits-derived field is null and source is "fixture". A GitHits
// failure is recorded in errors[] and never fails the build: this script always exits 0 in
// snapshot mode.
//
// API: https://api.githits.dev/v1 (OpenAPI: https://api.githits.dev/v1/openapi.json).
// The token is read from the environment and is never written or printed.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'githits');
const TARGETS = join(OUT, 'targets.json');
const API = 'https://api.githits.dev/v1';
const CAP = 12;

// Direct runtime dependencies beyond the cap, dropped by hand as the least significant to what the
// project does (small UI/build utilities). Listed in targets.json under `omitted` so nothing is hidden.
const OMIT = {
  flyspace: ['clsx', 'cmdk', 'react-server-dom-webpack', 'remark-gfm', 'server-only', 'tailwind-merge'],
};

// ---------- --targets: read manifests at the default-branch head ----------

async function projectsFromSiteData() {
  const { projects } = await import(join(ROOT, 'projects', 'site-data.js'));
  return projects.map((p) => {
    const m = /^([\w.-]+)\/([\w.-]+)@([0-9a-f]{7,40})/.exec(p.reflects || '');
    if (!m) throw new Error(`${p.slug}: cannot parse reflects "${p.reflects}"`);
    return { slug: p.slug, repo: `${m[1]}/${m[2]}`, shortRef: 'HEAD' };
  });
}

async function get(url, as = 'text') {
  const headers = { 'user-agent': 'syberlabs-githits-snapshot' };
  if (process.env.GITHUB_TOKEN && url.startsWith('https://api.github.com/')) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return as === 'json' ? res.json() : res.text();
}

const raw = (repo, ref, path) => get(`https://raw.githubusercontent.com/${repo}/${ref}/${path}`);
const EXACT = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function pep508(spec) {
  const m = /^\s*([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[[^\]]*\])?\s*([^;]*)/.exec(spec);
  return m ? { name: m[1].toLowerCase(), constraint: m[2].trim() || null } : null;
}

// Minimal reader for `dependencies = [...]` inside the [project] table of a pyproject.toml.
function pyprojectDeps(toml) {
  const table = /^\[project\]\s*$([\s\S]*?)(?=^\[|(?![\s\S]))/m.exec(toml);
  if (!table) return [];
  const arr = /^dependencies\s*=\s*\[([\s\S]*?)\]/m.exec(table[1]);
  if (!arr) return [];
  return [...arr[1].matchAll(/"([^"]+)"|'([^']+)'/g)].map((m) => pep508(m[1] ?? m[2])).filter(Boolean);
}

async function buildTarget({ slug, repo, shortRef }) {
  const commit = await get(`https://api.github.com/repos/${repo}/commits/${shortRef}`, 'json');
  if (!commit?.sha) throw new Error(`${slug}: commit ${repo}@${shortRef} not found`);
  const ref = commit.sha;

  const pkgJson = await raw(repo, ref, 'package.json');
  if (pkgJson) {
    const deps = Object.entries(JSON.parse(pkgJson).dependencies || {});
    const lockText = await raw(repo, ref, 'package-lock.json');
    const lock = lockText ? JSON.parse(lockText).packages || {} : {};
    const omit = OMIT[slug] || [];
    const kept = deps.filter(([n]) => !omit.includes(n));
    if (kept.length > CAP) throw new Error(`${slug}: ${kept.length} runtime deps exceed cap ${CAP}; extend OMIT`);
    const packages = kept.map(([name, constraint]) => {
      const locked = lock[`node_modules/${name}`]?.version;
      if (locked) return { registry: 'npm', name, version: locked, constraint, versionSource: 'package-lock.json' };
      if (EXACT.test(constraint)) return { registry: 'npm', name, version: constraint, constraint, versionSource: 'manifest-exact' };
      return { registry: 'npm', name, version: constraint, constraint, versionSource: 'manifest-constraint' };
    });
    return { repo, ref, manifest: 'package.json', lockfile: lockText ? 'package-lock.json' : null,
      scope: 'package.json "dependencies" (devDependencies excluded)', packages,
      omitted: deps.filter(([n]) => omit.includes(n)).map(([name]) => name) };
  }

  const pyproject = await raw(repo, ref, 'pyproject.toml');
  if (pyproject) {
    const packages = pyprojectDeps(pyproject).map(({ name, constraint }) => ({
      registry: 'pypi', name, version: constraint ?? '', constraint,
      versionSource: constraint && /^==\s*[\w.]+$/.test(constraint) ? 'manifest-exact' : 'manifest-constraint',
    }));
    if (packages.length > CAP) throw new Error(`${slug}: ${packages.length} runtime deps exceed cap ${CAP}`);
    return { repo, ref, manifest: 'pyproject.toml', lockfile: null,
      scope: 'pyproject.toml [project] dependencies (optional-dependencies excluded)', packages, omitted: [] };
  }
  throw new Error(`${slug}: no package.json or pyproject.toml at ${repo}@${ref}`);
}

async function writeTargets() {
  const targets = {};
  for (const p of await projectsFromSiteData()) targets[p.slug] = await buildTarget(p);
  await mkdir(OUT, { recursive: true });
  await writeFile(TARGETS, JSON.stringify(targets, null, 2) + '\n');
  for (const [slug, t] of Object.entries(targets))
    console.log(`${slug}: ${t.repo}@${t.ref.slice(0, 7)} ${t.manifest} -> ${t.packages.length} packages`);
}

// ---------- snapshot: query GitHits ----------

// CVSS bands as documented by GitHits for the `min_severity` filter (VulnerabilitySeverity):
// low >= 0.1, medium >= 4, high >= 7, critical >= 9. Unknown score -> null.
function band(score) {
  if (typeof score !== 'number') return null;
  if (score >= 9) return 'critical';
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  if (score >= 0.1) return 'low';
  return 'none';
}

async function githits(token, label, path, params) {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
    signal: AbortSignal.timeout(30000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // ProblemResponse: { code, title, detail, status, ... }
    const why = body?.code ? `${body.code}: ${body.detail ?? body.title ?? ''}` : `HTTP ${res.status}`;
    throw new Error(`${label}: ${why}`.trim());
  }
  return body;
}

async function queryPackage(token, pkg, errors) {
  const id = `${pkg.registry}:${pkg.name}@${pkg.version}`;
  const base = `/packages/${encodeURIComponent(pkg.registry)}/${encodeURIComponent(pkg.name)}`;
  const version = pkg.version || undefined;
  const out = { license: null, latestVersion: null, directDependencies: null, vulnerabilities: null };
  const fail = (e) => errors.push({ package: id, message: String(e?.message || e) });

  // PackageInfoReport: package.latest_version, selected_version.license
  await githits(token, 'package', base, { version, fields: 'package,selected_version' }).then((r) => {
    out.license = r?.selected_version?.license ?? null;
    out.latestVersion = r?.package?.latest_version ?? null;
  }, fail);

  // DependencyReport: dependencies.direct.count (DependencyDirect)
  await githits(token, 'dependencies', `${base}/dependencies`, { version, fields: 'dependencies.direct' }).then((r) => {
    const n = r?.dependencies?.direct?.count;
    out.directDependencies = Number.isInteger(n) ? n : null;
  }, fail);

  // VulnerabilityReport: vulnerabilities.advisories.entries[] (VulnerabilityAdvisory), scope=affected
  await githits(token, 'vulnerabilities', `${base}/vulnerabilities`, { version, fields: 'vulnerabilities.summary,vulnerabilities.advisories' }).then((r) => {
    const adv = r?.vulnerabilities?.advisories;
    if (!adv || !Array.isArray(adv.entries)) return; // unavailable -> stays null (unknown), not []
    out.vulnerabilities = adv.entries
      .filter((a) => a.withdrawn_at == null)
      .map((a) => ({
        id: a.osv_id,
        severity: band(a.severity_score),
        summary: a.summary ?? null,
        url: a.osv_id ? `https://osv.dev/vulnerability/${encodeURIComponent(a.osv_id)}` : null,
      }));
    if (adv.page_info?.has_next_page)
      fail(`vulnerabilities: list truncated at ${adv.entries.length} of ${adv.page_info.total_count}`);
  }, fail);

  return out;
}

async function snapshot() {
  const token = process.env.GITHITS_API_TOKEN?.trim() || '';
  const source = token ? 'githits-api' : 'fixture';
  const generatedAt = new Date().toISOString();
  const targets = JSON.parse(await readFile(TARGETS, 'utf8'));
  await mkdir(OUT, { recursive: true });

  for (const [slug, t] of Object.entries(targets)) {
    const errors = [];
    const packages = [];
    for (const p of t.packages) {
      const g = token ? await queryPackage(token, p, errors)
        : { license: null, latestVersion: null, directDependencies: null, vulnerabilities: null };
      // GitHits documents no public per-package web page, so there is no URL to link.
      packages.push({ registry: p.registry, name: p.name, version: p.version, ...g, githitsUrl: null });
    }
    const vulnKnown = token && packages.every((p) => Array.isArray(p.vulnerabilities));
    const licensed = packages.filter((p) => p.license);
    const doc = {
      slug, generatedAt, source, apiBase: API, repo: t.repo, ref: t.ref, manifest: t.manifest,
      packages, omitted: t.omitted || [],
      summary: {
        packages: packages.length,
        withKnownVulnerabilities: vulnKnown ? packages.filter((p) => p.vulnerabilities.length > 0).length : null,
        licenses: token && (licensed.length || !packages.length)
          ? licensed.reduce((acc, p) => ((acc[p.license] = (acc[p.license] || 0) + 1), acc), {})
          : null,
      },
      errors,
    };
    await writeFile(join(OUT, `${slug}.json`), JSON.stringify(doc, null, 2) + '\n');
    console.log(`githits ${slug}: ${source}, ${packages.length} packages, ${errors.length} errors`);
  }
  await writeFile(join(OUT, 'index.json'),
    JSON.stringify({ generatedAt, source, projects: Object.keys(targets) }, null, 2) + '\n');
}

if (process.argv.includes('--targets')) {
  await writeTargets();
} else {
  try { await snapshot(); } catch (e) {
    console.error(`githits snapshot skipped: ${e?.message || e}`);
  }
}
