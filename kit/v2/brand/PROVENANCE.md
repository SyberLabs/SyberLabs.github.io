# SyberLabs editable vector adaptation

Created 27 October 2026 from the existing website's folded prismatic S ribbon.
This is a new vector adaptation of that raster identity, not a preexisting
official vector, a new logo concept or a pixel-perfect trace. The editable
faces preserve its silhouette, folds and cyan/blue/off-white character; raster
grain, tiny edge irregularities and complex reflections are simplified.

## Source record

- Visual source: repository-root `syber-logo.png`, 651 × 720 pixels, at website
  commit `888d90c`. SHA-256:
  `e5ca498864e528bc0e96e18a80d31c844a886e824bc0015d72e88790104be3ad`.
- Older `syber-mark.png`, 512 × 512 pixels, remains unchanged and was not used
  as a substitute for the source above. Its SHA-256 is
  `5c196fc6f3a00a7d39dd603b18816f8e93f9c90dd65a76ee6e40e660d06ffcb4`.
- Wordmark source: the supplied `InstrumentSans.ttf`, 194,336 bytes, reported
  by CoreText as `InstrumentSans-Regular`. SHA-256:
  `b24f1812584816958afcf22e22d08e44318c5e51651e25d2438efdde389b33b1`.
- Copyright 2022 The Instrument Sans Project Authors. The supplied SIL Open
  Font License 1.1 is preserved verbatim in `Instrument-Sans-OFL.txt`, SHA-256
  `9e27a72ed30eb49a08678f6a5d6ed98ec7ba5368f541637ee0683ec9134ef966`.
  The font binary is not redistributed here. The lockup contains glyph outlines
  exported from that font, with normal glyph positioning, not live text.

## Files and use

- `syberlabs-mark-color.svg`: transparent editable mark, named fold paths and
  linear gradients in a `651 720` view box. No embedded raster or font.
- `syberlabs-mark-monochrome.svg`: one transparent silhouette path using
  `currentColor`. Face shading is intentionally absent at small sizes.
- `syberlabs-lockup.svg`: color mark and an outlined Instrument Sans wordmark.
  The wordmark uses `currentColor`; the font does not need to be installed.
- `preview.html`: self-contained inline preview on ivory and nearly black,
  with 32px, 96px and expandable full-size 1024px samples.
- `preview.png`: rendered contact sheet; its 1024px samples are reduced to
  256px for comparison. This is a preview only, not source artwork.

Use the mark at small sizes; use the lockup at 192px wide or larger when the
name must remain readable. Set the surrounding CSS `color` for inline
monochrome marks and lockups. A standalone SVG loaded through `<img>` does
not inherit the host page's `color` and defaults to black. For repeated inline
copies, prefix every SVG ID and its references to avoid document-wide ID
collisions. Retain an accessible name, or hide a decorative mark when adjacent
text already names SyberLabs. Keep aspect ratio and clear space around the mark.

## Verification

All three SVGs were parsed as XML and checked for unique IDs, local references,
paths, transparent backgrounds and the absence of image/text elements, external
links, font dependencies, scripts, filters and foreign objects. They were
rendered with the available Sharp/librsvg runtime at 32px, 96px and 1024px widths
on both ivory and nearly black. The contact sheet was visually inspected.
These are rendering and scaling checks, not a claim of pixel-perfect matching.

The existing live raster files and headers remain unchanged. No brand ownership
or trademark rights are transferred by this adaptation. Font attribution above
applies to the wordmark's source font, not to the SyberLabs logo artwork.
