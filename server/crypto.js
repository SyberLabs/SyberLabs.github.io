// Web Crypto helpers for the staff sign-in. No npm dependencies: runs on Workers and on Node 22+.
// APP_SECRET is the AES-GCM key for the OAuth state cookie, and nothing else. Session tokens are random
// and never derived, so rotating APP_SECRET signs nobody out.
const enc = new TextEncoder();
const dec = new TextDecoder();

const bytesOf = input => (typeof input === 'string' ? enc.encode(input) : input);

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

// Session tokens, OAuth state and PKCE verifiers: 32 bytes, base64url (43 chars).
export const randomToken = () => b64urlEncode(randomBytes(32));

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

// The 32 key bytes: APP_SECRET as unpadded base64url (RFC-0002 2.1, 8.4). null for anything else, which
// app.js treats as unconfigured.
export function secretKeyBytes(appSecret) {
  try {
    const raw = b64urlDecode(appSecret);
    return raw.length === 32 ? raw : null;
  } catch {
    return null;
  }
}

// RFC-0002 R1-14: APP_SECRET is imported directly as the AES-GCM key, with no HKDF.
export function stateKey(appSecret) {
  const bytes = secretKeyBytes(appSecret);
  return bytes ? crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
    : Promise.reject(new Error('APP_SECRET must be 32 bytes'));
}

// AES-GCM over JSON with a random 96-bit IV. Output: base64url(iv || ciphertext+tag). AAD binds the purpose.
export async function sealJson(key, value, aad) {
  const iv = randomBytes(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: enc.encode(aad) }, key, enc.encode(JSON.stringify(value))));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv);
  out.set(ct, 12);
  return b64urlEncode(out);
}

// The value, or null for anything malformed, tampered, sealed with other AAD or not JSON. Never throws.
export async function openJson(key, sealed, aad) {
  try {
    const raw = b64urlDecode(sealed);
    if (raw.length < 12 + 16) return null;
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: raw.slice(0, 12), additionalData: enc.encode(aad) }, key, raw.slice(12));
    return JSON.parse(dec.decode(pt));
  } catch {
    return null;
  }
}
