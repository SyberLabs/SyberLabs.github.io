// Versioned private backups. App origins get only their own app's snapshots.
import { loadSession } from './session.js';
import { newId } from './crypto.js';
import { identityName } from './authz.js';

export const ACCOUNT_BASE = '/admin/api/v1';
export const APP_ORIGINS = { omni: 'https://omni.syberlabs.io', rise: 'https://rise.syberlabs.io', sketch: 'https://sketch.syberlabs.io' };
export const isAccountApi = pathname => pathname === ACCOUNT_BASE || pathname.startsWith(ACCOUNT_BASE + '/');
const MAX_BYTES = 1048576;
const ID = /^[a-zA-Z0-9_-]{8,80}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json = (data, status = 200) => Response.json({ version: 1, ...data }, { status });
const failure = (error, status) => json({ error }, status);
const metadata = row => ({ id: row.id, app: row.app, name: row.name, createdAt: row.created_at, bytes: row.bytes });

export function accountCors(res, request, env) {
  const origin = request.headers.get('Origin');
  const out = new Response(res.body, res);
  out.headers.set('Vary', 'Origin');
  if (origin === env.ORIGIN || Object.values(APP_ORIGINS).includes(origin)) {
    out.headers.set('Access-Control-Allow-Origin', origin);
    out.headers.set('Access-Control-Allow-Credentials', 'true');
    if (request.method === 'OPTIONS') {
      out.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      out.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-SyberLabs-Account, X-SyberLabs-Expected-User');
      out.headers.set('Access-Control-Max-Age', '600');
    }
  }
  return out;
}

async function readJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw { status: 400, code: 'invalid_body' };
  const chunks = [];
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BYTES + 2048) { await reader.cancel(); throw { status: 413, code: 'too_large' }; }
    chunks.push(value);
  }
  const data = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)); }
  catch { throw { status: 400, code: 'invalid_json' }; }
}

export async function accountApi(request, env, now) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const consumerApp = Object.keys(APP_ORIGINS).find(app => APP_ORIGINS[app] === origin);
  const allowedOrigin = origin === env.ORIGIN || Boolean(consumerApp);
  if (origin && !allowedOrigin) return failure('origin_not_allowed', 403);
  if (request.method === 'OPTIONS') {
    if (!allowedOrigin) return failure('origin_not_allowed', 403);
    if (!['GET', 'POST'].includes(request.headers.get('Access-Control-Request-Method'))) return failure('method_not_allowed', 405);
    const headers = (request.headers.get('Access-Control-Request-Headers') || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
    if (headers.some(h => !['content-type', 'x-syberlabs-account', 'x-syberlabs-expected-user'].includes(h))) return failure('headers_not_allowed', 403);
    return new Response(null, { status: 204 });
  }
  if (!['GET', 'HEAD', 'POST'].includes(request.method)) return failure('method_not_allowed', 405);
  if (request.method === 'POST' && (!allowedOrigin || request.headers.get('X-SyberLabs-Account') !== 'v1' || !/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || ''))) return failure('csrf', 403);
  if (!env.DB || !env.APP_SECRET) return failure('unavailable', 503);
  const session = await loadSession(env, request, now);
  if (!session.user) return failure('signin_required', 401);
  const user = session.user;
  const pathname = url.pathname;
  if (pathname === ACCOUNT_BASE + '/account' && request.method !== 'POST') return json({ user: { id: user.id, label: identityName(user) }, portalUrl: env.ORIGIN + '/admin/' });
  const listPath = ACCOUNT_BASE + '/saves';
  // Bind each operation to the account the consumer displayed when it began.
  // The host-only cookie can change in another tab after an account preflight.
  // This is an equality precondition, never an alternate source of ownership.
  if (pathname === listPath || pathname.startsWith(listPath + '/')) {
    const expectedUser = request.headers.get('X-SyberLabs-Expected-User');
    if (!expectedUser) return failure('expected_user_required', 400);
    if (expectedUser !== user.id) return failure('account_changed', 409);
  }
  if (pathname === listPath && request.method !== 'POST') {
    const app = url.searchParams.get('app');
    if (!Object.hasOwn(APP_ORIGINS, app)) return failure('invalid_app', 400);
    if (consumerApp && consumerApp !== app) return failure('app_not_allowed', 403);
    const { results } = await env.DB.prepare('SELECT id, app, name, created_at, bytes FROM account_saves WHERE user_id = ? AND app = ? ORDER BY created_at DESC, id DESC').bind(user.id, app).all();
    return json({ saves: results.map(metadata) });
  }
  if (pathname.startsWith(listPath + '/') && request.method !== 'POST') {
    const id = pathname.slice(listPath.length + 1);
    if (!ID.test(id)) return failure('not_found', 404);
    const row = await env.DB.prepare('SELECT * FROM account_saves WHERE id = ? AND user_id = ?').bind(id, user.id).first();
    if (!row || (consumerApp && consumerApp !== row.app)) return failure('not_found', 404);
    return json({ save: { ...metadata(row), payload: JSON.parse(row.payload) } });
  }
  if (pathname !== listPath || request.method !== 'POST') return failure('not_found', 404);
  let body;
  try { body = await readJson(request); } catch (err) { return failure(err.code, err.status); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !['app', 'name', 'payload', 'requestId'].includes(k))) return failure('invalid_body', 400);
  const { app, name, payload, requestId } = body;
  if (typeof app !== 'string' || !Object.hasOwn(APP_ORIGINS, app) || typeof requestId !== 'string' || typeof name !== 'string' || !name.trim() || name.length > 100 || !UUID.test(requestId || '') || payload === null || typeof payload !== 'object') return failure('invalid_body', 400);
  if (consumerApp && app !== consumerApp) return failure('app_not_allowed', 403);
  const encoded = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(encoded).length;
  if (bytes > MAX_BYTES) return failure('too_large', 413);
  const rowForRequest = () => env.DB.prepare('SELECT * FROM account_saves WHERE user_id = ? AND request_id = ?').bind(user.id, requestId).first();
  const prior = await rowForRequest();
  const retry = row => row.app === app && row.name === name.trim() && row.payload === encoded ? json({ save: metadata(row) }) : failure('request_id_conflict', 409);
  if (prior) return retry(prior);
  const id = newId();
  try {
    await env.DB.prepare('INSERT OR IGNORE INTO account_saves (id, user_id, app, name, payload, bytes, request_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id, user.id, app, name.trim(), encoded, bytes, requestId, now).run();
  } catch (err) {
    if (String(err.message).includes('account_save_quota')) return failure('quota_reached', 409);
    throw err;
  }
  const saved = await rowForRequest();
  if (!saved) return failure('unavailable', 503);
  return saved.id === id ? json({ save: metadata(saved) }, 201) : retry(saved);
}
