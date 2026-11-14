# Engine plates

The pictures in `media/engines/` are drawn by the Engines repository's procedural engines
(https://github.com/sykosyber/engines), run unmodified in headless Chromium, then graded into the site's
Midnight theme so each plate's ground is the page's ground and its light is Electric Blue.

| File | Engine | Seed | Engine settings changed from the seed's own | Used on |
|---|---|---|---|---|
| `vestigia-syberwork` | Vestigia | `SYBERWORK` | palette ice, zoom 0.72, abandoned branches 0.34, link weight 0.1, bloom 0.55, thickness 1.35 | SyberWork page hero, homepage product card |
| `vestigia-factory` | Vestigia | `FACTORY` | as above, zoom 0.98 | homepage factory section, `/factory/` |
| `interferentia-attest` | Interferentia | `ATTEST` | palette ice, forms plane and radial, warp 0, line 1.7, fringes 1.5 | Attest page hero, homepage product card |
| `ostensoria-rise` | Ostensoria | `RISE` | palette ice | homepage product card |
| `sophia-flyspace` | Sophia | none (the engine has no seed) | none | FLYSPACE page hero, homepage product card |
| `civitas-services` | Civitas | `7` | none | `/services/` |

Why each engine sits where it does:

- **Vestigia with SyberWork.** The engine grows a tree toward a cloud of points and keeps every branch it tried
  beside the ones that survived. SyberWork logs every proposed change, including the ones that were refused.
- **Interferentia with Attest.** The engine computes two fields and draws only the contours of their difference.
  Attest runs a document against the running app and reports where they differ.
- **Ostensoria with RISE.** The engine folds one chaotic orbit into a rose-window form. RISE's Library includes a Chapel.
- **Sophia with FLYSPACE.** Nodes on field lines around one centre, as data sources are wired to one assistant.
- **Civitas with services.** Generated human figures. Every engagement keeps a person in the approval step.

These pairings explain the choice to maintainers. Public captions state only what the engine does.

## Regenerating

```
git clone https://github.com/sykosyber/engines /path/to/engines
node scripts/engine-plates.mjs /path/to/engines           # all plates
node scripts/engine-plates.mjs /path/to/engines attest    # one plate
```

`scripts/engine-plates.mjs` serves the checkout on a local port, sets each engine's own panel controls,
captures its canvas, and calls `scripts/engine-grade.py` (Pillow and NumPy) for the grade and the 560px card
size. Plates are seeded, so the same checkout gives the same picture. The plates above were rendered from the
Engines repository at commit `1c60f55`. After regenerating a plate, bump the `?v=` on any stylesheet you
changed and check the pages at laptop and phone widths.

Public captions name the engine and the seed and say what the engine does. They never present a plate as a
screenshot of a product. Pages carry no link to the Engines repository and no individual's name (CLAUDE.md).

## Licence

The engines are released under the MIT License. The plates are output of that software; the notice is kept
here with the record of their use.

```
MIT License

Copyright (c) 2025-2026 Mateo Robles

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
