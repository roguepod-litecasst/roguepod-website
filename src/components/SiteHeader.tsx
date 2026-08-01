import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE } from '../data/site';
import { jumpTo } from '../lib/scroll';

type NavItem = { label: string; href: string; route?: boolean };

/** `route: true` navigates to a page; the rest are in-page anchors. */
const NAV: NavItem[] = [
  { label: 'Episodes', href: '/episodes', route: true },
  { label: 'Tier list', href: '/#tierlist' },
  { label: 'Contact', href: '/#contact' },
];

/**
 * Sticky header. Transparent over the hero art, then picks up a background and
 * hairline once the page scrolls so it stays legible over content.
 */
const SiteHeader: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled ? 'border-b border-ink-600 bg-ink-900/90 backdrop-blur-md' : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-5 sm:px-8">
        <Link
          to="/"
          className="rounded font-display text-sm font-semibold uppercase tracking-[0.18em] text-bone-50 transition-colors hover:text-signal"
          aria-label="RoguePod LiteCast — home"
        >
          Home
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV.map((item) =>
            item.route ? (
              <Link
                key={item.href}
                to={item.href}
                className="rounded px-2.5 py-2 text-sm font-medium text-bone-200 transition-colors hover:text-bone-50 sm:px-3"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                // On the home page these are in-page jumps; elsewhere the href
                // navigates normally because the target isn't in the document.
                onClick={jumpTo(item.href.replace('/', ''))}
                className="rounded px-2.5 py-2 text-sm font-medium text-bone-200 transition-colors hover:text-bone-50 sm:px-3"
              >
                {item.label}
              </a>
            )
          )}
          <a
            href={SITE.patreon}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 hidden rounded-sm border border-ink-500 px-3.5 py-2 text-sm font-medium text-bone-100 transition-colors hover:border-signal hover:text-bone-50 sm:inline-block"
          >
            Patreon
          </a>
        </nav>
      </div>
    </header>
  );
};

export default SiteHeader;
