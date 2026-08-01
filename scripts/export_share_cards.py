#!/usr/bin/env python3
"""
Generates the 1200x630 social preview card for each episode page.

These are what Reddit, Discord, Bluesky and Twitter show when someone pastes an
episode link. Without them every episode previews with the same show art, which
is the whole reason the episode pages exist.

Layout: the glitch band from the show art as a background, the game's Steam
capsule on the left, and episode number / title / wordmark on the right.

Run after scripts/fetch-episodes.js and scripts/export_episode_art.py:

    python scripts/export_share_cards.py
"""

import json
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tier_list_generator import TierListGenerator  # noqa: E402

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EPISODES_JSON = os.path.join(REPO_ROOT, "public", "episodes.json")
ART_DIR = os.path.join(REPO_ROOT, "public", "episode-art")
BRAND_DIR = os.path.join(REPO_ROOT, "public", "brand")
OUTPUT_DIR = os.path.join(REPO_ROOT, "public", "episode-share")

WIDTH, HEIGHT = 1200, 630
PAD = 56
CAPSULE_H = HEIGHT - PAD * 2          # capsule fills the card height, less padding
CAPSULE_W = round(CAPSULE_H * 2 / 3)  # Steam library capsules are 2:3

INK = (8, 9, 10)
WHITE = (255, 255, 255)
RED = (254, 1, 0)
MUTED = (135, 141, 151)


def background():
    """Glitch band, cropped to the card and darkened so text stays legible."""
    path = os.path.join(BRAND_DIR, "hero-2160.webp")
    if not os.path.exists(path):
        return Image.new("RGB", (WIDTH, HEIGHT), INK)

    with Image.open(path) as src:
        art = src.convert("RGB")

    # Cover the card, keeping the pixel blocks hard-edged.
    scale = max(WIDTH / art.width, HEIGHT / art.height)
    art = art.resize((round(art.width * scale), round(art.height * scale)), Image.NEAREST)
    left = (art.width - WIDTH) // 2
    top = (art.height - HEIGHT) // 2
    art = art.crop((left, top, left + WIDTH, top + HEIGHT))

    return Image.blend(art, Image.new("RGB", (WIDTH, HEIGHT), INK), 0.62)


def fit_text(draw, text, font_loader, max_width, start_size, min_size):
    """Largest font size at which `text` wraps to at most two lines."""
    for size in range(start_size, min_size - 1, -2):
        font = font_loader(size)
        words, lines, current = text.split(), [], ""
        for word in words:
            trial = f"{current} {word}".strip()
            if draw.textlength(trial, font=font) <= max_width:
                current = trial
            else:
                lines.append(current)
                current = word
        if current:
            lines.append(current)
        if len(lines) <= 2:
            return font, lines
    return font, lines[:2]


def main():
    if not os.path.exists(EPISODES_JSON):
        print("No public/episodes.json — run scripts/fetch-episodes.js first")
        return 1

    with open(EPISODES_JSON, encoding="utf-8") as handle:
        data = json.load(handle)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    generator = TierListGenerator(verbose=False)
    base = background()

    wordmark = None
    wordmark_path = os.path.join(BRAND_DIR, "wordmark.png")
    if os.path.exists(wordmark_path):
        with Image.open(wordmark_path) as wm:
            wm = wm.convert("RGBA")
            target_w = 300
            wordmark = wm.resize(
                (target_w, round(wm.height * target_w / wm.width)), Image.LANCZOS
            )

    made = 0
    for episode in data.get("episodes", []):
        card = base.copy()
        draw = ImageDraw.Draw(card)

        text_left = PAD

        # Capsule art on the left, if we have it.
        art_path = os.path.join(ART_DIR, f"{episode['slug']}.webp")
        if os.path.exists(art_path):
            with Image.open(art_path) as capsule:
                capsule = capsule.convert("RGB").resize((CAPSULE_W, CAPSULE_H), Image.LANCZOS)
            card.paste(capsule, (PAD, PAD))
            draw.rectangle(
                [PAD, PAD, PAD + CAPSULE_W - 1, PAD + CAPSULE_H - 1],
                outline=(42, 47, 54),
                width=2,
            )
            text_left = PAD + CAPSULE_W + 48

        text_width = WIDTH - text_left - PAD
        y = PAD + 8

        # Episode number, in the brand red.
        if episode.get("number"):
            label_font = generator._load_font(26, bold=True)
            draw.text((text_left, y), f"EPISODE {episode['number']}", font=label_font, fill=RED)
            y += 46

        title_font, lines = fit_text(
            draw, episode["title"], lambda s: generator._load_font(s, bold=True), text_width, 66, 34
        )
        for line in lines:
            draw.text((text_left, y), line, font=title_font, fill=WHITE)
            y += title_font.size + 10

        y += 6
        meta_parts = [p for p in (episode.get("duration"), "A podcast about roguelites") if p]
        meta_font = generator._load_font(24)
        draw.text((text_left, y), "  ·  ".join(meta_parts), font=meta_font, fill=MUTED)

        if wordmark is not None:
            card.paste(
                wordmark,
                (text_left, HEIGHT - PAD - wordmark.height),
                wordmark,
            )

        # JPEG, not PNG: these are photographic-ish and PNG lands ~550KB each.
        # Every major link unfurler (Reddit, Discord, Bluesky, X) handles JPEG.
        card.save(
            os.path.join(OUTPUT_DIR, f"{episode['slug']}.jpg"),
            quality=86,
            optimize=True,
            progressive=True,
        )
        made += 1

    print(f"Generated {made} share cards in public/episode-share/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
