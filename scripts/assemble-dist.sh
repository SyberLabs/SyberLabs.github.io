#!/usr/bin/env sh
# Copy the static site files and directories next to the Vite build in dist/.
# Run after `pnpm build` (`pnpm build:site` does both; CI: .github/workflows/cloudflare-pages.yml).
set -eu
cd "$(dirname "$0")/.."
test -d dist
cp 404.html robots.txt sitemap.xml site.webmanifest _redirects \
  syber-mark.png syber-logo.png syber-logo.webp syber-logo-96.png \
  og-image.png mateo_robles_resume.pdf \
  favicon.ico favicon-32x32.png favicon-16x16.png \
  apple-touch-icon.png android-chrome-192x192.png \
  android-chrome-512x512.png dist/
# kit/v2 is the canonical public home of the design kit: https://syberlabs.io/kit/v2/
mkdir -p dist/kit
cp -r kit/v2 dist/kit/
# social preview cards, one per page (regenerate with `node scripts/og-cards.mjs`)
cp -r og dist/
for dir in rise-demo omni-demo relay-demo projects approach jev kev research services privacy stack; do
  cp -r "$dir" dist/
done
# GitHits dependency snapshots (regenerate with `node scripts/githits-snapshot.mjs`)
mkdir -p dist/githits
cp data/githits/*.json dist/githits/
# llms.txt / llms-full.txt are generated from projects/site-data.js; fails the build if stale (regenerate with `node scripts/llms.mjs`)
node scripts/llms.mjs --check; cp llms.txt llms-full.txt dist/
node scripts/prerender.mjs
