// Live checks for Mission Control, made from the Function each time /admin/board loads: the other production
// hosts and the Flyspace preview's 503 invariant (MasterMind RFC 0004, section 5). syberlabs.io is not checked:
// the page being served proves it. A check is one request with no cookie and no Origin, judged by its status
// alone, except the connector's initialize, which must also return result.serverInfo. No body leaves this module.
export const PROBE_TIMEOUT_MS = 3000;
const MAX_BODY_BYTES = 65536; // an initialize answer is a few KB; anything longer is not one
const HEADERS = { 'User-Agent': 'SyberLabs-Mission-Control/1' };

// MCP streamable HTTP: the client accepts both types, and the answer is JSON or one SSE event carrying it.
const INITIALIZE = JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'syberlabs-mission-control', version: '1' } },
});

// Each preview route takes POST (Flyspace src/app/api/*/route.ts at 42785f9). Each answers 503 first while the
// preview runs with paid inference off, then refuses a request with no Origin, so a check can never spend.
const PREVIEW_OFF = [
  ['llm', 'AI answers'],
  ['jev-persona', 'Persona suggestions'],
  ['capability-broker', 'Capability broker'],
  ['registry-intent', 'Search routing'],
];

export const CHECKS = [
  { id: 'rise', label: 'RISE Reader', url: 'https://rise.syberlabs.io/', expect: 200 },
  { id: 'rise-mcp', label: 'RISE Composer connector', url: 'https://rise.syberlabs.io/api/mcp', method: 'POST', expect: 200, initialize: true },
  { id: 'omni', label: 'FLYSPACE preview', url: 'https://omni.syberlabs.io/', expect: 200 },
  ...PREVIEW_OFF.map(([route, name]) => ({
    id: `omni-${route}`, label: `${name} off on the preview`, url: `https://omni.syberlabs.io/api/${route}`, method: 'POST', expect: 503,
  })),
  { id: 'sketch', label: 'RISE Sketch', url: 'https://sketch.syberlabs.io/', expect: 200 },
];

// An unread body holds its connection, and a Worker gets six at a time, so every body is read or cancelled.
const cancel = res => { if (res.body) res.body.cancel().catch(() => {}); };

// At most MAX_BODY_BYTES as text; a longer body reads as ''.
async function readCapped(res) {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let size = 0;
  for (let part = await reader.read(); !part.done; part = await reader.read()) {
    size += part.value.byteLength;
    if (size > MAX_BODY_BYTES) {
      reader.cancel().catch(() => {});
      return '';
    }
    text += decoder.decode(part.value, { stream: true });
  }
  return text + decoder.decode();
}

// True when the answer, or one of its SSE data lines, is a JSON-RPC result carrying a serverInfo object.
export function hasServerInfo(text) {
  const candidates = [text, ...text.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5))];
  return candidates.some(candidate => {
    try {
      const info = JSON.parse(candidate)?.result?.serverInfo;
      return Boolean(info) && typeof info === 'object';
    } catch {
      return false;
    }
  });
}

// One request. Never rejects: a fetch that throws is 'network', or 'timeout' once the deadline aborted it.
async function attempt(check, signal) {
  try {
    const res = await fetch(check.url, {
      method: check.method || 'GET',
      headers: check.initialize ? { ...HEADERS, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' } : HEADERS,
      body: check.initialize ? INITIALIZE : undefined,
      redirect: 'manual',
      signal,
    });
    if (res.status !== check.expect) {
      cancel(res);
      return { status: res.status, failure: 'status' };
    }
    if (check.initialize) return { status: res.status, failure: hasServerInfo(await readCapped(res)) ? null : 'no_server_info' };
    cancel(res);
    return { status: res.status, failure: null };
  } catch {
    return { status: null, failure: signal.aborted ? 'timeout' : 'network' };
  }
}

// One check against its own deadline. The race ends it on time even if a fetch ignores the abort.
async function probe(check, timeoutMs) {
  const started = Date.now();
  const controller = new AbortController();
  let timer;
  const deadline = new Promise(resolve => {
    timer = setTimeout(() => {
      controller.abort();
      resolve({ status: null, failure: 'timeout' });
    }, timeoutMs);
  });
  const outcome = await Promise.race([attempt(check, controller.signal), deadline]);
  clearTimeout(timer);
  return {
    id: check.id, label: check.label, method: check.method || 'GET', url: check.url, expect: check.expect,
    initialize: Boolean(check.initialize), ...outcome, up: outcome.failure === null, ms: Date.now() - started,
  };
}

// Every check at once, so the set takes no longer than its slowest check, which is at most timeoutMs.
export const runProbes = (checks = CHECKS, timeoutMs = PROBE_TIMEOUT_MS) =>
  Promise.all(checks.map(check => probe(check, timeoutMs)));
