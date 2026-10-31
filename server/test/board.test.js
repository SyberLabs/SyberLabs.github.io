// Mission Control (/admin/board): the key and the sign-in redirect, each way the board can be missing or unreadable,
// a hostile board rendered escaped, the 36-hour stale warning, telemetry unknowns, shape drift, and the live checks
// through a stubbed fetch (all up, some down, every one hanging). No page carries a script.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, signIn, call, stubFetch, HOUR } from './helpers.js';
import { CHECKS, PROBE_TIMEOUT_MS, hasServerInfo } from '../probes.js';
import { BOARD_KEY, STALE_MS, repoName } from '../views/board.js';

const XSS = `<script>alert(1)</script>'"><img src=x>`;
const NOW = Date.UTC(2026, 9, 31, 12, 0);
const CANARY = 'response-body-canary';
const iso = ms => new Date(ms).toISOString();

const noRawXss = body => {
  assert.ok(!body.includes('<script>alert(1)'), 'raw <script> leaked');
  assert.ok(!body.includes('<img src=x>'), 'raw <img> leaked');
  assert.ok(!body.includes(`'"><img`), 'attribute breakout leaked');
};

// A KV binding holding one value (null: no such key). It records every read.
function kv(value) {
  const calls = [];
  return { calls, get: async (key, type) => { calls.push([key, type]); return value; } };
}

// Every host answering as production did on 2026-10-31, each body carrying the canary.
function production(req) {
  if (req.url === 'https://rise.syberlabs.io/api/mcp') {
    return Response.json({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'rise', version: '1.0.0' }, instructions: CANARY } });
  }
  if (req.url.startsWith('https://omni.syberlabs.io/api/')) return Response.json({ error: CANARY }, { status: 503 });
  return new Response(`<p>${CANARY}</p>`, { status: 200 });
}

// GET /admin/board with fetch stubbed; returns the response, its text and every request the checks made.
async function render(env, cookie, { fetch = production } = {}) {
  const stub = stubFetch(fetch);
  try {
    const res = await call(env, '/admin/board', { cookie, now: NOW });
    return { res, body: await res.text(), calls: stub.calls };
  } finally {
    stub.restore();
  }
}

const adminEnv = async overrides => {
  const env = makeEnv(overrides);
  const admin = await signIn(env.DB, { roles: ['role_admin'], now: NOW });
  return { env, cookie: admin.cookie };
};

// A board.v1 object with a hostile string in every field a person or commit can write.
function fixture(over = {}) {
  return {
    generatedAt: iso(NOW - 3 * HOUR),
    repo: 'SyberLabs/MasterMind',
    objective: { text: XSS, source: XSS },
    summary: { keysWaiting: 2, asksExpired: 1, gatesOpen: 1, gatesExpiredOrUnrunnable: 0, openDecisions: 1, malformed: 0,
      mergesWeek: 40, keyedWeek: 3, reposActive: 2, reposTotal: 3 },
    asks: [
      { id: 'ASK-010', key: XSS, owner: XSS, question: `Which stands? ${XSS}`, status: 'open', expires: '2026-11-02', daysLeft: 2,
        default: XSS, answer: null, options: [XSS, 'keep it'] },
      { id: 'ASK-011', key: 'keys', owner: 'Seth', question: 'Answered already', status: 'answered', expires: null, daysLeft: null,
        default: null, answer: { sha: 'abc1234', date: '2026-10-30', admittedBy: 'tester', decision: 'yes' }, options: [] },
    ],
    gates: [{ id: `G-${XSS}`, status: XSS, owner: XSS, expires: '2026-11-03', note: XSS, verdict: null },
      { id: 'G-PASSED', status: 'pass', owner: 'Mateo', expires: null, note: null, verdict: { verdict: 'pass', admittedBy: 'tester', sha: 'def5678' } }],
    decisions: [{ sha: '929bff9', pr: '61', date: '2026-10-17', decision: XSS, admittedBy: XSS, propagated: XSS, pending: [XSS] }],
    malformed: [{ sha: 'x', date: '2026-10-01', decision: XSS, problems: [XSS] }],
    advice: [{ sha: 'y', text: XSS }],
    portfolio: [
      { name: 'SyberLabs/RISE', layer: XSS, role: 'active', roleSource: XSS, pushedAt: '2026-10-30', note: XSS,
        counts: [0, 1, 2, 3, 4, 5, 6, 7], weeks: ['2026-W37', '2026-W38', XSS, '2026-W40', '2026-W41', '2026-W42', '2026-W43', '2026-W44'],
        total: 28, authors: [[XSS, 3], ['Test Author', 25]] },
      { name: `evil"/><script>alert(1)</script>`, layer: null, role: XSS, roleSource: '', pushedAt: null, note: null, counts: null, weeks: null, total: null, authors: [] },
      { name: 'javascript:alert(1)', layer: null, role: 'parked', roleSource: '', pushedAt: null, note: null, counts: null, weeks: null, total: null, authors: [] },
      { name: 'SyberLabs/..', layer: null, role: 'archived', roleSource: '', pushedAt: null, note: null, counts: null, weeks: null, total: null, authors: [] },
    ],
    telemetry: {
      generatedAt: iso(NOW - 3 * HOUR), window: XSS,
      metrics: [{ id: 'up', label: XSS, owner: XSS, value: 99.5, unit: XSS, basis: XSS, threshold: XSS, status: 'ok', reason: XSS }],
      incidents: [{ title: XSS, url: 'https://github.com/SyberLabs/SyberLabs.github.io/issues/190', openedAt: iso(NOW - HOUR), owner: XSS },
        { title: 'Phished', url: 'https://evil.example/issues/1' }],
    },
    ...over,
  };
}

// ---- access ------------------------------------------------------------------------------------------------

test('signed out, /admin/board 303s to sign-in; without site:board.read it is 403; neither runs a check or reads KV', async () => {
  const board = kv(JSON.stringify(fixture()));
  const env = makeEnv({ BOARD: board });
  const reader = await signIn(env.DB, { perms: ['site:changes.read', 'id:audit.read'], now: NOW });
  const stub = stubFetch(production);
  try {
    const out = await call(env, '/admin/board', { now: NOW });
    assert.equal(out.status, 303);
    assert.equal(out.headers.get('Location'), '/auth/signin?next=%2Fadmin%2Fboard');
    assert.equal(await out.text(), '');
    const denied = await call(env, '/admin/board', { cookie: reader.cookie, now: NOW });
    assert.equal(denied.status, 403);
    const body = await denied.text();
    assert.match(body, /This page is for people who can see Mission Control: the board and telemetry\./);
    assert.doesNotMatch(body, /<script/i);
    noRawXss(body);
    assert.equal(stub.calls.length, 0);
  } finally {
    stub.restore();
  }
  assert.equal(board.calls.length, 0);
});

test('admin and a role holding only site:board.read get 200, with Mission Control in the nav and on the launchpad', async () => {
  const env = makeEnv({ BOARD: kv(JSON.stringify(fixture())) });
  const holders = [await signIn(env.DB, { roles: ['role_admin'], now: NOW }), await signIn(env.DB, { perms: ['site:board.read'], now: NOW })];
  for (const { cookie } of holders) {
    const { res, body } = await render(env, cookie);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('Content-Security-Policy'), /default-src 'none'/);
    assert.match(body, /<title>Mission Control · SyberLabs staff<\/title>/);
    assert.match(body, /<h1 class="sy-display">Mission Control\.<\/h1>/);
    assert.match(body, /<a href="\/admin\/board" aria-current="page">[\s\S]*?<span>Mission Control<\/span><\/a>/);
    assert.match(body, /<span class="workspace-page-name">Mission Control<\/span>/);
    assert.doesNotMatch(body, /<script/i);
    const home = await (await call(env, '/admin/', { cookie, now: NOW })).text();
    assert.match(home, /<a class="portal-card portal-card--team" href="\/admin\/board">/);
  }
  const other = await signIn(env.DB, { perms: ['site:changes.read'], now: NOW });
  assert.doesNotMatch(await (await call(env, '/admin/', { cookie: other.cookie, now: NOW })).text(), /\/admin\/board/);
  // HEAD: GET's status and headers, no body.
  const stub = stubFetch(production);
  try {
    const head = await call(env, '/admin/board', { method: 'HEAD', cookie: holders[0].cookie, now: NOW });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
  } finally {
    stub.restore();
  }
});

// ---- no board ----------------------------------------------------------------------------------------------

test('no binding, no key, malformed JSON or a non-object: "not connected" with the three steps, and the checks still run', async () => {
  const cases = [
    [undefined, /This deployment has no <code>BOARD<\/code> KV binding\./],
    [{}, /This deployment has no <code>BOARD<\/code> KV binding\./],
    [kv(null), /The <code>BOARD<\/code> namespace holds no <code>board:v1<\/code> key yet\./],
    [kv('{"generatedAt": "2026-10-31T09:00:00Z", '), /The <code>board:v1<\/code> value is not a board\.v1 JSON object\./],
    [kv('[]'), /is not a board\.v1 JSON object\./],
    [kv('null'), /is not a board\.v1 JSON object\./],
    [kv('"text"'), /is not a board\.v1 JSON object\./],
  ];
  for (const [binding, reason] of cases) {
    const { env, cookie } = await adminEnv({ BOARD: binding });
    const { res, body, calls } = await render(env, cookie);
    assert.equal(res.status, 200);
    assert.match(body, /The board is not connected\./);
    assert.match(body, reason);
    const steps = body.match(/<ol class="board-steps">([\s\S]*?)<\/ol>/)[1];
    assert.equal(steps.match(/<li>/g).length, 3);
    assert.match(steps, /Seth creates a Workers KV namespace and adds its id to <code>wrangler\.toml<\/code> as <code>\[\[kv_namespaces\]\]<\/code> with <code>binding = "BOARD"<\/code>\./);
    assert.match(steps, /MasterMind gets the repository secrets <code>CLOUDFLARE_API_TOKEN<\/code> \(with Workers KV Storage: Edit\), <code>CLOUDFLARE_ACCOUNT_ID<\/code> and <code>BOARD_KV_NAMESPACE_ID<\/code>\./);
    assert.match(steps, /The daily ledger run then writes the board to <code>board:v1<\/code>, and it shows here\./);
    assert.doesNotMatch(body, /id="(?:telemetry|summary|asks|gates|decisions|portfolio)-h"/);
    assert.equal(calls.length, CHECKS.length, 'the live checks still run');
    assert.match(body, /8 of 8 checks up/);
    assert.doesNotMatch(body, /<script/i);
    if (binding && binding.calls) assert.deepEqual(binding.calls, [[BOARD_KEY, 'text']]);
  }
});

test('a KV read that throws renders the checks and a warning, never an error page, the exception or the steps', async () => {
  for (const get of [async () => { throw new Error(`KV_ERROR ${CANARY}`); }, () => { throw new Error(`KV_ERROR ${CANARY}`); }]) {
    const { env, cookie } = await adminEnv({ BOARD: { get } });
    const { res, body, calls } = await render(env, cookie);
    assert.equal(res.status, 200);
    assert.match(body, /The board could not be read from KV just now\. Reload in a minute\./);
    assert.doesNotMatch(body, /KV_ERROR|response-body-canary|not connected|board-steps/);
    assert.equal(calls.length, CHECKS.length);
    assert.doesNotMatch(body, /<script/i);
  }
});

// ---- the board -------------------------------------------------------------------------------------------

test('every board string is escaped, and a repository is linked only when its name is owner/repo', async () => {
  const { env, cookie } = await adminEnv({ BOARD: kv(JSON.stringify(fixture())) });
  const { res, body } = await render(env, cookie);
  assert.equal(res.status, 200);
  noRawXss(body);
  assert.doesNotMatch(body, /<script/i);
  assert.ok(body.includes('&lt;script&gt;alert(1)&lt;/script&gt;&#39;&quot;&gt;&lt;img src=x&gt;'));
  // Links go to GitHub only, built from owner/repo names, hex shas, numbers and issue URLs that pass their patterns.
  const links = [...body.matchAll(/href="(https?:[^"]*|javascript:[^"]*)"/g)].map(m => m[1]).filter(h => !h.startsWith('https://syberlabs.io'));
  assert.deepEqual([...new Set(links)].sort(), [
    'https://github.com/SyberLabs/MasterMind',
    'https://github.com/SyberLabs/MasterMind/commit/929bff9',
    'https://github.com/SyberLabs/MasterMind/pull/61',
    'https://github.com/SyberLabs/RISE',
    'https://github.com/SyberLabs/SyberLabs.github.io/issues/190',
  ]);
  assert.ok(body.includes('evil&quot;/&gt;&lt;script&gt;alert(1)&lt;/script&gt;'), 'an invalid name is text');
  assert.ok(body.includes('<p class="board-repo__name">javascript:alert(1)<span'), 'javascript: is text');
  assert.ok(body.includes('<p class="board-repo__name">SyberLabs/..<span'));
  assert.doesNotMatch(body, /evil\.example/);
  // Hostile words in badges stay text, and the badge's tone comes from this page, never from the board.
  assert.match(body, /class="sy-badge board-badge board-badge--muted">&lt;script&gt;/);
  assert.doesNotMatch(body, /board-badge--(?!good|bad|warn|info|muted)/);
  // Only open asks, soonest first; an answered ask is not waiting on a key.
  assert.match(body, /Which stands\? &lt;script&gt;/);
  assert.match(body, /2 days left/);
  assert.doesNotMatch(body, /Answered already/);
  // The sparkline: a stub for a zero week, the current week brighter, a title per week, every week in its label.
  assert.match(body, /<rect class="board-spark__zero" x="0" y="22" width="8" height="2"\/>/);
  assert.match(body, /<path class="board-spark__bar is-now" d="M70 24V2Q70 0 72 0H76Q78 0 78 2V24Z"\/>/);
  assert.match(body, /<title>&lt;script&gt;alert\(1\)&lt;\/script&gt;&#39;&quot;&gt;&lt;img src=x&gt;: 2 commits<\/title>/);
  assert.match(body, /aria-label="Commits per week, oldest first: 2026-W37 0, 2026-W38 1, &lt;script&gt;/);
  assert.match(body, /28 commits in 8 weeks/);
  assert.match(body, /No weekly counts: not cloned beside the ledger\./);
  // The objective, malformed entries and advice are not part of this page.
  assert.doesNotMatch(body, /id="objective|Malformed entries|Advice/);
  // Sections in the order Mission Control reads them.
  const order = ['live-h', 'board-h', 'telemetry-h', 'summary-h', 'asks-h', 'gates-h', 'decisions-h', 'portfolio-h'].map(id => body.indexOf(`id="${id}"`));
  assert.ok(order.every((at, i) => at > 0 && (i === 0 || at > order[i - 1])), String(order));
  assert.match(body, /<dt>Asks waiting on a key<\/dt><dd>2<\/dd>/);
  assert.match(body, /<dt>Repositories active<\/dt><dd>2 of 3<\/dd>/);
});

test('board.v1 freshness: past 36 hours the page says the board is stale and how old it is', async () => {
  for (const [age, stale, says] of [[35 * HOUR, false, /35 h 0 min ago/], [STALE_MS + 60000, true, /This board is stale: it is 36 h 1 min old/],
    [74 * HOUR, true, /This board is stale: it is 3 days 2 h old/]]) {
    const { env, cookie } = await adminEnv({ BOARD: kv(JSON.stringify(fixture({ generatedAt: iso(NOW - age) }))) });
    const { body } = await render(env, cookie);
    assert.equal(body.includes('This board is stale'), stale, String(age));
    assert.match(body, says);
    assert.match(body, new RegExp(`Computed <time datetime="${iso(NOW - age)}">`));
  }
  for (const generatedAt of [undefined, 'yesterday', 42, '']) {
    const { env, cookie } = await adminEnv({ BOARD: kv(JSON.stringify(fixture({ generatedAt }))) });
    const { body } = await render(env, cookie);
    assert.match(body, /This board has no valid <code>generatedAt<\/code>, so its age is unknown\./, String(generatedAt));
    assert.doesNotMatch(body, /This board is stale/);
  }
});

test('telemetry: an unknown metric shows its reason and never a value, not even 0; ok and breach show theirs', async () => {
  const telemetry = {
    generatedAt: iso(NOW - HOUR), window: '7 days',
    metrics: [
      { id: 'up', label: 'Up', owner: 'Seth', value: 99.5, unit: '%', basis: 'probe workflow', threshold: 'below 99% over 28 days', status: 'ok', reason: null },
      { id: 'used', label: 'Used', owner: 'Mateo', value: 0, unit: 'readings', basis: 'RISE', threshold: 'none yet', status: 'unknown', reason: 'Counts are not shipped yet.' },
      { id: 'shipped', label: 'Shipped', owner: 'Seth', value: 30, unit: 'h', basis: 'GitHub', threshold: 'above 24 h', status: 'breach', reason: 'Keyed median 30 h.' },
      { id: 'collisions', label: 'Collisions', value: null, status: 'unknown' },
      { id: 'drift', label: 'Drift', value: 0, unit: 'things', status: 'maybe', reason: 'A status this page does not know.' },
      { id: 'zero', label: 'Zero', value: 0, unit: 'collisions', status: 'ok' },
      'not a metric', null, 7, ['up'],
    ],
    incidents: [
      { title: 'Incident: omni-llm-off failing', url: 'https://github.com/SyberLabs/SyberLabs.github.io/issues/190', openedAt: iso(NOW - HOUR), owner: 'Mateo' },
      { title: 'Closed one', closedAt: iso(NOW - 2 * HOUR) },
      { title: 'Resolved one', state: 'resolved' },
    ],
  };
  const { env, cookie } = await adminEnv({ BOARD: kv(JSON.stringify(fixture({ telemetry }))) });
  const { body } = await render(env, cookie);
  const metrics = Object.fromEntries([...body.matchAll(/<li class="board-item board-metric">([\s\S]*?)<\/li>/g)]
    .map(m => [m[1].match(/<h3 class="board-metric__name">([^<]*)<\/h3>/)[1], m[1]]));
  assert.deepEqual(Object.keys(metrics), ['Up', 'Used', 'Shipped', 'Collisions', 'Drift', 'Zero']);
  for (const [name, reason] of [['Used', 'Counts are not shipped yet.'], ['Collisions', 'No reason given.'], ['Drift', 'A status this page does not know.']]) {
    const item = metrics[name];
    assert.match(item, /board-badge--muted">Unknown<\/span>/, name);
    assert.match(item, /<p class="board-metric__value is-unknown">Unknown<\/p>/, name);
    assert.match(item, new RegExp(`<p class="board-metric__reason">${reason.replace(/\./g, '\\.')}</p>`), name);
    assert.doesNotMatch(item, /\b0\b|readings|things/, `${name} shows no value`);
  }
  assert.match(metrics.Up, /board-badge--good">OK<\/span>/);
  assert.match(metrics.Up, /<p class="board-metric__value">99\.5 <span class="board-metric__unit">%<\/span><\/p>/);
  assert.match(metrics.Up, /<dt>Owner<\/dt><dd>Seth<\/dd><\/div><div><dt>Basis<\/dt><dd>probe workflow<\/dd><\/div><div><dt>Threshold<\/dt><dd>below 99% over 28 days<\/dd>/);
  assert.match(metrics.Shipped, /board-badge--bad">Breach<\/span>/);
  assert.match(metrics.Shipped, /30 <span class="board-metric__unit">h<\/span>/);
  assert.match(metrics.Shipped, /Keyed median 30 h\./);
  // A known zero is a real zero.
  assert.match(metrics.Zero, /<p class="board-metric__value">0 <span class="board-metric__unit">collisions<\/span><\/p>/);
  // Open incidents only.
  assert.match(body, /Incident: omni-llm-off failing <a href="https:\/\/github\.com\/SyberLabs\/SyberLabs\.github\.io\/issues\/190">Issue<\/a>/);
  assert.doesNotMatch(body, /Closed one|Resolved one/);
  assert.match(body, /Window: 7 days\./);

  for (const [t, says] of [[undefined, /This board carries no telemetry yet\./], [[1, 2], /This board carries no telemetry yet\./],
    [{ metrics: 'nope', incidents: { a: 1 } }, /No metrics in this telemetry\.[\s\S]*No open incidents\./]]) {
    const again = await adminEnv({ BOARD: kv(JSON.stringify(fixture({ telemetry: t }))) });
    assert.match((await render(again.env, again.cookie)).body, says);
  }
});

test('shape drift: wrong types and unknown keys render as absent, and the page never fails', async () => {
  const board = {
    generatedAt: iso(NOW - HOUR), extra: { nested: [1, 2] }, summary: 'x', asks: { a: 1 }, gates: null,
    decisions: [1, 'a', null, [], { decision: 7, sha: { x: 1 }, pr: 'abc', pending: 'x', propagated: 'NO' }],
    portfolio: [{ name: 42, counts: 'x', authors: 'x', role: { x: 1 } }, { name: 'SyberLabs/Flyspace', counts: [1, 'x', -3, null, 2], weeks: ['w1'] }],
    telemetry: { metrics: [{ status: 'ok', value: { x: 1 } }], incidents: [{ state: { x: 1 } }] },
  };
  const { env, cookie } = await adminEnv({ BOARD: kv(JSON.stringify(board)) });
  const { res, body } = await render(env, cookie);
  assert.equal(res.status, 200);
  assert.match(body, /This board has no summary counts\./);
  assert.match(body, /Nothing waits on a key\./);
  assert.match(body, /No gates in this board\./);
  assert.match(body, /<p class="board-item__title">7<\/p>/);
  assert.match(body, /board-badge--bad">Propagated: NO<\/span>/);
  assert.match(body, /<span>#abc<\/span>/, 'a pr that is not a number is text');
  assert.match(body, /<p class="board-metric__value">No value given<\/p>/);
  assert.match(body, /<h3 class="board-metric__name">Unnamed metric<\/h3>/);
  assert.match(body, /<p class="board-item__title">Incident<\/p>/);
  assert.match(body, /aria-label="Commits per week, oldest first: week 1 1, week 2 0, week 3 0, week 4 0, week 5 2"/);
  assert.match(body, /3 commits in 5 weeks/);
  assert.match(body, /<p class="board-repo__name">42<span class="sy-badge board-badge board-badge--muted">unknown<\/span>/);
  assert.doesNotMatch(body, /<script/i);
});

test('long lists are capped and say so; decisions come newest first', async () => {
  const decisions = Array.from({ length: 25 }, (_, i) => ({ sha: `aaaa${String(i).padStart(3, '0')}`, date: `2026-10-${String(i + 1).padStart(2, '0')}`, decision: `Decision ${i + 1}` }));
  const portfolio = Array.from({ length: 70 }, (_, i) => ({ name: `SyberLabs/repo-${i}`, role: 'active', counts: [1, 2, 3, 4, 5, 6, 7, 8] }));
  const { env, cookie } = await adminEnv({ BOARD: kv(JSON.stringify(fixture({ decisions, portfolio }))) });
  const { body } = await render(env, cookie);
  assert.match(body, /Showing 20 of 25\./);
  assert.match(body, /Showing 60 of 70\./);
  assert.ok(body.indexOf('Decision 25') < body.indexOf('Decision 24'), 'newest first');
  assert.doesNotMatch(body, /Decision 5</);
});

// ---- live checks -------------------------------------------------------------------------------------------

test('live checks: eight requests at once, no cookie or Origin, POST where the route takes it, an MCP initialize, no body shown', async () => {
  const { env, cookie } = await adminEnv({ BOARD: kv(null) });
  const { body, calls } = await render(env, cookie);
  assert.deepEqual(calls.map(c => `${c.method} ${c.url}`).sort(), [
    'GET https://omni.syberlabs.io/',
    'GET https://rise.syberlabs.io/',
    'GET https://sketch.syberlabs.io/',
    'POST https://omni.syberlabs.io/api/capability-broker',
    'POST https://omni.syberlabs.io/api/jev-persona',
    'POST https://omni.syberlabs.io/api/llm',
    'POST https://omni.syberlabs.io/api/registry-intent',
    'POST https://rise.syberlabs.io/api/mcp',
  ]);
  for (const c of calls) {
    assert.equal(c.headers.get('Cookie'), null, c.url);
    assert.equal(c.headers.get('Origin'), null, c.url);
    assert.equal(c.redirect, 'manual', c.url);
    assert.equal(c.headers.get('User-Agent'), 'SyberLabs-Mission-Control/1', c.url);
    if (!c.url.endsWith('/api/mcp')) assert.equal(await c.text(), '', `${c.url} sends no body`);
  }
  const mcp = calls.find(c => c.url.endsWith('/api/mcp'));
  assert.equal(mcp.headers.get('Content-Type'), 'application/json');
  assert.equal(mcp.headers.get('Accept'), 'application/json, text/event-stream');
  const rpc = await mcp.json();
  assert.deepEqual([rpc.jsonrpc, rpc.id, rpc.method, typeof rpc.params.protocolVersion], ['2.0', 1, 'initialize', 'string']);
  assert.ok(!body.includes(CANARY), 'no response body reaches the page');
  assert.match(body, /8 of 8 checks up, run as this page loaded at <time datetime="2026-10-31T12:00:00\.000Z">/);
  assert.match(body, /syberlabs\.io is not checked: it served this page\./);
  assert.equal(body.match(/board-badge--good">Up<\/span>/g).length, 8);
  assert.doesNotMatch(body, />Down</);
  for (const c of CHECKS) assert.match(body, new RegExp(`data-check="${c.id}"`));
  assert.match(body, /data-check="rise-mcp">[\s\S]*?200 with serverInfo, \d+\s?ms[\s\S]*?POST rise\.syberlabs\.io\/api\/mcp initialize, expects 200/);
  assert.match(body, /data-check="omni-llm">[\s\S]*?503, \d+\s?ms[\s\S]*?POST omni\.syberlabs\.io\/api\/llm, expects 503/);
});

test('live checks: a paid route answering, a connector without serverInfo, a redirect and an unreachable host each read as down', async () => {
  const { env, cookie } = await adminEnv({ BOARD: kv(null) });
  const { body } = await render(env, cookie, {
    fetch: req => {
      if (req.url.endsWith('/api/llm')) return new Response(CANARY, { status: 200 });
      if (req.url.endsWith('/api/mcp')) return Response.json({ jsonrpc: '2.0', id: 1, error: { code: -32600, message: CANARY } });
      if (req.url === 'https://omni.syberlabs.io/') return new Response(null, { status: 301, headers: { Location: 'https://example.test/' } });
      if (req.url === 'https://sketch.syberlabs.io/') throw new TypeError(`fetch failed ${CANARY}`);
      return production(req);
    },
  });
  const item = id => body.match(new RegExp(`<li class="board-probe([^"]*)" data-check="${id}">([\\s\\S]*?)</li>`)).slice(1).join('');
  assert.match(body, /4 of 8 checks up/);
  assert.match(item('omni-llm'), /^ is-down[\s\S]*board-badge--bad">Down<\/span><span>200, expected 503, \d+\s?ms/);
  assert.match(item('rise-mcp'), /^ is-down[\s\S]*<span>200 without serverInfo, \d+\s?ms/);
  assert.match(item('omni'), /^ is-down[\s\S]*<span>301, expected 200, \d+\s?ms/);
  assert.match(item('sketch'), /^ is-down[\s\S]*<span>Could not connect, \d+\s?ms/);
  assert.match(item('rise'), /^[\s\S]*board-badge--good">Up<\/span><span>200, \d+\s?ms/);
  assert.ok(!body.includes(CANARY), 'neither a body nor an exception message reaches the page');
  assert.doesNotMatch(body, /example\.test/);
});

test('live checks: the connector may answer as one SSE event', async () => {
  const { env, cookie } = await adminEnv({ BOARD: kv(null) });
  const { body } = await render(env, cookie, {
    fetch: req => (req.url.endsWith('/api/mcp')
      ? new Response(`event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: 1, result: { serverInfo: { name: 'rise' } } })}\n\n`, { headers: { 'Content-Type': 'text/event-stream' } })
      : production(req)),
  });
  assert.match(body, /8 of 8 checks up/);
});

test('every check and the KV read hanging: the page still renders in about 3 s, each check "No answer within 3 s"', async () => {
  const { env, cookie } = await adminEnv({ BOARD: { get: () => new Promise(() => {}) } });
  const started = Date.now();
  const { res, body, calls } = await render(env, cookie, { fetch: () => new Promise(() => {}) });
  const took = Date.now() - started;
  assert.equal(res.status, 200);
  assert.ok(took >= PROBE_TIMEOUT_MS - 20 && took < 3500, `took ${took} ms`);
  assert.equal(calls.length, CHECKS.length);
  assert.match(body, /0 of 8 checks up/);
  assert.equal(body.match(/No answer within 3\s?s/g).length, 8);
  assert.match(body, /The board could not be read from KV just now\./);
  for (const c of calls) assert.equal(c.signal.aborted, true, `${c.url} was aborted at its deadline`);
  assert.doesNotMatch(body, /<script/i);
});

// ---- units -------------------------------------------------------------------------------------------------

test('hasServerInfo: a JSON-RPC result with a serverInfo object, as JSON or an SSE data line, and nothing else', () => {
  const ok = JSON.stringify({ jsonrpc: '2.0', id: 1, result: { serverInfo: { name: 'rise' } } });
  assert.equal(hasServerInfo(ok), true);
  assert.equal(hasServerInfo(`event: message\ndata: ${ok}\n\n`), true);
  assert.equal(hasServerInfo(`event: message\r\ndata:${ok}\r\n\r\n`), true);
  for (const bad of ['', 'null', '7', '{}', '{"result":{}}', '{"result":{"serverInfo":"rise"}}', '{"result":{"serverInfo":null}}',
    '{"error":{"code":-32600}}', 'data: {"result":null}', '<html>serverInfo</html>']) {
    assert.equal(hasServerInfo(bad), false, bad);
  }
});

test('repoName: only owner/repo as GitHub spells them', () => {
  for (const good of ['SyberLabs/RISE', 'SyberLabs/SyberLabs.github.io', 'a/b_c-d.e', 'x-1/.github']) assert.equal(repoName(good), good);
  for (const bad of ['SyberLabs', 'SyberLabs/RISE/x', 'javascript:alert(1)', 'SyberLabs/..', 'SyberLabs/.', '-x/y', 'x/y z', '../etc',
    'https://github.com/x/y', 'x/y"', '/x', 'x/', 42, null, undefined]) assert.equal(repoName(bad), null, String(bad));
});
