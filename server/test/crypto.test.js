import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  b64urlEncode, b64urlDecode, hex, newId, randomToken, sha256Hex, sha256B64url, timingSafeEqual,
  secretKeyBytes, stateKey, seal, open, sealJson, openJson,
} from '../crypto.js';

const SECRET = 'crypto-test-secret-0123456789abcdefghijklmn'; // 43 base64url chars = 32 bytes
const OTHER = 'other-test-secret-0123456789abcdefghijklmno';

test('base64url round-trips and refuses padding, + / and bad lengths', () => {
  for (const n of [0, 1, 2, 3, 31, 32, 33]) {
    const bytes = crypto.getRandomValues(new Uint8Array(n));
    const s = b64urlEncode(bytes);
    assert.match(s, /^[A-Za-z0-9_-]*$/);
    assert.deepEqual(b64urlDecode(s), bytes);
  }
  assert.equal(b64urlEncode(new Uint8Array([0xfb, 0xff])), '-_8');
  for (const bad of ['ab==', 'a+b/', 'abcde', 'a b', null]) assert.throws(() => b64urlDecode(bad));
});

test('ids are 32 lowercase hex; tokens are 43 base64url chars and unique', () => {
  assert.match(newId(), /^[0-9a-f]{32}$/);
  assert.match(randomToken(), /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(randomToken(), randomToken());
  assert.notEqual(newId(), newId());
  assert.equal(hex(new Uint8Array([0, 15, 255])), '000fff');
});

test('sha256 hex and the RFC 7636 PKCE S256 vector', async () => {
  assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(await sha256B64url('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
    'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});

test('timingSafeEqual', () => {
  assert.equal(timingSafeEqual('abc', 'abc'), true);
  assert.equal(timingSafeEqual('abc', 'abd'), false);
  assert.equal(timingSafeEqual('abc', 'abcd'), false);
  assert.equal(timingSafeEqual('', ''), true);
  assert.equal(timingSafeEqual(undefined, 'a'), false);
  assert.equal(timingSafeEqual('a', null), false);
});

test('stateKey: APP_SECRET is the AES-GCM key itself (RFC-0002 R1-14), cached, and refused unless 32 bytes', async () => {
  for (const bad of [undefined, 'short', 'x'.repeat(31), 'x'.repeat(40), 'not base64url but 43 chars long, honestly!!']) {
    assert.equal(secretKeyBytes(bad), null, String(bad));
    await assert.rejects(stateKey(bad));
  }
  assert.equal(secretKeyBytes(SECRET).length, 32);
  assert.deepEqual(secretKeyBytes(SECRET), b64urlDecode(SECRET));
  assert.equal(secretKeyBytes('y'.repeat(32)).length, 32); // exactly 32 UTF-8 bytes also works
  assert.equal(stateKey(SECRET), stateKey(SECRET));
  const key = await stateKey(SECRET);
  assert.equal(key.algorithm.name, 'AES-GCM');
  assert.equal(key.algorithm.length, 256);
  assert.equal(key.extractable, false);
  // No derivation: a key imported straight from the decoded bytes opens what stateKey sealed.
  const direct = await webcrypto.subtle.importKey('raw', b64urlDecode(SECRET), 'AES-GCM', false, ['decrypt']);
  assert.equal(new TextDecoder().decode(await open(direct, await seal(key, 'hi', 'aad'), 'aad')), 'hi');
});

test('seal/open: round trip, random IV, and null for wrong AAD, tampering, other keys or junk', async () => {
  const key = await stateKey(SECRET);
  const otherKey = await stateKey(OTHER);
  const a = await sealJson(key, { v: 1, p: 'github', s: 'x' }, 'sl_oauth|github');
  const b = await sealJson(key, { v: 1, p: 'github', s: 'x' }, 'sl_oauth|github');
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(await openJson(key, a, 'sl_oauth|github'), { v: 1, p: 'github', s: 'x' });
  assert.equal(await openJson(key, a, 'sl_oauth|google'), null);
  assert.equal(await openJson(otherKey, a, 'sl_oauth|github'), null);
  const raw = b64urlDecode(a);
  raw[raw.length - 1] ^= 1;
  assert.equal(await openJson(key, b64urlEncode(raw), 'sl_oauth|github'), null);
  raw[raw.length - 1] ^= 1;
  raw[3] ^= 1;
  assert.equal(await openJson(key, b64urlEncode(raw), 'sl_oauth|github'), null);
  for (const junk of ['', 'abc', 'not base64!', b64urlEncode(new Uint8Array(20)), undefined]) {
    assert.equal(await open(key, junk, 'sl_oauth|github'), null);
  }
  const bytes = await open(key, await seal(key, 'plain', 'aad'), 'aad');
  assert.equal(new TextDecoder().decode(bytes), 'plain');
});
