/**
 * Bundles src/ssr.tsx for Node and loads it, so the build scripts can render
 * the real React app (prerender.js) and share its helpers (generate-sitemap.js).
 *
 * Packages stay external and resolve from node_modules at runtime, so the app
 * and react-dom/server share a single copy of React. The bundle is written
 * under node_modules/.cache so it's never committed and never deployed.
 */

const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const OUTFILE = path.join(ROOT, 'node_modules/.cache/roguepod-ssr/ssr.js');

let loaded;

function loadSsr() {
  if (loaded) return loaded;

  // Production builds of React and React Router, matching what ships.
  process.env.NODE_ENV = 'production';

  esbuild.buildSync({
    entryPoints: [path.join(ROOT, 'src/ssr.tsx')],
    outfile: OUTFILE,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    jsx: 'automatic',
    packages: 'external',
    logLevel: 'warning',
  });

  delete require.cache[OUTFILE];
  loaded = require(OUTFILE);
  return loaded;
}

module.exports = { loadSsr };
