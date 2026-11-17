#!/usr/bin/env python3
"""Build the per-site share pages and their 1200x630 preview cards.

    python3 src/lacuna/atlas/share.py           pages and cards
    python3 src/lacuna/atlas/share.py --pages   pages only (the cards are left as they are)

Writes, for every site in sites.js:
    lacuna/sites/<slug>/index.html   small page with Open Graph / Twitter tags
                                      that sends people on to the Atlas at /lacuna/#<id>
    lacuna/share/<slug>.jpg           1200x630 preview card (site photo + Lacuna branding)
and lacuna/share/lacuna.jpg, the card for the Atlas itself.

The cards print LACUNAINSTITUTE.ORG: that address redirects to this section, path for path.

Needs Python 3 with Pillow, and Node (to read sites.js). Fonts are in fonts/ (SIL OFL).
"""
import html, json, os, subprocess, sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))   # the repository root
PUB = os.path.join(ROOT, "lacuna")
ORIGIN = "https://syberlabs.io/lacuna"
W, H = 1200, 630

VOID = (7, 8, 11); BONE = (228, 218, 200); BONE2 = (207, 196, 176)
ASH = (139, 133, 119); EMBER = (217, 160, 102)

def font(name, size):
    return ImageFont.truetype(os.path.join(HERE, "fonts", name), size)

F_BRAND = font("IBMPlexMono_500Medium.ttf", 17)
F_META = font("IBMPlexMono_400Regular.ttf", 16)
F_CREDIT = font("IBMPlexMono_400Regular.ttf", 12)
F_URL = font("IBMPlexMono_500Medium.ttf", 17)
F_LEDE = font("CormorantGaramond_500Medium_Italic.ttf", 31)

def load_sites():
    out = subprocess.run(["node", os.path.join(HERE, "dump_sites.cjs")], check=True,
                         capture_output=True, text=True).stdout
    return json.loads(out)

def spaced(d, xy, text, f, fill, track):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + track
    return x

def wrap(d, text, f, width):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= width:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines

def fit_lines(d, text, f, width, n):
    lines = wrap(d, text, f, width)
    if len(lines) <= n:
        return lines
    lines = lines[:n]
    while d.textlength(lines[-1] + "…", font=f) > width:
        lines[-1] = lines[-1].rsplit(" ", 1)[0]
    lines[-1] = lines[-1].rstrip(",;:.") + "…"
    return lines

def cover(img, w, h, fx=0.5):
    s = max(w / img.width, h / img.height)
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    x = round((img.width - w) * fx); y = round((img.height - h) / 2)
    return img.crop((x, y, x + w, y + h))

def mark(d, x, y):
    # the site's logo: a ring with a gap, a faint inner ring and an ember dot
    d.arc((x - 16, y - 16, x + 16, y + 16), start=-30, end=270, fill=BONE, width=2)
    d.ellipse((x - 9, y - 9, x + 9, y + 9), outline=(95, 91, 82), width=1)
    d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=EMBER)

def coords(s):
    la, lo = s["lat"], s["lon"]
    return f"{abs(la):.2f}° {'N' if la >= 0 else 'S'} · {abs(lo):.2f}° {'E' if lo >= 0 else 'W'}"

def card(photo_path, kicker, title, lede, credit, out):
    im = Image.new("RGB", (W, H), VOID)
    PX = 610  # photo starts here
    ph = cover(Image.open(photo_path).convert("RGB"), W - PX, H)
    im.paste(ph, (PX, 0))
    # fade the photo's left edge into the dark panel, and darken its foot for the credit
    fade = Image.new("L", (W - PX, H), 0)
    fd = ImageDraw.Draw(fade)
    for i in range(240):
        fd.line([(i, 0), (i, H)], fill=round(255 * (1 - i / 240) ** 1.6))
    foot = Image.new("L", (W - PX, H), 0)
    ftd = ImageDraw.Draw(foot)
    for j in range(90):
        ftd.line([(0, H - 1 - j), (W - PX, H - 1 - j)], fill=round(150 * (1 - j / 90)))
    fade = ImageChops.lighter(fade, foot)
    shade = Image.new("RGB", (W - PX, H), VOID)
    region = im.crop((PX, 0, W, H))
    im.paste(Image.composite(shade, region, fade), (PX, 0))
    # soft ember glow behind the text
    glow = Image.new("RGB", (W, H), (0, 0, 0)); gd = ImageDraw.Draw(glow)
    gd.ellipse((-260, 260, 520, 900), fill=(60, 38, 18))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    im = ImageChops.add(im, glow)
    d = ImageDraw.Draw(im)
    mark(d, 79, 79)
    spaced(d, (108, 69), "LACUNA INSTITUTE", F_BRAND, BONE2, 4.2)
    spaced(d, (64, 160), kicker, F_META, EMBER, 2.2)
    tsize = 66
    while True:
        F_TITLE = font("CormorantGaramond_500Medium.ttf", tsize)
        tl = wrap(d, title, F_TITLE, 500)
        if len(tl) <= 2 or tsize <= 48:
            break
        tsize -= 4
    y = 196
    for l in tl[:2]:
        d.text((62, y), l, font=F_TITLE, fill=BONE)
        y += round(tsize * 1.02)
    y += 26
    d.line([(64, y), (124, y)], fill=EMBER, width=2)
    y += 22
    for l in fit_lines(d, lede, F_LEDE, 500, 4 if len(tl) < 2 else 3):
        d.text((64, y), l, font=F_LEDE, fill=BONE2)
        y += 38
    spaced(d, (64, 556), "LACUNAINSTITUTE.ORG", F_URL, EMBER, 3.0)
    if credit:
        tw = d.textlength(credit, font=F_CREDIT)
        d.text((W - 24 - tw, H - 30), credit, font=F_CREDIT, fill=(200, 192, 176))
    im.save(out, "JPEG", quality=86, optimize=True, progressive=True)

PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#07080b">
<title>{title} · Lacuna Institute</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:site_name" content="Lacuna Institute">
<meta property="og:type" content="article">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{alt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{image}">
<meta name="twitter:image:alt" content="{alt}">
<script>location.replace("../../#{id}");</script>
<style>
html,body{{margin:0;background:#07080b;color:#e4dac8;font:20px/1.5 "Cormorant Garamond",Georgia,serif}}
main{{max-width:620px;margin:0 auto;padding:12vh 24px}}
p.k{{font:12px/1.4 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase;color:#d9a066}}
h1{{font-weight:500;font-size:44px;line-height:1.05;margin:.3em 0}}
a{{color:#d9a066}}
</style>
</head>
<body>
<main>
<p class="k">Lacuna Institute</p>
<h1>{title}</h1>
<p><em>{lede}</em></p>
<p><a href="../../#{id}">Open {title} on the Lacuna Atlas</a></p>
</main>
</body>
</html>
"""

def main():
    cards = "--pages" not in sys.argv
    data = load_sites()
    sites = data["SITES"]
    os.makedirs(os.path.join(PUB, "share"), exist_ok=True)
    for n, s in enumerate(sites, 1):
        slug = s["slug"]
        img = s["img"]
        lic = img.get("lic") or ""
        credit = f"Photo: {img['credit']}" + (f" · {lic}" if lic and lic != "Public domain" else " · public domain")
        if cards:
            card(os.path.join(PUB, "img", img["key"] + ".jpg"),
                 f"NO. {n:02d} · {coords(s)}", s["name"], s["lede"], credit,
                 os.path.join(PUB, "share", slug + ".jpg"))
        d = os.path.join(PUB, "sites", slug); os.makedirs(d, exist_ok=True)
        e = lambda t: html.escape(t, quote=True)
        with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
            f.write(PAGE.format(
                title=e(s["name"]), desc=e(s["lede"]), lede=e(s["lede"]), id=e(s["id"]),
                url=f"{ORIGIN}/sites/{slug}/", image=f"{ORIGIN}/share/{slug}.jpg",
                alt=e(f"{s['name']}: {img['alt']}")))
    if cards:
        canyon = next(s for s in sites if s["id"] == "canyon")
        card(os.path.join(PUB, "img", canyon["img"]["key"] + ".jpg"),
             f"AN ATLAS OF LACUNAE · {len(sites)} SITES", "Where the record goes quiet",
             "Twenty-one places where history has a gap. Turn back the clock 25,000 years and see the Earth as it was.",
             f"Photo: {canyon['img']['credit']} · {canyon['img'].get('lic') or 'public domain'}",
             os.path.join(PUB, "share", "lacuna.jpg"))
    print(f"{len(sites)} share pages" + (" and cards" if cards else "") + " written")

if __name__ == "__main__":
    main()
