/* The factory's live numbers (src/App.jsx Factory). Each [data-stat] tile carries its baked-in snapshot as
   text and as data-count; this fills it from the public GitHub REST API after load, one request per tile
   (search with per_page=1, read total_count). Unauthenticated: 60 requests an hour per IP, and a failed or
   rate-limited request leaves the snapshot in place. The tile's [data-stat-src] caption says which it is.
   Nothing here blocks render, and the count-up (site.js counters) still runs once, on reveal, from
   whatever number the tile holds when it scrolls in. */
const API = 'https://api.github.com';
const day = ms => new Date(Date.now() - ms).toISOString().slice(0, 10);
const WEEK = 7 * 86400e3, DAY = 86400e3;

const search = q => `${API}/search/issues?q=${encodeURIComponent(q)}&per_page=1`;
const queries = {
  'merged-7d': () => [search(`org:SyberLabs is:pr is:merged merged:>=${day(WEEK)}`), r => r.total_count],
  'reviewed-7d': () => [search(`org:SyberLabs is:pr commenter:chatgpt-codex-connector[bot] created:>=${day(WEEK)}`), r => r.total_count],
  'merged-24h': () => [search(`org:SyberLabs is:pr is:merged merged:>=${day(DAY)}`), r => r.total_count],
  repos: () => [`${API}/orgs/SyberLabs`, r => r.public_repos],
};

async function fetchStat(name) {
  const [url, pick] = queries[name]();
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const n = pick(await res.json());
  if (!Number.isFinite(n)) throw new Error(`no number in ${url}`);
  return n;
}

export function factoryStats(root = document) {
  const tiles = [...root.querySelectorAll('[data-stat]')].filter(t => queries[t.dataset.stat]);
  if (!tiles.length || typeof fetch !== 'function') return;
  const run = () => tiles.forEach(tile => fetchStat(tile.dataset.stat).then(n => {
    const num = tile.querySelector('[data-count]'), src = tile.querySelector('[data-stat-src]');
    if (num) { num.dataset.count = String(n); num.textContent = String(n); }
    if (src) { src.textContent = 'live · from GitHub'; src.classList.add('is-live'); }
  }).catch(() => {}));
  if (document.readyState === 'complete') run(); else addEventListener('load', run, { once: true });
}
