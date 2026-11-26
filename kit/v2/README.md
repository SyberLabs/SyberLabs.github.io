# SyberLabs Design System v2 "Atlas" kit

Canonical home: https://syberlabs.io/kit/v2/ (source: `kit/v2/` in SyberLabs.github.io). Spec: SPEC-v2.
Files: `syber-atlas.css` (tokens + components), `syber-atmosphere.js` (Plate I engine), `syber-sigil.js` (product sigils), `syber-mark-96.png`, `demo.html`.

## Current website direction: an AI lab

The current website direction refines this existing kit. It does not introduce a second kit or replace the vendored component API. For the SyberLabs website, the direction below takes precedence over the legacy serif, spectrum and framed-plate presentation described later. Existing app consumers retain their current tokens and components. Until November 18, 2026 the direction was "immersive mathematical media": a full-bleed clip behind the first screen and a full-height canvas for each part. The owner then asked that the homepage look like a professional AI lab's, with interface elements that react and that are about AI. On November 25, 2026 the owner asked that the homepage be a single small visual: it is now Elan with Menu under it, and the page with the full-bleed clip and the full-height canvases is the overview page at `/overview/`, where the Line stands in a card. The website's `CLAUDE.md` ("Homepage", "Overview page") is the current account; the notes below on composition and on the homepage's first screen describe the AI-lab homepage of November 18 to 25.

- **Palette (Midnight theme, October 30, 2026):** Midnight Black `#02070A` surfaces, off-white text, quiet cool secondary text, Electric Blue `#0297DE` as the system's light (links, focus, structure, and on the homepage the model and the checks) and Cantaloupe Orange `#FC734D` used a little, as heat: solid action buttons and live signals. In the Line on the overview page, green (`--sy-success`) is what passed, was approved or is published, the `Approve` button included, and orange is what was stopped or returned. Text on either colour fill is Midnight (6.3:1 on blue, 7.4:1 on orange; white on the blue fails). The website defines these once, in `src/styles/tokens.css`, under the kit's `--sy-*` names. Since November 18, 2026 the website has its own stylesheet (`src/styles/`) and no longer loads `syber-atlas.css`; this kit file keeps its own tokens for vendored apps. Product artwork (the RISE hero, Midjourney pieces) keeps its own colours. Avoid rainbow emphasis, purple haze and competing accents on this surface.
- **Typography:** Instrument Sans for headings and body copy, with clean bold names and titles and comfortable line spacing. Use 400/500/600 weights already supported by the kit. Serif and spectrum italics remain available to existing consumers but are not the website hero treatment. Reserve mono for occasional useful metadata.
- **Composition:** one grid of twelve columns holds the homepage. The first screen sets the copy on the left and one picture on the right. Every part after it opens with its name over a hairline, and what follows is rows: products, reports and published works are lines in an index, not cards. Keep generous whitespace and a left-aligned hierarchy. Keep headings, supporting copy and actions as real HTML.
- **Reaction:** what moves answers the visitor: the pointer, a press, a drag or a key. The first screen's picture is a network that is computed as it is drawn, and its inputs include the pointer's position. A press on the network sends a signal through it. A row lights under the pointer, and a product's row opens to its evidence. The recorded run lights the lines of output that back the row pointed at. The globe turns under a drag. Nothing animates on scroll, every word is on the page when it loads, reduced motion gets stills whose controls still work, and a touch screen gets presses in place of pointing.
- **Honesty of the pictures:** a picture that simulates is called an illustration beside it, and its counts are never presented as figures about a product. Evidence shown on the homepage is read from the same recorded output the product page prints.
- **Colour roles:** blue is the machine (the model, the checks, links) and orange is the person (Approve, `Book a consultation`).
- **Conversion:** `Book a consultation` is the one action: it is in the header at every width, in the first screen and at the foot of the page (CLAUDE.md, "Homepage"). It is the page's one solid button. Avoid competing solid actions and fabricated customer logos, testimonials, usage statistics or product proof.
- **Navigation:** keep the header visually quiet. Products, Research, Factory and Services may be prominent, while the existing menu, privacy and account routes must remain reachable and keyboard accessible at every breakpoint. Sparse presentation does not authorize removing functionality.
- **Responsive pictures:** on a narrow screen the first screen's picture follows the copy and is drawn for that width (`src/visuals/line.js` lays it out again); it is not the wide picture made smaller. Let actions wrap or stack without clipping; keep navigation and controls reachable.
- **Video:** a product film uses a native `<video controls>` with an accessible name, an appropriate poster, captions for speech and a transcript. Keep native playback and keyboard controls. Show a play affordance only when a working video is available, and derive any duration from the actual asset. Decorative background motion stays muted, has a still fallback, respects reduced motion and can be paused when it runs for more than five seconds. It must never carry essential copy.
- **Selected work:** continue the same restrained palette and spatial rhythm into project rows. Use actual project information and imagery. Project media supports the work rather than posing as evidence of capabilities or results that have not been verified.

Apply these choices through the website's stylesheet (`src/styles/`) and page components. Do not retokenize this kit merely to match the website: apps vendor it as it is. No new framework, dependency or parallel design-system directory is required.

Acceptance checks: inspect the rendered first screen at laptop and mobile widths; press Approve with a pointer, a finger and the keyboard; check that nothing is published without a press; verify keyboard focus, menu routes, both first-screen destinations, reduced-motion behaviour and the page without JavaScript. A mockup establishes art direction, not evidence that those checks passed.

## Vendoring
Apps copy the files into their repo (e.g. `src/vendor/syber/`) unmodified, and never hot-link. Wrap the module format only if your bundler needs it. Load fonts yourself: Instrument Serif, Instrument Sans 400/500/600, JetBrains Mono 400/500. The website serves them from its own `/fonts/` directory (`fonts/site.css`); self-host them in apps too. Tokens are `--sy-*` custom properties on `:root` and classes are `sy-*`. To map tokens onto existing variable names, write `--app-bg: var(--sy-ink)`.

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

The reading pages (projects, services, research, approach, stack, Jev, Kev, the RISE demo) share the homepage's Midnight surface; the earlier page-local ivory blocks were removed. All use Instrument Sans and real project media.

### The homepage's first screen

The first screen is the headline ("Take no machine at its word.", the site's one motto, after the Royal Society's
"Nullius in verba"), a line saying what the company makes ("software for checking AI's work"), two actions and the Line:
a model drawn as a small network, and under it the stations Propose, Check, Review and Approve. A change that reaches
Approve waits until the visitor presses `Approve`, and only then turns onto the published line. `src/visuals/line.js`
draws it and `src/visuals/line-sim.js` holds its rules. The headline is set in the site's one title style
(`main h1`); the SyberLabs name is in the header.

Without JavaScript the five steps read as a numbered list. With reduced motion the picture is drawn once and a press
on `Approve` draws it again. The picture pauses off screen, in a hidden tab and behind the open Menu. The link to the
game sits above the title at every width.

The factory page (`/factory/`) carries two Midjourney pieces, the chrome emblem and the agent network (`media/lab/`),
credited "Illustration made with Midjourney".

### Editable brand assets

`brand/` contains a transparent color S mark, a `currentColor` monochrome mark
and a portable lockup with an outlined Instrument Sans wordmark. These are
editable adaptations of the existing `syber-logo.png`, not a preexisting
official vector or a pixel-perfect trace. Existing live PNGs remain unchanged.
See [provenance and usage](brand/PROVENANCE.md), the preserved
[font license](brand/Instrument-Sans-OFL.txt) and the
[light/dark size preview](brand/preview.html).
