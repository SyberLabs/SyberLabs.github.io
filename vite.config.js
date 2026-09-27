import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// The static pages (projects/, services/, commons/ ...) link the shared design-system stylesheet at /syberlabs.css:
// the v2 kit (kit/v2/syber-atlas.css) followed by the site layer (src/syberlabs.css), the same two files the homepage imports.
// Serve it in dev and emit it unhashed in the build.
const kitCss = fileURLToPath(new URL('./kit/v2/syber-atlas.css', import.meta.url));
const siteCss = fileURLToPath(new URL('./src/syberlabs.css', import.meta.url));
const sharedCss = () => readFileSync(kitCss, 'utf8') + '\n' + readFileSync(siteCss, 'utf8');

function syberlabsCss() {
  return {
    name: 'syberlabs-shared-css',
    configureServer(server) {
      server.middlewares.use('/syberlabs.css', (_req, res) => {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        res.end(sharedCss());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'syberlabs.css', source: sharedCss() });
    },
  };
}

export default defineConfig({
  base: '/',
  publicDir: false,
  plugins: [syberlabsCss()],
});
