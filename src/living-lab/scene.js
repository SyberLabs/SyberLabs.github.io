// A local, bounded text renderer. Text is never code, markup, a URL or a model prompt.
export const MAX_CHARACTERS = 180;
const MAX_CODE_UNITS = 2048;

const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
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
