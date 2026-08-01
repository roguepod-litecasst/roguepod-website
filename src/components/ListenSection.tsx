import React from 'react';
import { COMMUNITY, PlatformLink, SITE } from '../data/site';
import { DiscordIcon, MailIcon, PatreonIcon } from './Icons';

const LinkTile: React.FC<{ link: PlatformLink }> = ({ link }) => (
  <a
    href={link.href}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex items-center gap-3.5 border border-ink-600 bg-ink-800 p-4 transition-colors hover:border-ink-500"
  >
    <span className="h-5 w-5 shrink-0 text-bone-300 transition-colors group-hover:text-bone-50">
      {link.icon}
    </span>
    <span className="font-display text-sm font-semibold text-bone-50">{link.label}</span>
  </a>
);

/**
 * Contact first — Discord and email are the two ways to actually reach the
 * hosts. Patreon and the socials sit below as secondary. The podcast apps live
 * in the hero, not here.
 */
const ListenSection: React.FC = () => (
  <section id="contact" className="mx-auto max-w-content scroll-mt-20 px-5 pt-20 sm:px-8 sm:pt-28">
    <div className="max-w-2xl">
      <p className="eyebrow">Contact</p>
      <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Get in touch</h2>
    </div>

    <div className="mt-8 grid gap-4 lg:grid-cols-2">
      {/* Discord leads — it's the best way to reach the hosts. */}
      <div className="flex flex-col border border-ink-600 bg-ink-800 p-6 sm:p-8">
        <span className="h-7 w-7 text-glitch-blue">
          <DiscordIcon />
        </span>
        <h3 className="mt-4 font-display text-lg font-semibold text-bone-50">
          Talk about roguelites on our Discord
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-bone-200">
          The best way to get in touch with us. Suggest a game, argue about a tier, or talk about
          new releases and upcoming roguelites.
        </p>
        <a
          href={SITE.discord}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex w-fit items-center justify-center border border-ink-500 bg-ink-900 px-6 py-3.5 font-display text-sm font-semibold uppercase tracking-[0.08em] text-bone-100 transition-colors hover:border-bone-300 hover:text-bone-50"
        >
          Join the Discord
        </a>
      </div>

      <div className="flex flex-col border border-ink-600 bg-ink-800 p-6 sm:p-8">
        <span className="h-7 w-7 text-bone-300">
          <MailIcon />
        </span>
        <h3 className="mt-4 font-display text-lg font-semibold text-bone-50">Email the show</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-bone-200">
          For anything that doesn&apos;t fit in a Discord message — feedback, corrections, or
          getting in touch about your game.
        </p>
        <a
          href={`mailto:${SITE.email}`}
          className="mt-6 inline-flex w-fit items-center gap-2.5 font-display text-base font-semibold text-bone-50 underline decoration-signal/50 underline-offset-[6px] transition-colors hover:decoration-signal"
        >
          {SITE.email}
        </a>
      </div>
    </div>

    <div className="mt-4 flex flex-col gap-6 border border-ink-600 bg-ink-800 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div className="flex items-start gap-4">
        <span className="mt-0.5 h-7 w-7 shrink-0 text-signal-bright">
          <PatreonIcon />
        </span>
        <div>
          <h3 className="font-display text-lg font-semibold text-bone-50">
            Monthly bonus episodes on Patreon
          </h3>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-bone-200">
            Extra bonus episode every month, plus support for the show.
          </p>
        </div>
      </div>
      <a
        href={SITE.patreon}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center justify-center bg-signal px-6 py-3.5 font-display text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-signal-dim"
      >
        Join the Patreon
      </a>
    </div>

    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {COMMUNITY.map((link) => (
        <LinkTile key={link.href} link={link} />
      ))}
    </div>
  </section>
);

export default ListenSection;
