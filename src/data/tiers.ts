import { useJson } from './preload';

/**
 * public/tiers.json, written by scripts/automated_tierlist_updater.py next to
 * tierlist.png. It carries exactly what the image shows: released games only,
 * in the doc's order within each tier. `slug` is the episode page the game
 * links to; null only if the updater couldn't resolve the feed title.
 */
export type TierGame = { name: string; slug: string | null };
export type TierRow = { tier: string; games: TierGame[] };
export type TierList = { tiers: TierRow[] };

const EMPTY: TierList = { tiers: [] };

export const useTiers = (): { tierList: TierList; loading: boolean } => {
  const { data, loading } = useJson<TierList>('/tiers.json');
  return { tierList: data ?? EMPTY, loading };
};

const TIER_COLORS: Record<string, string> = {
  S: 'bg-tier-s',
  A: 'bg-tier-a',
  B: 'bg-tier-b',
  C: 'bg-tier-c',
  D: 'bg-tier-d',
  F: 'bg-tier-f',
};

export const tierColor = (tier: string): string => TIER_COLORS[tier] ?? 'bg-bone-300';

/** Every placed game as one ranked list, best first. */
const ranked = (tierList: TierList) =>
  tierList.tiers.flatMap((row) => row.games.map((game) => ({ ...game, tier: row.tier })));

export const tierFor = (tierList: TierList, slug: string): string | null =>
  ranked(tierList).find((game) => game.slug === slug)?.tier ?? null;

/**
 * The games ranked closest to this one — alternately just above and just
 * below, so a game at the very top or bottom still gets `count` neighbours.
 * Used for the "ranked nearby" links on an episode page; scripts/
 * generate-sitemap.js calls it too, so lastmod moves when they change.
 */
export const nearbyOnTierList = (tierList: TierList, slug: string, count = 3): string[] => {
  const list = ranked(tierList).filter((game) => game.slug);
  const index = list.findIndex((game) => game.slug === slug);
  if (index === -1) return [];

  const nearby: string[] = [];
  for (let step = 1; nearby.length < count && step < list.length; step += 1) {
    for (const candidate of [list[index - step], list[index + step]]) {
      if (candidate?.slug && nearby.length < count) nearby.push(candidate.slug);
    }
  }
  return nearby;
};
