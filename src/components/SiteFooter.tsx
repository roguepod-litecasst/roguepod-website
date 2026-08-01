import React from 'react';
import { Link } from 'react-router-dom';
import { SITE } from '../data/site';
import { MailIcon } from './Icons';

const SiteFooter: React.FC = () => (
  <footer className="rule mt-24 bg-ink-900">
    <div className="mx-auto max-w-content px-5 py-14 sm:px-8">
      <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <img
            src="/brand/cover-480.webp"
            alt="RoguePod LiteCast"
            width={480}
            height={480}
            className="w-24 border border-ink-600"
            style={{ imageRendering: 'pixelated' }}
            loading="lazy"
          />
          <p className="mt-5 text-sm leading-relaxed text-bone-300">{SITE.description}</p>
          <a
            href={`mailto:${SITE.email}`}
            className="mt-5 inline-flex items-center gap-2.5 text-sm font-medium text-bone-100 transition-colors hover:text-signal-bright"
          >
            <MailIcon className="h-4 w-4" />
            {SITE.email}
          </a>
        </div>

        <div className="grid grid-cols-2 gap-x-10 gap-y-8 text-sm sm:gap-x-16">
          <div>
            <h2 className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-bone-400">
              Listen
            </h2>
            <ul className="mt-4 space-y-2.5">
              <li><a className="text-bone-200 transition-colors hover:text-signal-bright" href={SITE.spotify} target="_blank" rel="noopener noreferrer">Spotify</a></li>
              <li><a className="text-bone-200 transition-colors hover:text-signal-bright" href={SITE.apple} target="_blank" rel="noopener noreferrer">Apple Podcasts</a></li>
              <li><a className="text-bone-200 transition-colors hover:text-signal-bright" href={SITE.pocketCasts} target="_blank" rel="noopener noreferrer">Pocket Casts</a></li>
              <li><a className="text-bone-200 transition-colors hover:text-signal-bright" href={SITE.overcast} target="_blank" rel="noopener noreferrer">Overcast</a></li>
              <li><a className="text-bone-200 transition-colors hover:text-signal-bright" href={SITE.rss} target="_blank" rel="noopener noreferrer">RSS feed</a></li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-bone-400">
              More
            </h2>
            <ul className="mt-4 space-y-2.5">
              <li><Link className="text-bone-200 transition-colors hover:text-signal-bright" to="/episodes">All episodes</Link></li>
              <li><a className="text-bone-200 transition-colors hover:text-signal-bright" href={SITE.patreon} target="_blank" rel="noopener noreferrer">Patreon</a></li>
              <li><a className="text-bone-200 transition-colors hover:text-signal-bright" href={SITE.discord} target="_blank" rel="noopener noreferrer">Discord</a></li>
              <li><a className="text-bone-200 transition-colors hover:text-signal-bright" href={SITE.youtube} target="_blank" rel="noopener noreferrer">YouTube</a></li>
              <li><a className="text-bone-200 transition-colors hover:text-signal-bright" href={SITE.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a></li>
              <li><a className="text-bone-200 transition-colors hover:text-signal-bright" href={SITE.survey} target="_blank" rel="noopener noreferrer">Listener survey</a></li>
              <li><Link className="text-bone-200 transition-colors hover:text-signal-bright" to="/blog">Articles</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="rule mt-12 pt-6">
        <p className="text-xs text-bone-400">
          © {new Date().getFullYear()} RoguePod LiteCast
        </p>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
