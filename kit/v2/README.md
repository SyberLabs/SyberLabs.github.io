# SyberLabs Design System v2 "Atlas" kit

Canonical home: https://syberlabs.io/kit/v2/ (source: `kit/v2/` in SyberLabs.github.io). Spec: SPEC-v2.
Files: `syber-atlas.css` (tokens + components), `syber-atmosphere.js` (Plate I engine), `syber-sigil.js` (product sigils), `syber-mark-96.png`, `demo.html`.

## Vendoring
Apps copy the files into their repo (e.g. `src/vendor/syber/`) unmodified, and never hot-link. Wrap the module format only if your bundler needs it. Load fonts yourself: Instrument Serif, Instrument Sans 400/500/600, JetBrains Mono 400/500 (Google Fonts on the website, self-hosted in apps). Tokens are `--sy-*` custom properties on `:root` and classes are `sy-*`. To map tokens onto existing variable names, write `--app-bg: var(--sy-ink)`.

## CSS
- Base: add `sy` to `<html>` for ink/vellum/body font, focus ring and box-sizing. `.sy-starfield` adds the body texture (also exposed as `--sy-stars` / `--sy-stars-size`), and `.sy-nebula` / `.sy-nebula--center` provide the no-WebGL fallback behind a canvas.
- Type: `sy-display-xl` (one `<em>` becomes spectrum italic), `sy-display`, `sy-title`, `sy-heading`, `sy-body-lg`, `sy-body`, `sy-small`, `sy-eyebrow`/`sy-label`, `sy-caption`.
- Components: `sy-header` (fixed; `--sticky` for in-flow pages; +`__in`, `sy-lockup`, `sy-lockup__sep`, `sy-lockup__product`, `sy-nav`, `sy-menu`/`__panel`), `sy-btn` + `--solid|--line|--ghost` (disabled, `aria-busy="true"`), `sy-badge` + `--live|--early|--research|--private` (`--bare` drops the pill), `sy-plate` (+`--sigil`, `--card`), `sy-plate-figure`, `sy-plate-caption` (+`sy-params`, `--figure` with `sy-figure`), `sy-strip`, `sy-project-rows` / `sy-project-row` (+`__index __sigil __name __title __cat __body __headline __intro __stack __arrow`), `sy-field` (+`__label __hint __error`, `.is-invalid`), `sy-input`, `sy-alert` (+`--danger|--warning|--success`), `sy-skeleton`, `sy-empty`, `sy-footer` (+`__in`), `sy-atmosphere`, `sy-scrim` (+`--heavy`), `sy-ring`, `sy-nowrap` (keep a caption token such as the seed on one line).
- Accent: set `--sy-accent` on a container (e.g. `style="--sy-accent:var(--sy-accent-relay)"`). Plate ticks, row category, strip dot and sigil colour all follow it.

## JS (ES modules, no dependencies)
```js
import { mount, RING_SVG, paramLine } from './syber-atmosphere.js';
const plate = mount(canvas, { mode: 'hero' | 'ambient', avoid: copyEl, caption: paramsEl, reduced, allowSoftware });
// -> { supported: boolean, destroy() }. supported:false = no WebGL2, a failIfMajorPerformanceCaveat probe fails, or the
// renderer is software (SwiftShader/llvmpipe/softpipe/Basic Render); the canvas is hidden, so the CSS nebula shows.
// allowSoftware: true skips the software guard. Screenshot tooling only, never for real visitors.
import { params, draw, drawAll } from './syber-sigil.js';
params('relay');                       // { P:[a,b,c,d], box, caption }  (pure, same everywhere)
draw(canvas, 'relay', { color: '#62e3d8', animate: true });  // -> { P, caption, cancel() }
drawAll(document);                     // canvas[data-sigil="relay"][data-color][data-caption-for] drawn on scroll-in
```
- `hero`: 160k particles, placed right of `avoid` on wide screens and above the copy on phones. It sets `--cx/--cy/--s` on the parent for `RING_SVG`.
- `ambient`: 40k particles, slower, 35% intensity, full-bleed. Always put `sy-scrim--heavy` over it.
- Sigil names are trimmed and lower-cased. Product seeds: `rise`, `commons`, `relay`, `omnios`, `osahr`. For record fingerprints, seed by the ID.
- In apps with a first-load budget, lazy-load the atmosphere: `import('./syber-atmosphere.js').then(m => m.mount(...))`, and call `destroy()` on unmount.

## Rules (accessibility and performance)
1. One live plate per view. Sigils are static once drawn.
2. The canvas is always `aria-hidden="true"`, `pointer-events:none` and the lowest z-index of its container. Copy never sits on the plate. Use scrims so every text run keeps ≥4.5:1 (≥3:1 for display ≥24px) against the brightest frame.
3. Reduced motion is detected automatically. It gives one still exposure, sigils render instantly, and CSS transitions and animations are off.
4. All copy lives in the served HTML. The canvas is progressive enhancement, and the page reads fine with JS disabled or without WebGL2.
5. The engine renders ≤1 texel per CSS px, pauses off-screen (IntersectionObserver) and while the tab is hidden, and `destroy()` cancels the RAF and loses the GL context.
6. Status is always shown as dot + word, never as colour alone. Nothing is set below 12px, and serif is never used below 32px.
