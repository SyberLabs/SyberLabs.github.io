"""One-time recolor to the SyberLabs mark palette (see docs/BRAND.md).

Explicit maps move each role of the old palettes onto the mark's colors;
remaining dark navies are pulled toward the mark's black. Re-running is a
no-op because every target color is outside the source sets.
"""
import colorsys, re, sys
from pathlib import Path

EXPLICIT = {
    # blue accents -> colors sampled from the mark
    '#0045ff': '#0048f0', '#0037cc': '#0038c8', '#003bcf': '#0038c8', '#82a5ff': '#5b9cf6', '#a9c1ff': '#9cc3f5',
    '#9fdcff': '#90d8f0', '#dce7ff': '#e2edfb', '#f3f7ff': '#f2f5fb', '#101a30': '#070b1a', '#0b1428': '#05070e',
    '#f3f6fc': '#f4f6fb', '#e5edff': '#e7edf9', '#b9c7df': '#c5cee0', '#476080': '#1c2440',
    # calm editorial (beige / rust) -> cool paper, logo ink, cobalt
    '#f2f0e9': '#f4f6fb', '#e9e5db': '#e7edf9', '#f9f7f1': '#fbfcff', '#faf8f2': '#fbfcff', '#f3f1eb': '#f4f6fb',
    '#191917': '#070b1a', '#57564f': '#4a556e', '#66645c': '#1c2440', '#66645b': '#1c2440', '#b9b5aa': '#c5cee0',
    '#c7c2b6': '#c5cee0', '#9e4838': '#0048f0', '#8d3e30': '#0038c8', '#873b2e': '#0038c8', '#20201d': '#030407',
    '#171715': '#05060a', '#22221e': '#0a0d18', '#24231f': '#0c1122', '#24241f': '#0c1122', '#0f0f0e': '#030407',
    '#f3f0e8': '#f2f5fb', '#bbb7aa': '#a3afc8', '#d69075': '#4890f0', '#e5dab8': '#f0d8d8', '#25372d': '#0b2a86',
}

def darken_navy(hex_):
    r, g, b = (int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if 205 <= h * 360 <= 245 and s > .15 and l < .4:
        r, g, b = colorsys.hls_to_rgb(h, l * .72, min(1, s * 1.15))
        return '#%02x%02x%02x' % tuple(round(v * 255) for v in (r, g, b))
    return hex_

def recolor(text, navy):
    def sub(m):
        c = m.group(0).lower()
        if len(c) == 4:
            return m.group(0)
        c = EXPLICIT.get(c, c)
        return darken_navy(c) if navy else c
    return re.sub(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b', sub, text)

if __name__ == '__main__':
    mode = sys.argv[1]
    for f in sys.argv[2:]:
        p = Path(f); s = p.read_text(encoding='utf-8'); t = recolor(s, mode == 'navy')
        if t != s: p.write_text(t, encoding='utf-8'); print('recolored', f)
