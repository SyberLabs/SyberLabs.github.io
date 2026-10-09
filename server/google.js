// Google OpenID Connect, authorization code + PKCE S256 + nonce, confidential client. The identity is
// `sub`; the email only ever redeems an invite.
// RFC-0002 2.2 / section 0: the id_token comes only from our own TLS POST to Google's token endpoint,
// authenticated with the client secret, so TLS stands in for the signature (OIDC Core 3.1.3.7 step 6).
// Its claims are checked and no JWKS is fetched: one Google call, and no RSA work in the CPU budget (T31).
import { AuthError } from './http.js';
import { b64urlDecode, timingSafeEqual } from './crypto.js';

const AUTHORIZE = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = 'https://oauth2.googleapis.com/token';
const ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);
const SKEW_MS = 30 * 1000;
const TIMEOUT_MS = 8000;

export const redirectUri = env => `${env.ORIGIN}/auth/callback/google`;

// Never access_type=offline, so Google issues no refresh token.
export function authorizeUrl(env, { state, challenge, nonce, loginHint, selectAccount = false }) {
  const q = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(env),
    response_type: 'code',
    scope: 'openid email',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  if (loginHint) q.set('login_hint', loginHint);
  if (selectAccount) q.set('prompt', 'select_account');
  return `${AUTHORIZE}?${q}`;
}

// Returns {subject, email, emailVerified, hd}. Token failure: e=provider; any claim failure: e=expired.
export async function fetchIdentity(env, { code, verifier, nonce, now }) {
  let res;
  try {
    res = await fetch(TOKEN, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri(env),
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }).toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new AuthError('provider');
  }
  if (!res.ok) throw new AuthError('provider', `http ${res.status}`);
  let body;
  try { body = await res.json(); } catch { throw new AuthError('provider'); }
  if (!body || typeof body.id_token !== 'string') throw new AuthError('provider', 'no id_token');

  const claims = verifyIdToken(env, body.id_token, { nonce, now });
  return {
    subject: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : null,
    emailVerified: claims.email_verified === true,
    hd: typeof claims.hd === 'string' ? claims.hd : null,
  };
}

const expired = detail => new AuthError('expired', detail);

// Claims only (see header). Kept synchronous; returns the payload or throws AuthError('expired').
export function verifyIdToken(env, jwt, { nonce, now }) {
  const parts = typeof jwt === 'string' ? jwt.split('.') : [];
  if (parts.length !== 3) throw expired('shape');
  let c;
  try {
    c = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])));
  } catch {
    throw expired('payload');
  }
  if (!c || typeof c !== 'object' || Array.isArray(c)) throw expired('payload');
  if (!ISSUERS.has(c.iss)) throw expired('iss');
  if (c.aud !== env.GOOGLE_CLIENT_ID) throw expired('aud');
  if (typeof c.exp !== 'number' || !(c.exp * 1000 > now - SKEW_MS)) throw expired('exp');
  if (typeof nonce !== 'string' || !nonce || !timingSafeEqual(c.nonce, nonce)) throw expired('nonce');
  if (typeof c.sub !== 'string' || !c.sub || c.sub.length > 255) throw expired('sub');
  return c;
}

// Google is authoritative for @gmail.com, and for a Workspace domain only when the id_token's hd claim
// (not the request parameter) names that same domain.
export function googleAuthoritative(email, hd) {
  if (typeof email !== 'string') return false;
  const at = email.lastIndexOf('@');
  if (at < 1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (domain === 'gmail.com') return true;
  return typeof hd === 'string' && hd.trim().toLowerCase() === domain;
}
