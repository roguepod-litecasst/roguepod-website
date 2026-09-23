/**
 * Title and description templates, shared by the app (document.title on
 * client-side navigation) and scripts/prerender.js (the static <head>), which
 * imports them through the SSR bundle. One copy, so the two can't drift.
 */

export const SITE_URL = 'https://roguepod.show';

const TITLE_LIMIT = 60;

/**
 * "<Game> Podcast Review | RoguePod LiteCast", shortened for long game names
 * so Google doesn't truncate it. "Podcast" is never dropped: "<game> podcast"
 * is the search this page exists to rank for. A few titles are long enough to
 * exceed the limit even at "<Game> Podcast"; those run over rather than lose it.
 */
export const episodeTitle = (game: string): string => {
  const candidates = [
    `${game} Podcast Review | RoguePod LiteCast`,
    `${game} Podcast Review | RoguePod`,
    `${game} Podcast Review`,
  ];
  return candidates.find((title) => title.length <= TITLE_LIMIT) ?? `${game} Podcast`;
};

/**
 * The feed blurb already leads with "A Podcast Review of <Game>:" (added by
 * scripts/fetch-episodes.js), so it carries the game name and "review".
 */
export const episodeDescription = (game: string, blurb: string): string =>
  blurb || `A Podcast Review of ${game}: Danny and David review ${game} and add it to the ultimate roguelite tier list.`;

export const TIER_LIST_TITLE = "RoguePod LiteCast's Ultimate Roguelite Tier List";

export const DEFINITIONS_TITLE = 'Roguelite vs Roguelike | RoguePod LiteCast Podcast';

/** "1h 45m" -> "PT1H45M", the ISO 8601 form schema.org durations use. */
export const isoDuration = (human: string): string => {
  const hours = /(\d+)h/.exec(human)?.[1];
  const minutes = /(\d+)m/.exec(human)?.[1];
  if (!hours && !minutes) return '';
  return `PT${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}`;
};
