import React from 'react';
import { PLATFORMS, SITE } from '../data/site';
import { jumpTo } from '../lib/scroll';
import { ArrowIcon } from './Icons';

type HeroProps = { episodeCount: number };

/**
 * Full-bleed glitch band from the show art, fading into the page. This is the
 * only place the art runs at full strength — everything below it stays quiet.
 */
const Hero: React.FC<HeroProps> = ({ episodeCount }) => (
  <section className="relative isolate overflow-hidden">
    {/* Art layer */}
    <div className="absolute inset-0 -z-10">
      <img
        src="/brand/hero-2160.webp"
        srcSet="/brand/hero-1440.webp 1440w, /brand/hero-2160.webp 2160w"
        sizes="100vw"
        alt=""
        aria-hidden="true"
        className="h-full w-full object-cover opacity-90"
        // The source is pixel art and the band gets scaled up to fill the hero;
        // smoothing turns it to mush, so keep the blocks hard-edged.
        style={{ imageRendering: 'pixelated' }}
        fetchPriority="high"
      />
      {/* Scrims run light-to-dark left-to-right: the glitch art reads brightest
          on the left, and the busiest side of the background sits away from the
          cover art on the right so the two don't compete. The left is still
          scrimmed enough to keep the headline legible. */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink-900/45 via-ink-900/70 to-ink-900/90" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/25 to-ink-900/60" />
    </div>

    <div className="mx-auto max-w-content px-5 pb-16 pt-32 sm:px-8 sm:pb-24 sm:pt-40">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto] lg:gap-16">
      {/* Cover art is the show's real logo, glitch border and all. It leads on
          mobile and sits opposite the copy from lg up. */}
      <h1 className="animate-rise order-first lg:order-last">
        <img
          src="/brand/cover-720.webp"
          srcSet="/brand/cover-480.webp 480w, /brand/cover-720.webp 720w, /brand/cover-1080.webp 1080w"
          sizes="(min-width: 1024px) 22rem, (min-width: 640px) 20rem, 100vw"
          alt="RoguePod LiteCast"
          width={720}
          height={720}
          className="w-full max-w-[17rem] border border-ink-600 shadow-2xl sm:max-w-[20rem] lg:max-w-[22rem]"
          style={{ imageRendering: 'pixelated' }}
          fetchPriority="high"
        />
      </h1>

      <div className="min-w-0">
        <p className="eyebrow animate-rise">{SITE.eyebrow}</p>

        <p
          className="animate-rise mt-4 max-w-2xl font-display text-2xl font-semibold leading-[1.15] tracking-[-0.02em] text-bone-50 sm:text-4xl"
          style={{ animationDelay: '60ms' }}
        >
          {SITE.tagline}
        </p>

        <p
          className="animate-rise mt-5 max-w-xl text-base leading-relaxed text-bone-200 sm:text-lg"
          style={{ animationDelay: '120ms' }}
        >
          {SITE.blurb}
        </p>

        <div
          className="animate-rise mt-9 flex flex-wrap items-center gap-3"
          style={{ animationDelay: '180ms' }}
        >
          <a
            href="#tierlist"
            onClick={jumpTo('#tierlist')}
            className="group inline-flex items-center gap-2.5 bg-signal px-6 py-3.5 font-display text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-signal-dim"
          >
            See the tier list
            <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#episodes"
            onClick={jumpTo('#episodes')}
            className="inline-flex items-center gap-2.5 border border-ink-500 bg-ink-900/60 px-6 py-3.5 font-display text-sm font-semibold uppercase tracking-[0.08em] text-bone-100 backdrop-blur-sm transition-colors hover:border-bone-300 hover:text-bone-50"
          >
            Latest episodes
          </a>
        </div>
        </div>
      </div>

      {/* Straight-to-the-show links, for people who just want to hit play.
          Full width below the grid so all five fit on one line. */}
      <div
        className="animate-rise mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-ink-600/70 pt-6"
        style={{ animationDelay: '240ms' }}
      >
        <span className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-bone-400">
          Listen on
        </span>
        {PLATFORMS.map((platform) => (
          <a
            key={platform.href}
            href={platform.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 text-sm font-medium text-bone-200 transition-colors hover:text-bone-50"
          >
            <span className="h-4 w-4 text-bone-300 transition-colors group-hover:text-signal-bright">
              {platform.icon}
            </span>
            {platform.label}
          </a>
        ))}
      </div>
    </div>

    {/* Stat strip */}
    <div className="rule bg-ink-900/80 backdrop-blur-sm">
      <dl className="mx-auto grid max-w-content grid-cols-1 divide-y divide-ink-600 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8">
        <div className="py-5 sm:pr-8">
          <dt className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-bone-400">
            Episodes
          </dt>
          <dd className="mt-1.5 font-display text-lg font-semibold text-bone-50">
            {episodeCount > 0 ? `${episodeCount} games reviewed` : 'Reviewing one game at a time'}
          </dd>
        </div>
        <div className="py-5 sm:px-8">
          <dt className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-bone-400">
            Schedule
          </dt>
          <dd className="mt-1.5 font-display text-lg font-semibold text-bone-50">
            Every other Wednesday
          </dd>
        </div>
        <div className="py-5 sm:pl-8">
          <dt className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-bone-400">
            Patreon
          </dt>
          <dd className="mt-1.5 font-display text-lg font-semibold text-bone-50">
            <a
              href={SITE.patreon}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-signal-bright"
            >
              Monthly bonus episodes
            </a>
          </dd>
        </div>
      </dl>
    </div>
  </section>
);

export default Hero;
