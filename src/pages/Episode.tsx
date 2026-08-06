import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AppleIcon,
  ArrowIcon,
  OvercastIcon,
  PocketCastsIcon,
  RssIcon,
  SpotifyIcon,
} from '../components/Icons';
import { formatLongDate, isoDate, useEpisodes } from '../data/episodes';
import { SITE } from '../data/site';

const Episode: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { feed, loading } = useEpisodes();
  const episode = feed.episodes.find((candidate) => candidate.slug === slug);

  /*
   * The Acast player is only embedded once someone asks for it, and that is
   * load-bearing for search, not a performance nicety.
   *
   * The embed fetches the episode from phoenix.prod.ateam.acast.cloud, whose
   * robots.txt is `User-agent: * / Disallow: /`. Googlebot obeys it, the fetch
   * fails, and the player renders "The episode was not found or is
   * unavailable." into the page. On a page whose only other unique text is a
   * one-line blurb, that was enough for Google to classify every episode URL as
   * a soft 404 and refuse to index it.
   *
   * Nothing on this domain can change Acast's robots.txt, so the fix is to not
   * create the iframe for a client that never clicks. Everyone is served the
   * same HTML — there's no user-agent sniffing here, so it isn't cloaking.
   */
  const [playerRequested, setPlayerRequested] = useState(false);

  useEffect(() => {
    if (!episode) return;
    document.title = `${episode.title} | RoguePod LiteCast`;
    const description = document.querySelector('meta[name="description"]');
    if (description && episode.blurb) description.setAttribute('content', episode.blurb);
  }, [episode]);

  if (loading) {
    return (
      <div className="mx-auto max-w-content px-5 pt-32 sm:px-8 sm:pt-40">
        <div className="h-6 w-32 animate-pulse bg-ink-800" />
        <div className="mt-6 h-10 w-2/3 animate-pulse bg-ink-800" />
        <div className="mt-10 aspect-[3/4] w-56 animate-pulse bg-ink-800" />
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="mx-auto max-w-content px-5 pt-32 text-center sm:px-8 sm:pt-40">
        <h1 className="text-3xl font-semibold">Episode not found</h1>
        <p className="mt-4 text-bone-200">That episode doesn&apos;t exist, or it moved.</p>
        <Link
          to="/episodes"
          className="mt-8 inline-flex items-center bg-signal px-6 py-3.5 font-display text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-signal-dim"
        >
          All episodes
        </Link>
      </div>
    );
  }

  /*
   * Apple and Acast resolve to this exact episode; Apple's comes from the
   * iTunes lookup at build time. Spotify, Pocket Casts and Overcast have no
   * unauthenticated way to resolve an episode URL, so they're listed
   * separately as show-level follow links rather than pretending to be exact.
   */
  const episodeLinks = [
    episode.apple && { href: episode.apple, label: 'Apple Podcasts', icon: <AppleIcon /> },
    { href: episode.link, label: 'Acast', icon: <RssIcon /> },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];

  const showLinks = [
    { href: SITE.spotify, label: 'Spotify', icon: <SpotifyIcon /> },
    { href: SITE.pocketCasts, label: 'Pocket Casts', icon: <PocketCastsIcon /> },
    { href: SITE.overcast, label: 'Overcast', icon: <OvercastIcon /> },
    { href: SITE.rss, label: 'RSS', icon: <RssIcon /> },
  ];

  return (
    <div className="mx-auto max-w-content px-5 pb-8 pt-32 sm:px-8 sm:pt-40">
      <Link
        to="/episodes"
        className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-bone-400 transition-colors hover:text-signal-bright"
      >
        ← All episodes
      </Link>

      <article className="mt-8 grid gap-10 lg:grid-cols-[18rem_1fr] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          {episode.art ? (
            <img
              src={episode.art}
              alt={`${episode.title} cover art`}
              className="w-full max-w-[18rem] border border-ink-600"
            />
          ) : (
            <div className="flex aspect-[2/3] w-full max-w-[18rem] items-center justify-center border border-ink-600 bg-ink-800 p-6">
              <span className="text-center font-display text-2xl font-semibold text-bone-300">
                {episode.title}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <header>
            {episode.number !== null && <p className="eyebrow">Episode {episode.number}</p>}
            <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
              {episode.title}
            </h1>
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-bone-400">
              <time dateTime={isoDate(episode.publishedAt)}>
                {formatLongDate(episode.publishedAt)}
              </time>
              {episode.duration && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{episode.duration}</span>
                </>
              )}
            </p>
          </header>

          {episode.embed && (
            <div className="mt-8 border border-ink-600 bg-ink-800 p-2 sm:p-3">
              {playerRequested ? (
                <iframe
                  src={episode.embed}
                  title={`Play ${episode.title}`}
                  width="100%"
                  height="190"
                  frameBorder="0"
                  allow="autoplay"
                  className="w-full"
                />
              ) : (
                /* Same 190px box as the iframe, so swapping them shifts nothing. */
                <button
                  type="button"
                  onClick={() => setPlayerRequested(true)}
                  aria-label={`Load the player for ${episode.title}`}
                  className="group flex h-[190px] w-full items-center gap-4 bg-gradient-to-b from-ink-700 to-ink-800 px-4 text-left transition-colors hover:from-ink-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-signal-bright"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-signal transition-transform group-hover:scale-105 motion-reduce:transform-none">
                    <svg viewBox="0 0 16 16" aria-hidden="true" className="ml-0.5 h-4 w-4 fill-white">
                      <path d="M3 1.5v13l11-6.5z" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-base font-semibold text-bone-50">
                      Play this episode
                    </span>
                    <span className="mt-0.5 block text-sm text-bone-300">
                      {episode.duration ? `${episode.duration} · ` : ''}Loads the Acast player
                    </span>
                  </span>
                </button>
              )}
            </div>
          )}

          <div className="mt-8">
            <h2 className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-bone-400">
              Listen to this episode
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {episodeLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2.5 border border-ink-600 bg-ink-800 px-4 py-3 text-sm font-medium text-bone-100 transition-colors hover:border-ink-500"
                >
                  <span className="h-4 w-4 text-bone-300 transition-colors group-hover:text-signal-bright">
                    {link.icon}
                  </span>
                  {link.label}
                </a>
              ))}
              {episode.audio && (
                <a
                  href={episode.audio}
                  className="inline-flex items-center gap-2.5 border border-ink-600 bg-ink-800 px-4 py-3 text-sm font-medium text-bone-100 transition-colors hover:border-ink-500"
                >
                  Download MP3
                </a>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <span className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-bone-400">
                Follow the show
              </span>
              {showLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 text-sm font-medium text-bone-200 transition-colors hover:text-bone-50"
                >
                  <span className="h-4 w-4 text-bone-300 transition-colors group-hover:text-signal-bright">
                    {link.icon}
                  </span>
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {episode.blocks.length > 0 && (
            <div className="mt-10 space-y-4">
              {episode.blocks.map((block, index) =>
                block.list ? (
                  <p key={index} className="flex gap-3 pl-1 leading-relaxed text-bone-200">
                    <span aria-hidden="true" className="text-signal-bright">
                      —
                    </span>
                    <span>{block.text}</span>
                  </p>
                ) : (
                  <p key={index} className="leading-relaxed text-bone-200">
                    {block.text}
                  </p>
                )
              )}
            </div>
          )}

          <div className="mt-10 flex flex-col gap-4 border border-ink-600 bg-ink-800 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-bone-200">
              See where {episode.title} landed against every other game on the show.
            </p>
            <Link
              to="/#tierlist"
              className="group inline-flex shrink-0 items-center gap-2.5 bg-signal px-5 py-3 font-display text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-signal-dim"
            >
              The tier list
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
};

export default Episode;
