import { createContext, useContext, useEffect, useRef, useState } from 'react';

/**
 * The build-time JSON a page was rendered with, keyed by the URL the app would
 * otherwise fetch it from ('/episodes.json', '/tiers.json', '/blog/<slug>.json').
 *
 * scripts/prerender.js renders every route to static HTML with this filled in,
 * then embeds the same object in the page as window.__ROGUEPOD_PRELOAD__. The
 * client hydrates from it, so its first render matches the server's markup
 * exactly — a loading skeleton on the first client render would be a hydration
 * mismatch, and React would throw the server HTML away.
 *
 * The object is mutable on purpose: whatever the client fetches later is added
 * to it, so navigating between pages doesn't refetch or flash a skeleton.
 */
export type PreloadCache = Record<string, unknown>;

const PreloadContext = createContext<PreloadCache | null>(null);

export const PreloadProvider = PreloadContext.Provider;

const has = (cache: PreloadCache, url: string) =>
  Object.prototype.hasOwnProperty.call(cache, url);

/**
 * Build-time JSON, preloaded if the page was prerendered with it and fetched
 * otherwise. Outside a provider (the tests) each call keeps its own cache.
 */
export const useJson = <T,>(url: string): { data: T | null; loading: boolean } => {
  const shared = useContext(PreloadContext);
  const local = useRef<PreloadCache>({});
  const cache = shared ?? local.current;

  const [failed, setFailed] = useState<string | null>(null);
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (has(cache, url)) return undefined;
    let cancelled = false;

    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        cache[url] = data;
        if (!cancelled) setVersion((version) => version + 1);
      })
      .catch(() => {
        // Non-fatal: callers degrade to their empty or not-found state.
        if (!cancelled) setFailed(url);
      });

    return () => {
      cancelled = true;
    };
  }, [cache, url]);

  const hit = has(cache, url);
  return { data: hit ? (cache[url] as T) : null, loading: !hit && failed !== url };
};
