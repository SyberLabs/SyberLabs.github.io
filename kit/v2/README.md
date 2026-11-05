# SyberLabs Design System v2 "Atlas" kit

Canonical home: https://syberlabs.io/kit/v2/ (source: `kit/v2/` in SyberLabs.github.io). Spec: SPEC-v2.
Files: `syber-atlas.css` (tokens + components), `syber-atmosphere.js` (Plate I engine), `syber-sigil.js` (product sigils), `syber-mark-96.png`, `demo.html`.

## Current website direction: immersive mathematical media

The current website direction refines this existing kit. It does not introduce a second kit or replace the vendored component API. For the SyberLabs website, the direction below takes precedence over the legacy serif, spectrum and framed-plate presentation described later. Existing app consumers retain their current tokens and components.

- **Palette (Midnight theme, October 30, 2026):** Midnight Black `#02070A` surfaces, off-white text, quiet cool secondary text, Electric Blue `#0297DE` as the system's light (links, focus, structure, the wordmark and the graded Gyre) and Cantaloupe Orange `#FC734D` used a little, as heat: solid action buttons, live signals, the factory's Admit step and the warm horizon under the hero. Text on either colour fill is Midnight (6.3:1 on blue, 7.4:1 on orange; white on the blue fails). The website defines these once as scoped `--sy-*` overrides at the end of `src/syberlabs.css`; this kit file keeps its own tokens for vendored apps. Product artwork (the RISE hero, Midjourney pieces) keeps its own colours. Avoid rainbow emphasis, purple haze and competing accents on this surface.
- **Typography:** Instrument Sans for headings and body copy, with clean bold names and titles and comfortable line spacing. Use 400/500/600 weights already supported by the kit. Serif and spectrum italics remain available to existing consumers but are not the website hero treatment. Reserve mono for occasional useful metadata.
- **Composition:** mathematical motion fills the entire hero, including behind the copy. Use a subtle full-width or lower-edge tint and local text shadows for contrast, rather than an opaque left-half mask. Keep generous whitespace and a sparse left-aligned hierarchy. Keep headings, supporting copy and actions as real HTML. Do not recreate the composition as a flattened screenshot or a stack of bordered cards.
- **Conversion:** the hero leads with the SyberLabs name, one line on what the company builds and its four products, followed by `Book a consultation` as the primary action and `Explore products` as the secondary action. The same action closes the page and stays in the header at every width. Avoid competing hero actions and fabricated customer logos, testimonials, usage statistics or product proof.
- **Navigation:** keep the header visually quiet. Products, Factory and Services may be prominent, while the existing menu, privacy and account routes must remain reachable and keyboard accessible at every breakpoint. Sparse presentation does not authorize removing functionality.
- **Responsive media:** choose the mobile crop deliberately so the mathematical subject remains legible and text has its own calm reading area. Use scoped `object-position` or canvas composition changes rather than shrinking the desktop scene wholesale. Let actions wrap or stack without clipping; keep navigation and media controls reachable.
- **Video:** a product film uses a native `<video controls>` with an accessible name, an appropriate poster, captions for speech and a transcript. Keep native playback and keyboard controls. Show a play affordance only when a working video is available, and derive any duration from the actual asset. Decorative background motion stays muted, has a still fallback, respects reduced motion and can be paused when it runs for more than five seconds. It must never carry essential copy.
- **Selected work:** continue the same restrained palette and spatial rhythm into project rows. Use actual project information and imagery. Project media supports the work rather than posing as evidence of capabilities or results that have not been verified.

Apply these choices through the website's existing stylesheet and page components, using scoped `--sy-*` overrides where needed. Do not globally retokenize shared app consumers merely to match one hero. No new framework, dependency or parallel design-system directory is required.

Acceptance checks: inspect the rendered hero at laptop and mobile widths; verify copy and control contrast over the brightest frame, keyboard focus, menu routes, both hero destinations, real video playback, reduced-motion behavior and the static fallback. A mockup establishes art direction, not evidence that those checks passed.

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
// -> { supported: boolean, pause(), resume(), destroy() }. supported:false = no WebGL2, a failIfMajorPerformanceCaveat probe fails, or the
// renderer is software (SwiftShader/llvmpipe/softpipe/Basic Render); the canvas is hidden, so the CSS nebula shows.
// allowSoftware: true skips the software guard. Screenshot tooling only, never for real visitors.
import { params, draw, drawAll } from './syber-sigil.js';
params('relay');                       // { P:[a,b,c,d], box, caption }  (pure, same everywhere)
draw(canvas, 'relay', { color: '#62e3d8', animate: true });  // -> { P, caption, cancel() }
drawAll(document);                     // canvas[data-sigil="relay"][data-color][data-caption-for] drawn on scroll-in
```
- `hero`: 160k particles, placed right of `avoid` on wide screens and above the copy on phones. It sets `--cx/--cy/--s` on the parent for `RING_SVG`.
- `ambient`: 40k particles, slower, 35% intensity, full-bleed. Always put `sy-scrim--heavy` over it.
- Sigil names are trimmed and lower-cased. Product seeds: `rise`, `omnios`, `syberwork`, `relay`, `osahr`. For record fingerprints, seed by the ID.
- In apps with a first-load budget, lazy-load the atmosphere: `import('./syber-atmosphere.js').then(m => m.mount(...))`, and call `destroy()` on unmount.

## Rules (accessibility and performance)
1. One live plate per view. Sigils are static once drawn.
2. The canvas is always `aria-hidden="true"`, `pointer-events:none` and the lowest z-index of its container. For the full-bleed website hero, motion may sit behind copy. Use subtle tints and local text contrast so every text run keeps ≥4.5:1 (≥3:1 for display ≥24px) against the brightest frame.
3. Reduced motion is detected automatically. It gives one still exposure, sigils render instantly, and CSS transitions and animations are off.
4. All copy lives in the served HTML. The canvas is progressive enhancement, and the page reads fine with JS disabled or without WebGL2.
5. The engine renders ≤1 texel per CSS px and at most 60 frames a second, pauses off-screen (IntersectionObserver) and while the tab is hidden, `pause()`/`resume()` hold the frame while something covers the plate (a full-screen menu), and `destroy()` cancels the RAF and loses the GL context.
6. Status is always shown as dot + word, never as colour alone. Nothing is set below 12px, and serif is never used below 32px.

The reading pages (projects, services, research, approach, stack, Jev, Kev, the RISE demo) share the homepage's Midnight surface; the earlier page-local ivory blocks were removed. The homepage keeps the cinematic motion stage. All use Instrument Sans and real project media.

### Homepage first-visit reveal

The hero is one composition over one muted, looping Gyre clip (`media/demos/gyre-full-*.mp4`), full-bleed on every
screen, with a portrait cut on phones. The title is `SyberLabs` in chromatic blue: a chrome gradient clipped to
Instrument Sans letters, built from stacked solid copies of the word, never an outline stroke (Instrument Sans draws
letters from overlapping contours, and a stroke traces their inner joints as visible seams).

On the first visit in a tab the panel rises in step with the clip (`REVEAL` in `src/hero-media.js`). A slow or blocked
clip, scrolling, reduced motion or a media error all end in the same full layout; return visits and script-free pages
start there. If autoplay is refused, the poster shows and the first tap or key press starts the motion. Do not
restore a permanent opaque half-screen mask.

The factory section carries the company's identity with two Midjourney pieces, the chrome emblem and the agent
network (`media/lab/`), credited "Illustration made with Midjourney".

### Editable brand assets

`brand/` contains a transparent color S mark, a `currentColor` monochrome mark
and a portable lockup with an outlined Instrument Sans wordmark. These are
editable adaptations of the existing `syber-logo.png`, not a preexisting
official vector or a pixel-perfect trace. Existing live PNGs remain unchanged.
See [provenance and usage](brand/PROVENANCE.md), the preserved
[font license](brand/Instrument-Sans-OFL.txt) and the
[light/dark size preview](brand/preview.html).
