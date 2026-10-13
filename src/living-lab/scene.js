// A local, bounded text renderer. Text is never code, markup, a URL or a model prompt.
export const MAX_CHARACTERS = 180;
const MAX_CODE_UNITS = 2048;
export const SAMPLES = [
  { label: 'After the rain', text: 'After the rain, the city holds a thousand tiny suns.', atmosphere: 'spectrum' },
  { label: 'A small wonder', text: 'A small light finds its way through the dark, and everything begins again.', atmosphere: 'ember' },
  { label: 'Cosmic drift', text: 'Somewhere between the stars, a quiet thought becomes a world.', atmosphere: 'glacier' },
];

const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
// Older browsers retain a usable static reading; the component gates playback on full grapheme support.
export const supportsGraphemes = !!segmenter;
export const characters = text => segmenter ? [...segmenter.segment(text)].map(part => part.segment) : Array.from(text);
export function limitText(text) {
  // A single combining cluster can be arbitrarily large. Bound work before segmentation,
  // and drop a cluster crossing the secondary ceiling rather than cutting through it.
  const prefix = text.slice(0, MAX_CODE_UNITS + 64);
  if (!segmenter) return Array.from(prefix).slice(0, MAX_CHARACTERS).join('');
  const parts = [];
  for (const part of segmenter.segment(prefix)) {
    if (parts.length >= MAX_CHARACTERS || part.index + part.segment.length > MAX_CODE_UNITS) break;
    parts.push(part.segment);
  }
  return parts.join('');
}
export const cleanText = text => limitText(text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\s+/gu, ' ').trim());
export const longText = text => characters(text).length > 100 || text.split(/\s+/u).some(word => characters(word).length > 24);

export function makeScene(input) {
  const text = cleanText(input);
  const phrases = [];
  for (const clause of text.match(/[^.!?;,:。！？、，；：]*[.!?;,:。！？、，；：]+|[^.!?;,:。！？、，；：]+$/gu) || []) {
    const words = clause.trim().split(/\s+/u);
    if (words.length === 1 && characters(words[0]).length > 32) {
      const glyphs = characters(words[0]);
      for (let i = 0; i < glyphs.length; i += 32) phrases.push(glyphs.slice(i, i + 32).join(''));
      continue;
    }
    for (let i = 0; i < words.length; i += 6) phrases.push(words.slice(i, i + 6).join(' '));
  }
  if (text && !phrases.length) phrases.push(text);
  // Even punctuation-heavy or one-letter input finishes in at most six holds.
  const size = Math.ceil(phrases.length / 6);
  const bounded = [];
  for (let i = 0; i < phrases.length; i += size) bounded.push(phrases.slice(i, i + size).join(' '));
  return { text, phrases: bounded };
}

export function phraseDuration(phrase) {
  return 1800 + Math.min(6, phrase.split(/\s+/u).length) * 180;
}
