import React from 'react';
import { Episode, formatDate } from '../data/episodes';
import { SITE } from '../data/site';
import { ArrowIcon } from './Icons';

type EpisodesSectionProps = {
  episodes: Episode[];
  loading: boolean;
};

/**
 * Game art comes from the tier list pipeline's Steam capsule cache. A brand new
 * episode may not have art exported yet, so the card falls back to a
 * typographic tile rather than a broken image.
 */
const EpisodeCard: React.FC<{ episode: Episode }> = ({ episode }) => (
  <a
    href={episode.link}
    target="_blank"
    rel="noopener noreferrer"
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
      <h3 className="font-display text-base font-semibold leading-snug text-bone-50 transition-colors group-hover:text-signal-bright">
        {episode.title}
      </h3>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-bone-400">
        <time dateTime={new Date(episode.publishedAt).toISOString()} className="whitespace-nowrap">
          {formatDate(episode.publishedAt)}
        </time>
        {episode.duration && <span className="whitespace-nowrap">{episode.duration}</span>}
      </p>
    </div>
  </a>
);

const EpisodesSection: React.FC<EpisodesSectionProps> = ({ episodes, loading }) => (
  <section id="episodes" className="mx-auto max-w-content scroll-mt-20 px-5 pt-20 sm:px-8 sm:pt-28">
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="eyebrow">Episodes</p>
        <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Latest episodes</h2>
        <p className="mt-4 text-base leading-relaxed text-bone-200">
          One roguelite per episode, played, discussed, and placed on the list.
        </p>
      </div>

      <a
        href={SITE.apple}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex shrink-0 items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.08em] text-bone-100 transition-colors hover:text-signal-bright"
      >
        All episodes
        <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </a>
    </div>

    {loading ? (
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="aspect-[3/4] animate-pulse border border-ink-600 bg-ink-800" />
        ))}
      </div>
    ) : episodes.length > 0 ? (
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {episodes.slice(0, 6).map((episode) => (
          <EpisodeCard key={episode.link || episode.title} episode={episode} />
        ))}
      </div>
    ) : (
      <p className="mt-8 text-bone-300">
        Episode list unavailable right now —{' '}
        <a
          href={SITE.apple}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-signal-bright underline underline-offset-4"
        >
          find every episode on Apple Podcasts
        </a>
        .
      </p>
    )}
  </section>
);

export default EpisodesSection;
