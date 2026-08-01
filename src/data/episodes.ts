import { useEffect, useState } from 'react';

/** One paragraph of an episode description; `list` marks a bullet. */
export type EpisodeBlock = {
  text: string;
  list: boolean;
};

export type Episode = {
  slug: string;
  title: string;
  publishedAt: string;
  number: number | null;
  duration: string;
  /** Acast episode page. */
  link: string;
  /** Acast player for this specific episode. */
  embed: string | null;
  /** Direct MP3 enclosure. */
  audio: string;
  /** Per-episode Apple Podcasts URL, resolved at build time. */
  apple: string | null;
  art: string | null;
  /** 1200x630 social preview card. */
  share: string | null;
  blurb: string;
  blocks: EpisodeBlock[];
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

export const formatLongDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export const isoDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

export const episodePath = (slug: string): string => `/episodes/${slug}`;
