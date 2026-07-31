import React from 'react';

/**
 * In-page anchors jump instantly rather than smooth-scrolling.
 *
 * The page is tall — the tier list sits below the episode grid — so a smooth
 * scroll glides the whole way past intervening sections before arriving. The
 * anchor keeps a real href so middle-click, copy-link and no-JS still work; we
 * only take over the plain left-click.
 */
export const jumpTo =
  (hash: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.querySelector(hash);
    if (!target) return;
    event.preventDefault();
    // Must be 'instant', not 'auto' — 'auto' defers to the CSS scroll-behavior,
    // which is `smooth` for the document, so the jump would still animate.
    target.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
    window.history.replaceState(null, '', hash);
  };
