import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * Catch-all. Without this any unknown path renders the header and footer with
 * an empty middle, which reads as a broken page rather than a missing one.
 */
const NotFound: React.FC = () => {
  useEffect(() => {
    document.title = 'Page not found | RoguePod LiteCast';
  }, []);

  return (
    <div className="mx-auto max-w-content px-5 pb-8 pt-32 sm:px-8 sm:pt-40">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Page not found</h1>
      <p className="mt-4 max-w-lg text-base leading-relaxed text-bone-200">
        That page doesn&apos;t exist, or it moved.
      </p>

      <div className="mt-9 flex flex-wrap gap-3">
        <Link
          to="/"
          className="inline-flex items-center bg-signal px-6 py-3.5 font-display text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-signal-dim"
        >
          Home
        </Link>
        <Link
          to="/episodes"
          className="inline-flex items-center border border-ink-500 px-6 py-3.5 font-display text-sm font-semibold uppercase tracking-[0.08em] text-bone-100 transition-colors hover:border-bone-300 hover:text-bone-50"
        >
          All episodes
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
