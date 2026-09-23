/**
 * Server-side entry, used only by the build. scripts/ssr-bundle.js bundles this
 * for Node with esbuild, and scripts/prerender.js calls render() once per route
 * to write the real page markup into each prerendered index.html. The browser
 * bundle never imports it (CRA only follows src/index.tsx).
 *
 * The seo and tier helpers are re-exported so the build scripts share the
 * app's templates and ranking logic instead of keeping their own copies.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App from './App';
import { PreloadCache, PreloadProvider } from './data/preload';

export const render = (location: string, preload: PreloadCache): string =>
  renderToString(
    <React.StrictMode>
      <PreloadProvider value={preload}>
        <StaticRouter location={location}>
          <App />
        </StaticRouter>
      </PreloadProvider>
    </React.StrictMode>
  );

export { nearbyOnTierList, tierFor } from './data/tiers';
export * from './lib/seo';
