import React from 'react';

/**
 * The question the hosts get more than any other, answered once so it can be
 * linked at instead of relitigated. `id="roguelite-vs-roguelike"` is what the
 * header nav points at.
 *
 * Sits last on the page: it's reference material, not a call to action, so it
 * shouldn't come before the Discord and Patreon blocks.
 */
const DefinitionsSection: React.FC = () => (
  <section
    id="roguelite-vs-roguelike"
    className="mx-auto max-w-content px-5 pt-20 sm:px-8 sm:pt-28"
  >
    <div className="max-w-2xl">
      <p className="eyebrow">Roguelite vs Roguelike</p>
      {/* Steps down on phones like the hero tagline does — at `text-3xl` the
          question ran to four lines at 375px and stranded "[insert game]". */}
      <h2 className="mt-3 text-balance text-2xl font-semibold sm:text-4xl">
        But isn&apos;t [insert game] here a roguelike not a roguelite?
      </h2>
    </div>

    <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-bone-200">
      <p>
        We started this show operating on the old-school definition of roguelikes: turn-based grid
        movement, procedural generation, and permadeath. Nowadays these games are more commonly
        referred to as &ldquo;traditional roguelikes&rdquo;. When you use that strict definition of
        a roguelike, all games that are inspired by roguelikes but do not follow these rigid rules
        fall under the category of &ldquo;roguelites&rdquo;.
      </p>
      <p>
        Since the early days, there was another strain of thought that referred to games with
        procedural generation, permadeath, and no metaprogression as &ldquo;roguelikes&rdquo; and
        those with metaprogression as &ldquo;roguelites&rdquo;. This has slowly become the more
        common terminology when discussing these games.
      </p>
      <p>
        Language continues to evolve, but we don&apos;t want to change the name of the show, so
        we&apos;re going to continue to refer to all of these non-traditional roguelikes as
        &ldquo;roguelites&rdquo; and not get too bogged down in the definitions.
      </p>
    </div>
  </section>
);

export default DefinitionsSection;
