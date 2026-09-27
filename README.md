> **Current RISE and Jev status:** RISE offers a Jev reading request on its home screen. Jev selects a released work, passage, and Chamber settings from bounded choices, including six mood sounds. The Chamber renders audio locally. The separate Scriptorium composition route still needs an independently verified authoring outcome.

# SyberLabs homepage

Company and portfolio site for [syberlabs.io](https://syberlabs.io/).

Built with React, Material UI, and Vite. Run `pnpm install` and `pnpm build` to generate the Cloudflare Pages output in `dist/`. The public RISE demo is copied into `dist/rise-demo/` by the deployment workflow.

The public COMMONS roadmap is maintained in `commons/index.html` and included in the same Cloudflare Pages deployment at `/commons/`. The homepage links directly to that route; the previous `/projects/commons/` address redirects there.

The independent Jev evaluation and integration plan lives in `jev/` and is published at `/jev/`. Its product status labels distinguish implemented routes from proposed integrations and must be checked against the source repositories before updating.

