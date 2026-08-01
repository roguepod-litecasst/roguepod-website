import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import EpisodeCard from '../components/EpisodeCard';
import { useEpisodes } from '../data/episodes';

const Episodes: React.FC = () => {
  const { feed, loading } = useEpisodes();

  useEffect(() => {
    document.title = 'All episodes | RoguePod LiteCast';
  }, []);

  return (
    <div className="mx-auto max-w-content px-5 pb-8 pt-32 sm:px-8 sm:pt-40">
      <header className="max-w-2xl">
        <p className="eyebrow">Episodes</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Every episode</h1>
        <p className="mt-4 text-base leading-relaxed text-bone-200">
          One roguelite per episode, played, discussed, and placed on{' '}
          <Link
            to="/#tierlist"
            className="font-medium text-signal-bright underline decoration-signal/40 underline-offset-4 transition-colors hover:decoration-signal"
          >
            the tier list
          </Link>
          .
        </p>
      </header>

      {loading ? (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="aspect-[3/4] animate-pulse border border-ink-600 bg-ink-800" />
          ))}
        </div>
      ) : (
        <>
          <p className="mt-10 font-display text-xs font-semibold uppercase tracking-[0.16em] text-bone-400">
            {feed.episodeCount} episodes
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {feed.episodes.map((episode) => (
              <EpisodeCard key={episode.slug} episode={episode} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Episodes;
