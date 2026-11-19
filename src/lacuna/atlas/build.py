#!/usr/bin/env python3
"""Build the Lacuna Atlas, the first page of the Lacuna Institute section of syberlabs.io (/lacuna/).

    python3 src/lacuna/atlas/build.py            -> lacuna/index.html (the published page)
    python3 src/lacuna/atlas/build.py --check    -> writes nothing; fails if lacuna/index.html is out of date
    python3 src/lacuna/atlas/build.py --fragment -> src/lacuna/atlas/preview.html (body fragment, for a claude.ai preview)

The template's placeholders are filled with the site list, the world-atlas
TopoJSON, the paleo layers (ice, Green Sahara, Mega-Chad) and the
compressed elevation grid used for past coastlines.
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))   # the repository root
OUT = os.path.join(ROOT, "lacuna", "index.html")
# The one address of the section. lacunainstitute.org and lacunainstitute.com redirect here, path for path.
SITE_URL = "https://syberlabs.io/lacuna/"

def rd(*p):
    with open(os.path.join(HERE, *p), encoding="utf-8") as f:
        return f.read()

def fragment():
    s = rd("page.tpl.html")
    return (s.replace("/*__SITES__*/", rd("sites.js"))
             .replace("/*__TOPO_C__*/", rd("data", "countries-110m.json"))
             .replace("/*__TOPO_L__*/", rd("data", "land-50m.json"))
             .replace("/*__PALEO__*/", rd("data", "paleo.json"))
             .replace("/*__GRID__*/", rd("data", "grid.b64").strip())
             .replace("/*__SITE_URL__*/", SITE_URL))

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#07080b">
<title>Lacuna Institute | Atlas of Historical Gaps | SyberLabs</title>
<meta name="description" content="Lacuna Institute maps 21 sites where the historical record breaks down, separating verified primary sources from open questions and speculation.">
<meta property="og:title" content="Lacuna Institute | Atlas of Historical Gaps">
<meta property="og:description" content="Lacuna Institute maps 21 sites where the historical record breaks down, separating verified primary sources from open questions and speculation.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://syberlabs.io/lacuna/">
<meta property="og:site_name" content="Lacuna Institute">
<meta property="og:image" content="https://syberlabs.io/lacuna/share/lacuna.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Lacuna Institute: where the record goes quiet. The Grand Canyon at dusk.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Lacuna Institute | Atlas of Historical Gaps">
<meta name="twitter:description" content="Lacuna Institute maps 21 sites where the historical record breaks down, separating verified primary sources from open questions and speculation.">
<meta name="twitter:image" content="https://syberlabs.io/lacuna/share/lacuna.jpg">
<link rel="canonical" href="https://syberlabs.io/lacuna/">
<!--email_off-->
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"ResearchOrganization","@id":"https://syberlabs.io/lacuna/#org","name":"Lacuna Institute","url":"https://syberlabs.io/lacuna/","email":"contact@lacunainstitute.org","parentOrganization":{"@type":"Organization","@id":"https://syberlabs.io/#org","name":"SyberLabs","url":"https://syberlabs.io/"}}
</script>
<!--/email_off-->
"""

def site():
    frag = fragment()
    cut = frag.index("</style>") + len("</style>")
    head, body = frag[:cut], frag[cut:]
    keep = [l for l in head.split("\n")
            if not l.startswith("<title>") and "claude:viewport" not in l
            and not l.startswith('<meta name="description"')]
    # email_off: Cloudflare rewrites email addresses in served HTML unless they sit between these comments
    # (the site's contact pages do the same), so the address is in the page as written.
    return (HEAD + "\n".join(keep) + "\n</head>\n<body>\n<!--email_off-->\n"
            + body.strip("\n") + "\n<!--/email_off-->\n</body>\n</html>\n")

if __name__ == "__main__":
    if "--fragment" in sys.argv:
        out = os.path.join(HERE, "preview.html"); txt = fragment()
    else:
        out = OUT; txt = site()
    if "--check" in sys.argv:
        old = open(out, encoding="utf-8").read() if os.path.exists(out) else None
        if old != txt:
            sys.exit("lacuna atlas: lacuna/index.html is out of date, run `python3 src/lacuna/atlas/build.py`")
        print("lacuna atlas: lacuna/index.html up to date")
    else:
        with open(out, "w", encoding="utf-8", newline="\n") as f:
            f.write(txt)
        print(out, len(txt))
