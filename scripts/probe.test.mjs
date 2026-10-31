// scripts/probe.mjs against a fake internet: the probed sites, GitHub's issues API and a Slack webhook,
// all in memory. No request leaves the process and nothing waits 30 s.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CHECKS, RETRY_MS, main, title } from './probe.mjs';

const REPO = 'SyberLabs/SyberLabs.github.io';
const TOKEN = 'ghs_token-canary-0123456789abcdef';
const WEBHOOK = 'https://hooks.slack.com/services/T0CANARY/B0CANARY/webhook-canary-secret';
const BODY = 'response-body-canary';
const T0 = Date.parse('2026-10-31T01:50:00Z');
const MINUTE = 60000;

// A right answer for each check; the four held-off Flyspace routes answer 503.
const GOOD = {
  'site-home': () => new Response('<details class="sy-menu"><div class="sy-atlas" id="sy-atlas"></div></details>'),
  'account-api': () => Response.json({ version: 1, error: 'signin_required' }, { status: 401 }),
  'rise-home': () => new Response('<div id="view-read" class="view-container" hidden></div>'),
  'rise-mcp': () => Response.json({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-06-18', serverInfo: { name: 'rise', version: '1.0.0' } } }),
  'omni-home': () => new Response('<title>Flyspace</title>'),
  'sketch-home': () => new Response('<title>RISE Sketch · living procedural ink</title>'),
};
const good = check => (GOOD[check.id] || (() => Response.json({ error: 'unavailable' }, { status: 503 })))();

// plan: check id -> 'fail' (every attempt) or ['fail', 'pass'] (per attempt). A failure is a 500 whose body
// is a canary. issues: GitHub's issues, in memory. slack: the webhook's status, or 'throw'. clock: when
// GitHub records an issue as closed.
function world({ plan = {}, issues = [], slack = 200, github = 200, labelExists = false, clock = T0 } = {}) {
  const posts = [];
  const calls = [];
  const attempts = new Map();
  let next = issues.reduce((n, i) => Math.max(n, i.number), 0) + 1;
  const fetch = async (input, init = {}) => {
    const url = String(input);
    const method = init.method || 'GET';
    if (url.startsWith('https://hooks.slack.com/')) {
      assert.equal(url, WEBHOOK);
      if (slack === 'throw') throw new TypeError(`Failed to parse URL from ${url}`);
      posts.push(JSON.parse(init.body).text);
      return new Response('ok', { status: slack });
    }
    if (url.startsWith('https://api.github.com/')) {
      const path = url.slice(`https://api.github.com/repos/${REPO}`.length);
      assert.ok(url.startsWith(`https://api.github.com/repos/${REPO}/`), url);
      assert.equal(new Headers(init.headers).get('Authorization'), `Bearer ${TOKEN}`);
      const body = init.body ? JSON.parse(init.body) : null;
      calls.push([method, path, body]);
      if (github !== 200) return Response.json({ message: 'nope' }, { status: github });
      if (method === 'GET' && path.startsWith('/issues?')) {
        const query = new URLSearchParams(path.slice('/issues?'.length));
        const wanted = query.get('labels').split(',');
        assert.ok(wanted.includes('incident'), path);
        return Response.json(issues.filter(i => i.state === query.get('state') && wanted.every(l => i.labels.includes(l))));
      }
      if (method === 'POST' && path === '/labels') return Response.json({}, { status: labelExists ? 422 : 201 });
      if (method === 'POST' && path === '/issues') {
        const number = next++;
        const issue = { ...body, number, state: 'open', comments: [], created_at: new Date(T0).toISOString(),
          html_url: `https://github.com/${REPO}/issues/${number}` };
        issues.push(issue);
        return Response.json(issue, { status: 201 });
      }
      const issue = issues.find(i => path.startsWith(`/issues/${i.number}`));
      if (method === 'POST' && issue && path === `/issues/${issue.number}/comments`) {
        issue.comments.push(body.body);
        return Response.json({}, { status: 201 });
      }
      if (method === 'PATCH' && issue && path === `/issues/${issue.number}`) {
        if (body.state === 'closed') issue.closed_at = new Date(clock).toISOString();
        return Response.json(Object.assign(issue, body));
      }
      const label = issue && path.startsWith(`/issues/${issue.number}/labels/`) && decodeURIComponent(path.split('/').pop());
      if (method === 'DELETE' && label) {
        issue.labels = issue.labels.filter(l => l !== label);
        return Response.json(issue.labels.map(name => ({ name })));
      }
      throw new Error(`unexpected GitHub call ${method} ${path}`);
    }
    const check = CHECKS.find(c => c.url === url);
    if (!check) throw new Error(`unexpected fetch ${method} ${url}`);
    // What actually goes out: no Origin (RISE and Flyspace refuse foreign ones), and the URL's own status.
    assert.equal(new Headers(init.headers).get('Origin'), null, check.id);
    assert.equal(init.redirect, 'manual', check.id);
    const n = attempts.get(check.id) || 0;
    attempts.set(check.id, n + 1);
    const step = plan[check.id];
    return (Array.isArray(step) ? step[n] === 'fail' : step === 'fail') ? new Response(BODY, { status: 500 }) : good(check);
  };
  return { fetch, posts, calls, issues, attempts };
}

async function run(w, { env = {}, now = T0 } = {}) {
  const out = [];
  const sleeps = [];
  const code = await main({
    env: { GITHUB_TOKEN: TOKEN, GITHUB_REPOSITORY: REPO, SLACK_ALERTS_WEBHOOK: WEBHOOK, ...env },
    fetch: w.fetch, log: (...a) => out.push(a.join(' ')), now: () => now, sleep: async ms => { sleeps.push(ms); },
  });
  return { code, out: out.join('\n'), sleeps };
}

const openIncident = (id, firstFailure = T0, number = 7) => ({
  number, title: `Incident: ${id} failing`, labels: ['incident'], state: 'open', comments: [],
  body: `- Check: \`${id}\`\n- First failure: ${new Date(firstFailure).toISOString().replace(/\.\d{3}Z$/, 'Z')}`,
  created_at: new Date(firstFailure + 30000).toISOString(), html_url: `https://github.com/${REPO}/issues/${number}`,
});

test('every check passes: one attempt each, no retry, no issue and no Slack', async () => {
  const w = world();
  const { code, out, sleeps } = await run(w);
  assert.equal(code, 0);
  assert.deepEqual(sleeps, []);
  assert.deepEqual([...w.attempts.values()], CHECKS.map(() => 1));
  assert.equal(out.match(/^pass /gm).length, CHECKS.length);
  assert.deepEqual(w.calls.map(([m, p]) => `${m} ${p}`), ['GET /issues?state=open&labels=incident&per_page=100',
    'GET /issues?state=closed&labels=incident,unannounced&per_page=100']);
  assert.deepEqual(w.posts, []);
});

test('a single failure that passes about 30 s later is not an incident', async () => {
  const w = world({ plan: { 'rise-mcp': ['fail', 'pass'] } });
  const { code, out, sleeps } = await run(w);
  assert.equal(code, 0);
  assert.deepEqual(sleeps, [RETRY_MS]);
  assert.equal(RETRY_MS, 30000);
  assert.equal(w.attempts.get('rise-mcp'), 2);
  assert.equal(w.attempts.get('site-home'), 1, 'only the failed check is tried again');
  assert.match(out, /^pass rise-mcp: 200 in \d+ ms on the second attempt \(first: 500\)$/m);
  assert.equal(w.issues.length, 0);
  assert.deepEqual(w.posts, []);
});

test('two failures in a row open one incident and post once; later runs stay quiet while it is open', async () => {
  const w = world({ plan: { 'omni-home': 'fail' } });
  const first = await run(w);
  assert.equal(first.code, 0);
  assert.match(first.out, /^FAIL omni-home: 500 on both attempts; expected 200 with `<title>Flyspace<\/title>` \(owner Mateo\)$/m);
  assert.equal(w.issues.length, 1);
  const [issue] = w.issues;
  assert.equal(issue.title, 'Incident: omni-home failing');
  assert.equal(issue.title, title(CHECKS.find(c => c.id === 'omni-home')));
  for (const want of ['- Check: `omni-home` (Flyspace preview home)', '- URL: GET https://omni.syberlabs.io/',
    '- Expected: 200 with `<title>Flyspace</title>`', '- Got: 500 on both attempts', '- First failure: 2026-10-31T01:50:00Z', '- Owner: Mateo']) {
    assert.ok(issue.body.includes(want), want);
  }
  assert.equal(w.posts.length, 1);
  assert.equal(w.posts[0], 'Incident: omni-home failing. Flyspace preview home (GET https://omni.syberlabs.io/) expected 200 with ' +
    '`&lt;title&gt;Flyspace&lt;/title&gt;`, got 500 on both attempts. Failing since 2026-10-31T01:50:00Z. Owner: Mateo. ' +
    `https://github.com/${REPO}/issues/1`);
  assert.deepEqual(w.calls.filter(([m, p]) => m === 'POST' && p === '/labels').map(([, , b]) => b.name), ['incident', 'unannounced'],
    'both labels are made sure of before the issue');
  assert.deepEqual(issue.labels, ['incident'], 'a confirmed post takes unannounced off');

  for (const minutes of [10, 20]) {
    const again = await run(w, { now: T0 + minutes * MINUTE });
    assert.equal(again.code, 0);
    assert.match(again.out, /^omni-home: incident #1 stays open$/m);
  }
  assert.equal(w.issues.length, 1);
  assert.equal(w.posts.length, 1);
  assert.equal(w.calls.filter(([m, p]) => m === 'POST' && p === '/issues').length, 1);
});

test('an existing incident label answers 422 and the incident still opens', async () => {
  const w = world({ plan: { 'omni-llm-off': 'fail' }, labelExists: true });
  const { code } = await run(w);
  assert.equal(code, 0);
  assert.equal(w.issues.length, 1);
  assert.match(w.issues[0].body, /- Expected: 503 \(paid inference off in the public preview\)/);
  assert.match(w.posts[0], /^Incident: omni-llm-off failing\. .* Owner: Mateo\. https:/);
});

test('recovery closes the incident with a comment giving the duration in minutes', async () => {
  const w = world({ issues: [openIncident('rise-mcp')] });
  const { code, out } = await run(w, { now: T0 + 40 * MINUTE + 20000 });
  assert.equal(code, 0);
  const [issue] = w.issues;
  assert.equal(issue.state, 'closed');
  assert.equal(issue.state_reason, 'completed');
  assert.deepEqual(issue.comments, ['Passing again at 2026-10-31T02:30:20Z, 40 minutes after the first failure. Closed by scripts/probe.mjs.']);
  assert.match(out, /^rise-mcp: closed incident #7 after 40 minutes$/m);
  assert.deepEqual(w.posts, [`Recovered: rise-mcp passes again after 40 minutes. Owner: Seth. https://github.com/${REPO}/issues/7`]);
});

test('a full cycle: opened on two failures, closed by the next passing run with its duration', async () => {
  const w = world({ plan: { 'sketch-home': 'fail' } });
  await run(w);
  assert.equal(w.issues[0].state, 'open');
  const passing = world({ issues: w.issues });
  await run(passing, { now: T0 + 20 * MINUTE });
  assert.equal(w.issues[0].state, 'closed');
  assert.match(w.issues[0].comments[0], /, 20 minutes after the first failure\./);
  assert.deepEqual(passing.posts, [`Recovered: sketch-home passes again after 20 minutes. Owner: unnamed. https://github.com/${REPO}/issues/1`]);
});

test('a Slack failure at opening leaves the incident unannounced, and the next run announces it once', async () => {
  const w = world({ plan: { 'omni-home': 'fail' }, slack: 500 });
  const first = await run(w);
  assert.equal(first.code, 1);
  assert.match(first.out, /^Slack post failed: Slack answered 500$/m);
  const [issue] = w.issues;
  assert.deepEqual(issue.labels, ['incident', 'unannounced']);

  const later = world({ plan: { 'omni-home': 'fail' }, issues: w.issues });
  const second = await run(later, { now: T0 + 10 * MINUTE });
  assert.equal(second.code, 0);
  assert.deepEqual(later.posts, ['Incident: omni-home failing. Flyspace preview home (GET https://omni.syberlabs.io/) expected 200 with ' +
    '`&lt;title&gt;Flyspace&lt;/title&gt;`, got 500 on both attempts. Failing since 2026-10-31T01:50:00Z. Owner: Mateo. ' +
    `https://github.com/${REPO}/issues/1`]);
  assert.deepEqual(issue.labels, ['incident']);

  await run(later, { now: T0 + 20 * MINUTE });
  assert.equal(later.posts.length, 1, 'a confirmed post is never repeated');
});

test('a Slack failure at recovery keeps the closed incident unannounced until a post succeeds', async () => {
  const w = world({ issues: [openIncident('rise-mcp')], slack: 'throw', clock: T0 + 40 * MINUTE });
  const first = await run(w, { now: T0 + 40 * MINUTE });
  assert.equal(first.code, 1);
  const [issue] = w.issues;
  assert.equal(issue.state, 'closed');
  assert.deepEqual(issue.labels, ['incident', 'unannounced']);

  const stillDown = world({ issues: w.issues, slack: 503 });
  assert.equal((await run(stillDown, { now: T0 + 50 * MINUTE })).code, 1);
  assert.deepEqual(issue.labels, ['incident', 'unannounced']);

  const later = world({ issues: w.issues });
  const third = await run(later, { now: T0 + 60 * MINUTE });
  assert.equal(third.code, 0);
  assert.deepEqual(later.posts, [`Recovered: rise-mcp passes again after 40 minutes. Owner: Seth. https://github.com/${REPO}/issues/7`],
    'the duration runs to when the incident closed, not to the late post');
  assert.deepEqual(issue.labels, ['incident']);
  await run(later, { now: T0 + 70 * MINUTE });
  assert.equal(later.posts.length, 1);
});

test('an issue whose first-failure line was edited away falls back to when it opened', async () => {
  const issue = { ...openIncident('account-api'), body: 'edited by hand' };
  const w = world({ issues: [issue] });
  await run(w, { now: T0 + 30000 + 15 * MINUTE });
  assert.match(issue.comments[0], /, 15 minutes after the first failure\./);
});

test('without SLACK_ALERTS_WEBHOOK one line says so, and incidents are still opened and closed', async () => {
  const w = world({ plan: { 'sketch-home': 'fail' }, issues: [openIncident('rise-home')] });
  const { code, out } = await run(w, { env: { SLACK_ALERTS_WEBHOOK: undefined } });
  assert.equal(code, 0);
  assert.equal(out.match(/Slack is not configured/g).length, 1);
  assert.match(out, /^Slack is not configured \(no SLACK_ALERTS_WEBHOOK secret\): incidents are GitHub issues only\.$/m);
  assert.equal(w.issues.find(i => i.title === 'Incident: sketch-home failing').state, 'open');
  assert.equal(w.issues.find(i => i.title === 'Incident: rise-home failing').state, 'closed');
  assert.deepEqual(w.posts, []);
});

test('no secret value and no response body ever reaches the log, an issue or Slack', async () => {
  const seen = [];
  const scenarios = [
    [{ plan: { 'site-home': 'fail', 'account-api': ['fail', 'pass'] } }, 0],
    [{ issues: [openIncident('omni-home')] }, 0],
    [{ plan: { 'rise-home': 'fail' }, slack: 500 }, 1],
    [{ plan: { 'rise-home': 'fail' }, slack: 'throw' }, 1],
    [{ plan: { 'rise-home': 'fail' }, github: 503 }, 1],
    [{ plan: { 'rise-home': 'fail' }, github: 401 }, 1],
  ];
  for (const [setup, expected] of scenarios) {
    const w = world(setup);
    const { code, out } = await run(w);
    assert.equal(code, expected, JSON.stringify(setup));
    seen.push(out, ...w.posts, ...w.issues.flatMap(i => [i.title, i.body, ...i.comments]));
  }
  const noToken = await run(world({ plan: { 'rise-home': 'fail' } }), { env: { GITHUB_TOKEN: undefined } });
  assert.equal(noToken.code, 1, 'a failing check with nowhere to record it fails the run');
  assert.match(noToken.out, /^GITHUB_TOKEN is not set: no incident is opened or closed\.$/m);
  seen.push(noToken.out);
  const all = seen.join('\n');
  assert.match(all, /Slack answered 500/);
  assert.match(all, /Slack post failed: no response \(TypeError\)/);
  assert.match(all, /Incidents unavailable: GitHub GET \/issues answered 503\. Nothing was opened, closed or posted\./);
  for (const secret of [TOKEN, WEBHOOK, 'webhook-canary-secret', 'hooks.slack.com', BODY]) assert.ok(!all.includes(secret), secret);
});

test('a dropped connection is reported by its code and a slow one by the timeout, never by message', async () => {
  const w = world();
  const fetch = async (input, init) => {
    if (String(input) === 'https://rise.syberlabs.io/') {
      throw Object.assign(new TypeError(`fetch failed for ${input} ${BODY}`), { cause: { code: 'ECONNREFUSED' } });
    }
    if (String(input) === 'https://sketch.syberlabs.io/') throw new DOMException('The operation timed out.', 'TimeoutError');
    return w.fetch(input, init);
  };
  const { out } = await run({ ...w, fetch });
  assert.match(out, /^FAIL rise-home: no response \(ECONNREFUSED\) on both attempts;/m);
  assert.match(out, /^FAIL sketch-home: no answer within 15 s on both attempts;/m);
  assert.ok(!out.includes(BODY));
  assert.ok(w.issues.every(i => !i.body.includes(BODY)));
});

test('each check refuses the wrong answer', () => {
  const check = id => CHECKS.find(c => c.id === id);
  assert.equal(check('site-home').verify(200, '<html>maintenance</html>'), '200 without `sy-atlas`');
  assert.equal(check('site-home').verify(503, 'sy-atlas'), '503');
  assert.equal(check('account-api').verify(401, '{"version":1,"error":"signin_required"}'), null);
  assert.equal(check('account-api').verify(401, '<html>sign in</html>'), '401 without JSON version 1');
  assert.equal(check('account-api').verify(200, '{"version":1}'), '200');
  assert.equal(check('rise-mcp').verify(200, '{"jsonrpc":"2.0","id":1,"error":{"code":-32601}}'), '200 without result.serverInfo');
  assert.equal(check('rise-mcp').verify(200, 'event: message'), '200 without result.serverInfo');
  assert.equal(check('rise-mcp').verify(429, '{}'), '429');
  for (const route of ['llm', 'jev-persona', 'capability-broker', 'registry-intent']) {
    const c = check(`omni-${route}-off`);
    assert.equal(c.verify(503, ''), null, route);
    for (const status of [200, 202, 403, 404, 500]) assert.equal(c.verify(status, ''), String(status), `${route} ${status}`);
  }
});

test('the check list: owners by name, what each sends, and never an Origin header', () => {
  const owners = Object.fromEntries(CHECKS.map(c => [c.id, c.owner]));
  assert.deepEqual(owners, {
    'site-home': 'Seth', 'account-api': 'Seth', 'rise-home': 'Seth', 'rise-mcp': 'Seth', 'omni-home': 'Mateo',
    'omni-llm-off': 'Mateo', 'omni-jev-persona-off': 'Mateo', 'omni-capability-broker-off': 'Mateo',
    'omni-registry-intent-off': 'Mateo', 'sketch-home': 'unnamed',
  });
  for (const c of CHECKS) {
    assert.match(c.url, /^https:\/\/(syberlabs|rise\.syberlabs|omni\.syberlabs|sketch\.syberlabs)\.io\//, c.id);
    assert.ok(!Object.keys(c.headers || {}).some(h => h.toLowerCase() === 'origin'), c.id);
    assert.doesNotMatch(c.owner, /@/);
  }
  const mcp = CHECKS.find(c => c.id === 'rise-mcp');
  assert.equal(mcp.method, 'POST');
  assert.equal(mcp.url, 'https://rise.syberlabs.io/api/mcp');
  assert.deepEqual(mcp.headers, { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' });
  assert.equal(JSON.parse(mcp.body).method, 'initialize');
  for (const route of ['llm', 'jev-persona', 'capability-broker', 'registry-intent']) {
    const c = CHECKS.find(x => x.url === `https://omni.syberlabs.io/api/${route}`);
    assert.equal(c.method, 'POST', route);
    assert.equal(c.verify(503, ''), null, route);
  }
});

test('the workflow runs on the schedule or by hand only, with read contents and write issues', async () => {
  // Comments dropped: the header says in words why there is no pull_request trigger.
  const yml = (await readFile(new URL('../.github/workflows/probe.yml', import.meta.url), 'utf8')).replace(/^ *#.*\n/gm, '');
  const on = /^on:\n([\s\S]*?)^\S/m.exec(yml)[1];
  assert.match(on, /^ {2}schedule:\n {4}- cron: '\*\/10 \* \* \* \*'$/m);
  assert.match(on, /^ {2}workflow_dispatch:$/m);
  assert.deepEqual([...on.matchAll(/^ {2}(\w+):/gm)].map(m => m[1]), ['schedule', 'workflow_dispatch']);
  assert.doesNotMatch(yml, /pull_request/);
  assert.match(yml, /^permissions:\n {2}contents: read\n {2}issues: write\n\n/m);
  assert.match(yml, /^concurrency:\n/m);
  assert.match(yml, /node-version: '24'/);
  assert.match(yml, /run: node scripts\/probe\.mjs\n/);
  assert.match(yml, /GITHUB_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(yml, /SLACK_ALERTS_WEBHOOK: \$\{\{ secrets\.SLACK_ALERTS_WEBHOOK \}\}/);
});
