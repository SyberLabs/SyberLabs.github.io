import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cleanText, limitText, MAX_CHARACTERS } from '../src/living-lab/scene.js';

test('text is normalized and kept literal, never parsed as markup', () => {
  const text = '<img src=x onerror=alert(1)> <script>alert(1)</script>';
  assert.equal(cleanText(text), text);
  assert.equal(cleanText(' a\n\t b\u0000 '), 'a b');
});
test('input is bounded for large paste and unbroken words', () => {
  for (const text of ['x'.repeat(10000), 'word '.repeat(2000)]) {
    assert.equal(limitText(text).length, MAX_CHARACTERS);
    assert.ok(cleanText(text).length <= MAX_CHARACTERS);
  }
});
test('Unicode bounds never cut an emoji cluster or combining mark', () => {
  const cluster = '👩🏽‍🚀';
  assert.equal(limitText(cluster.repeat(181)), cluster.repeat(180));
  assert.equal(limitText('e\u0301'.repeat(181)), 'e\u0301'.repeat(180));
  const text = '👩🏽‍🚀 café e\u0301 — 你好 世界 مرحبا';
  assert.equal(cleanText(text), text);
  assert.equal(limitText('e' + '\u0301'.repeat(100000)), '');
  assert.equal(limitText('valid ' + 'e' + '\u0301'.repeat(100000)), 'valid ');
});
test('missing Intl.Segmenter keeps the module and bounded still reading usable', () => {
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    Intl.Segmenter = undefined;
    const renderer = await import('./src/living-lab/scene.js');
    assert.equal(renderer.cleanText('A still reading.'), 'A still reading.');
    assert.equal(renderer.limitText('x'.repeat(100000)).length, 180);
    assert.equal(renderer.limitText('😀'.repeat(1000)), '😀'.repeat(180));
  `], { cwd: new URL('../', import.meta.url), stdio: 'pipe' });
});
