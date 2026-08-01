import React, { useEffect } from 'react';
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
        <h1 className="text-3xl font-semibold sm:text-4xl">Episodes</h1>
      </header>

      {loading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="aspect-[3/4] animate-pulse border border-ink-600 bg-ink-800" />
          ))}
        </div>
      ) : (
        <>
          <p className="mt-3 font-display text-xs font-semibold uppercase tracking-[0.16em] text-bone-400">
            {feed.episodeCount} total, newest first
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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
