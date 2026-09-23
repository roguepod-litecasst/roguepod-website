import React, { useEffect, useState } from 'react';
import { CloseIcon, ExpandIcon } from './Icons';

/**
 * The tier list PNG with its click-to-expand lightbox. Shared by the home page
 * section and /tier-list/.
 *
 * The image must stay at /tierlist.png: a Discord bot in a separate repo polls
 * that exact URL and reposts it when the hash changes.
 */
const TierListImage: React.FC = () => {
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
    <>
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
    </>
  );
};

export default TierListImage;
