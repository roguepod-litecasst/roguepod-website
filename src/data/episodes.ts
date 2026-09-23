import { useJson } from './preload';

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
 * cannot be fetched directly from the browser. Prerendered pages carry it
 * preloaded (see ./preload).
 */
export const useEpisodes = (): { feed: EpisodeFeed; loading: boolean } => {
  const { data, loading } = useJson<EpisodeFeed>('/episodes.json');
  return { feed: data ?? EMPTY, loading };
};

/*
 * Dates are formatted in UTC. Pages are rendered once at build time and then
 * hydrated in the visitor's browser, and the two must print the same day — in
 * the visitor's own zone an episode out at 09:00 UTC reads as the day before
 * anywhere west of UTC-9, and hydration would disagree with the static HTML.
 * The UTC date is also simply the release date the feed publishes.
 */
export const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export const formatLongDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export const isoDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

/**
 * Slashed, because links are now in the static HTML crawlers read, and the
 * slashed form is the one Pages answers 200 for (the bare path 301s).
 */
export const episodePath = (slug: string): string => `/episodes/${slug}/`;
