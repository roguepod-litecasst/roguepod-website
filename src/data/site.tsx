import React from 'react';
import {
  AppleIcon,
  MailIcon,
  OvercastIcon,
  PatreonIcon,
  PocketCastsIcon,
  RssIcon,
  SpotifyIcon,
  TikTokIcon,
  YouTubeIcon,
} from '../components/Icons';

export const SITE = {
  title: 'RoguePod LiteCast',
  email: 'host@roguepod.show',
  url: 'https://roguepod.show',
  eyebrow: 'RoguePod LiteCast: a roguelite podcast',
  // Straight from the show's own feed description.
  tagline: 'Building the most comprehensive roguelite tier list, one episode at a time.',
  blurb:
    'We like playing roguelites, so we started a podcast to talk about them. We spend two weeks ' +
    "playing a game, then review it on the show and rank it against every other game we've " +
    'covered. Tune in every other Wednesday!',
  // The short "what is this show" paragraph that sits under the cover art in
  // the footer card. Kept separate from `blurb`, which is the hero pitch.
  description:
    'RoguePod LiteCast is a roguelite and action roguelike review podcast! We cover the GOATs, ' +
    'new releases, and tiny games without much reach. New episodes every other Wednesday.',
  patreon: 'https://www.patreon.com/roguepod',
  discord: 'https://discord.gg/EEwq9VGGKb',
  rss: 'https://feeds.acast.com/public/shows/roguepod-litecast',
  apple: 'https://podcasts.apple.com/gb/podcast/roguepod-litecast/id1774367401',
  spotify: 'https://open.spotify.com/show/0LGkjkg8uVVMg5y6slJiua',
  // Both resolve from the Apple show id. Note Overcast's web view bounces
  // logged-out desktop visitors to a login page; on mobile it opens the app.
  pocketCasts: 'https://pca.st/itunes/1774367401',
  overcast: 'https://overcast.fm/itunes1774367401',
  youtube: 'https://www.youtube.com/@RoguePodLiteCast',
  // The show as a YouTube playlist — the full episodes. The channel URL above
  // is the follow/subscribe link; this is the listen link. Episodes land here
  // a little after they hit the audio feeds, so nothing links to a
  // per-episode YouTube URL; the playlist is the whole offer.
  youtubePodcast: 'https://www.youtube.com/playlist?list=PLFk9J0akrQME',
  tiktok: 'https://www.tiktok.com/@roguepodlitecast',
  survey: 'https://forms.gle/Wqiao5narTMChSFr5',
};

export type PlatformLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

/**
 * Podcast apps, shown in the hero so people can go straight to the show.
 * Patreon is in the row because the bonus episodes are audio you subscribe to
 * like any other feed — it keeps its own block further down the page as well.
 */
export const PLATFORMS: PlatformLink[] = [
  { href: SITE.spotify, label: 'Spotify', icon: <SpotifyIcon /> },
  { href: SITE.apple, label: 'Apple Podcasts', icon: <AppleIcon /> },
  { href: SITE.youtubePodcast, label: 'YouTube', icon: <YouTubeIcon /> },
  { href: SITE.pocketCasts, label: 'Pocket Casts', icon: <PocketCastsIcon /> },
  { href: SITE.patreon, label: 'Patreon', icon: <PatreonIcon /> },
  { href: SITE.overcast, label: 'Overcast', icon: <OvercastIcon /> },
  { href: SITE.rss, label: 'RSS', icon: <RssIcon /> },
];

/**
 * Secondary links in the community section. Discord and Patreon are absent —
 * they each get their own highlighted block rather than a tile in this row.
 * The YouTube link here is the channel, not the episode playlist PLATFORMS
 * points at: this row is where to follow the show, and Subscribe is a
 * channel-level action.
 */
export const COMMUNITY: PlatformLink[] = [
  { href: SITE.youtube, label: 'YouTube', icon: <YouTubeIcon /> },
  { href: SITE.tiktok, label: 'TikTok', icon: <TikTokIcon /> },
  { href: SITE.survey, label: 'Listener survey', icon: <MailIcon /> },
];
