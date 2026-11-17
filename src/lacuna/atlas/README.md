# Lacuna Atlas (the first page of /lacuna/)

A globe of research sites that unrolls into an Equal Earth map, with a time bar
that turns the clock back 25,000 years (sea level, ice sheets, Green Sahara).

- `page.tpl.html`: page, styles and code, with placeholders for the data.
- `sites.js`: the research sites (text, sources, image credits). Edit this to add or change a site.
- `data/`: world-atlas 2.0.2 TopoJSON (ISC, see `world-atlas-LICENSE`), `paleo.json`
  (schematic ice sheets, Green Sahara, Lake Mega-Chad), `grid.b64` (compressed elevation
  grid from Mapzen Terrarium tiles, for past coastlines).
- `tools/`: how `grid.b64` and `paleo.json` were made (`grid.py`, `orient.cjs`).
- `fonts/`: the typefaces drawn onto the share cards (SIL OFL, licences beside them).
- Site photos live in `lacuna/img/<key>.jpg`.

Run from the repository root:

    python3 src/lacuna/atlas/build.py            # writes lacuna/index.html
    python3 src/lacuna/atlas/build.py --check    # writes nothing; fails if lacuna/index.html is stale (the site build runs this)
    python3 src/lacuna/atlas/share.py --pages    # rewrites lacuna/sites/<slug>/index.html
    python3 src/lacuna/atlas/share.py            # the pages and the 1200x630 cards in lacuna/share/ (needs Pillow and Node)
    python3 src/lacuna/atlas/build.py --fragment # body-only src/lacuna/atlas/preview.html for a claude.ai preview

After changing a site's text, run `build.py` and `share.py --pages`. After changing a site's name, lede or
photo, run `share.py` so its card is redrawn.

The page is served from `/lacuna/` and addresses its files relatively (`img/`, `vendor/`, `sites/`,
`research/`), so only two places name the address: `SITE_URL` in `build.py` and `ORIGIN` in `share.py`.
d3 and topojson-client are served from `lacuna/vendor/`.

Sources for the past-Earth layers are listed in the page's Sources popover (time bar).
