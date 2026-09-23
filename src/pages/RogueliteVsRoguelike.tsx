import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowIcon } from '../components/Icons';
import { DEFINITIONS_TITLE } from '../lib/seo';

/**
 * The question the hosts get more than any other, answered once so it can be
 * linked at instead of relitigated. It used to be the last section of the home
 * page (anchor #roguelite-vs-roguelike, which Home.tsx still redirects here);
 * as its own page it can be indexed and linked on its own.
 */
const RogueliteVsRoguelike: React.FC = () => {
  useEffect(() => {
    document.title = DEFINITIONS_TITLE;
  }, []);

  return (
    <div className="mx-auto max-w-content px-5 pb-8 pt-32 sm:px-8 sm:pt-40">
      <header className="max-w-2xl">
        <p className="eyebrow">Roguelite vs Roguelike</p>
        {/* Steps down on phones — at `text-3xl` the question ran to four lines
            at 375px and stranded "[insert game]". */}
        <h1 className="mt-3 text-balance text-2xl font-semibold sm:text-4xl">
          But isn&apos;t [insert game] here a roguelike not a roguelite?
        </h1>
      </header>

      <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-bone-200">
        <p>
          We started this show operating on the old-school definition of roguelikes: turn-based
          grid movement, procedural generation, and permadeath. Nowadays these games are more
          commonly referred to as &ldquo;traditional roguelikes&rdquo;. When you use that strict
          definition of a roguelike, all games that are inspired by roguelikes but do not follow
          these rigid rules fall under the category of &ldquo;roguelites&rdquo;.
        </p>
        <p>
          Since the term was first used in the Steam page for Rogue Legacy in 2013, there was
          another strain of thought that referred to games with procedural generation, permadeath,
          and no metaprogression as &ldquo;roguelikes&rdquo; and those with metaprogression as
          &ldquo;roguelites&rdquo;. This has slowly become the more common terminology when
          discussing these games.
        </p>
        <p>
          Language continues to evolve, but we don&apos;t want to change the name of the show, so
          we&apos;re going to continue to refer to all of these non-traditional roguelikes as
          &ldquo;roguelites&rdquo; and not get too bogged down in the definitions.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/tier-list/"
          className="group inline-flex items-center gap-2.5 bg-signal px-6 py-3.5 font-display text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-signal-dim"
        >
          See the tier list
          <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          to="/episodes/"
          className="inline-flex items-center border border-ink-500 px-6 py-3.5 font-display text-sm font-semibold uppercase tracking-[0.08em] text-bone-100 transition-colors hover:border-bone-300 hover:text-bone-50"
        >
          All episodes
        </Link>
      </div>
    </div>
  );
};

export default RogueliteVsRoguelike;
