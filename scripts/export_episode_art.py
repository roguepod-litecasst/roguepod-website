#!/usr/bin/env python3
"""
Exports web-sized game art for the episode cards on the home page.

The tier list pipeline already downloads a Steam library capsule for every game
it ranks and caches it in scripts/steam_images/. Those files are 600x900 and far
too heavy to ship to browsers, so this script picks out just the games that
appear in public/episodes.json and writes small WebP copies to
public/episode-art/.

Filename resolution deliberately reuses TierListGenerator._safe_filename so the
naming stays identical to the tier list cache. Episodes with no matching capsule
are simply skipped — the site falls back to a typographic card.

This script only writes images; fetch-episodes.js picks them up by looking for a
matching file, so a plain `npm run build` needs no Python.

Run after scripts/fetch-episodes.js:

    python scripts/export_episode_art.py
"""

import json
import os
import re
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tier_list_generator import TierListGenerator  # noqa: E402

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_DIR = os.path.join(REPO_ROOT, "scripts", "steam_images")
EPISODES_JSON = os.path.join(REPO_ROOT, "public", "episodes.json")
OUTPUT_DIR = os.path.join(REPO_ROOT, "public", "episode-art")

# Cards render the capsule at roughly 230px wide; 2x covers retina.
TARGET_WIDTH = 460

# Same mappings the updater applies when turning an episode title into a game
# name. Kept in sync with name_mappings in automated_tierlist_updater.py.
NAME_MAPPINGS = {
    "Spelunky HD": "Spelunky",
    "Vampire Crawlers: The Turbo Wildcard from Vampire Survivors": "Vampire Crawlers",
}


def slugify(title):
    """URL-safe slug used for the exported filename and the JSON reference."""
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


def find_capsule(generator, title):
    """Locate the cached capsule for an episode title, if one exists."""
    candidates = [title]
    if title in NAME_MAPPINGS:
        candidates.insert(0, NAME_MAPPINGS[title])
    # Titles like "The Binding of Isaac: Rebirth" are cached under a shorter name.
    if ":" in title:
        candidates.append(title.split(":")[0].strip())

    for name in candidates:
        path = os.path.join(CACHE_DIR, f"{generator._safe_filename(name)}_capsule.jpg")
        if os.path.exists(path):
            return path

    # Last resort: case/punctuation-insensitive match against the cache.
    def norm(s):
        return re.sub(r"[^a-z0-9]", "", s.lower())

    wanted = {norm(c) for c in candidates}
    for filename in os.listdir(CACHE_DIR):
        if not filename.endswith("_capsule.jpg"):
            continue
        if norm(filename[: -len("_capsule.jpg")]) in wanted:
            return os.path.join(CACHE_DIR, filename)
    return None


def main():
    if not os.path.exists(EPISODES_JSON):
        print("No public/episodes.json — run scripts/fetch-episodes.js first")
        return 1

    with open(EPISODES_JSON, encoding="utf-8") as handle:
        data = json.load(handle)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    generator = TierListGenerator(verbose=False)

    exported, missing = 0, []
    for episode in data.get("episodes", []):
        title = episode["title"]
        slug = slugify(title)
        source = find_capsule(generator, title)

        if not source:
            missing.append(title)
            continue

        with Image.open(source) as img:
            img = img.convert("RGB")
            height = round(img.height * TARGET_WIDTH / img.width)
            img = img.resize((TARGET_WIDTH, height), Image.LANCZOS)
            img.save(os.path.join(OUTPUT_DIR, f"{slug}.webp"), quality=78, method=6)

        exported += 1

    print(f"Exported art for {exported}/{len(data.get('episodes', []))} episodes")
    if missing:
        print(f"  No cached capsule for: {', '.join(missing)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
