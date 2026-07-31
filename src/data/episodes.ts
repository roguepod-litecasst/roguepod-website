import { useEffect, useState } from 'react';

export type Episode = {
  title: string;
  publishedAt: string;
  number: number | null;
  duration: string;
  link: string;
  art: string | null;
  blurb: string;
};

export type EpisodeFeed = {
  generatedAt: string;
  /** Game episodes only — bonus episodes aren't reviews and get no tier. */
  episodeCount: number;
  episodes: Episode[];
};

const EMPTY: EpisodeFeed = { generatedAt: '', episodeCount: 0, episodes: [] };

/**
 * Reads the build-time snapshot of the Acast feed written by
 * scripts/fetch-episodes.js. The feed itself sends no CORS headers, so this
 * cannot be fetched directly from the browser.
 */
export const useEpisodes = (): { feed: EpisodeFeed; loading: boolean } => {
  const [feed, setFeed] = useState<EpisodeFeed>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/episodes.json')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data: EpisodeFeed) => {
        if (!cancelled) setFeed(data);
      })
      .catch(() => {
        // Non-fatal: the sections that use this degrade to their static copy.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { feed, loading };
};

export const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
