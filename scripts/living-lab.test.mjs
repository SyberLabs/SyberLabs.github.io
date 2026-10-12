import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { characters, cleanText, limitText, longText, makeScene, MAX_CHARACTERS, phraseDuration, SAMPLES } from '../src/living-lab/scene.js';

test('blank and whitespace input produces no scene', () => {
  for (const text of ['', ' \n\t ']) assert.deepEqual(makeScene(text), { text: '', phrases: [] });
});
test('text is normalized and kept literal, never parsed as markup', () => {
  const text = '<img src=x onerror=alert(1)> <script>alert(1)</script>';
  assert.equal(makeScene(text).text, text);
  assert.equal(cleanText(' a\n\t b\u0000 '), 'a b');
});
test('input is bounded for large paste and unbroken words', () => {
  for (const text of ['x'.repeat(10000), 'word '.repeat(2000)]) {
    assert.equal(characters(limitText(text)).length, MAX_CHARACTERS);
    assert.ok(characters(makeScene(text).text).length <= MAX_CHARACTERS);
  }
});
test('Unicode bounds never cut an emoji cluster or combining mark', () => {
  const cluster = '👩🏽‍🚀';
  assert.equal(limitText(cluster.repeat(181)), cluster.repeat(180));
  assert.equal(limitText('e\u0301'.repeat(181)), 'e\u0301'.repeat(180));
  const text = '👩🏽‍🚀 café e\u0301 — 你好 世界 مرحبا';
  assert.equal(makeScene(text).text, text);
  assert.equal(limitText('e' + '\u0301'.repeat(100000)), '');
  assert.equal(limitText('valid ' + 'e' + '\u0301'.repeat(100000)), 'valid ');
});
test('every punctuation-only or one-character scene is playable', () => {
  for (const text of ['a', '.', '!?', '你好', '...hello', 'a,b,c', 'a。b！']) {
    const scene = makeScene(text);
    assert.ok(scene.phrases.length > 0);
    assert.equal(scene.phrases.join('').replace(/\s/g, ''), scene.text.replace(/\s/g, ''));
  }
});
test('unspaced scripts and long tokens are paced without cutting graphemes', () => {
  for (const text of ['界'.repeat(100), '界'.repeat(180), '👩🏽‍🚀'.repeat(180), 'x'.repeat(180)]) {
    const scene = makeScene(text);
    assert.ok(longText(scene.text));
    assert.ok(scene.phrases.every(phrase => characters(phrase).length <= 32));
    assert.equal(scene.phrases.join(''), text);
  }
});
test('playback stays bounded to six deterministic phrase holds', () => {
  for (const input of ['a '.repeat(90), 'a,'.repeat(90), ...SAMPLES.map(sample => sample.text)]) {
    const scene = makeScene(input);
    assert.deepEqual(scene, makeScene(input));
    assert.ok(scene.phrases.length <= 6);
    assert.ok(scene.phrases.every(phrase => phraseDuration(phrase) >= 1980 && phraseDuration(phrase) <= 2880));
    assert.ok(scene.phrases.reduce((sum, phrase) => sum + phraseDuration(phrase), 0) <= 17280);
  }
});
test('missing Intl.Segmenter keeps the module and bounded still reading usable', () => {
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    Intl.Segmenter = undefined;
    const renderer = await import('./src/living-lab/scene.js');
    assert.equal(renderer.supportsGraphemes, false);
    assert.equal(renderer.makeScene('A still reading.').text, 'A still reading.');
    assert.equal(renderer.limitText('x'.repeat(100000)).length, 180);
    assert.equal(renderer.limitText('😀'.repeat(1000)), '😀'.repeat(180));
  `], { cwd: new URL('../', import.meta.url), stdio: 'pipe' });
});
