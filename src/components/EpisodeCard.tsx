import React from 'react';
import { Link } from 'react-router-dom';
import { Episode, episodePath, formatDate, isoDate } from '../data/episodes';

/**
 * Game art comes from the tier list pipeline's Steam capsule cache. A brand new
 * episode may not have art exported yet, so the card falls back to a
 * typographic tile rather than a broken image.
 */
const EpisodeCard: React.FC<{ episode: Episode }> = ({ episode }) => (
  <Link
    to={episodePath(episode.slug)}
    className="group flex flex-col border border-ink-600 bg-ink-800 transition-colors hover:border-ink-500"
  >
    <div className="relative aspect-[3/4] overflow-hidden bg-ink-700">
      {episode.art ? (
        <img
          src={episode.art}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-4">
          <span className="text-center font-display text-lg font-semibold leading-tight text-bone-300">
            {episode.title}
          </span>
        </div>
      )}
      {episode.number !== null && (
        <span className="absolute left-0 top-0 bg-ink-900/90 px-2.5 py-1.5 font-display text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-bone-100 backdrop-blur-sm">
          Ep {episode.number}
        </span>
      )}
    </div>

    <div className="flex flex-1 flex-col p-4">
      {/* Clamped: a few titles run very long ("Vampire Crawlers: The Turbo
          Wildcard from Vampire Survivors") and would stretch the whole grid row. */}
      <h3
        className="line-clamp-2 font-display text-base font-semibold leading-snug text-bone-50 transition-colors group-hover:text-signal-bright"
        title={episode.title}
      >
        {episode.title}
      </h3>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-bone-400">
        <time dateTime={isoDate(episode.publishedAt)} className="whitespace-nowrap">
          {formatDate(episode.publishedAt)}
        </time>
        {episode.duration && <span className="whitespace-nowrap">{episode.duration}</span>}
      </p>
    </div>
  </Link>
);

export default EpisodeCard;
