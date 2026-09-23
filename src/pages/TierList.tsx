import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import TierListImage from '../components/TierListImage';
import { episodePath, useEpisodes } from '../data/episodes';
import { SITE } from '../data/site';
import { tierColor, useTiers } from '../data/tiers';
import { TIER_LIST_TITLE } from '../lib/seo';

/**
 * The tier list as HTML, every game linked to its episode page. The PNG is a
 * picture of this list, which is readable to people and useless to crawlers:
 * this page is what gives search engines the tier list itself, and one more
 * internal link to every episode.
 *
 * Built entirely from public/tiers.json, which the tier list workflow writes
 * alongside the PNG — nothing here is maintained by hand.
 */
const TierList: React.FC = () => {
  const { tierList, loading } = useTiers();
  const { feed } = useEpisodes();
  const bySlug = new Map(feed.episodes.map((episode) => [episode.slug, episode]));
  const gameCount = tierList.tiers.reduce((total, row) => total + row.games.length, 0);

  useEffect(() => {
    document.title = TIER_LIST_TITLE;
  }, []);

  return (
    <div className="mx-auto max-w-content px-5 pb-8 pt-32 sm:px-8 sm:pt-40">
      <header className="max-w-2xl">
        <p className="eyebrow">The tier list</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">The roguelite tier list</h1>
        <p className="mt-4 text-base leading-relaxed text-bone-200">
          We assess games as how good we feel they are at a) being a roguelite and b) being fun.
          Games are ordered within their tier, and the list is updated after every episode.
        </p>
        {gameCount > 0 && (
          <p className="mt-3 font-display text-xs font-semibold uppercase tracking-[0.16em] text-bone-400">
            {gameCount} games, best first
          </p>
        )}
      </header>

      {loading ? (
        <div className="mt-10 space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse border border-ink-600 bg-ink-800" />
          ))}
        </div>
      ) : (
        <div className="mt-10 space-y-2">
          {tierList.tiers.map((row) => (
            <section
              key={row.tier}
              aria-labelledby={`tier-${row.tier}`}
              className="flex border border-ink-600 bg-ink-800"
            >
              <h2
                id={`tier-${row.tier}`}
                className={`${tierColor(row.tier)} flex w-14 shrink-0 items-center justify-center font-display text-2xl font-bold text-ink-900 sm:w-20 sm:text-3xl`}
              >
                <span className="sr-only">Tier </span>
                {row.tier}
              </h2>
              <ol className="grid flex-1 grid-cols-3 gap-2 p-2 sm:grid-cols-5 lg:grid-cols-8">
                {row.games.map((game) => {
                  const episode = game.slug ? bySlug.get(game.slug) : undefined;
                  const title = episode?.title ?? game.name;
                  const body = (
                    <>
                      <div className="aspect-[2/3] overflow-hidden bg-ink-700">
                        {episode?.art ? (
                          <img
                            src={episode.art}
                            alt={`${title} cover art`}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center p-2">
                            <span className="text-center font-display text-sm font-semibold leading-tight text-bone-300">
                              {title}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug text-bone-100 transition-colors group-hover:text-signal-bright">
                        {title}
                      </span>
                    </>
                  );
                  return (
                    <li key={game.name}>
                      {episode ? (
                        <Link to={episodePath(episode.slug)} className="group block">
                          {body}
                        </Link>
                      ) : (
                        <div className="block">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}

      <section className="mt-16">
        <h2 className="text-2xl font-semibold sm:text-3xl">As an image</h2>
        <p className="mt-3 text-base leading-relaxed text-bone-200">
          The same list, the way we post it after every episode. Think we got one wrong?{' '}
          <a
            href={SITE.discord}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-signal-bright underline decoration-signal/40 underline-offset-4 transition-colors hover:decoration-signal"
          >
            Tell us in the Discord
          </a>
          .
        </p>
        <TierListImage />
      </section>
    </div>
  );
};

export default TierList;
