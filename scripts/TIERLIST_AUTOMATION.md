# Tier List Automation — How It Works & Troubleshooting

Context file for debugging the automated tier list update. Written 2026-07-08 after
the "Gambonanza didn't appear" incident (see bottom).

## Pipeline overview

GitHub Actions workflow: `.github/workflows/update-tierlist.yml`

- **Schedule:** Wednesdays at 2:02 AM Pacific (dual cron for DST: `2 9 * 3-10 3` PDT,
  `2 10 * 11-12,1-2 3` PST). Also manually triggerable via workflow_dispatch, with
  a `debug` input and a `force_deploy` input (rebuild and deploy even when nothing
  changed — how you recover a week the automation missed).
- Runs `scripts/automated_tierlist_updater.py --verbose` from inside `scripts/`,
  writing to `../public/tierlist.png`, then refreshes the episode snapshot, card
  art and share cards.
- Then checks `git status --porcelain` over **`GENERATED_PATHS`** (a job-level env
  var listing every path the pipeline writes). If nothing there moved, it reports
  **"Nothing changed"** and skips commit/deploy — that means the script *ran
  successfully* but produced identical output. It is NOT an error.
  - The check is `git status`, not `git diff HEAD`, because a new episode's art
    and share card are untracked and `git diff` doesn't see untracked files.
  - It covers the episode data too, not just `tierlist.png` — so a new episode
    reaches the site even on a week where no game moved on the tier list.
- If changed: stages `GENERATED_PATHS` with `git add -A`, commits, rebases
  (`--autostash`), pushes with retries, builds the site, deploys to GitHub Pages.

**If you add a generated file to this pipeline, add its path to `GENERATED_PATHS`.**
A pipeline output that isn't listed there stays unstaged after the commit; the run
then either aborts the rebase or silently ships without it. The workflow prints a
`::warning::` listing any files left unstaged after the commit — treat that as a
"someone forgot to update `GENERATED_PATHS`" alarm.

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
5. **Did the run go red?** A failed run does *not* mean the tier list is wrong — it
   usually means the image was generated fine and then the commit/push or deploy
   failed, so the site still shows last fortnight's list. The job summary says
   which. Fix the cause, then re-run the workflow; if the files were already
   committed but never deployed, re-run with **force_deploy** ticked, since a
   plain re-run will correctly find nothing to change and skip the deploy.
6. **Steam image issues** don't block the update — missing images become
   placeholder tiles. Hashed-CDN-URL lookups were fixed in commit 81681c2.
   If the action log shows `⚠️ No confident Steam match for '<game>'`, the
   search scorer rejected all candidates (better a named placeholder than the
   wrong game's art) — add the game to `steam_id_overrides` in
   `tier_list_generator.py` with its real app ID. If a *wrong* image ever
   ships, also delete that game's entries from `steam_images/game_ids.json`
   and its cached `.jpg`s, or the bad ID sticks. Matching logic is unit-tested
   in `test_steam_matching.py` (offline, run `python3 test_steam_matching.py`).

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
  - Now caught proactively: the updater prints a `::warning::` naming any released
    episode that no tier line accounts for (bonus episodes excepted).

- **2026-08-05 — Pathogenic:** The run generated the tier list correctly, with
  Pathogenic in A, and then **failed at "Commit and push changes"** one second in.
  Build and deploy were skipped, so the site kept serving the 2026-07-22 image and
  never learned about the episode.

  Root cause, and it was introduced by the site redesign the week before: that
  update added `scripts/export_share_cards.py` to the workflow, which writes
  `public/episode-share/*.jpg` **and** `public/brand/share-card.jpg`. Only the
  first was added to the commit step's `git add` list. `Pillow` was unpinned
  (`>=9.0.0`), so CI re-encoded `share-card.jpg` to different bytes than the
  locally-generated committed copy, leaving it modified-but-unstaged — and
  `git pull --rebase` refuses to run with unstaged changes:

  ```
  error: cannot pull with rebase: You have unstaged changes.
  ```

  Four fixes, so no single one has to hold:
  1. `GENERATED_PATHS` — one list of pipeline outputs, shared by the change check
     and the commit step, staged with `git add -A` (covers `public/brand/`).
  2. `git pull --rebase --autostash` — a stray dirty file can't abort the push.
  3. The commit step warns if anything is left unstaged, so a future missing path
     is visible instead of fatal.
  4. `Pillow` pinned in `requirements.txt`, so CI and local produce identical image
     bytes and "did this change?" stays a meaningful question.

  Also fixed alongside: the deploy gate now covers episode data (a new episode used
  to reach the site only if `tierlist.png` happened to change in the same run), the
  push retry loop no longer reports failure when the last attempt succeeds, and
  `fetch-episodes.js` keeps the previous `generatedAt` when nothing else moved
  (its timestamp used to churn `public/episodes.json` on every run and every local
  `npm start`).
