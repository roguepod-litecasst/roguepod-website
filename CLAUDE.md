# RoguePod LiteCast Website

Public website for the RoguePod LiteCast podcast — a roguelite/roguelike review
podcast hosted by Danny and David. An episode ships every other Wednesday; each
episode covers one game, which then gets placed on the show's tier list.

- Live site: https://roguepod.show (GitHub Pages, CNAME in `public/CNAME`)
- RSS feed: https://feeds.acast.com/public/shows/roguepod-litecast
- Contact: host@roguepod.show

## Stack

React + TypeScript single-page app, Create React App build, Tailwind CSS.
`npm start` to develop, `npm run build` to build. The SPA trick in
`public/404.html` + `public/index.html` handles client-side routing on Pages.

## The two halves of this repo

### 1. The website (`src/`, `public/`)

Routes: `/` (landing page), `/episodes`, `/episodes/:slug`, `/blog`,
`/blog/:slug`. `src/App.tsx` is just the router and page chrome (`SiteHeader` /
`SiteFooter`); the home page lives in `src/pages/Home.tsx` and composes four
sections:

- `components/Hero.tsx` — glitch art band, wordmark, podcast-app links, stats.
- `components/EpisodesSection.tsx` — latest six episode cards.
- `components/TierListSection.tsx` — `/tierlist.png` with a click-to-expand
  lightbox. Carries `id="tierlist"`, which is how the old `#tierlist` links
  keep working (they now scroll to the section instead of swapping views).
- `components/ListenSection.tsx` — Discord and Patreon blocks, socials.

`src/pages/Episode.tsx` is the per-episode landing page (cover art, that
episode's Acast player, per-episode listen links, description, tier list CTA).
These exist mainly so episodes can be linked from Reddit — see the prerender
section below, without which they'd all share one link preview.

Shared bits: `src/data/site.tsx` (all outbound URLs and standing copy — edit
copy there, not in components), `src/data/episodes.ts` (feed snapshot hook),
`src/components/EpisodeCard.tsx`, `src/components/Icons.tsx`,
`src/lib/scroll.ts` (in-page anchors jump instantly; `behavior: 'auto'` would
defer to the CSS `scroll-behavior: smooth`, so it must be `'instant'`).

Design tokens live in `tailwind.config.js`, sampled from the show art: `ink`
(near-black surfaces), `bone` (text), `signal` (the `#FE0100` wordmark red),
`glitch` (secondary accents), `tier` (S–F badge colours). Fonts are Space
Grotesk for display and Inter for body.

Brand assets in `public/brand/` are exported from the Photoshop files in
`design/` (gitignored — they're ~195 MB and must never land in `public/`,
which CRA copies verbatim into the deploy). `design/logo-refs/` is the one
tracked exception: the official Pocket Casts and Overcast SVGs the platform
icons in `src/components/Icons.tsx` were traced from, recoloured to
`currentColor` so the icon row stays single-colour. Regenerate them with the snippet
in `scripts/export_episode_art.py`'s sibling workflow if the source art
changes. The hero art is pixel art and is rendered with
`image-rendering: pixelated` — resize it with NEAREST, not LANCZOS, or it
turns to mush when the browser scales it up.

- `src/components/BlogPost.tsx` / `BlogList.tsx` — blog. Posts are markdown
  files in **`content/blog/`** with YAML frontmatter (title, date, author,
  excerpt, slug, published). The blog is primarily for SEO — it's linked from
  the footer only, not the main nav.

  **The markdown sources are outside `public/` on purpose.** CRA copies
  `public/` verbatim into the deploy, so while they lived there Pages served
  every post twice: the real page, and the raw source as `text/markdown` at
  `/blog/<slug>.md` — a duplicate document that can't be marked non-canonical,
  because Pages can't set an `X-Robots-Tag` and a `robots.txt` Disallow would
  have blocked the fetch the page itself depended on. `generate-blog-index.js`
  renders them at build time to `public/blog-index.json` (the list page's whole
  payload) and `public/blog/<slug>.json` (frontmatter + HTML), which is what
  the components fetch. Don't move the sources back, and don't add a runtime
  fetch of anything that duplicates a page's text. Post *images* stay in
  `public/blog/` — those are meant to be fetched.
- **When adding a blog post**: drop the markdown in `content/blog/` with
  `published: true`. The index, the per-post JSON, `public/sitemap.xml` and the
  prerendered page are all generated. Consider `public/llms.txt` too. See
  `BLOG_GUIDE.md`.
- `public/index.html` carries all SEO meta tags and JSON-LD schema — edit
  carefully.

**Only name games on the site that have a released episode.** The meta
description, keywords, JSON-LD and `llms.txt` previously listed FTL, Dead
Cells and Gunfire Reborn, none of which have been covered. Check the feed
before adding a title to any copy.

### 1b. Episode data (`scripts/fetch-episodes.js`, `export_episode_art.py`)

The Acast feed sends **no CORS headers**, so the browser cannot read it. The
episode list is snapshotted at build time instead:

- `scripts/fetch-episodes.js` runs on `npm start` / `npm run build` and writes
  `public/episodes.json` (latest 12 episodes + a total count). Bonus episodes
  are excluded from both — they're not reviews and get no tier. Detection
  checks `<itunes:episodeType>` *and* a `Bonus:` title prefix, because at least
  one bonus episode is tagged `full` in the feed. If the fetch fails the
  existing snapshot is kept, so the build never breaks offline.
- `scripts/export_episode_art.py` writes `public/episode-art/<slug>.webp` from
  the Steam capsules the tier list pipeline already caches, reusing
  `TierListGenerator._safe_filename` so naming stays in sync. Cards fall back
  to a typographic tile when art is missing, so this step is optional and the
  JS build needs no Python.
- `scripts/export_share_cards.py` writes `public/episode-share/<slug>.jpg`, the
  1200x630 social preview cards, plus `public/brand/share-card.jpg` (the
  site-wide `og:image`). Each episode card uses that episode's own capsule
  blurred as its background, so the set is colour-varied without per-episode
  work. Three things about it are load-bearing:
  - **Fonts are vendored in `scripts/fonts/`** (Space Grotesk + Inter variable
    TTFs, SIL OFL, licences alongside). CI has no fonts installed, and PIL
    fails *silently* to DejaVu Sans — which is how these cards spent a year set
    in a face that appears nowhere on the site.
  - **Save with `subsampling=0`.** The JPEG default is 4:2:0, which stores
    chroma at half resolution. Red-on-ink text is almost pure chroma, so the
    red eyebrow is the one element that visibly disintegrates without it.
  - **Small red text is `#FF3B30`** (`signal.bright`), not the `#FE0100`
    wordmark red, which has too little luminance over ink to hold an edge.

  The cards deliberately say nothing about where a game landed on the tier
  list — they're an invitation to listen, not a summary of the verdict. That
  also means they don't depend on the tier data, so a card can be built the day
  an episode drops rather than waiting on the Wednesday tier run.

Both Python steps write images only; `fetch-episodes.js` picks them up by
checking whether the file exists, so run it *after* them (the workflow runs it
twice for exactly this reason).

Freshness is tied to the tier list workflow: it refreshes episode data and
deploys when anything it generates changed — the tier list image, the episode
snapshot, the card art, the share cards or the sitemap. The paths are listed
once as `GENERATED_PATHS` at the top of the job; **anything new the pipeline
writes has to be added there**, or it won't be committed and it can wedge the
push (see the 2026-08-05 entry in `scripts/TIERLIST_AUTOMATION.md`).

### 1c. Prerendering (`scripts/prerender.js`)

Runs after the CRA build and writes `build/episodes/<slug>/index.html` for every
episode, `build/episodes/index.html`, `build/blog/<slug>/index.html` for every
published post and `build/blog/index.html`.

**Why it's mandatory, not an optimisation:** Reddit, Discord and search crawlers
don't execute JavaScript. Without prerendering every episode URL returns the same
`index.html`, so every episode shared on Reddit previews with an identical
title, description and image. Each generated file carries its own `<title>`,
meta description, Open Graph / Twitter tags, canonical URL, JSON-LD
(`PodcastEpisode` / `BlogPosting`), and a static content block inside `#root`
that React replaces on mount.

For the blog the stakes are higher than a bad preview. GitHub Pages has no SPA
rewrite: a path with no file behind it is served by `404.html` with a real HTTP
**404**. The redirect script in there rescues browsers, but a crawler sees a 404
and leaves. Until the blog was prerendered, `/blog` and every post were in the
sitemap and returning 404 to everything that fetched them — so
**a new route that isn't prerendered is not indexable, no matter what the
sitemap says.**

**URLs end in a trailing slash.** Pages serves a directory's `index.html` only
at `/episodes/<slug>/` and 301s the bare path to it, and Google counts a
redirecting sitemap URL as an error. So the slashed form is canonical
everywhere: `prerender.js` writes it into `<link rel="canonical">`,
`generate-sitemap.js` emits it, and `validate-sitemap.js` fails the build on
any `<loc>` without it. React Router matches either form, so in-app `<Link>`s
don't need it (there's a test pinning that).

**`"homepage"` in package.json must stay `"/"`.** With `"."` CRA emits relative
asset paths (`./static/...`), which resolve against `/episodes/<slug>/` and
404 — the page renders blank. The old value only worked because the SPA
404-redirect keeps the browser at `/` while `index.html` loads. `prerender.js`
hard-fails the build if it detects relative asset paths.

### 1d. Sitemap (`scripts/generate-sitemap.js`, `validate-sitemap.js`)

`generate-sitemap.js` builds `public/sitemap.xml` from the episode snapshot and
the blog sources — it is no longer maintained by hand. `scripts/blog-posts.js`
is the one markdown reader it shares with `prerender.js` and
`generate-blog-index.js`, so no two parts of the build can disagree about which
posts are published.

`lastmod` comes from a fingerprint ledger, `scripts/sitemap-lastmod.json`, not
from the publish date: publish dates never move, so an edited post or a
corrected show note gave Google no reason to recrawl. The ledger stores a hash
of what each page renders from; the date advances only when that hash changes.
It's build state, so it lives outside `public/` (nothing should serve it) and
is committed so CI and local builds agree — it's in `GENERATED_PATHS`. Delete
it and every page gets re-seeded at its publish date, which is harmless.

No `<priority>` or `<changefreq>` — Google ignores both. The homepage carries no
`lastmod` at all; nothing in the build can honestly date the hero, the tier list
image and the episode rail together, and a wrong `lastmod` teaches Google to
distrust the field site-wide.

`validate-sitemap.js` runs immediately after and **fails the build** on: a
missing prolog or namespace, a `<url>` without a non-empty `<loc>`, a non-absolute
or `www` or unslashed URL, duplicates, a malformed or future `lastmod`, a >10%
drop in URL count against the last committed sitemap, or the vendored
`scripts/sitemap-0.9.xsd` schema (when `xmllint` is installed — it is on CI, and
its absence is a note, not a failure). Every deploy goes through `npm run build`,
so nothing reaches the live site without passing.

### 2. The automated tier list (`scripts/`)

The tier list image at `public/tierlist.png` is generated automatically.
**Full pipeline documentation and troubleshooting: `scripts/TIERLIST_AUTOMATION.md`**
(read that before debugging anything tier-list related). Short version:

1. GitHub Actions (`.github/workflows/update-tierlist.yml`) runs Wednesdays
   ~2:02 AM Pacific, right after episodes drop.
2. `scripts/automated_tierlist_updater.py` fetches the RSS feed (which games
   have released episodes) and the hosts' master tier list from a Google Doc
   (service-account creds via `GOOGLE_CREDENTIALS` secret; locally
   `credentials.json`). Only games that appear on an `X Tier:` line in the doc
   AND have a released episode make the image.
3. `scripts/tier_list_generator.py` renders the PNG. Game art is Steam
   **library capsule** images (600x900 vertical, the Steam library grid art),
   found via Steam search API + a fallback chain (standard CDN paths → store
   API asset lookup for hashed URLs → composed tile from the horizontal
   header image). Images and name→appid lookups are cached in
   `scripts/steam_images/` (committed, so CI doesn't re-download).
4. If the PNG changed, the workflow commits it, rebuilds, and deploys.
   "Tier list is already up to date" in the action log means the image was
   byte-identical — usually the game wasn't added to a tier line in the doc.

Run locally:

```bash
cd scripts
pip install -r requirements.txt
python automated_tierlist_updater.py --verbose --debug --output /tmp/tierlist.png --credentials ../credentials.json
```

Layout knobs (tile width, games per row before wrapping, tier label width) are
class constants at the top of `TierListGenerator`; `generate_tier_list()`
accepts per-call overrides for experimentation. Wrapped rows within a tier are
intentionally seamless (no gap) — keep it that way.

## Hard constraints

- **Never put large source files in `public/`.** CRA copies that directory
  verbatim into `build/`, so anything dropped there ships to the live site.
  Photoshop sources belong in `design/` (gitignored).
- **`public/tierlist.png` must keep that exact path/filename.** A Discord bot
  in a separate repo (`../rogue-bot/`) downloads
  `https://roguepod.show/tierlist.png` and reposts it to Discord, detecting
  changes by image hash. Renaming or moving the file breaks the bot.
- Keep the generated PNG comfortably under 8 MB (Discord attachment limit).
- The Google Doc parsing only understands `S Tier: Game1, Game2, ...` lines
  (tiers S–F). The doc's "Covered games" numbered list is ignored.
- Episode titles that don't fuzzy-match (≥0.60) the doc's game names need an
  entry in `name_mappings` in `automated_tierlist_updater.py`; games whose
  short names confuse Steam search need `steam_id_overrides` in
  `tier_list_generator.py`.
- `credentials.json` / service-account keys are gitignored secrets — never
  commit them.
