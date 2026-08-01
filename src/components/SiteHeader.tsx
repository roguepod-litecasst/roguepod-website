import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE } from '../data/site';
import { jumpTo } from '../lib/scroll';
import { CloseIcon, MenuIcon } from './Icons';

type NavItem = { label: string; href: string; route?: boolean };

/** `route: true` navigates to a page; the rest are in-page anchors. */
const NAV: NavItem[] = [
  { label: 'Episodes', href: '/episodes', route: true },
  { label: 'Tier List', href: '/#tierlist' },
  { label: 'Contact', href: '/#contact' },
  { label: 'Roguelite vs Roguelike', href: '/#roguelite-vs-roguelike' },
];

/**
 * The row of full labels plus the Patreon button measures ~645px, so it can't
 * appear until `md` (768px) — at `sm` (640px) it lands about 5px short, which
 * is what used to squeeze the nav on phones and force an abbreviated label.
 * Below `md` everything moves into the disclosure panel instead.
 */
const linkClasses =
  'whitespace-nowrap rounded px-2.5 py-2 text-sm font-medium text-bone-200 transition-colors hover:text-bone-50 lg:px-3';

/**
 * Sticky header. Transparent over the hero art, then picks up a background and
 * hairline once the page scrolls so it stays legible over content.
 */
const SiteHeader: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /*
   * Escape, a click outside the header, and growing past `md` all close the
   * panel. The resize case matters because the panel is `md:hidden` — without
   * it a phone rotated to landscape leaves `open` stuck true behind the
   * now-visible desktop nav, and the button it belongs to is gone.
   */
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const wide = window.matchMedia('(min-width: 768px)');
    const onWide = () => wide.matches && setOpen(false);

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    wide.addEventListener('change', onWide);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      wide.removeEventListener('change', onWide);
    };
  }, [open]);

  // In-page links have to scroll *and* close; the panel would otherwise sit
  // over the section it just jumped to.
  const jumpAndClose = useCallback(
    (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      jumpTo(href.replace('/', ''))(event);
      setOpen(false);
    },
    []
  );

  return (
    <header
      ref={headerRef}
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled || open
          ? 'border-b border-ink-600 bg-ink-900/90 backdrop-blur-md'
          : 'border-b border-transparent'
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

        <nav className="hidden items-center gap-1 md:flex lg:gap-2">
          {NAV.map((item) =>
            item.route ? (
              <Link key={item.href} to={item.href} className={linkClasses}>
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                // On the home page these are in-page jumps; elsewhere the href
                // navigates normally because the target isn't in the document.
                onClick={jumpTo(item.href.replace('/', ''))}
                className={linkClasses}
              >
                {item.label}
              </a>
            )
          )}
          <a
            href={SITE.patreon}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 whitespace-nowrap rounded-sm border border-ink-500 px-3.5 py-2 text-sm font-medium text-bone-100 transition-colors hover:border-signal hover:text-bone-50"
          >
            Patreon
          </a>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="site-menu"
          className="-mr-2 inline-flex items-center gap-2 rounded px-2 py-2 font-display text-xs font-semibold uppercase tracking-[0.14em] text-bone-100 transition-colors hover:text-bone-50 md:hidden"
        >
          {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {/* The bar can be transparent over the hero art, so the panel carries its
          own opaque background rather than relying on the header's. */}
      {open && (
        <div
          id="site-menu"
          className="border-t border-ink-600 bg-ink-900/95 backdrop-blur-md md:hidden"
        >
          <nav className="mx-auto flex max-w-content flex-col px-5 pb-6 pt-1 sm:px-8">
            {NAV.map((item) =>
              item.route ? (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-ink-700 py-3.5 text-[0.9375rem] font-medium text-bone-100 transition-colors hover:text-signal-bright"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={jumpAndClose(item.href)}
                  className="border-b border-ink-700 py-3.5 text-[0.9375rem] font-medium text-bone-100 transition-colors hover:text-signal-bright"
                >
                  {item.label}
                </a>
              )
            )}
            <a
              href={SITE.patreon}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="mt-5 border border-ink-500 px-4 py-3 text-center font-display text-sm font-semibold uppercase tracking-[0.08em] text-bone-100 transition-colors hover:border-signal hover:text-bone-50"
            >
              Patreon
            </a>
          </nav>
        </div>
      )}
    </header>
  );
};

export default SiteHeader;
