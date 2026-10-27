// An inactive slot is valid. Activation must never publish an absent or incomplete film.
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MATEO_VIDEO as video } from '../src/mateo-video.js';

if (video) {
  for (const key of ['src', 'poster', 'captions', 'transcriptFile']) {
    assert.match(video[key], /^\/mateo\/media\/[a-z0-9.-]+$/i, `Invalid local ${key} path`);
    const file = await stat(resolve(video[key].slice(1)));
    assert.ok(file.isFile() && file.size > 0, `Missing ${key}`);
  }
  assert.ok(typeof video.credit === 'string' && video.credit.trim(), 'Verified credit/provenance wording is required');
  assert.ok(video.durationSeconds >= 45 && video.durationSeconds <= 60, 'Verify the real 45–60 second duration');
  assert.ok((await stat(resolve(video.src.slice(1)))).size <= 25 * 1024 * 1024, 'Video exceeds 25 MiB');
  assert.match(await readFile(resolve(video.captions.slice(1)), 'utf8'), /^WEBVTT(?:\r?\n|\s)/, 'English captions must be WebVTT');
  assert.ok(Array.isArray(video.transcript) && video.transcript.length, 'A static transcript is required');
  const spoken = video.transcript.join(' ').replace(/\s+/g, ' ').trim();
  const delivered = (await readFile(resolve(video.transcriptFile.slice(1)), 'utf8')).replace(/\s+/g, ' ').trim();
  assert.equal(spoken, delivered, 'Static and downloadable transcript must match');
  assert.ok(spoken.startsWith('Hi, my name is Mateo Robles'), 'Keep the exact opening');
  assert.ok(spoken.includes('Everybody deserves a chance'), 'Keep the exact motto');
  console.log('mateo-video: complete local delivery present; media/player acceptance still required');
} else {
  console.log('mateo-video: inactive; no unfinished film presented as live');
}
