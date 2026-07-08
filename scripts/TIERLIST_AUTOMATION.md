# Tier List Automation — How It Works & Troubleshooting

Context file for debugging the automated tier list update. Written 2026-07-08 after
the "Gambonanza didn't appear" incident (see bottom).

## Pipeline overview

GitHub Actions workflow: `.github/workflows/update-tierlist.yml`

- **Schedule:** Wednesdays at 2:02 AM Pacific (dual cron for DST: `2 9 * 3-10 3` PDT,
  `2 10 * 11-12,1-2 3` PST). Also manually triggerable via workflow_dispatch (with
  optional debug input).
- Runs `scripts/automated_tierlist_updater.py --verbose` from inside `scripts/`,
  writing to `../public/tierlist.png`.
- Then checks `git diff --quiet HEAD -- public/tierlist.png`. If the PNG is
  byte-identical, it prints **"Tier list is already up to date"** and skips
  commit/deploy. This message means the script *ran successfully* but the generated
  image didn't change — it is NOT an error.
- If changed: commits `public/tierlist.png` + `scripts/steam_images/`, pushes
  (with rebase/retry), builds the site, deploys to GitHub Pages.

## What the script does (`automated_tierlist_updater.py`)

1. **Fetch RSS feed** (`https://feeds.acast.com/public/shows/roguepod-litecast`)
   to get all published episode titles.
2. **Extract game names** from episode titles (strips "Episode N:" prefixes and
   "- Review/Discussion/Podcast" suffixes). Hard-coded `name_mappings` dict handles
   titles that don't match the doc (currently: Spelunky HD → Spelunky, and the
   Vampire Crawlers long/short title variants).
3. **Fetch the master tier list** from Google Doc ID
   `1nCm7kf_10FCEs5HKVEQyyivV50e7XrAzgueP2oSPTt8` via the Google Docs API
   (service-account creds from `GOOGLE_CREDENTIALS` repo secret; local fallback:
   `scripts/credentials.json`, then `scripts/tierlist.txt`).
4. **Parse tiers** with regex `([A-Z])\s*Tier:\s*(...)` — it ONLY reads lines like
   `S Tier: Game1, Game2, ...` in the doc. The "Covered games" numbered list in the
   doc is IGNORED by the script; it's for the hosts' bookkeeping only.
5. **Filter to released games:** matches tier-list games against episode titles —
   exact matches first, then fuzzy (SequenceMatcher, ≥0.60 similarity). Games in a
   tier with no matching released episode are dropped from the image. This is the
   intended mechanism that keeps unreleased/upcoming games (and their Steam images)
   off the public tier list.
6. **Generate the image** via `tier_list_generator.py`, which searches Steam for
   header images and caches them in `scripts/steam_images/` (game-name→appid cache
   in `steam_images/game_ids.json`). If no Steam image is found, it draws a text
   placeholder tile.

## Troubleshooting checklist — "new episode released but tier list didn't update"

Check in this order:

1. **Is the game in a tier row of the Google Doc?** The game must appear on one of
   the `X Tier:` lines. Being in the "Covered games" list is NOT enough. ← This is
   the most common cause (it was the Gambonanza root cause).
2. **Does the episode title (fuzzy-)match the doc's game name?** Run locally with
   `--debug` and inspect `scripts/debug/match_details.json` /
   `released_games.json`. If similarity < 0.60, add an entry to `name_mappings`
   in `automated_tierlist_updater.py`.
3. **Timing:** episodes publish ~09:00 UTC Wednesdays; the workflow fires 09:02 UTC
   (PDT). Very little slack — if Acast is late propagating the RSS item, the run
   misses it and it won't retry until next Wednesday. Fix by manually re-running
   the workflow from the Actions tab (workflow_dispatch).
4. **Google Doc API failure:** the script prints a warning and falls back to a
   local `tierlist.txt` (which doesn't exist in CI), then exits with
   "Failed to fetch tier list content". This shows as a *failed* action run, not
   "already up to date". Check the `GOOGLE_CREDENTIALS` secret and that the service
   account still has read access to the doc.
5. **Steam image issues** don't block the update — missing images become
   placeholder tiles. Hashed-CDN-URL lookups were fixed in commit 81681c2.

## Running locally

```bash
cd scripts
pip install -r requirements.txt
# needs credentials.json (service account) in scripts/, or a tierlist.txt fallback
python automated_tierlist_updater.py --verbose --debug --output /tmp/tierlist.png
```

`--debug` writes `scripts/debug/released_games.json` and `match_details.json`
(these are untracked scratch files — check their freshness before trusting them).

## Incident log

- **2026-07-08 — Gambonanza:** Episode published 09:00 UTC; the 09:02 UTC run said
  "already up to date". Root cause: Gambonanza was #46 in the doc's "Covered games"
  list but hadn't been added to any `X Tier:` line, so the parsed tier list (and
  thus the PNG) was unchanged. Fix: add Gambonanza to a tier in the Google Doc,
  then manually trigger the "Update Tier List" workflow.
