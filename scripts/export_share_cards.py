#!/usr/bin/env python3
"""
Generates the 1200x630 social preview cards.

These are what Reddit, Discord, Bluesky and Twitter show when someone pastes a
link. Without them every episode previews with the same show art, which is the
whole reason the episode pages exist.

Two outputs, both drawn on the same darkened glitch band so they stay a set:

- public/episode-share/<slug>.jpg — one per episode: the game's Steam capsule on
  the left, episode number / title / show byline on the right.
- public/brand/share-card.jpg — the site-wide card behind og:image in
  public/index.html: cover art on the left, show name and tagline on the right.

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
SHOW_CARD = os.path.join(BRAND_DIR, "share-card.jpg")

SHOW_NAME = "RoguePod LiteCast"
DOMAIN = "roguepod.show"
EYEBROW = "A ROGUELITE PODCAST"
# Kept verbatim from the hand-made card this replaced; src/data/site.tsx words
# the tagline differently, so change both together if it ever changes.
TAGLINE = ["The ultimate roguelite tier list,", "one episode at a time."]

WIDTH, HEIGHT = 1200, 630
PAD = 56
CAPSULE_H = HEIGHT - PAD * 2          # capsule fills the card height, less padding
CAPSULE_W = round(CAPSULE_H * 2 / 3)  # Steam library capsules are 2:3

INK = (8, 9, 10)
WHITE = (255, 255, 255)
RED = (254, 1, 0)
MUTED = (135, 141, 151)

# Every image and every text plate carries the same white hairline, which is
# what makes the capsule, the show mark and the two plates read as one system
# rather than as panels floating on the art.
EDGE = WHITE
EDGE_W = 3
PLATE = (8, 9, 10, 214)  # translucent ink under text
PLATE_RADIUS = 0         # the show art is hard-cornered, so the plates are too
PLATE_PAD = 20
MARK = 104               # show art in the byline lockup


def _calmest_left(art):
    """Crop offset whose window has the softest vertical edge.

    The band has hard light/dark seams in it. Cropping dead centre puts one of
    them down the middle of the card, where it reads as an unintended divider
    between the capsule and the text. Scanning for the quietest window moves it
    off-card instead, and keeps working if the art is ever re-exported.
    """
    span = art.width - WIDTH
    if span <= 0:
        return 0

    # One row of column averages: BOX-resizing to a single pixel tall is just
    # a mean down each column.
    col = [p[0] * 0.299 + p[1] * 0.587 + p[2] * 0.114
           for p in art.resize((art.width, 1), Image.BOX).getdata()]
    jumps = [abs(col[i + 1] - col[i]) for i in range(len(col) - 1)]

    best, best_left = None, 0
    for left in range(0, span + 1, 4):
        worst = max(jumps[left:left + WIDTH - 1])
        if best is None or worst < best:
            best, best_left = worst, left
    return best_left


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
    left = _calmest_left(art)
    top = (art.height - HEIGHT) // 2
    art = art.crop((left, top, left + WIDTH, top + HEIGHT))

    # The text sits on its own plates, so the band only has to be knocked back
    # far enough to stay quiet — it keeps its colour instead of going near-black.
    return Image.blend(art, Image.new("RGB", (WIDTH, HEIGHT), INK), 0.56)


def show_mark(size, edged=False):
    """Square show art for the byline lockup.

    No hairline by default: the mark sits inside a plate that already carries
    one, so its own edge would just draw a second white line a few pixels
    inside the first. The capsule still gets an edge — it stands on the band.
    """
    for name in ("cover-720.webp", "cover-1080.webp", "cover-480.webp"):
        path = os.path.join(BRAND_DIR, name)
        if os.path.exists(path):
            break
    else:
        return None

    with Image.open(path) as src:
        art = src.convert("RGB").resize((size, size), Image.LANCZOS)

    if edged:
        ImageDraw.Draw(art).rectangle([0, 0, size - 1, size - 1], outline=EDGE, width=EDGE_W)
    return art


def plate(card, boxes):
    """Composite translucent, white-edged plates under the given boxes."""
    overlay = Image.new("RGBA", card.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for box in boxes:
        draw.rounded_rectangle(box, radius=PLATE_RADIUS, fill=PLATE,
                               outline=EDGE, width=2)
    return Image.alpha_composite(card, overlay)


def write_show_card(base, generator):
    """The site-wide card: cover art left, show name and tagline right.

    Regenerated here rather than kept as a hand-made JPEG so it inherits the
    same background treatment as the episode cards.
    """
    card = base.copy().convert("RGBA")
    draw = ImageDraw.Draw(card)

    art = 376
    top = (HEIGHT - art) // 2
    left = PAD + 20 + art + 52

    # Largest size that still clears the right margin.
    for size in range(62, 39, -2):
        title_font = generator._load_font(size, bold=True)
        if left + draw.textlength(SHOW_NAME, font=title_font) <= WIDTH - PAD:
            break
    eyebrow_font = generator._load_font(26, bold=True)
    line_font = generator._load_font(28)

    # Show name leads, with the eyebrow reading as its subtitle beneath it.
    rows = [(SHOW_NAME, title_font, WHITE, 16), (EYEBROW, eyebrow_font, RED, 22)]
    rows += [(t, line_font, MUTED, 10) for t in TAGLINE]

    block_h = sum(font.size + gap for _, font, _, gap in rows) - rows[-1][3]
    block_top = (HEIGHT - block_h) // 2
    widest = max(draw.textlength(text, font=font) for text, font, _, _ in rows)

    card = plate(card, [[
        left - PLATE_PAD, block_top - PLATE_PAD,
        min(left + widest + PLATE_PAD, WIDTH - 16), block_top + block_h + PLATE_PAD,
    ]])
    draw = ImageDraw.Draw(card)

    with Image.open(os.path.join(BRAND_DIR, "cover-720.webp")) as src:
        cover = src.convert("RGB").resize((art, art), Image.LANCZOS)
    card.paste(cover, (PAD + 20, top))
    draw.rectangle(
        [PAD + 20, top, PAD + 20 + art - 1, top + art - 1], outline=EDGE, width=EDGE_W
    )

    y = block_top
    for text, font, fill, gap in rows:
        draw.text((left, y), text, font=font, fill=fill)
        y += font.size + gap

    card.convert("RGB").save(SHOW_CARD, quality=88, optimize=True, progressive=True)


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

    mark = show_mark(MARK)
    name_font = generator._load_font(30, bold=True)
    dom_font = generator._load_font(22)
    label_font = generator._load_font(26, bold=True)
    meta_font = generator._load_font(24)

    made = 0
    for episode in data.get("episodes", []):
        card = base.copy().convert("RGBA")
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
                outline=EDGE,
                width=EDGE_W,
            )
            text_left = PAD + CAPSULE_W + 48

        text_width = WIDTH - text_left - PAD
        bottom = HEIGHT - PAD

        # Measure the whole block before drawing so the plate can go underneath.
        title_font, lines = fit_text(
            draw, episode["title"], lambda s: generator._load_font(s, bold=True), text_width, 66, 34
        )
        rows = []
        if episode.get("number"):
            rows.append((f"EPISODE {episode['number']}", label_font, RED, 20))
        rows += [(line, title_font, WHITE, 10) for line in lines]
        rows[-1] = rows[-1][:3] + (16,)  # a little more air before the meta line
        meta_parts = [p for p in (episode.get("duration"), "A podcast about roguelites") if p]
        rows.append(("  ·  ".join(meta_parts), meta_font, MUTED, 0))

        block_h = sum(font.size + gap for _, font, _, gap in rows)
        widest = max(draw.textlength(text, font=font) for text, font, _, _ in rows)
        top_y = PAD + PLATE_PAD

        # Byline lockup on the card's bottom edge, flush with the capsule.
        mark_top = bottom - PLATE_PAD - MARK
        byline_right = text_left + MARK + 20 + max(
            draw.textlength(SHOW_NAME, font=name_font),
            draw.textlength(DOMAIN, font=dom_font),
        )

        card = plate(card, [
            [text_left - PLATE_PAD, PAD,
             min(text_left + widest + PLATE_PAD, WIDTH - 16), top_y + block_h + PLATE_PAD],
            [text_left - PLATE_PAD, mark_top - PLATE_PAD,
             byline_right + PLATE_PAD, bottom],
        ])
        draw = ImageDraw.Draw(card)

        y = top_y
        for text, font, fill, gap in rows:
            draw.text((text_left, y), text, font=font, fill=fill)
            y += font.size + gap

        if mark is not None:
            card.paste(mark, (text_left, mark_top))
            name_x = text_left + MARK + 20
            draw.text((name_x, mark_top + 24), SHOW_NAME, font=name_font, fill=WHITE)
            draw.text((name_x, mark_top + 62), DOMAIN, font=dom_font, fill=MUTED)

        # JPEG, not PNG: these are photographic-ish and PNG lands ~550KB each.
        # Every major link unfurler (Reddit, Discord, Bluesky, X) handles JPEG.
        card.convert("RGB").save(
            os.path.join(OUTPUT_DIR, f"{episode['slug']}.jpg"),
            quality=86,
            optimize=True,
            progressive=True,
        )
        made += 1

    write_show_card(base, generator)
    print(f"Generated {made} share cards in public/episode-share/")
    print("Generated public/brand/share-card.jpg")
    return 0


if __name__ == "__main__":
    sys.exit(main())
