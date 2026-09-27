> **Current RISE and Jev status:** RISE's Chamber reads locally. Its Scriptorium offers optional JEV routing for composition requests with a reader-provided key. A live provider outcome for that route remains unverified.

# SyberLabs homepage

Company and portfolio site for [syberlabs.io](https://syberlabs.io/).

Built with React, Material UI, and Vite. Run `pnpm install` and `pnpm build` to generate the Cloudflare Pages output in `dist/`. The public RISE demo is copied into `dist/rise-demo/` by the deployment workflow.

The public COMMONS roadmap is maintained in `commons/index.html` and included in the same Cloudflare Pages deployment at `/commons/`. The homepage links directly to that route; the previous `/projects/commons/` address redirects there.

The independent Jev evaluation and integration plan lives in `jev/` and is published at `/jev/`. Its product status labels distinguish implemented routes from proposed integrations and must be checked against the source repositories before updating.

