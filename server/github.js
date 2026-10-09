// GitHub OAuth App, authorization code + PKCE S256, confidential client. The identity is the numeric
// user id; login is display only, because logins can be renamed and reclaimed.
// RFC-0002 2.2: no scope (public read-only data), so exactly two calls, the token exchange and GET /user;
// no /user/emails and no token revoke (T28: the token can read nothing private and is never kept).
import { AuthError } from './http.js';

const AUTHORIZE = 'https://github.com/login/oauth/authorize';
const TOKEN = 'https://github.com/login/oauth/access_token';
const API = 'https://api.github.com';
const TIMEOUT_MS = 8000;

const API_HEADERS = {
  'User-Agent': 'syberlabs-accounts',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

export const redirectUri = env => `${env.ORIGIN}/auth/callback/github`;

export function authorizeUrl(env, { state, challenge, selectAccount = false }) {
  const q = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri(env),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    allow_signup: 'false',
  });
  if (selectAccount) q.set('prompt', 'select_account');
  return `${AUTHORIZE}?${q}`;
}

// Network errors, timeouts and non-2xx all read as "GitHub didn't answer" (e=provider).
async function getJson(url, init) {
  let res;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new AuthError('provider');
  }
  if (!res.ok) throw new AuthError('provider');
  try { return await res.json(); } catch { throw new AuthError('provider'); }
}

// Returns {subject, login, email}. email is always null: with no scope GitHub vouches for no address.
export async function fetchIdentity(env, { code, verifier }) {
  const tok = await getJson(TOKEN, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': API_HEADERS['User-Agent'],
    },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri(env),
      code_verifier: verifier,
    }).toString(),
  });
  // GitHub answers 200 with {error: 'bad_verification_code'} for a used or junk code.
  if (!tok || typeof tok.access_token !== 'string' || !tok.access_token) throw new AuthError('provider');

  const user = await getJson(`${API}/user`, {
    headers: { ...API_HEADERS, Authorization: `Bearer ${tok.access_token}` },
  });
  if (!user || !Number.isSafeInteger(user.id) || user.id <= 0 || typeof user.login !== 'string') {
    throw new AuthError('provider');
  }
  return { subject: String(user.id), login: user.login, email: null };
}

// Packet 4 invite form: one unauthenticated GET /users/{login}. null when GitHub says no or refuses
// (rate limit), and the form then asks for the numeric id instead.
const LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
export async function lookupLogin(login) {
  const name = typeof login === 'string' ? login.trim().replace(/^@/, '') : '';
  if (!LOGIN_RE.test(name)) return null;
  try {
    const res = await fetch(`${API}/users/${encodeURIComponent(name)}`, {
      headers: API_HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const u = await res.json();
    if (!u || !Number.isSafeInteger(u.id) || u.id <= 0 || typeof u.login !== 'string') return null;
    return { id: String(u.id), login: u.login };
  } catch {
    return null;
  }
}
