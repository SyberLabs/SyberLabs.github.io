#!/usr/bin/env sh
# Copy the static site files and directories next to the Vite build in dist/.
# Run after `pnpm build` (CI: .github/workflows/cloudflare-pages.yml; locally: `pnpm build:site`).
set -eu
cd "$(dirname "$0")/.."
test -d dist
cp 404.html robots.txt sitemap.xml site.webmanifest _redirects \
  syber-mark.png syber-logo.png syber-logo.webp syber-logo-96.png \
  og-image.png mateo_robles_resume.pdf \
  favicon.ico favicon-32x32.png favicon-16x16.png \
  apple-touch-icon.png android-chrome-192x192.png \
  android-chrome-512x512.png dist/
for dir in rise-demo projects commons approach jev kev research services; do
  cp -r "$dir" dist/
done
node scripts/prerender.mjs
