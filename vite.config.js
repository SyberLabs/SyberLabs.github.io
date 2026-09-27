import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// The static pages (projects/, services/, commons/ ...) link the shared design-system stylesheet at /syberlabs.css.
// Serve it in dev and emit it unhashed in the build, from the same source the homepage imports.
const sharedCss = fileURLToPath(new URL('./src/syberlabs.css', import.meta.url));

function syberlabsCss() {
  return {
    name: 'syberlabs-shared-css',
    configureServer(server) {
      server.middlewares.use('/syberlabs.css', (_req, res) => {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        res.end(readFileSync(sharedCss));
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'syberlabs.css', source: readFileSync(sharedCss) });
    },
  };
}

export default defineConfig({
  base: '/',
  publicDir: false,
  plugins: [syberlabsCss()],
});
