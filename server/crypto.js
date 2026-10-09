// Web Crypto helpers for the staff sign-in. No npm dependencies: runs on Workers and on Node 22+.
// Two keys come from APP_SECRET by HKDF-SHA256: AES-GCM for the OAuth state cookie, HMAC for the
// audit subject hash. Session tokens are random and never derived, so rotating APP_SECRET signs nobody out.
const enc = new TextEncoder();
const dec = new TextDecoder();

export const STATE_INFO = 'sl-oauth-state-v1';
export const AUDIT_INFO = 'sl-audit-subject-v1';

export const utf8 = s => enc.encode(s);

const bytesOf = input => (typeof input === 'string' ? enc.encode(input)
  : input instanceof Uint8Array ? input : new Uint8Array(input));

export function hex(bytes) {
  let out = '';
  for (const b of bytesOf(bytes)) out += b.toString(16).padStart(2, '0');
  return out;
}

export function b64urlEncode(bytes) {
  let bin = '';
  for (const b of bytesOf(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Throws on anything that is not unpadded base64url.
export function b64urlDecode(str) {
  if (typeof str !== 'string' || !/^[A-Za-z0-9_-]*$/.test(str) || str.length % 4 === 1) {
    throw new TypeError('invalid base64url');
  }
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

// Row ids: 32 lowercase hex chars (128 bits), as the migration header says.
export const newId = () => hex(randomBytes(16));

// Session tokens, invite tokens, OAuth state, PKCE verifiers and nonces: 32 bytes, base64url (43 chars).
export const randomToken = (n = 32) => b64urlEncode(randomBytes(n));

export async function sha256(input) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytesOf(input)));
}

export const sha256Hex = async input => hex(await sha256(input));
export const sha256B64url = async input => b64urlEncode(await sha256(input));

// Constant time for equal-length inputs; a length mismatch returns early, which leaks only the length.
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// The UTF-8 bytes of APP_SECRET are the HKDF input, so any well-formed secret works; 32+ chars required.
const keyCache = new Map();
export function deriveKeys(appSecret) {
  if (typeof appSecret !== 'string' || appSecret.length < 32) {
    return Promise.reject(new Error('APP_SECRET missing or shorter than 32 characters'));
  }
  if (!keyCache.has(appSecret)) {
    const p = (async () => {
      const ikm = await crypto.subtle.importKey('raw', enc.encode(appSecret), 'HKDF', false, ['deriveKey']);
      const hkdf = info => ({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode(info) });
      const [stateKey, auditKey] = await Promise.all([
        crypto.subtle.deriveKey(hkdf(STATE_INFO), ikm, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']),
        crypto.subtle.deriveKey(hkdf(AUDIT_INFO), ikm, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign']),
      ]);
      return { stateKey, auditKey };
    })();
    p.catch(() => keyCache.delete(appSecret));
    keyCache.set(appSecret, p);
  }
  return keyCache.get(appSecret);
}

// AES-GCM with a random 96-bit IV. Output: base64url(iv || ciphertext+tag). AAD binds the purpose.
export async function seal(key, plaintext, aad) {
  const iv = randomBytes(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: enc.encode(aad) }, key, bytesOf(plaintext)));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv);
  out.set(ct, 12);
  return b64urlEncode(out);
}

// Returns the plaintext bytes, or null for anything malformed, tampered or sealed with other AAD.
export async function open(key, sealed, aad) {
  try {
    const raw = b64urlDecode(sealed);
    if (raw.length < 12 + 16) return null;
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: raw.slice(0, 12), additionalData: enc.encode(aad) }, key, raw.slice(12));
    return new Uint8Array(pt);
  } catch {
    return null;
  }
}

export const sealJson = (key, value, aad) => seal(key, JSON.stringify(value), aad);

export async function openJson(key, sealed, aad) {
  const pt = await open(key, sealed, aad);
  if (!pt) return null;
  try { return JSON.parse(dec.decode(pt)); } catch { return null; }
}

export async function hmacHex(key, message) {
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, bytesOf(message))));
}
