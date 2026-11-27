#!/usr/bin/env sh
# Copy the static site files and directories next to the Vite build in dist/.
# Run after `pnpm build` (`pnpm build:site` does both; CI: .github/workflows/cloudflare-pages.yml).
set -eu
cd "$(dirname "$0")/.."
test -d dist
cp 404.html robots.txt sitemap.xml site.webmanifest _redirects _headers \
  syber-mark.png syber-logo.png syber-logo.webp syber-logo-96.png \
  og-image.png footer-orb.webp \
  favicon.ico favicon-32x32.png favicon-16x16.png \
  apple-touch-icon.png android-chrome-192x192.png \
  android-chrome-512x512.png dist/
# _routes.json sends only /auth/*, /admin and /admin/* to the staff Function; staff.css styles its pages, and
# staff/ holds Google's sign-in button images (RFC-0002 3.2)
cp _routes.json staff.css dist/
cp -r staff dist/
# every typeface the site uses is served from /fonts/ (fonts/README.md); no page asks another company for a font
mkdir -p dist/fonts
cp -r fonts/v1 fonts/licenses dist/fonts/
cp fonts/site.css fonts/lacuna.css fonts/rise.css dist/fonts/
# kit/v2 is the canonical public home of the design kit: https://syberlabs.io/kit/v2/
mkdir -p dist/kit
cp -r kit/v2 dist/kit/
# social preview cards, one per page (regenerate with `node scripts/og-cards.mjs`)
cp -r og dist/
for dir in rise-demo omni-demo media projects approach factory jev kev research services privacy stack plus psycho-syber vertical; do
  cp -r "$dir" dist/
done
# Lacuna Institute: lacuna/ is published as it is at /lacuna/. Its first page (the Atlas) is generated from
# src/lacuna/atlas/; this fails the build if that page is stale (regenerate with `python3 src/lacuna/atlas/build.py`)
python3 src/lacuna/atlas/build.py --check
cp -r lacuna dist/
# The overview page's Lacuna visual draws the Atlas's own site list; this fails the build if its data file is stale
# (regenerate with `node scripts/lacuna-home.mjs`)
node scripts/lacuna-home.mjs --check
# "What changed" is staff-only (MasterMind RFC 0002): its source projects/latest.js is deleted, and nothing here removes
# a re-added copy, so the workflow's `test ! -e dist/projects/latest.js` guard fails the build instead.
# GitHits dependency snapshots (regenerate with `node scripts/githits-snapshot.mjs`)
mkdir -p dist/githits
cp data/githits/*.json dist/githits/
# llms.txt / llms-full.txt are generated from projects/site-data.js; fails the build if stale (regenerate with `node scripts/llms.mjs`)
# the game's Node tests are not part of the site
rm -rf dist/psycho-syber/test dist/psycho-syber/README.md
node scripts/llms.mjs --check; cp llms.txt llms-full.txt dist/
node scripts/prerender.mjs
# last: add each local stylesheet's and script's content hash to the links that name it
node scripts/stamp.mjs
