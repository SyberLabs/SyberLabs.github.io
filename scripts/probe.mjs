// Production probe. Every ten minutes (.github/workflows/probe.yml) each check below asks one public
// surface the question its owner cares about. A check fails only when two attempts about 30 seconds
// apart both fail, so one dropped request never alerts anyone, and nothing is carried between runs.
// A failing check opens one GitHub issue labelled `incident` and posts once to Slack; the first run
// that passes closes it with the duration. The open issue is the state: while it is open, nothing is
// posted again.
//
//   node scripts/probe.mjs    run every check; with GITHUB_TOKEN it opens and closes incidents, and
//                             with SLACK_ALERTS_WEBHOOK it also posts to #alerts
//
// Nothing a server sends back is kept: the log, issues and Slack carry statuses, timings and the
// expectation that failed, never a response body. Neither secret is ever printed. The exit status is
// 1 only when the probe could not record or deliver what it saw (GitHub or Slack refused, or a failing
// check with no GITHUB_TOKEN to open an incident with), so a long outage is one issue, not a red run
// and a workflow-failure email every ten minutes.
import { pathToFileURL } from 'node:url';

const UA = 'syberlabs-probe (+https://github.com/SyberLabs/SyberLabs.github.io/blob/main/scripts/probe.mjs)';
const REPO = 'SyberLabs/SyberLabs.github.io';
const LABEL = 'incident';
const TIMEOUT_MS = 15000;
export const RETRY_MS = 30000;

// What each kind of check expects. verify(status, text) is null when the answer is right, else a short
// account of what came back instead: a status and the expectation it missed, never the text itself.
const page = marker => ({
  expected: `200 with \`${marker}\``,
  verify: (status, text) => (status !== 200 ? String(status) : text.includes(marker) ? null : `200 without \`${marker}\``),
});

const parse = text => { try { return JSON.parse(text); } catch { return null; } };

// Signed out, the account API answers JSON, never a sign-in redirect (server/account-api.js).
const signedOut = {
  expected: '401 JSON with version 1',
  verify: (status, text) => (status !== 401 ? String(status) : parse(text)?.version === 1 ? null : '401 without JSON version 1'),
};

// MCP's initialize as a host's own server sends it, with no Origin: RISE refuses any origin but its own
// (RISE worker/mcp-server.mjs), and Node's fetch sends none.
const connector = {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
  body: JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'syberlabs-probe', version: '1' } },
  }),
  expected: '200 JSON-RPC result with serverInfo',
  verify: (status, text) => {
    if (status !== 200) return String(status);
    const info = parse(text)?.result?.serverInfo;
    return info && typeof info === 'object' ? null : '200 without result.serverInfo';
  },
};

// The public preview runs with paid inference off, so each route answers 503 before it reads the body
// or the origin (Flyspace src/app/api/<route>/route.ts). Anything else means the route is no longer held
// off. The probe sends no Origin, which each route refuses next, so a probe never spends either way.
const PAID_ROUTES = ['llm', 'jev-persona', 'capability-broker', 'registry-intent'];
const heldOff = {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
  expected: '503 (paid inference off in the public preview)',
  verify: status => (status === 503 ? null : String(status)),
};

// Each owner is a name, never an @handle: it is who the issue and Slack say to ask. Markers are structure,
// not copy: sy-atlas is the shared header's site map (CI greps dist/ for it too), view-read is the reader
// container RISE's route manifest mounts into, and the two titles are each app's own.
export const CHECKS = [
  { id: 'site-home', name: 'syberlabs.io home', owner: 'Seth', url: 'https://syberlabs.io/', ...page('sy-atlas') },
  { id: 'account-api', name: 'Account API, signed out', owner: 'Seth', url: 'https://syberlabs.io/admin/api/v1/account', ...signedOut },
  { id: 'rise-home', name: 'RISE home', owner: 'Seth', url: 'https://rise.syberlabs.io/', ...page('id="view-read"') },
  { id: 'rise-mcp', name: 'RISE Composer connector', owner: 'Seth', url: 'https://rise.syberlabs.io/api/mcp', ...connector },
  { id: 'omni-home', name: 'Flyspace preview home', owner: 'Mateo', url: 'https://omni.syberlabs.io/', ...page('<title>Flyspace</title>') },
  ...PAID_ROUTES.map(route => ({
    id: `omni-${route}-off`, name: `Flyspace preview /api/${route} held off`, owner: 'Mateo',
    url: `https://omni.syberlabs.io/api/${route}`, ...heldOff,
  })),
  { id: 'sketch-home', name: 'RISE Sketch home', owner: 'unnamed', url: 'https://sketch.syberlabs.io/', ...page('RISE Sketch') },
];

// A timeout, or a network code such as ECONNREFUSED, or the error's class: never its message, which can
// carry the URL it failed on.
function unanswered(err) {
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') return `no answer within ${TIMEOUT_MS / 1000} s`;
  const code = err?.cause?.code;
  return `no response (${typeof code === 'string' && /^[A-Z][A-Z0-9_]*$/.test(code) ? code : err?.name || 'error'})`;
}

// One request. The status is the one this exact URL answers (redirects are not followed), and the body
// is read only to check it.
export async function attempt(check, fetchImpl) {
  const started = performance.now();
  try {
    const res = await fetchImpl(check.url, {
      method: check.method || 'GET',
      headers: { 'User-Agent': UA, ...check.headers },
      body: check.body,
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text();
    return { status: res.status, ms: Math.round(performance.now() - started), got: check.verify(res.status, text) };
  } catch (err) {
    return { status: null, ms: Math.round(performance.now() - started), got: unanswered(err) };
  }
}

// Every check once, then the ones that failed once more about 30 s later. Failing means both failed.
export async function probe(checks, { fetch: fetchImpl, sleep, now }) {
  const at = now();
  const first = await Promise.all(checks.map(check => attempt(check, fetchImpl)));
  const again = checks.filter((_, i) => first[i].got);
  let second = [];
  if (again.length) {
    await sleep(RETRY_MS);
    second = await Promise.all(again.map(check => attempt(check, fetchImpl)));
  }
  return checks.map((check, i) => {
    const retry = again.includes(check) ? second[again.indexOf(check)] : null;
    return { check, first: first[i], retry, failing: Boolean(retry?.got), at };
  });
}

const iso = ms => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const minutes = ms => { const m = Math.round(ms / 60000); return `${m} minute${m === 1 ? '' : 's'}`; };
const target = check => `${check.method || 'GET'} ${check.url}`;
const both = (first, retry) => (first.got === retry.got ? `${retry.got} on both attempts` : `${first.got}, then ${retry.got}`);

function line({ check, first, retry, failing }) {
  if (failing) return `FAIL ${check.id}: ${both(first, retry)}; expected ${check.expected} (owner ${check.owner})`;
  const passed = retry || first;
  return `pass ${check.id}: ${passed.status} in ${passed.ms} ms${retry ? ` on the second attempt (first: ${first.got})` : ''}`;
}

export const title = check => `Incident: ${check.id} failing`;

function issueBody({ check, first, retry, at }) {
  return [
    `- Check: \`${check.id}\` (${check.name})`,
    `- URL: ${target(check)}`,
    `- Expected: ${check.expected}`,
    `- Got: ${both(first, retry)}`,
    `- First failure: ${iso(at)}`,
    `- Owner: ${check.owner}`,
    '',
    'Opened by scripts/probe.mjs (.github/workflows/probe.yml) after two attempts about 30 seconds apart both failed. ' +
      'The first run that passes closes it with the duration. No response body is recorded.',
  ].join('\n');
}

// The first failure is in the body the probe wrote; an edited body falls back to when the issue opened.
const since = issue => Date.parse(/First failure: (\S+)/.exec(issue.body || '')?.[1]) || Date.parse(issue.created_at);

// Our own refusals carry a method, a path and a status. Anything else is reported by class only: a fetch
// error's message can quote the URL, and the Slack URL is the secret.
class Refused extends Error {}
const why = err => (err instanceof Refused ? err.message : `no response (${err?.name || 'error'})`);

function github(token, repo, fetchImpl) {
  return async (method, path, body) => {
    const res = await fetchImpl(`https://api.github.com/repos/${repo}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': UA,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body && { 'Content-Type': 'application/json' }),
      },
      body: body && JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // 422 on creating the label means it is already there.
    if (!res.ok && !(path === '/labels' && res.status === 422)) throw new Refused(`GitHub ${method} ${path.split('?')[0]} answered ${res.status}`);
    return res.json();
  };
}

// Incoming-webhook text: &, < and > are Slack's own markup, so they are escaped.
async function postSlack(webhook, text, fetchImpl) {
  const res = await fetchImpl(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Refused(`Slack answered ${res.status}`);
}

export async function main({
  env = process.env, fetch: fetchImpl = globalThis.fetch, log = console.log, now = Date.now,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), checks = CHECKS,
} = {}) {
  const results = await probe(checks, { fetch: fetchImpl, sleep, now });
  for (const r of results) log(line(r));
  const webhook = env.SLACK_ALERTS_WEBHOOK || '';
  if (!webhook) log('Slack is not configured (no SLACK_ALERTS_WEBHOOK secret): incidents are GitHub issues only.');
  if (!env.GITHUB_TOKEN) {
    log('GITHUB_TOKEN is not set: no incident is opened or closed.');
    return results.some(r => r.failing) ? 1 : 0;
  }
  const gh = github(env.GITHUB_TOKEN, env.GITHUB_REPOSITORY || REPO, fetchImpl);
  let open;
  try {
    open = (await gh('GET', `/issues?state=open&labels=${LABEL}&per_page=100`)).filter(issue => !issue.pull_request);
  } catch (err) {
    // Without the open incidents a post could not be deduplicated, so nothing is opened, closed or posted.
    log(`Incidents unavailable: ${why(err)}. Nothing was opened, closed or posted.`);
    return 1;
  }
  let errors = 0;
  let labelled = false;
  const slack = async text => {
    if (!webhook) return;
    try { await postSlack(webhook, text, fetchImpl); } catch (err) { errors += 1; log(`Slack post failed: ${why(err)}`); }
  };
  for (const r of results) {
    const { check } = r;
    const issue = open.find(i => i.title === title(check));
    try {
      if (r.failing && issue) {
        log(`${check.id}: incident #${issue.number} stays open`);
      } else if (r.failing) {
        if (!labelled) {
          await gh('POST', '/labels', { name: LABEL, color: 'b60205', description: 'A production check failed twice in a row (scripts/probe.mjs)' });
          labelled = true;
        }
        const created = await gh('POST', '/issues', { title: title(check), body: issueBody(r), labels: [LABEL] });
        log(`${check.id}: opened incident #${created.number} ${created.html_url}`);
        await slack(`Incident: ${check.id} failing. ${check.name} (${target(check)}) expected ${check.expected}, got ${both(r.first, r.retry)}. ` +
          `Failing since ${iso(r.at)}. Owner: ${check.owner}. ${created.html_url}`);
      } else if (issue) {
        const at = now();
        const duration = minutes(at - since(issue));
        await gh('POST', `/issues/${issue.number}/comments`, { body: `Passing again at ${iso(at)}, ${duration} after the first failure. Closed by scripts/probe.mjs.` });
        await gh('PATCH', `/issues/${issue.number}`, { state: 'closed', state_reason: 'completed' });
        log(`${check.id}: closed incident #${issue.number} after ${duration}`);
        await slack(`Recovered: ${check.id} passes again after ${duration}. Owner: ${check.owner}. ${issue.html_url}`);
      }
    } catch (err) {
      errors += 1;
      log(`${check.id}: ${why(err)}`);
    }
  }
  return errors ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
