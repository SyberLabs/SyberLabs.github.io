# SyberLabs Design System v2 "Atlas" kit

Canonical home: https://syberlabs.io/kit/v2/ (source: `kit/v2/` in SyberLabs.github.io). Spec: SPEC-v2.
Files: `syber-atlas.css` (tokens + components), `syber-atmosphere.js` (Plate I engine), `syber-sigil.js` (product sigils), `syber-mark-96.png`, `demo.html`.

## Current website direction: immersive mathematical media

The approved Mateo concept refines this existing kit. It does not introduce a second kit or replace the vendored component API. For the SyberLabs website and Mateo portfolio, the direction below takes precedence over the legacy serif, spectrum and framed-plate presentation described later. Existing app consumers retain their current tokens and components.

- **Palette:** nearly black surfaces, off-white text, quiet neutral secondary text and one restrained cyan accent. Starting values for scoped website overrides are `--sy-ink: #060809`, `--sy-vellum: #f1f0eb`, `--sy-body: #d5d7d6`, `--sy-mist: #b3b8b8` and `--sy-accent: #90d8f0`. Check contrast against the rendered media before use. Avoid rainbow emphasis, purple haze and competing accents on this surface.
- **Typography:** Instrument Sans for headings and body copy, with clean bold names and titles and comfortable line spacing. Use 400/500/600 weights already supported by the kit. Serif and spectrum italics remain available to existing consumers but are not the website hero treatment. Reserve mono for occasional useful metadata.
- **Composition:** mathematical motion fills the entire hero, including behind the copy. Use a subtle full-width or lower-edge tint and local text shadows for contrast, rather than an opaque left-half mask. Keep generous whitespace and a sparse left-aligned hierarchy. Keep headings, supporting copy and actions as real HTML. Do not recreate the composition as a flattened screenshot or a stack of bordered cards.
- **Conversion:** the Mateo hero leads with his name and a concise software-engineer introduction, followed by `Interview Mateo` as the primary action and `View résumé` as the secondary action. Preserve those destinations and the résumé download. Avoid competing hero actions, unsupported seniority claims and fabricated customer logos, testimonials, usage statistics or product proof.
- **Navigation:** keep the header visually quiet. Work and About may be prominent, while the existing menu, privacy and account routes must remain reachable and keyboard accessible at every breakpoint. Sparse presentation does not authorize removing functionality.
- **Responsive media:** choose the mobile crop deliberately so the mathematical subject remains legible and text has its own calm reading area. Use scoped `object-position` or canvas composition changes rather than shrinking the desktop scene wholesale. Let actions wrap or stack without clipping; keep navigation and media controls reachable.
- **Video:** a genuine introduction uses a native `<video controls>` with an accessible name, an appropriate poster, captions for speech and a transcript. Keep native playback and keyboard controls. Show a play affordance only when a working video is available, and derive any duration from the actual asset. Decorative background motion stays muted, has a still fallback, respects reduced motion and can be paused when it runs for more than five seconds. It must never carry essential copy.
- **Selected work:** continue the same restrained palette and spatial rhythm into project rows. Use actual project information and imagery. Project media supports the work rather than posing as evidence of capabilities or results that have not been verified.

Apply these choices through the website's existing stylesheet and page components, using scoped `--sy-*` overrides where needed. Do not globally retokenize shared app consumers merely to match one hero. No new framework, dependency or parallel design-system directory is required.

Acceptance checks: inspect the rendered hero at laptop and mobile widths; verify copy and control contrast over the brightest frame, keyboard focus, menu routes, both conversion destinations, real video playback, reduced-motion behavior and the static fallback. A mockup establishes art direction, not evidence that those checks passed.

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

The Mateo detail page uses an ivory reading surface (`#f5f3ec`), dark text (`#172c30`) and dark cyan links (`#176473`). Its header, menu and footer must remain readable in that page-local theme. The homepage keeps the cinematic near-black motion stage. Both use Instrument Sans, real project media and direct hiring actions.

### Homepage first-visit reveal

The hiring hero is one composition timed to one clip, `gyre-sophia-*.mp4`:
Gyre motion, the RISE Sophia frame drawing itself, Earth held in the frame,
then back to Gyre. On wide screens the clip sits right of the copy, scaled into
a soft vignette so the frame and Earth are always whole and never under type;
on phones it sits between the name and the panel.

The hero title is `SyberLabs` in chromatic blue: a chrome gradient clipped to
Instrument Sans letters, a fine light bezel on their edges and an embossed lit top
edge and shadow, with one slow sheen on arrival. Beneath it, "by" and Mateo's own
signature (`mateo/brand/mateo-robles-signature.webp`, alt text "Mateo Robles"),
which writes itself in from the left on the first visit.

The Sophia frame holds a different picture on each pass of the clip, chosen at
random without repeating, and it always holds something warm against the blue
page: Earth (in the clip), The Pink Cloud (Henri-Edmond Cross, CC0 at the
Cleveland Museum of Art) or one of Mateo's own pieces, laid exactly over Earth's
disc (`src/frame-art.js` holds the measured disc and timing). The credit line
under the hero names every picture and highlights the one in the frame. Keep
baked-in text out of the frame.

Mateo's own Midjourney pieces carry the lab's identity below the hiring content:
the chrome emblem and the agent network in the lab section. Credit them as
"Mateo Robles, made with Midjourney".

On the first visit in a tab the page follows the clip's own playback time
(`REVEAL` in `src/hero-media.js`): with the Gyre the name rises (readable within
a second); as the frame draws, the role follows; once Earth is framed, at about
5.7 seconds, the panel rises with the line, `Interview Mateo`, `View résumé` and
availability. Interview and Résumé stay in the header throughout, and the panel
is inert only while hidden. A slow or blocked clip, scrolling, playing the film,
reduced motion or a media error all end in the same full layout; return visits
and script-free pages start there. The clip keeps looping behind the settled
page. Keep NASA/GSFC's visible linked image acknowledgment. Keep the panel beside
or below Earth, never over it, and do not restore a permanent opaque half-screen
mask.

### Editable brand assets

`brand/` contains a transparent color S mark, a `currentColor` monochrome mark
and a portable lockup with an outlined Instrument Sans wordmark. These are
editable adaptations of the existing `syber-logo.png`, not a preexisting
official vector or a pixel-perfect trace. Existing live PNGs remain unchanged.
See [provenance and usage](brand/PROVENANCE.md), the preserved
[font license](brand/Instrument-Sans-OFL.txt) and the
[light/dark size preview](brand/preview.html).
