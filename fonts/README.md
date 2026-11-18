# Fonts

Every typeface the site uses is served from this directory, so no page asks another company's servers for a font.

- `site.css`: Instrument Sans, Instrument Serif and JetBrains Mono. The build puts it at the top of `/syberlabs.css`
  (`vite.config.js`), so a page that links the shared stylesheet needs nothing else.
- `lacuna.css`: Cormorant Garamond, IBM Plex Mono and Marcellus, linked by the Lacuna pages.
- `rise.css`: Rubik Mono One and Literata, RISE's own typefaces, linked by the RISE product page.
- `v1/`: the `.woff2` files. They are the Latin (and, for Lacuna, Latin Extended) subsets published by Fontsource 5.3.0,
  copied unchanged. `_headers` lets browsers keep them for a year, so a changed file goes in a new directory (`v2/`)
  and the three stylesheets point there.
- `licenses/`: each family's SIL Open Font License 1.1 text, as shipped with the files.

To add a weight or a family, copy its `.woff2` from the matching `@fontsource` package, add an `@font-face` rule with
the subset's `unicode-range`, and add the licence text.
