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

- `src/App.tsx` — everything: home page and the tier list view (toggled via
  `#tierlist` URL hash). The tier list view just displays `/tierlist.png`.
- `src/components/BlogPost.tsx` / `BlogList.tsx` — blog. Posts are markdown
  files in `public/blog/` with YAML frontmatter (title, date, author, excerpt,
  slug), indexed by `public/blog-index.json`.
- **When adding a blog post**: update `public/blog-index.json` AND
  `public/sitemap.xml`; consider `public/llms.txt` too. See `BLOG_GUIDE.md`.
- `public/index.html` carries all SEO meta tags and JSON-LD schema — edit
  carefully.

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
