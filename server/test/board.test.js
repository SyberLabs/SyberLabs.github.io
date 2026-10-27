// The board page: needs site:board.read, renders board.v1 from the BOARD KV namespace, says plainly when
// the namespace is unbound, empty, invalid or stale, escapes everything, and filters the portfolio by a
// query string (no script runs on staff pages, RFC-0002 8.2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { call, makeEnv, signIn } from './helpers.js';
import { BOARD_KEY, validBoard } from '../views/board.js';

const XSS = '<img src=x onerror=alert(1)>';

function kv(value) {
  return { get: async (key, type) => (key === BOARD_KEY && type === 'json' ? value : null) };
}

const BOARD = {
  generatedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  repo: 'SyberLabs/MasterMind',
  objective: { text: '1. RISE Composer\n2. Flyspace\n3. SyberSDK', source: 'stance, locked 2026-10-04' },
  summary: { keysWaiting: 2, asksExpired: 1, gatesOpen: 2, gatesExpiredOrUnrunnable: 3, openDecisions: 4, malformed: 1, mergesWeek: 40, keyedWeek: 0, reposActive: 12, reposTotal: 43 },
  asks: [
    { id: 'ASK-009', key: 'keys', owner: 'Mateo', question: `Send Composer to the five experts ${XSS}`, status: 'open', expires: '2026-10-31', daysLeft: 14, default: 'Contact stays parked', options: ['send this week', 'hold'] },
    { id: 'ASK-001', key: 'direction', owner: 'Mateo', question: 'Layer 1 definition', status: 'open', expires: '2026-10-22', daysLeft: 5, default: 'Composer is layer 1' },
    { id: 'ASK-003', key: 'direction', owner: 'Mateo', question: 'OmniOS #71', status: 'expired', expires: '2026-10-05', default: 'reconstruct' },
    { id: 'ASK-002', key: 'direction', owner: 'Mateo', question: 'Canonical store', status: 'answered', answer: { sha: 'abc1234', admittedBy: 'sykosyber', decision: 'RISE docs are canonical' } },
  ],
  gates: [
    { id: 'G-COMPOSER-HOST', status: 'open', owner: 'Mateo', expires: '2026-10-22', note: null },
    { id: 'G-RELAY-PILOT', status: 'expired', owner: 'Seth', expires: '2026-10-08', note: 'on_expiry in force: halt stands' },
    { id: 'G-X', status: 'pass', owner: 'Mateo', expires: null, verdict: { verdict: 'pass', admittedBy: 'sykosyber', sha: 'def5678' } },
  ],
  decisions: [{ sha: '929bff9', pr: '61', date: '2026-10-17', decision: 'Rebirth', admittedBy: '', propagated: 'PARTIAL', pending: ['README.md (pending)'] }],
  portfolio: [
    { name: 'SyberLabs/RISE', layer: 'experience', role: 'active', roleSource: 'computed: last push 2026-10-17, 400 commits in 8 weeks', pushedAt: '2026-10-17', counts: [10, 105, 217, 68, 0, 0, 0, 0], weeks: ['W39', 'W40', 'W41', 'W42', 'W43', 'W44', 'W45', 'W46'], total: 400, authors: [['Mateo Robles', 260], ['Seth Carlson', 140]] },
    { name: 'SyberLabs/relay', layer: 'action', role: 'parked', roleSource: 'decision 2026-09-27', pushedAt: '2026-10-13', counts: null, weeks: null, total: null, authors: [], note: 'removed from selected work' },
    { name: `bad name ${XSS}`, layer: 'unread', role: 'unknown', roleSource: 'computed', pushedAt: null },
  ],
};

test('validBoard accepts the contract shape and nothing else', () => {
  assert.equal(validBoard(BOARD), true);
  assert.equal(validBoard(null), false);
  assert.equal(validBoard({ generatedAt: 'x' }), false);
  assert.equal(validBoard({ ...BOARD, asks: 'nope' }), false);
});

test('the page needs site:board.read; admin has it; the nav shows it only with the key', async () => {
  const env = makeEnv({ BOARD: kv(BOARD) });
  const reader = await signIn(env.DB, { perms: ['site:changes.read'] });
  let res = await call(env, '/admin/board', { cookie: reader.cookie });
  assert.equal(res.status, 403);
  assert.doesNotMatch(await res.text(), /ASK-009/);
  res = await call(env, '/admin/changes', { cookie: reader.cookie });
  assert.doesNotMatch(await res.text(), /href="\/admin\/board"/);

  const admin = await signIn(env.DB, { roles: ['role_admin'] });
  res = await call(env, '/admin/board', { cookie: admin.cookie });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /href="\/admin\/board" aria-current="page"/);
  assert.match(html, /ASK-009/);
  assert.match(html, /14 days left/);
  assert.match(html, /Default in force:<\/b> reconstruct/);
  assert.match(html, /Answered<\/b> in abc1234 by sykosyber/);
  assert.match(html, /G-RELAY-PILOT/);
  assert.match(html, /pass by sykosyber in def5678/);
  assert.match(html, /929bff9/);
  assert.match(html, /README\.md \(pending\)/);
  assert.match(html, /https:\/\/github\.com\/SyberLabs\/RISE/);
  assert.match(html, /Mateo Robles 260/);
  assert.match(html, /1\. RISE Composer<br>2\. Flyspace/);
  assert.doesNotMatch(html, /older than a day and a half/);
  // Escaped, never executed; the bad repository name gets no link.
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /github\.com\/bad name/);
  assert.doesNotMatch(html, /<script/);
});

test('the portfolio filter is a query string and rejects junk', async () => {
  const env = makeEnv({ BOARD: kv(BOARD) });
  const { cookie } = await signIn(env.DB, { roles: ['role_admin'] });
  let html = await (await call(env, '/admin/board?layer=action', { cookie })).text();
  assert.match(html, /href="\/admin\/board\?layer=action#portfolio" aria-current="true"/);
  assert.match(html, /SyberLabs\/relay/);
  assert.doesNotMatch(html, /github\.com\/SyberLabs\/RISE/);
  assert.match(html, /1 of 3\./);
  html = await (await call(env, '/admin/board?layer=' + encodeURIComponent('../../etc'), { cookie })).text();
  assert.match(html, /3 of 3\./, 'junk falls back to all');
});

test('unbound, empty, invalid and stale stores each say so', async () => {
  const { cookie: c1 } = await signIn(makeEnv().DB, { roles: ['role_admin'] });
  void c1;
  const cases = [
    [{}, /not connected/],
    [{ BOARD: kv(null) }, /has not been published yet/],
    [{ BOARD: kv({ nope: true }) }, /not in the <code>board\.v1<\/code> shape/],
    [{ BOARD: kv({ ...BOARD, generatedAt: new Date(Date.now() - 3 * 86400 * 1000).toISOString() }) }, /older than a day and a half/],
    [{ BOARD: { get: async () => { throw new Error('kv down'); } } }, /did not answer/],
  ];
  for (const [overrides, re] of cases) {
    const env = makeEnv(overrides);
    const { cookie } = await signIn(env.DB, { roles: ['role_admin'] });
    const res = await call(env, '/admin/board', { cookie });
    assert.equal(res.status, 200);
    assert.match(await res.text(), re);
  }
});
