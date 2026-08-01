import React from 'react';
import { Link } from 'react-router-dom';
import { Episode } from '../data/episodes';
import EpisodeCard from './EpisodeCard';
import { ArrowIcon } from './Icons';

type EpisodesSectionProps = {
  episodes: Episode[];
  loading: boolean;
};

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

      <Link
        to="/episodes"
        className="group inline-flex shrink-0 items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.08em] text-bone-100 transition-colors hover:text-signal-bright"
      >
        All episodes
        <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
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
          <EpisodeCard key={episode.slug} episode={episode} />
        ))}
      </div>
    ) : (
      <p className="mt-8 text-bone-300">
        Episode list unavailable right now — <Link className="font-medium text-signal-bright underline underline-offset-4" to="/episodes">browse all episodes</Link>.
      </p>
    )}
  </section>
);

export default EpisodesSection;
