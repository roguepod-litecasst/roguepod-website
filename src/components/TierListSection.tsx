import React, { useEffect, useState } from 'react';
import { SITE } from '../data/site';
import { CloseIcon, ExpandIcon } from './Icons';

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
 * The image must stay at /tierlist.png: a Discord bot in a separate repo polls
 * that exact URL and reposts it when the hash changes.
 */
const TierListSection: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    // Prevent the page behind the lightbox from scrolling.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  return (
    <section id="tierlist" className="mx-auto max-w-content scroll-mt-20 px-5 pt-20 sm:px-8 sm:pt-28">
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

      {/* The tier list is a wide grid; below ~700px it becomes unreadable when
          scaled to fit, so let it overflow and pan horizontally instead. */}
      <div className="mt-8 overflow-x-auto border border-ink-600 bg-ink-800">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="group relative block w-full min-w-[42rem] transition-opacity hover:opacity-95"
          aria-label="Expand the tier list to full size"
        >
          <img
            src="/tierlist.png"
            alt="The RoguePod LiteCast roguelite tier list, ranking every game covered on the show from S tier to F tier"
            className="w-full"
            width={2216}
            height={1380}
          />
          <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-2 border border-ink-500 bg-ink-900/90 px-3 py-2 font-display text-xs font-semibold uppercase tracking-[0.1em] text-bone-100 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <ExpandIcon className="h-3.5 w-3.5" />
            Expand
          </span>
        </button>
      </div>

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
        .
      </p>

      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tier list, full size"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/95 p-4 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute right-4 top-4 z-10 border border-ink-500 bg-ink-800 p-2.5 text-bone-100 transition-colors hover:border-bone-300 hover:text-bone-50"
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
          <img
            src="/tierlist.png"
            alt="The RoguePod LiteCast roguelite tier list, full size"
            className="max-h-[92vh] max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
};

export default TierListSection;
