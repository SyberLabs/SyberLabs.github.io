// Project pages ship prerendered HTML (scripts/prerender.mjs) so their text is readable
// without JavaScript. This module renders only as a fallback when the page arrives empty,
// then draws the project sigils (kit/v2/syber-sigil.js) as they scroll into view, and fills
// the dependency evidence panel. The hand-authored RISE page has no #app; it loads this module
// only for that panel (see renderSections in project-template.js).
import { projects, renderProject } from './project-template.js';
import { drawAll } from '../kit/v2/syber-sigil.js';

const slug = location.pathname.split('/').filter(Boolean).at(-1);
const p = projects.find(item => item.slug === slug);
const app = document.getElementById('app');
if (!p) location.replace('/');
else {
  if (app) {
    document.documentElement.style.setProperty('--accent', p.accent);
    document.documentElement.style.setProperty('--sy-accent', p.accent);
    if (!app.firstElementChild) {
      const page = renderProject(p);
      document.title = page.title;
      document.querySelector('meta[name="description"]').content = page.description;
      app.innerHTML = page.body;
    }
    drawAll(app);
    document.querySelector('.sy-menu nav')?.addEventListener('click', event => {
      if (event.target.closest('a')) event.currentTarget.closest('details').open = false;
    });
  }
}

// ---------- Dependency evidence ----------
// The project's declared packages as GitHits reported them, from /githits/<slug>.json (a snapshot made at build
// time). Progressive enhancement: a missing file, a failed fetch or an unexpected shape leaves the host hidden.
// Truth rules: null means "not checked" and shows as an em dash; an empty vulnerability list is "None reported
// by GitHits on <date>", never "no vulnerabilities"; a fixture snapshot says plainly that GitHits has not been asked.

// Vite's dev server defines import.meta.env; the deployed file is copied as is, where it is undefined.
const DEV = !!import.meta.env?.DEV;

async function loadDependencies(name) {
  // Deployed at /githits/ (copied from data/githits/); `pnpm dev` serves the repository root, so there it is the source path.
  const url = `${DEV ? '/data/githits/' : '/githits/'}${encodeURIComponent(name)}.json`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok || !/json/i.test(res.headers.get('content-type') || '')) return null;
    const data = await res.json();
    return data && data.slug === name && Array.isArray(data.packages) ? data : null;
  } catch { return null; } // offline or not JSON: render nothing
}

async function mountDependencies(host) {
  if (host.dataset.state) return;
  host.dataset.state = 'loading';
  const data = await loadDependencies(host.dataset.githits);
  if (!data) { host.dataset.state = 'none'; return; }
  try {
    host.innerHTML = renderDependencies(data);
    host.hidden = false;
    host.dataset.state = 'ready';
  } catch { host.innerHTML = ''; host.hidden = true; host.dataset.state = 'none'; }
}

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = url => typeof url === 'string' && /^https:\/\/[^\s"'<>]+$/.test(url) ? url : null;
const isoDay = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10); };
const ext = '<svg class="sy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7"/><path d="M8 7h9v9"/></svg>';
const link = (href, text, cls = 'pj-deps__link') => href ? `<a class="${cls}" href="${esc(href)}" rel="noopener">${text}${ext}</a>` : text;
// An absent value: a dash on screen, words for a screen reader.
const missing = (why = 'not reported') => `<span class="pj-deps__na" aria-hidden="true">—</span><span class="sy-sr">${why}</span>`;
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

const SEVERITY = ['critical', 'high', 'moderate', 'medium', 'low'];
const severityOf = v => { const s = String(v?.severity || '').toLowerCase(); return SEVERITY.includes(s) ? s : 'unrated'; };
const severityLevel = s => s === 'critical' || s === 'high' ? 'high' : s === 'moderate' || s === 'medium' ? 'moderate' : s === 'low' ? 'low' : 'unrated';

function vulnerabilityCell(list, fixture) {
  if (!Array.isArray(list)) return missing('not checked');
  if (!list.length) return '<span class="pj-deps__none">None reported</span>';
  const counts = {};
  for (const v of list) { const s = severityOf(v); counts[s] = (counts[s] || 0) + 1; }
  const order = [...SEVERITY, 'unrated'].filter(s => counts[s]);
  const worst = severityLevel(order[0]);
  const ids = list.map(v => v?.id ? link(safeUrl(v.url), esc(v.id), 'pj-deps__id') : '').filter(Boolean);
  return `<span class="pj-deps__vuln is-${worst}"><i aria-hidden="true"></i><b>${list.length}</b> <span>${order.map(s => `${counts[s]} ${s}`).join(', ')}</span></span>${ids.length && !fixture ? `<span class="pj-deps__ids">${ids.join(' ')}</span>` : ''}`;
}

function packageRow(pkg) {
  const name = `${esc(pkg.name)}${pkg.version ? `<span class="pj-deps__ver">@${esc(pkg.version)}</span>` : ''}`;
  const latest = pkg.latestVersion
    ? `<span class="pj-deps__mono${pkg.version && pkg.latestVersion !== pkg.version ? ' is-newer' : ''}">${esc(pkg.latestVersion)}</span>`
    : missing();
  return `<tr>
    <th scope="row"><span class="pj-deps__pkg">${link(safeUrl(pkg.githitsUrl), name)}</span>${pkg.registry ? `<span class="pj-deps__registry">${esc(pkg.registry)}</span>` : ''}</th>
    <td>${pkg.license ? `<span class="pj-deps__mono">${esc(pkg.license)}</span>` : missing()}</td>
    <td>${latest}</td>
    <td>${vulnerabilityCell(pkg.vulnerabilities, false)}</td>
  </tr>`;
}

function renderDependencies(data) {
  const fixture = data.source !== 'githits-api';
  const day = isoDay(data.generatedAt);
  const dayHtml = day ? `<time class="sy-nowrap" datetime="${esc(data.generatedAt)}">${day}</time>` : 'an unrecorded date';
  const packages = data.packages.filter(pkg => pkg && pkg.name);
  const total = packages.length;

  // Where the list came from: the manifest, at a named repository and ref.
  const ref = typeof data.ref === 'string' ? data.ref : '';
  const shortRef = /^[0-9a-f]{40}$/i.test(ref) ? ref.slice(0, 7) : ref;
  const repoOk = typeof data.repo === 'string' && /^[\w.-]+\/[\w.-]+$/.test(data.repo);
  const manifest = typeof data.manifest === 'string' ? data.manifest : '';
  const where = repoOk ? `${esc(data.repo)}${shortRef ? `@${esc(shortRef)}` : ''}` : '';
  const whereHref = repoOk && ref && manifest ? `https://github.com/${data.repo}/blob/${encodeURIComponent(ref)}/${manifest.split('/').map(encodeURIComponent).join('/')}` : null;
  const source = `${manifest ? `<code class="pj-deps__code">${esc(manifest)}</code>` : 'The manifest'}${where ? ` at ${link(whereHref, `<span class="pj-deps__mono">${where}</span>`)}` : ''}`;

  // The summary is computed from the rows shown, so it can never say more than the table does.
  const checked = packages.filter(pkg => Array.isArray(pkg.vulnerabilities));
  const affected = checked.filter(pkg => pkg.vulnerabilities.length);
  let finding;
  if (fixture) finding = 'Licenses, latest versions and known vulnerabilities have not been checked yet.';
  else if (!checked.length) finding = 'Known vulnerabilities were not checked.';
  else {
    const partial = checked.length < total;
    finding = affected.length
      ? `${plural(affected.length, 'package')} with known vulnerabilities reported by GitHits on ${dayHtml}${partial ? `, of ${checked.length} checked` : ''}.`
      : `Known vulnerabilities: none reported by GitHits on ${dayHtml}${partial ? ` for the ${plural(checked.length, 'package')} checked` : ''}.`;
    if (partial) finding += ` ${plural(total - checked.length, 'package')} not checked.`;
  }
  const licenses = data.summary?.licenses && typeof data.summary.licenses === 'object' && !fixture
    ? Object.entries(data.summary.licenses).filter(([, n]) => Number.isFinite(n)).sort((a, b) => b[1] - a[1]) : [];
  // Optional: runtime dependencies left out of the lookup, named so nothing is hidden.
  const omitted = Array.isArray(data.omitted) ? data.omitted.filter(n => typeof n === 'string') : [];
  const errors = Array.isArray(data.errors) ? data.errors.filter(e => e && (e.package || e.message)) : [];

  const attribution = !total ? `Read from the manifest; snapshot made ${dayHtml}.` : fixture
    ? `Package data will come from ${link('https://githits.com/', 'GitHits')}; until it is fetched this panel shows only what the manifest declares. Snapshot made ${dayHtml}.`
    : `Package data from ${link('https://githits.com/', 'GitHits')}, retrieved ${dayHtml}. A dash means GitHits reported no value or the package was not checked.`;

  return `<div class="pj-split pj-split--facts">
    <h2 id="deps-title" class="sy-eyebrow pj-facts__label">Dependency evidence</h2>
    <div class="pj-split__main pj-deps__main">
      <p class="sy-small pj-deps__source">${total ? source : `No runtime dependencies declared in ${source}.`}</p>
      ${fixture && total ? '<p class="pj-deps__pending sy-label" role="note"><i aria-hidden="true"></i>Snapshot pending — GitHits data not yet fetched; showing manifest only</p>' : ''}
      ${total ? `<div class="pj-deps__scroll" role="region" aria-labelledby="deps-caption" tabindex="0">
        <table class="pj-deps__table">
          <caption id="deps-caption" class="pj-deps__caption">${plural(total, 'runtime dependency', 'runtime dependencies')} from ${manifest ? esc(manifest) : 'the manifest'}${where ? ` at ${where}` : ''}</caption>
          <thead><tr><th scope="col">Package</th><th scope="col">License</th><th scope="col">Latest</th><th scope="col">Known vulnerabilities</th></tr></thead>
          <tbody>${packages.map(packageRow).join('')}</tbody>
        </table>
      </div>` : ''}
      ${total ? `<p class="pj-deps__summary">${plural(total, 'package')}. ${finding}</p>` : ''}
      ${omitted.length ? `<p class="sy-small pj-deps__omitted">Not looked up: ${omitted.map(n => `<span class="pj-deps__mono">${esc(n)}</span>`).join(', ')}.</p>` : ''}
      ${licenses.length ? `<p class="sy-small pj-deps__licenses">Licenses: ${licenses.map(([k, n]) => `<span class="pj-deps__mono">${esc(k)}</span> ${n}`).join(' · ')}</p>` : ''}
      ${errors.length ? `<p class="sy-small pj-deps__errors">GitHits returned no data for ${errors.map(e => `<span class="pj-deps__mono">${esc(e.package || 'a package')}</span>${e.message ? ` (${esc(e.message)})` : ''}`).join(', ')}.</p>` : ''}
      <p class="sy-small pj-deps__attr">${attribution}</p>
    </div>
  </div>`;
}

if (p) document.querySelectorAll('[data-githits]').forEach(mountDependencies);
