// /admin/board, Mission Control (site:board.read): live checks of the other production hosts, made as the page
// loads, then the board MasterMind computes each day (board.v1, MasterMind docs/contracts/board-v1.md), read from
// KV binding BOARD, key board:v1. The board is a snapshot, and every string in it is untrusted: each is escaped on
// output, and a repository is linked only when its name is owner/repo. Keys this page does not know are ignored;
// a missing value renders as absent, never as 0. Lists, not tables (RFC-0002 2.6), and no script.
import { esc, html } from '../http.js';
import { runProbes, PROBE_TIMEOUT_MS } from '../probes.js';
import { page, head, alert, time, duration } from './layout.js';

export const BOARD_KEY = 'board:v1';
export const STALE_MS = 36 * 3600 * 1000; // board.v1: a consumer that sees it older than 36 hours says so
const READ_TIMEOUT_MS = 3000; // the probes' budget, so a slow KV read cannot hold the page longer than they do
const DAY = 86400 * 1000;

// {state: 'ok', board}, or a state naming why there is none: unbound | missing | malformed | unreadable. The value is
// read as text and parsed here, so a bad value is told apart from a missing one.
export async function readBoard(env) {
  const kv = env.BOARD;
  if (!kv || typeof kv.get !== 'function') return { state: 'unbound' };
  let raw;
  let timer;
  try {
    raw = await Promise.race([
      kv.get(BOARD_KEY, 'text'),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), READ_TIMEOUT_MS); }),
    ]);
  } catch {
    return { state: 'unreadable' };
  } finally {
    clearTimeout(timer);
  }
  if (raw == null) return { state: 'missing' };
  let board;
  try { board = JSON.parse(raw); } catch { return { state: 'malformed' }; }
  return board && typeof board === 'object' && !Array.isArray(board) ? { state: 'ok', board } : { state: 'malformed' };
}

// ---- reading untrusted values: anything of another type reads as absent ------------------------------------

const text = v => (typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : '');
const number = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const objects = v => (Array.isArray(v) ? v.filter(x => x && typeof x === 'object' && !Array.isArray(x)) : []);
const strings = v => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);
const pick = (map, key) => (typeof key === 'string' && Object.hasOwn(map, key) ? map[key] : null);
// ISO 8601 only (board.v1 times are UTC ISO strings): Date.parse alone reads "42" as a year.
const when = v => {
  const ms = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? Date.parse(v) : NaN;
  return Number.isFinite(ms) ? ms : null;
};
const count = n => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const plural = (n, one) => `${count(n)} ${n === 1 ? one : `${one}s`}`;
const ago = ms => (ms >= 2 * DAY ? `${Math.floor(ms / DAY)} days ${Math.floor((ms % DAY) / 3600000)} h` : duration(ms));

// owner/repo as GitHub spells them. Anything else is shown as text, never linked.
const OWNER_REPO = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/(?!\.\.?$)[A-Za-z0-9._-]{1,100}$/;
const ISSUE_URL = /^https:\/\/github\.com\/[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9._-]{1,100}\/issues\/[1-9][0-9]{0,9}$/;
export const repoName = v => (typeof v === 'string' && OWNER_REPO.test(v) ? v : null);
const repoLink = v => (repoName(v) ? `<a href="https://github.com/${esc(v)}">${esc(v)}</a>` : esc(text(v)));

// A state is a word beside its colour (the kit's .sy-badge), never colour alone. tone: good | bad | warn | info | muted.
const badge = (tone, label) => `<span class="sy-badge board-badge board-badge--${tone}">${esc(label)}</span>`;

const section = (id, title, inner) => `<section class="staff-section board-section" aria-labelledby="${id}">
    <h2 class="sy-heading" id="${id}">${title}</h2>
    ${inner}
  </section>`;

// A list longer than the page should carry shows its first max items and says so.
const capped = (items, max) => ({ items: items.slice(0, max), total: items.length });
const more = ({ items, total }) => (total > items.length ? `<p class="sy-small">Showing ${items.length} of ${total}.</p>` : '');

// ---- live status ----------------------------------------------------------------------------------------------

// A number keeps its unit on its line (no-break space).
function result(p) {
  const ms = `${count(Math.round(p.ms))}\u00a0ms`;
  if (p.failure === 'timeout') return `No answer within ${PROBE_TIMEOUT_MS / 1000}\u00a0s`;
  if (p.failure === 'network') return `Could not connect, ${ms}`;
  if (p.failure === 'no_server_info') return `${p.status} without serverInfo, ${ms}`;
  if (p.failure === 'status') return `${p.status}, expected ${p.expect}, ${ms}`;
  return `${p.status}${p.initialize ? ' with serverInfo' : ''}, ${ms}`;
}

function liveSection(probes, now) {
  const up = probes.filter(p => p.up).length;
  const items = probes.map(p => `<li class="board-probe${p.up ? '' : ' is-down'}" data-check="${esc(p.id)}">
      <p class="board-probe__name">${esc(p.label)}</p>
      <p class="board-probe__result">${badge(p.up ? 'good' : 'bad', p.up ? 'Up' : 'Down')}<span>${esc(result(p))}</span></p>
      <p class="board-probe__target">${esc(p.method)} ${esc(p.url.replace(/^https:\/\//, ''))}${p.initialize ? ' initialize' : ''}, expects ${p.expect}</p>
    </li>`).join('');
  return section('live-h', 'Live status', `<p class="sy-small">${up} of ${probes.length} checks up, run as this page loaded at ${time(now)}. syberlabs.io is not checked: it served this page.</p>
    <ul class="board-probes">${items}</ul>`);
}

// ---- no board -----------------------------------------------------------------------------------------------

const REASONS = {
  unbound: 'This deployment has no <code>BOARD</code> KV binding.',
  missing: 'The <code>BOARD</code> namespace holds no <code>board:v1</code> key yet.',
  malformed: 'The <code>board:v1</code> value is not a board.v1 JSON object.',
};

const notConnected = state => section('board-h', 'Board', `<div class="board-connect">
      <p class="board-connect__title">The board is not connected.</p>
      <p class="sy-small">${REASONS[state]} Three steps connect it:</p>
      <ol class="board-steps">
        <li>Seth creates a Workers KV namespace and adds its id to <code>wrangler.toml</code> as <code>[[kv_namespaces]]</code> with <code>binding = "BOARD"</code>.</li>
        <li>MasterMind gets the repository secrets <code>CLOUDFLARE_API_TOKEN</code> (with Workers KV Storage: Edit), <code>CLOUDFLARE_ACCOUNT_ID</code> and <code>BOARD_KV_NAMESPACE_ID</code>.</li>
        <li>The daily ledger run then writes the board to <code>board:v1</code>, and it shows here.</li>
      </ol>
    </div>`);

// ---- the board, in the order Mission Control reads it ---------------------------------------------------------

function freshness(board, now) {
  const generated = when(board.generatedAt);
  const by = repoName(board.repo) ? `, by the ledger in ${repoLink(board.repo)}` : '';
  if (generated === null) {
    return `<p class="sy-small">Computed at an unknown time${by}.</p>
    ${alert('warning', 'This board has no valid <code>generatedAt</code>, so its age is unknown.')}`;
  }
  const age = now - generated;
  const line = `<p class="sy-small">Computed ${time(generated)}, ${esc(ago(age))} ago${by}. It is a snapshot: the commits behind it are the record.</p>`;
  return age > STALE_MS
    ? `${line}\n    ${alert('warning', `This board is stale: it is ${esc(ago(age))} old, and the daily ledger run should replace it within a day.`)}`
    : line;
}

const METRIC_STATES = { ok: ['good', 'OK'], breach: ['bad', 'Breach'] };

// Unknown is not zero (RFC 0004, principle 3): a metric that is not ok or breach shows "Unknown" and its reason,
// never its value field.
function metricItem(m) {
  const state = pick(METRIC_STATES, m.status);
  const unit = text(m.unit);
  const raw = number(m.value) !== null ? count(m.value) : text(m.value);
  const value = !state ? 'Unknown' : raw ? `${esc(raw)}${unit ? ` <span class="board-metric__unit">${esc(unit)}</span>` : ''}` : 'No value given';
  const reason = text(m.reason) || (state ? '' : 'No reason given.');
  const facts = [['Owner', m.owner], ['Basis', m.basis], ['Threshold', m.threshold]].filter(([, v]) => text(v))
    .map(([label, v]) => `<div><dt>${label}</dt><dd>${esc(text(v))}</dd></div>`).join('');
  return `<li class="board-item board-metric">
      <p class="board-item__meta">${state ? badge(...state) : badge('muted', 'Unknown')}</p>
      <h3 class="board-metric__name">${esc(text(m.label) || text(m.id) || 'Unnamed metric')}</h3>
      <p class="board-metric__value${state ? '' : ' is-unknown'}">${value}</p>${reason ? `
      <p class="board-metric__reason">${esc(reason)}</p>` : ''}${facts ? `
      <dl class="staff-dl board-dl">${facts}</dl>` : ''}
    </li>`;
}

const CLOSED = ['closed', 'resolved'];
const isOpen = i => !i.closedAt && !CLOSED.includes(text(i.state || i.status).toLowerCase());

function incidentItem(i) {
  const since = when(i.openedAt || i.since);
  const owner = text(i.owner);
  const issue = typeof i.url === 'string' && ISSUE_URL.test(i.url) ? ` <a href="${esc(i.url)}">Issue</a>` : '';
  return `<li class="board-item">
      <p class="board-item__meta">${badge('bad', 'Open')}${since !== null ? `<span>Since ${time(since)}</span>` : ''}${owner ? `<span>${esc(owner)}</span>` : ''}</p>
      <p class="board-item__title">${esc(text(i.title) || text(i.check) || text(i.id) || 'Incident')}${issue}</p>
    </li>`;
}

function telemetrySection(t) {
  if (!t || typeof t !== 'object' || Array.isArray(t)) {
    return section('telemetry-h', 'Telemetry', '<p class="sy-small">This board carries no telemetry yet.</p>');
  }
  const generated = when(t.generatedAt);
  const facts = [text(t.window) ? `Window: ${esc(text(t.window))}.` : '', generated !== null ? `Computed ${time(generated)}.` : ''].filter(Boolean).join(' ');
  const metrics = capped(objects(t.metrics), 20);
  const open = capped(objects(t.incidents).filter(isOpen), 20);
  return section('telemetry-h', 'Telemetry', `${facts ? `<p class="sy-small">${facts}</p>` : ''}
    ${metrics.items.length ? `<ul class="board-metrics">${metrics.items.map(metricItem).join('')}</ul>${more(metrics)}` : '<p class="sy-small">No metrics in this telemetry.</p>'}
    <h3 class="board-subhead">Open incidents</h3>
    ${open.items.length ? `<ul class="board-list">${open.items.map(incidentItem).join('')}</ul>${more(open)}` : '<p class="sy-small">No open incidents.</p>'}`);
}

// The producer's own counts, labelled as its artifact page labels them (MasterMind tools/ledger/lib/dashboard.mjs).
const TILES = [
  ['keysWaiting', 'Asks waiting on a key'],
  ['asksExpired', 'Asks whose default took effect'],
  ['gatesOpen', 'Gates open with a date'],
  ['gatesExpiredOrUnrunnable', 'Gates expired or unrunnable'],
  ['openDecisions', 'Direction entries owing propagation'],
  ['malformed', 'Malformed ledger entries'],
  ['mergesWeek', 'Commits this week, cloned repositories'],
  ['keyedWeek', 'Keyed commits this week'],
];

function summarySection(s) {
  const summary = s && typeof s === 'object' && !Array.isArray(s) ? s : {};
  const tiles = TILES.filter(([key]) => number(summary[key]) !== null).map(([key, label]) => [label, count(summary[key])]);
  if (number(summary.reposActive) !== null && number(summary.reposTotal) !== null) {
    tiles.push(['Repositories active', `${count(summary.reposActive)} of ${count(summary.reposTotal)}`]);
  }
  return section('summary-h', 'Summary', tiles.length
    ? `<dl class="board-tiles">${tiles.map(([label, value]) => `<div class="board-tile"><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`
    : '<p class="sy-small">This board has no summary counts.</p>');
}

function askItem(a) {
  const left = number(a.daysLeft);
  const due = left !== null ? (left <= 0 ? 'due today' : `${plural(left, 'day')} left`) : text(a.expires) ? `expires ${text(a.expires)}` : '';
  const options = strings(a.options);
  return `<li class="board-item">
      <p class="board-item__meta">${badge('info', text(a.key) || 'key')}${[a.id, a.owner, due].map(text).filter(Boolean).map(v => `<span>${esc(v)}</span>`).join('')}</p>
      <p class="board-item__title">${esc(text(a.question))}</p>${options.length ? `
      <ul class="board-options">${options.map(o => `<li>${esc(o)}</li>`).join('')}</ul>` : ''}
      <p class="sy-small">Default on silence: ${esc(text(a.default) || 'none stated')}</p>
    </li>`;
}

function asksSection(asks) {
  const waiting = objects(asks).filter(a => a.status === 'open')
    .sort((a, b) => (number(a.daysLeft) ?? 9e9) - (number(b.daysLeft) ?? 9e9));
  const shown = capped(waiting, 40);
  return section('asks-h', 'Waiting on a key', shown.items.length
    ? `<ul class="board-list">${shown.items.map(askItem).join('')}</ul>${more(shown)}`
    : '<p class="sy-small">Nothing waits on a key.</p>');
}

const GATE_TONES = { pass: 'good', fail: 'bad', open: 'info', expired: 'warn', unrunnable: 'warn', park: 'muted' };

function gateItem(g) {
  const v = g.verdict && typeof g.verdict === 'object' ? g.verdict : null;
  const verdict = v ? [text(v.verdict), text(v.admittedBy) && `by ${text(v.admittedBy)}`, text(v.sha) && `in ${text(v.sha)}`].filter(Boolean).join(' ') : '';
  const facts = [['Owner', text(g.owner)], ['Expires', text(g.expires)], ['Note', text(g.note) || verdict]].filter(([, value]) => value)
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('');
  return `<li class="board-item">
      <p class="board-item__meta">${badge(pick(GATE_TONES, g.status) || 'muted', text(g.status) || 'unknown')}<span class="board-item__id">${esc(text(g.id))}</span></p>${facts ? `
      <dl class="staff-dl board-dl">${facts}</dl>` : ''}
    </li>`;
}

function gatesSection(gates) {
  const shown = capped(objects(gates), 40);
  return section('gates-h', 'Gates', shown.items.length
    ? `<ul class="board-list board-gates">${shown.items.map(gateItem).join('')}</ul>${more(shown)}`
    : '<p class="sy-small">No gates in this board.</p>');
}

const PROPAGATED_TONES = { YES: 'good', NO: 'bad', PARTIAL: 'warn' };

function decisionItem(d, repo) {
  const sha = text(d.sha);
  const pr = text(d.pr);
  // Commit and pull links are built only from a valid owner/repo and a hex sha or a number.
  const commit = repo && /^[0-9a-f]{7,40}$/.test(sha) ? `<a href="https://github.com/${esc(repo)}/commit/${sha}">${sha}</a>` : esc(sha);
  const pull = repo && /^[1-9][0-9]{0,9}$/.test(pr) ? `<a href="https://github.com/${esc(repo)}/pull/${pr}">#${pr}</a>` : pr ? `#${esc(pr)}` : '';
  const pending = strings(d.pending);
  const by = text(d.admittedBy);
  return `<li class="board-item">
      <p class="board-item__meta">${text(d.propagated) ? badge(pick(PROPAGATED_TONES, d.propagated) || 'muted', `Propagated: ${text(d.propagated)}`) : ''}${[esc(text(d.date)), commit, pull].filter(Boolean).map(v => `<span>${v}</span>`).join('')}</p>
      <p class="board-item__title">${esc(text(d.decision))}</p>${by || pending.length ? `
      <p class="sy-small">${by ? `Admitted by ${esc(by)}.` : ''}${by && pending.length ? ' ' : ''}${pending.length ? `Still pending: ${esc(pending.join('; '))}.` : ''}</p>` : ''}
    </li>`;
}

function decisionsSection(decisions, repo) {
  const shown = capped(objects(decisions).sort((a, b) => text(b.date).localeCompare(text(a.date))), 20);
  return section('decisions-h', 'Recent decisions', shown.items.length
    ? `<p class="sy-small">Direction entries that still owe propagation, newest first.</p>
    <ul class="board-list">${shown.items.map(d => decisionItem(d, repoName(repo))).join('')}</ul>${more(shown)}`
    : '<p class="sy-small">Every direction entry has propagated.</p>');
}

// Eight weeks of commits as columns, oldest first, the current week brighter. Each column's <title> is its tooltip
// and the image's label lists every week, so the numbers need neither script nor a table.
const BAR = 8;
const GAP = 2;
const TALL = 24;

function spark(counts, weeks, total) {
  if (!Array.isArray(counts) || !counts.length) return '<span class="sy-small">No weekly counts: not cloned beside the ledger.</span>';
  const values = counts.slice(-8).map(c => (number(c) !== null && c > 0 ? c : 0));
  const named = Array.isArray(weeks) && weeks.length === counts.length;
  const names = values.map((_, i) => (named && text(weeks[weeks.length - values.length + i])) || `week ${i + 1}`);
  const max = Math.max(1, ...values);
  const width = values.length * BAR + (values.length - 1) * GAP;
  const columns = values.map((v, i) => {
    const x = i * (BAR + GAP);
    const h = v ? Math.max(3, Math.round((TALL * v) / max)) : 2;
    const y = TALL - h;
    const r = Math.min(2, h / 2);
    const mark = v
      ? `<path class="board-spark__bar${i === values.length - 1 ? ' is-now' : ''}" d="M${x} ${TALL}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + BAR - r}Q${x + BAR} ${y} ${x + BAR} ${y + r}V${TALL}Z"/>`
      : `<rect class="board-spark__zero" x="${x}" y="${TALL - 2}" width="${BAR}" height="2"/>`;
    return `<g><title>${esc(names[i])}: ${plural(v, 'commit')}</title><rect class="board-spark__hit" x="${x}" y="0" width="${BAR + GAP}" height="${TALL}"/>${mark}</g>`;
  }).join('');
  const label = `Commits per week, oldest first: ${values.map((v, i) => `${names[i]} ${count(v)}`).join(', ')}`;
  const sum = number(total) ?? values.reduce((a, b) => a + b, 0);
  return `<svg class="board-spark" viewBox="0 0 ${width} ${TALL}" width="${width}" height="${TALL}" role="img" aria-label="${esc(label)}">${columns}</svg><span class="sy-small">${plural(sum, 'commit')} in ${values.length} weeks</span>`;
}

const ROLE_ORDER = { active: 0, parked: 1, archived: 2, unknown: 3 };
const roleRank = r => pick(ROLE_ORDER, r.role) ?? 4;

function repoItem(r) {
  const role = text(r.role) || 'unknown';
  const facts = [text(r.layer), text(r.pushedAt) && `last push ${text(r.pushedAt)}`].filter(Boolean);
  const authors = (Array.isArray(r.authors) ? r.authors : []).filter(a => Array.isArray(a) && text(a[0]) && number(a[1]) !== null)
    .map(a => `${esc(text(a[0]))} ${count(a[1])}`).join(', ');
  return `<li class="board-item board-repo">
      <p class="board-repo__name">${repoLink(r.name) || 'Unnamed repository'}${badge(role === 'active' ? 'info' : 'muted', role)}</p>${facts.length ? `
      <p class="board-item__meta">${facts.map(f => `<span>${esc(f)}</span>`).join('')}</p>` : ''}${text(r.note) ? `
      <p class="sy-small">${esc(text(r.note))}</p>` : ''}
      <div class="board-activity">${spark(r.counts, r.weeks, r.total)}</div>${authors ? `
      <p class="sy-small">${authors}</p>` : ''}${text(r.roleSource) ? `
      <p class="sy-small">${esc(text(r.roleSource))}</p>` : ''}
    </li>`;
}

function portfolioSection(portfolio) {
  const sorted = objects(portfolio).sort((a, b) => (roleRank(a) - roleRank(b)) || text(b.pushedAt).localeCompare(text(a.pushedAt)));
  const shown = capped(sorted, 60);
  return section('portfolio-h', 'Portfolio', shown.items.length
    ? `<p class="sy-small">Commits per ISO week over eight weeks, for repositories cloned beside the ledger.</p>
    <ul class="board-list board-repos">${shown.items.map(repoItem).join('')}</ul>${more(shown)}`
    : '<p class="sy-small">No repositories in this board.</p>');
}

// GET /admin/board. The checks and the KV read run together, so the page waits at most PROBE_TIMEOUT_MS for both.
export async function boardPage(ctx) {
  const [probes, read] = await Promise.all([runProbes(), readBoard(ctx.env)]);
  const b = read.board;
  const board = read.state === 'ok'
    ? [section('board-h', 'Board', freshness(b, ctx.now)), telemetrySection(b.telemetry), summarySection(b.summary),
      asksSection(b.asks), gatesSection(b.gates), decisionsSection(b.decisions, b.repo), portfolioSection(b.portfolio)].join('\n  ')
    : read.state === 'unreadable'
      ? section('board-h', 'Board', alert('warning', 'The board could not be read from KV just now. Reload in a minute.'))
      : notConnected(read.state);
  const body = `${head('Staff', 'Mission Control.')}
  <p class="sy-small staff-lede">Live checks of the other production hosts, run as this page loads, then the board MasterMind computes each day.</p>
  ${liveSection(probes, ctx.now)}
  ${board}`;
  return html(page(ctx, { title: 'Mission Control', body, section: 'board' }));
}
