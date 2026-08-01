#!/usr/bin/env python3
"""
Generates the 1200x630 social preview cards.

These are what Reddit, Discord, Bluesky and Twitter show when someone pastes a
link. Without them every episode previews with the same show art, which is the
whole reason the episode pages exist.

Two outputs, both drawn the same way so they stay a set:

- public/episode-share/<slug>.jpg — one per episode: the game's Steam capsule on
  the left, episode number / title / listen row on the right.
- public/brand/share-card.jpg — the site-wide card behind og:image in
  public/index.html: cover art on the left, show name and tagline on the right.

The background of each episode card is that episode's own capsule, blurred and
pushed most of the way to ink. It costs nothing — the art is already on disk —
and it means 47 cards read as a set without being identical.

Deliberately says nothing about where the game landed on the tier list. The card
is an invitation to listen, not a summary of the verdict.

Run after scripts/fetch-episodes.js and scripts/export_episode_art.py:

    python scripts/export_share_cards.py
"""

import colorsys
import json
import os
import sys

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EPISODES_JSON = os.path.join(REPO_ROOT, "public", "episodes.json")
ART_DIR = os.path.join(REPO_ROOT, "public", "episode-art")
BRAND_DIR = os.path.join(REPO_ROOT, "public", "brand")
OUTPUT_DIR = os.path.join(REPO_ROOT, "public", "episode-share")
SHOW_CARD = os.path.join(BRAND_DIR, "share-card.jpg")

# Vendored rather than looked up by name: CI has no fonts installed, and the
# silent fallback to DejaVu Sans is how these cards ended up set in a face that
# appears nowhere on the site. Both are SIL OFL, licences alongside.
FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")
GROTESK = os.path.join(FONT_DIR, "SpaceGrotesk[wght].ttf")
INTER = os.path.join(FONT_DIR, "Inter[opsz,wght].ttf")

SHOW_NAME = "RoguePod LiteCast"
DOMAIN = "roguepod.show"
EYEBROW = "A ROGUELITE PODCAST"
# Kept verbatim from the hand-made card this replaced; src/data/site.tsx words
# the tagline differently, so change both together if it ever changes.
TAGLINE = ["The ultimate roguelite tier list,", "one episode at a time."]
CADENCE = "New episode every other Wednesday"
META = "Roguelite review podcast"
PLATFORMS = ["Spotify", "Apple Podcasts", "Pocket Casts", "Overcast"]

WIDTH, HEIGHT = 1200, 630
PAD = 54
CAPSULE_H = HEIGHT - PAD * 2          # capsule fills the card height, less padding
CAPSULE_W = round(CAPSULE_H * 2 / 3)  # Steam library capsules are 2:3

INK = (8, 9, 10)
WHITE = (255, 255, 255)
# #FE0100 is the wordmark red, and it is the wrong red for small text on ink: it
# has almost no luminance above the background, so the glyphs are carried
# entirely by the chroma channels — which JPEG stores at reduced resolution.
# tailwind.config.js already names the fix as signal.bright, "links / text on
# dark". Paired with subsampling=0 below.
RED = (255, 59, 48)
BODY = (168, 174, 184)
LABEL = (128, 134, 145)

MARK = 76          # show art in the byline lockup
CAPSULE_RADIUS = 20


def grotesk(size, weight="Bold"):
    font = ImageFont.truetype(GROTESK, size)
    font.set_variation_by_name(weight)
    return font


def inter(size, weight="Regular"):
    font = ImageFont.truetype(INTER, size)
    font.set_variation_by_name(weight)
    return font


def tracked(draw, xy, text, font, fill, tracking=0):
    """Draw text with letter-spacing, which PIL has no native support for."""
    x, y = xy
    for char in text:
        draw.text((x, y), char, font=font, fill=fill)
        x += draw.textlength(char, font=font) + tracking


def rounded(img, radius):
    """RGBA copy with rounded corners."""
    img = img.convert("RGBA")
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, img.width - 1, img.height - 1], radius=radius, fill=255)
    img.putalpha(mask)
    return img


def drop_shadow(card, box, radius, blur=32, alpha=175, offset=(0, 16)):
    layer = Image.new("RGBA", card.size, (0, 0, 0, 0))
    x0, y0, x1, y1 = box
    ImageDraw.Draw(layer).rounded_rectangle(
        [x0 + offset[0], y0 + offset[1], x1 + offset[0], y1 + offset[1]],
        radius=radius, fill=(0, 0, 0, alpha))
    return Image.alpha_composite(card, layer.filter(ImageFilter.GaussianBlur(blur)))


def vgrad(size, top_a, bottom_a, color=(0, 0, 0)):
    width, height = size
    ramp = Image.new("L", (1, height))
    ramp.putdata([int(top_a + (bottom_a - top_a) * (i / max(height - 1, 1)))
                  for i in range(height)])
    layer = Image.new("RGBA", size, color + (0,))
    layer.putalpha(ramp.resize(size))
    return layer


def hgrad(size, left_a, right_a, color=(0, 0, 0), power=1.0):
    width, height = size
    ramp = Image.new("L", (width, 1))
    ramp.putdata([int(left_a + (right_a - left_a) * ((i / max(width - 1, 1)) ** power))
                  for i in range(width)])
    layer = Image.new("RGBA", size, color + (0,))
    layer.putalpha(ramp.resize(size))
    return layer


def cover(img, size, blur=0):
    """Scale to fill `size`, centre-cropped."""
    width, height = size
    scale = max(width / img.width, height / img.height)
    out = img.resize((max(round(img.width * scale), width),
                      max(round(img.height * scale), height)), Image.LANCZOS)
    if blur:
        out = out.filter(ImageFilter.GaussianBlur(blur))
    left = (out.width - width) // 2
    top = (out.height - height) // 2
    return out.crop((left, top, left + width, top + height))


def accent(img):
    """The art's most saturated, reasonably bright hue — the card's key colour.

    Averaging the whole image gives mud; this buckets by hue and takes the
    bucket carrying the most saturation-weighted colour, then floors the
    brightness so dark art still yields something usable.
    """
    small = img.convert("RGB").resize((64, 96), Image.LANCZOS)
    buckets = {}
    for r, g, b in small.getdata():
        hue, sat, val = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if sat < 0.35 or val < 0.25:
            continue
        weight = sat * val
        acc = buckets.setdefault(int(hue * 18), [0.0, 0.0, 0.0, 0.0])
        acc[0] += r * weight
        acc[1] += g * weight
        acc[2] += b * weight
        acc[3] += weight
    if not buckets:
        return (120, 130, 150)
    r, g, b, weight = max(buckets.values(), key=lambda a: a[3])
    hue, sat, val = colorsys.rgb_to_hsv(r / weight / 255, g / weight / 255, b / weight / 255)
    r, g, b = colorsys.hsv_to_rgb(hue, min(sat * 1.15, 1.0), max(val, 0.72))
    return (round(r * 255), round(g * 255), round(b * 255))


def mix(c1, c2, t):
    return tuple(round(a + (b - a) * t) for a, b in zip(c1, c2))


def fit_lines(draw, text, loader, max_width, high, low, max_lines=2):
    """Largest size at which `text` wraps to at most `max_lines`."""
    font, lines = loader(low), [text]
    for size in range(high, low - 1, -2):
        font = loader(size)
        lines, current = [], ""
        for word in text.split():
            trial = f"{current} {word}".strip()
            if draw.textlength(trial, font=font) <= max_width:
                current = trial
            else:
                lines.append(current)
                current = word
        if current:
            lines.append(current)
        if len(lines) <= max_lines:
            return font, lines
    return font, lines[:max_lines]


def show_mark(size, radius):
    for name in ("cover-720.webp", "cover-1080.webp", "cover-480.webp"):
        path = os.path.join(BRAND_DIR, name)
        if os.path.exists(path):
            with Image.open(path) as src:
                return rounded(src.convert("RGB").resize((size, size), Image.LANCZOS), radius)
    return None


def byline(card, x, bottom, mark):
    """Show lockup: art, name, domain — bottom-aligned to `bottom`."""
    if mark is None:
        return card
    size = mark.size[0]
    top = bottom - size
    card.alpha_composite(mark, (x, top))

    draw = ImageDraw.Draw(card)
    name_font = grotesk(30, "Bold")
    domain_font = inter(21, "Regular")
    text_x = x + size + 20

    # Centre on measured ink, not on font size. A font's nominal size includes
    # ascender and descender room these two strings don't use — "RoguePod
    # LiteCast" has no descender at all — so offsetting by a fraction of the
    # size leaves the block sitting low against the mark.
    gap = 8
    name_box = draw.textbbox((0, 0), SHOW_NAME, font=name_font)
    domain_box = draw.textbbox((0, 0), DOMAIN, font=domain_font)
    second = name_font.size + gap
    ink_top, ink_bottom = name_box[1], second + domain_box[3]
    y = top + (size - (ink_bottom - ink_top)) / 2 - ink_top

    draw.text((text_x, y), SHOW_NAME, font=name_font, fill=WHITE)
    draw.text((text_x, y + second), DOMAIN, font=domain_font, fill=LABEL)
    return card


def listen_row(card, x, y, width):
    """Where to hear it and how often — the two things a stranger seeing this
    card in a Reddit thread doesn't know.

    Platform names rather than logos: the marks are SVG and the pipeline has no
    rasteriser, and hand-tracing four brand logos into PIL primitives would look
    worse than type does.
    """
    draw = ImageDraw.Draw(card)
    label_font = inter(15, "Bold")
    tracked(draw, (x, y), "LISTEN ON", label_font, LABEL, 3.0)
    top = y + label_font.size + 18

    # Shrink the row to fit rather than dropping a platform off the end. The
    # site-wide card gives this block ~50px less width than an episode card
    # does, which is exactly enough to lose Overcast.
    gap = 10
    for size, pad_x in ((19, 17), (18, 15), (17, 14), (16, 13)):
        pill_font = inter(size, "Medium")
        widths = [round(draw.textlength(n, font=pill_font)) + pad_x * 2 for n in PLATFORMS]
        if sum(widths) + gap * (len(PLATFORMS) - 1) <= width:
            break

    height = 44
    layer = Image.new("RGBA", card.size, (0, 0, 0, 0))
    layer_draw = ImageDraw.Draw(layer)
    cursor, pills = x, []
    for name, pill_w in zip(PLATFORMS, widths):
        if cursor + pill_w > x + width:
            break
        layer_draw.rounded_rectangle([cursor, top, cursor + pill_w, top + height],
                                     radius=10, fill=(255, 255, 255, 16),
                                     outline=(255, 255, 255, 46), width=2)
        pills.append((cursor, pill_w, name))
        cursor += pill_w + gap
    card = Image.alpha_composite(card, layer)

    draw = ImageDraw.Draw(card)
    for pill_x, pill_w, name in pills:
        text_w = draw.textlength(name, font=pill_font)
        draw.text((pill_x + (pill_w - text_w) / 2, top + (height - pill_font.size) / 2 - 3),
                  name, font=pill_font, fill=(214, 218, 224))
    draw.text((x, top + height + 20), CADENCE, font=inter(21), fill=(138, 144, 154))
    return card


def ambient_background(art):
    """The art itself, blurred and pushed to ink, with a wash in its own hue."""
    key = accent(art)
    bg = ImageEnhance.Color(cover(art, (WIDTH, HEIGHT), blur=56)).enhance(1.3)
    card = Image.blend(bg, Image.new("RGB", (WIDTH, HEIGHT), INK), 0.62).convert("RGBA")
    card = Image.alpha_composite(
        card, hgrad((WIDTH, HEIGHT), 78, 0, mix(key, INK, 0.5), power=0.8))
    return Image.alpha_composite(card, vgrad((WIDTH, HEIGHT), 0, 120))


def save(card, path):
    # JPEG, not PNG: these are photographic-ish and PNG lands ~550KB each. Every
    # major link unfurler (Reddit, Discord, Bluesky, X) handles JPEG.
    #
    # subsampling=0 is not optional. The default 4:2:0 stores chroma at half
    # resolution, and red-on-ink text is almost pure chroma — it is the one
    # element on the card that visibly falls apart without this.
    card.convert("RGB").save(path, quality=90, subsampling=0, optimize=True,
                             progressive=True)


def write_episode_card(episode, mark):
    art_path = os.path.join(ART_DIR, f"{episode['slug']}.webp")
    if not os.path.exists(art_path):
        return False

    with Image.open(art_path) as src:
        art = src.convert("RGB")

    card = ambient_background(art)
    card = drop_shadow(card, (PAD, PAD, PAD + CAPSULE_W, PAD + CAPSULE_H), CAPSULE_RADIUS)
    card.alpha_composite(
        rounded(art.resize((CAPSULE_W, CAPSULE_H), Image.LANCZOS), CAPSULE_RADIUS), (PAD, PAD))

    draw = ImageDraw.Draw(card)
    text_x = PAD + CAPSULE_W + 54
    text_w = WIDTH - text_x - PAD

    y = PAD + 4
    if episode.get("number"):
        eyebrow_font = inter(23, "Bold")
        tracked(draw, (text_x, y), f"EPISODE {episode['number']}", eyebrow_font, RED, 2.8)
        y += eyebrow_font.size + 24

    title_font, lines = fit_lines(
        draw, episode["title"], lambda s: grotesk(s, "Bold"), text_w, 76, 36)
    for line in lines:
        draw.text((text_x, y), line, font=title_font, fill=WHITE)
        y += round(title_font.size * 1.06)

    y += 16
    meta = "  ·  ".join(p for p in (episode.get("duration"), META) if p)
    draw.text((text_x, y), meta, font=inter(24), fill=BODY)

    card = listen_row(card, text_x, HEIGHT - PAD - MARK - 40 - 113, text_w)
    card = byline(card, text_x, HEIGHT - PAD, mark)

    save(card, os.path.join(OUTPUT_DIR, f"{episode['slug']}.jpg"))
    return True


def write_show_card():
    """The site-wide card: cover art left, show name and tagline right.

    No byline lockup here — the cover fills the left half and the show name is
    the headline, so the lockup would say the same thing a third time.
    """
    cover_path = os.path.join(BRAND_DIR, "cover-1080.webp")
    if not os.path.exists(cover_path):
        print("No public/brand/cover-1080.webp — skipping site-wide card")
        return False

    with Image.open(cover_path) as src:
        art = src.convert("RGB")

    card = ambient_background(art)
    size = HEIGHT - PAD * 2
    card = drop_shadow(card, (PAD, PAD, PAD + size, PAD + size), 22, blur=34, alpha=180)
    card.alpha_composite(rounded(art.resize((size, size), Image.LANCZOS), 22), (PAD, PAD))

    draw = ImageDraw.Draw(card)
    x = PAD + size + 56
    column = WIDTH - x - PAD

    name_font = grotesk(64, "Bold")
    eyebrow_font = inter(23, "Bold")
    tagline_font = inter(26)

    # Centre the whole right column against the cover rather than starting it at
    # a fixed offset, so the block stays balanced if the copy ever changes.
    listen_h = 15 + 18 + 44 + 20 + 21          # label, gap, pills, gap, cadence
    block_h = (len(SHOW_NAME.split()) * round(name_font.size * 1.04) + 8
               + eyebrow_font.size + 30
               + len(TAGLINE) * (tagline_font.size + 10) + 34
               + listen_h)
    y = PAD + (size - block_h) / 2

    for line in SHOW_NAME.split():
        draw.text((x, y), line, font=name_font, fill=WHITE)
        y += round(name_font.size * 1.04)

    y += 8
    tracked(draw, (x, y), EYEBROW, eyebrow_font, RED, 2.8)
    y += eyebrow_font.size + 30

    for line in TAGLINE:
        draw.text((x, y), line, font=tagline_font, fill=(170, 176, 186))
        y += tagline_font.size + 10

    card = listen_row(card, x, y + 34, column)
    save(card, SHOW_CARD)
    return True


def main():
    if not os.path.exists(EPISODES_JSON):
        print("No public/episodes.json — run scripts/fetch-episodes.js first")
        return 1

    with open(EPISODES_JSON, encoding="utf-8") as handle:
        data = json.load(handle)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    mark = show_mark(MARK, 15)

    made = sum(write_episode_card(ep, mark) for ep in data.get("episodes", []))
    print(f"Generated {made} share cards in public/episode-share/")
    if write_show_card():
        print("Generated public/brand/share-card.jpg")
    return 0


if __name__ == "__main__":
    sys.exit(main())
