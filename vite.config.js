import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, transformWithEsbuild } from 'vite';

// What this build makes:
//   /index.html     the homepage. Its markup is src/home/page.js, written into index.html here, at build time and in
//                   `pnpm dev`, so the page is complete without JavaScript. Its script is src/home/main.js.
//   /syberlabs.css  the stylesheet every page links: fonts/site.css, then src/styles/ in the order below.
//   /syberlabs.js   the script every static page loads (src/site/boot.js): the Menu and a back-to-top button.
//   /system-map.js  a small loader on the RISE and FLYSPACE pages (src/system-map-embed.js). It fetches React and
//                   the maps (src/system-map-mount.jsx) only when an Inspect section nears the viewport.
// The three are emitted unhashed, because hand-written pages link them by name; scripts/stamp.mjs then adds each
// file's content hash to those links in dist/, so a changed file is never served from a browser's cache.
const file = path => fileURLToPath(new URL(path, import.meta.url));
const SHARED_CSS = ['./fonts/site.css', './src/styles/tokens.css', './src/styles/base.css', './src/styles/type.css', './src/styles/chrome.css', './src/styles/components.css'];
const sharedCss = () => SHARED_CSS.map(path => readFileSync(file(path), 'utf8')).join('\n');

function shared() {
  return {
    name: 'syberlabs-shared',
    configureServer(server) {
      server.middlewares.use('/syberlabs.css', (_req, res) => {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        res.end(sharedCss());
      });
      // In dev, /syberlabs.js and /system-map.js are the source modules themselves (Vite transforms them on the fly).
      server.middlewares.use('/syberlabs.js', (_req, res) => {
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        res.end(`import '/src/site/boot.js';`);
      });
      server.middlewares.use('/system-map.js', (_req, res) => {
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        res.end(`import '/src/system-map-embed.js';`);
      });
    },
    async generateBundle() {
      const { code } = await transformWithEsbuild(sharedCss(), 'syberlabs.css', { loader: 'css', minify: true, legalComments: 'none' });
      this.emitFile({ type: 'asset', fileName: 'syberlabs.css', source: code });
    },
  };
}

function homepage() {
  let server;
  return {
    name: 'syberlabs-home',
    configureServer(s) { server = s; },
    transformIndexHtml: {
      // post: Vite has already found the page's script and stylesheet, and leaves the markup added here alone
      // (its images and clips are served from media/, which scripts/assemble-dist.sh copies as it is).
      order: 'post',
      async handler(html, ctx) {
        // `pnpm dev` also serves the hand-written pages through here; only the homepage has the marker.
        if (ctx.filename !== file('./index.html')) return html;
        if (!html.includes('<!-- home:body -->')) throw new Error('index.html has no <!-- home:body --> marker');
        const { renderHome } = server ? await server.ssrLoadModule('/src/home/page.js') : await import('./src/home/page.js');
        return html.replace('<!-- home:body -->', renderHome());
      },
    },
  };
}

export default defineConfig({
  base: '/',
  publicDir: false,
  plugins: [shared(), homepage()],
  build: {
    rollupOptions: {
      input: { main: file('./index.html'), syberlabs: file('./src/site/boot.js'), systemmap: file('./src/system-map-embed.js') },
      output: {
        entryFileNames: chunk => chunk.name === 'syberlabs' ? 'syberlabs.js' : chunk.name === 'systemmap' ? 'system-map.js' : 'assets/[name]-[hash].js',
        // React in its own chunk: only the system maps use it
        manualChunks: id => (/node_modules\/(react|react-dom|scheduler)\//.test(id) ? 'react' : undefined),
      },
    },
  },
});
