import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import EpisodesSection from '../components/EpisodesSection';
import Hero from '../components/Hero';
import ListenSection from '../components/ListenSection';
import TierListSection from '../components/TierListSection';
import { useEpisodes } from '../data/episodes';

const Home: React.FC = () => {
  const { feed, loading } = useEpisodes();
  const { hash } = useLocation();

  useEffect(() => {
    document.title = 'RoguePod LiteCast — Roguelite Review Podcast & Tier List';
  }, []);

  /**
   * Existing links point at roguepod.show/#tierlist, which used to swap the
   * whole page to a tier list view. That anchor now lives on a section, but the
   * browser only scrolls to it natively on a full page load — after a
   * client-side route change we have to do it ourselves.
   */
  useEffect(() => {
    if (!hash) return;
    const target = document.querySelector(hash);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  return (
    <>
      <Hero episodeCount={feed.episodeCount} />
      <EpisodesSection episodes={feed.episodes} loading={loading} />
      <TierListSection />
      <ListenSection />
    </>
  );
};

export default Home;
