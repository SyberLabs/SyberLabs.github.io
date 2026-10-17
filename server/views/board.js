// GET /admin/board: the SyberLabs board, rendered from the board.v1 JSON that MasterMind's daily
// ledger job writes to the BOARD KV namespace (MasterMind docs/contracts/board-v1.md). Script-free, like
// every staff page (RFC-0002 8.2): the portfolio filter is a query string, the bars are inline heights.
// Nothing here is written by hand on the site; a stale or missing board says so rather than guessing.
import { esc, html } from '../http.js';
import { head, alert, page } from './layout.js';

export const BOARD_KEY = 'board:v1';
const STALE_AFTER_MS = 36 * 3600 * 1000; // the job runs daily; two misses is stale
const LAYERS_MAX = 12;

const chip = (text, cls = '') => `<span class="board-chip${cls ? ` is-${esc(cls)}` : ''}">${esc(text)}</span>`;
const STATUS_CLASS = {
  open: 'open', expired: 'warn', answered: 'good', pass: 'good', fail: 'crit', park: 'warn', unrunnable: 'crit',
  active: 'good', parked: 'warn', archived: '', unknown: '', YES: 'good', NO: 'crit', PARTIAL: 'warn',
};
const status = s => chip(s, STATUS_CLASS[s] ?? '');

// Accepts only the shape the contract promises; anything else is "no board", never a crash.
export function validBoard(data) {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.generatedAt !== 'string' || !data.summary || typeof data.summary !== 'object') return false;
  return ['asks', 'gates', 'decisions', 'portfolio'].every(k => Array.isArray(data[k]));
}

export async function readBoard(env) {
  if (!env.BOARD || typeof env.BOARD.get !== 'function') return { state: 'unbound' };
  let data = null;
  try {
    data = await env.BOARD.get(BOARD_KEY, 'json');
  } catch {
    return { state: 'unavailable' };
  }
  if (!validBoard(data)) return { state: data ? 'invalid' : 'empty' };
  return { state: 'ok', data };
}

function tiles(s) {
  const t = [
    [s.keysWaiting, 'asks waiting on a key', s.keysWaiting ? 'hot' : ''],
    [s.asksExpired, 'asks whose default took effect', s.asksExpired ? 'warm' : ''],
    [s.gatesOpen, 'gates open with a date', ''],
    [s.gatesExpiredOrUnrunnable, 'gates expired or unrunnable', s.gatesExpiredOrUnrunnable ? 'warm' : ''],
    [s.openDecisions, 'direction entries owing propagation', ''],
    [s.mergesWeek, 'commits this week, cloned repos', ''],
    [s.keyedWeek, 'keyed commits this week', ''],
    [`${s.reposActive ?? 0} / ${s.reposTotal ?? 0}`, 'repositories active', ''],
  ];
  return `<div class="board-tiles">${t.map(([n, l, c]) => `<div class="board-tile${c ? ` is-${c}` : ''}"><span class="board-tile__n">${esc(n ?? 0)}</span><span class="board-tile__l">${esc(l)}</span></div>`).join('')}</div>`;
}

function asks(list) {
  const order = { open: 0, expired: 1, answered: 2 };
  const rows = [...list].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3) || ((a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9)));
  if (!rows.length) return '<div class="sy-empty staff-empty"><p>Nothing waits on a key.</p></div>';
  return `<ol class="board-asks">${rows.map(a => {
    const when = a.status === 'open' && a.daysLeft != null ? (a.daysLeft <= 0 ? 'due today' : `${a.daysLeft} day${a.daysLeft === 1 ? '' : 's'} left`) : a.expires ? `expires ${a.expires}` : '';
    const tail = a.status === 'answered' && a.answer
      ? `<p class="board-ask__d"><b>Answered</b> in ${esc(a.answer.sha)} by ${esc(a.answer.admittedBy)}: ${esc(a.answer.decision)}</p>`
      : `<p class="board-ask__d"><b>${a.status === 'expired' ? 'Default in force' : 'Default on silence'}:</b> ${esc(a.default || 'none stated')}</p>`;
    const opts = Array.isArray(a.options) && a.options.length ? `<ul class="board-ask__opts">${a.options.map(o => `<li>${esc(o)}</li>`).join('')}</ul>` : '';
    return `<li class="board-ask is-${esc(a.status)}"><div class="board-ask__head">${status(a.status)}<span>${esc(a.id)}</span><span>${esc(a.key)} · ${esc(a.owner)}</span><span>${esc(when)}</span></div><p class="board-ask__q">${esc(a.question)}</p>${opts}${tail}</li>`;
  }).join('')}</ol>`;
}

function gates(list) {
  if (!list.length) return '<div class="sy-empty staff-empty"><p>No gate files.</p></div>';
  return `<div class="board-scroll"><table class="board-table"><thead><tr><th>Gate</th><th>Status</th><th>Owner</th><th>Expires</th><th>Note</th></tr></thead><tbody>${list.map(g => {
    const note = g.note || (g.verdict ? `${g.verdict.verdict} by ${g.verdict.admittedBy} in ${g.verdict.sha}` : '');
    return `<tr><td class="board-mono">${esc(g.id)}</td><td>${status(g.status)}</td><td>${esc(g.owner || '')}</td><td class="board-mono">${esc(g.expires || '')}</td><td>${esc(note)}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function decisions(list) {
  if (!list.length) return '<div class="sy-empty staff-empty"><p>Every direction entry has propagated.</p></div>';
  return `<div class="board-scroll"><table class="board-table"><thead><tr><th>Date</th><th>Decision</th><th>Key</th><th>Propagated</th><th>Still pending</th></tr></thead><tbody>${list.map(e =>
    `<tr><td class="board-mono">${esc(e.date)}</td><td>${esc(e.decision)} <span class="board-sub">${esc(e.sha)}${e.pr ? ` · #${esc(e.pr)}` : ''}</span></td><td>${esc(e.admittedBy || '')}</td><td>${status(e.propagated)}</td><td>${esc((e.pending || []).join('; '))}</td></tr>`).join('')}</tbody></table></div>`;
}

function portfolio(list, layer) {
  const layers = [];
  for (const r of list) if (r.layer && !layers.includes(r.layer)) layers.push(r.layer);
  const filters = ['all', ...layers.slice(0, LAYERS_MAX)].map(l => {
    const current = l === layer;
    const href = l === 'all' ? '/admin/board#portfolio' : `/admin/board?layer=${encodeURIComponent(l)}#portfolio`;
    return `<a class="board-filter${current ? ' is-current' : ''}" href="${esc(href)}"${current ? ' aria-current="true"' : ''}>${esc(l)}</a>`;
  }).join('');
  const order = { active: 0, parked: 1, archived: 2, unknown: 3 };
  const rows = list.filter(r => layer === 'all' || r.layer === layer)
    .sort((a, b) => ((order[a.role] ?? 3) - (order[b.role] ?? 3)) || ((b.pushedAt || '') > (a.pushedAt || '') ? 1 : -1));
  const body = rows.map(r => {
    let bars = '';
    if (Array.isArray(r.counts) && r.counts.length) {
      const max = Math.max(1, ...r.counts.map(Number));
      const title = (r.weeks || []).map((w, i) => `${w}: ${r.counts[i]}`).join(', ');
      bars = `<span class="board-bars" title="${esc(title)}">${r.counts.map(c => `<i style="height:${Math.max(2, Math.round(26 * Number(c) / max))}px"${Number(c) === 0 ? ' class="is-zero"' : ''}></i>`).join('')}</span>`;
    }
    const who = (r.authors || []).map(a => `${esc(a[0])} ${esc(a[1])}`).join(', ');
    const name = String(r.name || '');
    const link = /^[\w.-]+\/[\w.-]+$/.test(name) ? `<a href="https://github.com/${esc(name)}">${esc(name)}</a>` : esc(name);
    return `<tr><td>${link}${r.note ? `<span class="board-sub">${esc(r.note)}</span>` : ''}</td><td>${esc(r.layer || '')}</td><td>${status(r.role)}<span class="board-sub">${esc(r.roleSource || '')}</span></td><td class="board-mono">${esc(r.pushedAt || '')}</td><td>${bars}</td><td class="board-mono">${r.total == null ? '' : esc(r.total)}</td><td class="board-sub">${who}</td></tr>`;
  }).join('');
  return `<nav class="board-filters" aria-label="Filter by layer">${filters}</nav>
  <div class="board-scroll"><table class="board-table"><thead><tr><th>Repository</th><th>Layer</th><th>Role</th><th>Last push</th><th>8 weeks</th><th>Commits</th><th>Who</th></tr></thead><tbody>${body || '<tr><td colspan="7">No repositories in this layer.</td></tr>'}</tbody></table></div>
  <p class="board-note">${rows.length} of ${list.length}. Bars are commits per ISO week; a repository with no bars was not cloned by the job. Role is computed from the last push unless a registry row overrides it.</p>`;
}

function section(id, title, count, innerHtml, intro = '') {
  return `<section class="staff-section board-section" id="${esc(id)}" aria-labelledby="${esc(id)}-h">
    <h2 class="sy-heading" id="${esc(id)}-h">${esc(title)}${count != null ? ` <span class="board-count">${esc(count)}</span>` : ''}</h2>
    ${intro ? `<p class="board-note">${intro}</p>` : ''}
    ${innerHtml}
  </section>`;
}

const NOTICE = {
  unbound: ['warning', 'The board is not connected: the <code>BOARD</code> KV namespace is not bound to this deployment.'],
  unavailable: ['warning', 'The board store did not answer. Try again in a moment.'],
  empty: ['neutral', 'The board has not been published yet. MasterMind’s daily <code>ledger</code> job writes it.'],
  invalid: ['warning', 'The published board is not in the <code>board.v1</code> shape and was not rendered.'],
};

export async function boardPage(ctx) {
  const read = await readBoard(ctx.env);
  const layerParam = ctx.url.searchParams.get('layer') || 'all';
  const layer = /^[\w-]{1,40}$/.test(layerParam) ? layerParam : 'all';
  let body;
  if (read.state !== 'ok') {
    const [kind, text] = NOTICE[read.state];
    body = `${head('Staff', 'Board.')}${alert(kind, text)}`;
  } else {
    const d = read.data;
    const generated = Date.parse(d.generatedAt);
    const stale = Number.isFinite(generated) && ctx.now - generated > STALE_AFTER_MS;
    const stamp = Number.isFinite(generated) ? new Date(generated).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : 'unknown time';
    const objective = d.objective && d.objective.text
      ? `<blockquote class="board-objective">${esc(d.objective.text).replace(/\n/g, '<br>')}${d.objective.source ? `<footer class="board-sub">${esc(d.objective.source)}</footer>` : ''}</blockquote>`
      : '<p class="board-note">No stance clone was beside the job; the objective lives in ontology/obsidian-vault/stance/.</p>';
    body = `${head('Staff', 'Board.')}
    <p class="board-stamp">Computed ${esc(stamp)} from git, gates, asks and the registry. Nothing here is written by hand.</p>
    ${stale ? alert('warning', `This board is older than a day and a half (${esc(stamp)}). The daily job may have failed.`) : ''}
    ${objective}
    ${tiles(d.summary)}
    ${section('keys', 'Your keys', `${d.asks.filter(a => a.status === 'open').length} open`, asks(d.asks), 'Questions only a human can answer. Each has a default that takes effect on its date; answering is one commit with <code>Resolves:</code> and your handle.')}
    ${section('gates', 'Gates', d.gates.length, gates(d.gates))}
    ${section('decisions', 'Open decisions', d.decisions.length, decisions(d.decisions), 'Direction entries that still owe propagation. A surface is done when the named file changed after the decision; prose surfaces cannot be checked and say so.')}
    ${section('portfolio', 'Portfolio', d.portfolio.length, portfolio(d.portfolio, layer))}`;
  }
  return html(page(ctx, { title: 'Board', body, section: 'board' }));
}
