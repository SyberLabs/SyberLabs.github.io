import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hkdfSync, createHmac } from 'node:crypto';
import {
  b64urlEncode, b64urlDecode, hex, newId, randomToken, sha256Hex, sha256B64url, timingSafeEqual,
  deriveKeys, seal, open, sealJson, openJson, hmacHex, AUDIT_INFO,
} from '../crypto.js';

const SECRET = 'crypto-test-secret-0123456789abcdefghijk';

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

test('deriveKeys refuses a missing or short APP_SECRET and caches per secret', async () => {
  await assert.rejects(deriveKeys(undefined));
  await assert.rejects(deriveKeys('short'));
  assert.equal(deriveKeys(SECRET), deriveKeys(SECRET));
  const { stateKey, auditKey } = await deriveKeys(SECRET);
  assert.equal(stateKey.algorithm.name, 'AES-GCM');
  assert.equal(auditKey.algorithm.name, 'HMAC');
  assert.equal(stateKey.extractable, false);
});

test('the audit HMAC key is HKDF-SHA256(utf8(APP_SECRET), salt empty, info sl-audit-subject-v1)', async () => {
  const { auditKey } = await deriveKeys(SECRET);
  const raw = Buffer.from(hkdfSync('sha256', Buffer.from(SECRET), Buffer.alloc(0), AUDIT_INFO, 32));
  const expected = createHmac('sha256', raw).update('github:gh-test-1').digest('hex');
  assert.equal(await hmacHex(auditKey, 'github:gh-test-1'), expected);
  assert.notEqual(expected, await sha256Hex('github:gh-test-1'));
});

test('seal/open: round trip, random IV, and null for wrong AAD, tampering, other keys or junk', async () => {
  const { stateKey } = await deriveKeys(SECRET);
  const { stateKey: otherKey } = await deriveKeys(SECRET + '-other');
  const a = await sealJson(stateKey, { v: 1, p: 'github', s: 'x' }, 'sl_oauth|github');
  const b = await sealJson(stateKey, { v: 1, p: 'github', s: 'x' }, 'sl_oauth|github');
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(await openJson(stateKey, a, 'sl_oauth|github'), { v: 1, p: 'github', s: 'x' });
  assert.equal(await openJson(stateKey, a, 'sl_oauth|google'), null);
  assert.equal(await openJson(otherKey, a, 'sl_oauth|github'), null);
  const raw = b64urlDecode(a);
  raw[raw.length - 1] ^= 1;
  assert.equal(await openJson(stateKey, b64urlEncode(raw), 'sl_oauth|github'), null);
  raw[raw.length - 1] ^= 1;
  raw[3] ^= 1;
  assert.equal(await openJson(stateKey, b64urlEncode(raw), 'sl_oauth|github'), null);
  for (const junk of ['', 'abc', 'not base64!', b64urlEncode(new Uint8Array(20)), undefined]) {
    assert.equal(await open(stateKey, junk, 'sl_oauth|github'), null);
  }
  const bytes = await open(stateKey, await seal(stateKey, 'plain', 'aad'), 'aad');
  assert.equal(new TextDecoder().decode(bytes), 'plain');
});

test('hmacHex is deterministic per key and message', async () => {
  const { auditKey } = await deriveKeys(SECRET);
  const { auditKey: other } = await deriveKeys(SECRET + '-other');
  const h = await hmacHex(auditKey, 'github:1');
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(h, await hmacHex(auditKey, 'github:1'));
  assert.notEqual(h, await hmacHex(auditKey, 'github:2'));
  assert.notEqual(h, await hmacHex(other, 'github:1'));
});
