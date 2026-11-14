#!/usr/bin/env python3
"""Grades an engine plate into the site's Midnight theme (src/syberlabs.css): luminance is mapped onto
Midnight Black -> Electric Blue -> white, so every plate reads as one family on the page and its ground is
exactly the page's ground. Called by scripts/engine-plates.mjs.

  engine-grade.py in.png out.webp SIZE BLACK GAMMA [--round]     square plate, plus out-560.webp for cards
  engine-grade.py in.png out.webp --wide W H BLACK GAMMA          wide plate, cropped to W:H

BLACK is the input level that becomes the ground (an engine's own paper tone drops out), GAMMA shapes the
midtones. Every square plate fades to the ground before its edge: along a rounded square by default, along a
circle with --round (for a field that fills the frame).
"""
import sys
import numpy as np
from PIL import Image

GROUND = np.array([2, 7, 10], dtype=np.float32) / 255.0                       # Midnight Black #02070A
STOPS = np.array([0.0, 0.22, 0.58, 0.84, 1.0], dtype=np.float32)
RAMP = np.array([[2, 7, 10], [3, 40, 72], [2, 151, 222], [150, 214, 250], [255, 255, 255]], dtype=np.float32) / 255.0  # through Electric Blue #0297DE


def grade(im, black, gamma):
    a = np.asarray(im.convert('RGB')).astype(np.float32) / 255.0
    lum = a.max(axis=2) * 0.6 + (a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)) * 0.4
    lum = np.clip((lum - black) / (1.0 - black), 0, 1) ** gamma
    return np.stack([np.interp(lum, STOPS, RAMP[:, c]) for c in range(3)], axis=2)


def save(g, path, quality=80):
    Image.fromarray((np.clip(g, 0, 1) * 255 + 0.5).astype(np.uint8)).save(path, 'WEBP', quality=quality, method=6)
    print(path)


src, out = sys.argv[1], sys.argv[2]
im = Image.open(src)
w, h = im.size
if '--wide' in sys.argv:
    i = sys.argv.index('--wide')
    tw, th, black, gamma = int(sys.argv[i + 1]), int(sys.argv[i + 2]), float(sys.argv[i + 3]), float(sys.argv[i + 4])
    ch = min(h, round(w * th / tw))
    im = im.crop((0, (h - ch) // 2, w, (h - ch) // 2 + ch)).resize((tw, th), Image.LANCZOS)
    g = grade(im, black, gamma)
    # fade all four edges into the ground
    rows = np.clip(np.minimum(np.arange(th), th - 1 - np.arange(th)) / (th * 0.14), 0, 1).astype(np.float32)[:, None, None]
    cols = np.clip(np.minimum(np.arange(tw), tw - 1 - np.arange(tw)) / (tw * 0.07), 0, 1).astype(np.float32)[None, :, None]
    save(GROUND + (g - GROUND) * rows * cols, out, 78)
else:
    size, black, gamma = int(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
    s = min(w, h)
    im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).resize((size, size), Image.LANCZOS)
    g = grade(im, black, gamma)
    # Fade to the ground before the edge, so the plate has no visible square on the page: along a circle for a
    # full-bleed field (--round), otherwise along a rounded square that leaves the figure's corners alone.
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    x, y = np.abs(xx - size / 2) / (size / 2), np.abs(yy - size / 2) / (size / 2)
    r = np.hypot(x, y) if '--round' in sys.argv else (x ** 5 + y ** 5) ** 0.2
    g = GROUND + (g - GROUND) * np.clip((1.0 - r) / (0.16 if '--round' in sys.argv else 0.1), 0, 1)[..., None]
    save(g, out)
    small = Image.fromarray((np.clip(g, 0, 1) * 255 + 0.5).astype(np.uint8)).resize((560, 560), Image.LANCZOS)
    small.save(out.replace('.webp', '-560.webp'), 'WEBP', quality=78, method=6)
    print(out.replace('.webp', '-560.webp'))
