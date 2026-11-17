# Lacuna Institute on syberlabs.io

Lacuna Institute is SyberLabs' research institute. Its pages are published at https://syberlabs.io/lacuna/.

| What | Where |
|---|---|
| Published pages | `lacuna/` at the repository root, copied to `dist/lacuna/` as it is |
| Atlas sources and generators | `src/lacuna/atlas/` (see its README) |
| Dataset page | `lacuna/research/paracas-bundles/index.html` (plain HTML), CSV in `lacuna/data/` |
| Menu, research index, sitemap, llms.txt | `projects/site-data.js`, `research/index.html`, `sitemap.xml`, `scripts/llms.mjs` |

## Addresses

`https://syberlabs.io/lacuna/` is the one address of the section. The two Lacuna domains are short addresses for it.
Each is a zone in the same Cloudflare account as the site, and each needs exactly one redirect rule (Rules > Redirect
Rules, a single dynamic redirect, status 301, query string preserved):

| Requests to | Go to |
|---|---|
| `lacunainstitute.org/*`, `www.lacunainstitute.org/*` | `concat("https://syberlabs.io/lacuna", http.request.uri.path)` |
| `lacunainstitute.com/*`, `www.lacunainstitute.com/*` | `concat("https://syberlabs.io/lacuna", http.request.uri.path)` |

So `lacunainstitute.org/sites/paracas/` opens `syberlabs.io/lacuna/sites/paracas/`, and `lacunainstitute.org/#paracas`
opens that site on the Atlas (browsers keep the `#` part across a redirect). The rules act on web requests only:
the mail records of `lacunainstitute.org` (MX, SPF, DKIM, DMARC) are not part of them and stay as they are.

Printed and shared material may keep `lacunainstitute.org`: the share cards and the dataset's "How to cite" line do.

## What did not move

- The email signup form and its two endpoints (`/api/subscribe`, `/api/unsubscribe`). syberlabs.io gives visitors
  no forms (`/privacy/`), so "Get new findings" is an email link to `contact@lacunainstitute.org`. The form, its
  Worker and its database schema are in the history of the earlier Lacuna site repository.
- The contact API (a Go service). No published page called it.
