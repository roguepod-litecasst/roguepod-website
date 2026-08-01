import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DefinitionsSection from '../components/DefinitionsSection';
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

    const align = () => {
      const target = document.querySelector(hash);
      // 'instant', not 'auto' — 'auto' defers to the CSS scroll-behavior, which
      // is smooth, and a deep link should land rather than animate down.
      target?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
    };

    align();

    /*
     * On a cold load the first alignment happens before the web fonts swap in,
     * which reflows the hero and leaves the target ~115px off. Re-align once
     * fonts and any remaining images have settled.
     */
    const timer = window.setTimeout(align, 300);
    document.fonts?.ready.then(align).catch(() => {});
    window.addEventListener('load', align);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('load', align);
    };
  }, [hash]);

  return (
    <>
      <Hero episodeCount={feed.episodeCount} />
      <EpisodesSection episodes={feed.episodes} loading={loading} />
      <TierListSection />
      <ListenSection />
      <DefinitionsSection />
    </>
  );
};

export default Home;
