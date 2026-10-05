import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// The static pages (projects/, services/, research/ ...) link the shared design-system stylesheet at /syberlabs.css:
// the v2 kit (kit/v2/syber-atlas.css) followed by the site layer (src/syberlabs.css), the same two files the homepage imports.
// They also load /syberlabs.js, the site v3 behaviours (src/site/site.js: the 3D field, the Atlas menu, reveal, tilt),
// which this config builds as a second, unhashed entry. Both are served in dev and emitted unhashed in the build.
const kitCss = fileURLToPath(new URL('./kit/v2/syber-atlas.css', import.meta.url));
const siteCss = fileURLToPath(new URL('./src/syberlabs.css', import.meta.url));
const siteJs = fileURLToPath(new URL('./src/site/boot.js', import.meta.url));
const sharedCss = () => readFileSync(kitCss, 'utf8') + '\n' + readFileSync(siteCss, 'utf8');

function syberlabsShared() {
  return {
    name: 'syberlabs-shared',
    configureServer(server) {
      server.middlewares.use('/syberlabs.css', (_req, res) => {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        res.end(sharedCss());
      });
      // In dev, /syberlabs.js is the source module itself (Vite transforms it on the fly).
      server.middlewares.use('/syberlabs.js', (_req, res) => {
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        res.end(`import '/src/site/boot.js';`);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'syberlabs.css', source: sharedCss() });
    },
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  base: '/',
  publicDir: false,
  plugins: [syberlabsShared()],
  build: isSsrBuild ? {} : {
    rollupOptions: {
      input: { main: fileURLToPath(new URL('./index.html', import.meta.url)), syberlabs: siteJs },
      output: {
        entryFileNames: chunk => chunk.name === 'syberlabs' ? 'syberlabs.js' : 'assets/[name]-[hash].js',
        // three.js in its own chunk so the homepage and the static pages share one cached copy
        manualChunks: id => (id.includes('node_modules/three/') ? 'three' : undefined),
      },
    },
  },
}));
