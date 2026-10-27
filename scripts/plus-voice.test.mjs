import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../plus/plus.js', import.meta.url), 'utf8');
const voice = (name, extra = {}) => ({ name, lang: 'en-US', voiceURI: name, default: false, ...extra });

async function spokenVoice(voices, lang = 'en-US') {
  let click, spoken;
  const classes = { add() {}, remove() {}, toggle() {} };
  const button = { dataset: { text: 'A short original test.' }, setAttribute() {}, addEventListener(type, fn) { if (type === 'click') click = fn; } };
  const stage = { textContent: '', appendChild() {} };
  const status = { textContent: 'Ready.' };
  const host = {
    classList: classes,
    querySelector: selector => selector === '[data-words]' ? stage : status,
    querySelectorAll: () => [button]
  };
  const synth = { getVoices: () => voices, cancel() {}, speak(utterance) { spoken = utterance; } };
  const Utterance = class { constructor(text) { this.text = text; this.voice = null; } };
  const document = {
    documentElement: { lang }, querySelector: () => host, addEventListener() {},
    createElement: () => ({ classList: classes }), createTextNode: text => ({ textContent: text })
  };
  runInNewContext(source, {
    document, window: { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance },
    SpeechSynthesisUtterance: Utterance, addEventListener() {}, setTimeout: () => 1, clearTimeout() {}
  });
  await click();
  return spoken?.voice;
}

test('Plus speaks with Apple Premium or Enhanced ahead of the compact default', async () => {
  const compact = voice('Samantha', { voiceURI: 'com.apple.voice.compact.en-US.Samantha', default: true });
  for (const quality of ['premium', 'enhanced']) {
    const downloaded = voice('Ava', { voiceURI: `com.apple.voice.${quality}.en-US.Ava` });
    assert.equal(await spokenVoice([compact, downloaded]), downloaded);
  }
});

test('Plus recognizes Neural names and premium URI signals before Google', async () => {
  const google = voice('Google US English');
  for (const candidate of [voice('Microsoft Ava Neural'), voice('Ava (Premium)'), voice('Samantha (Enhanced)')]) {
    assert.equal(await spokenVoice([google, candidate]), candidate);
  }
});

test('Plus chooses a real language voice when Apple marks every voice default', async () => {
  const novelty = voice('Zarvox', { default: true });
  const compact = voice('Samantha', { voiceURI: 'com.apple.voice.compact.en-US.Samantha', default: true });
  const enhanced = voice('Samantha', { voiceURI: 'com.apple.voice.enhanced.en-US.Samantha', default: true });
  assert.equal(await spokenVoice([novelty, compact, enhanced]), enhanced);
  const plain = voice('Nicky');
  assert.equal(await spokenVoice([novelty, plain]), plain);
});

test('Plus preserves locale, base-language and single-language natural preferences', async () => {
  const us = voice('Samantha', { default: true }), uk = voice('Daniel (Premium)', { lang: 'en-GB' });
  assert.equal(await spokenVoice([uk, us]), us);
  assert.equal(await spokenVoice([voice('Thomas', { lang: 'fr-FR' }), uk], 'en-AU'), uk);
  const multi = voice('Microsoft AvaMultilingual Online (Natural)'), natural = voice('Microsoft Ava Online (Natural)');
  assert.equal(await spokenVoice([multi, natural]), natural);
  assert.equal(await spokenVoice([voice('Thomas', { lang: 'fr-FR' })]), null);
});
