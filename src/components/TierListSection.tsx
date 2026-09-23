import React from 'react';
import { Link } from 'react-router-dom';
import { SITE } from '../data/site';
import TierListImage from './TierListImage';

const TIERS = [
  { label: 'S', color: 'bg-tier-s' },
  { label: 'A', color: 'bg-tier-a' },
  { label: 'B', color: 'bg-tier-b' },
  { label: 'C', color: 'bg-tier-c' },
  { label: 'D', color: 'bg-tier-d' },
  { label: 'F', color: 'bg-tier-f' },
];

/**
 * The tier list itself. `id="tierlist"` keeps the old roguepod.show/#tierlist
 * links working — they now scroll here instead of swapping to a separate view.
 *
 * /tier-list/ is the same list as HTML, with every game linked to its episode.
 */
const TierListSection: React.FC = () => (
  <section id="tierlist" className="mx-auto max-w-content px-5 pt-20 sm:px-8 sm:pt-28">
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="eyebrow">The tier list</p>
        <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
          Every roguelite we&apos;ve covered
        </h2>
        <p className="mt-4 text-base leading-relaxed text-bone-200">
          We assess games as how good we feel they are at a) being a roguelite and b) being fun.
          Games are ordered within their tier, and the list is updated after every episode.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
        {TIERS.map((tier) => (
          <span
            key={tier.label}
            className={`${tier.color} flex h-8 w-8 items-center justify-center font-display text-sm font-bold text-ink-900`}
          >
            {tier.label}
          </span>
        ))}
      </div>
    </div>

    <TierListImage />

    <p className="mt-4 text-sm text-bone-300">
      <span className="hidden sm:inline">Click the image to view it full size. </span>
      <span className="sm:hidden">Swipe to pan, tap to view it full size. </span>
      Think we got one wrong?{' '}
      <a
        href={SITE.discord}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-signal-bright underline decoration-signal/40 underline-offset-4 transition-colors hover:decoration-signal"
      >
        Tell us in the Discord
      </a>
      .{' '}
      <Link
        to="/tier-list/"
        className="font-medium text-signal-bright underline decoration-signal/40 underline-offset-4 transition-colors hover:decoration-signal"
      >
        Browse it game by game
      </Link>
      .
    </p>
  </section>
);

export default TierListSection;
