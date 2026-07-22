#!/usr/bin/env python3
"""
Tier List Generator for RoguePod LiteCast

This module generates visual tier lists with Steam game images.

Images are Steam "library capsule" art (600x900 vertical, the same art used in
the Steam library grid and on tiermaker.com). Games without capsule art fall
back to a composed vertical tile built from the horizontal header image.
"""

import requests
import json
import math
import os
import re
from PIL import Image, ImageDraw, ImageFont
from urllib.parse import quote


class TierListGenerator:
    # Layout defaults (production look, picked by Danny 2026-07-09).
    # generate_tier_list() accepts overrides so sample renders can experiment.
    TILE_WIDTH = 150            # width of each game tile; height is 3:2 of this
    MAX_GAMES_PER_ROW = 14      # games per row before wrapping within a tier
    ROW_GAP = 0                 # px between wrapped rows inside one tier (keep 0: no visible break)
    TIER_LABEL_WIDTH = 110      # width of the colored tier-letter column
    LABEL_GAP = 6               # px between the label column and the first tile
    TIER_BAND = 6               # px dark band separating tiers
    LETTER_OUTLINE = 4          # dark outline on tier letters (readability on light colors)
    BACKGROUND = '#121316'

    def __init__(self, verbose=False):
        self.verbose = verbose
        self.cache_dir = "steam_images"
        self.game_id_cache_file = os.path.join(self.cache_dir, "game_ids.json")

        # Ensure cache directory exists
        os.makedirs(self.cache_dir, exist_ok=True)

        # Load cached game IDs
        self.game_id_cache = self.load_game_id_cache()

        # Hard-coded Steam App ID overrides for games whose short tier list name
        # doesn't match their full Steam title well enough for the search API.
        # Maps: lowercase game name -> Steam App ID
        self.steam_id_overrides = {
            "vampire crawlers": 3265700,
            # Steam search ranked the "Supporter Pack" DLC above the base game
            # (closer title length); pin the base game's app ID.
            "everything is crab": 3526710,
        }

        # Saturated take on the TierMaker palette (white letters on top)
        self.tier_colors = {
            'S': '#e5484d',  # Red
            'A': '#f0883e',  # Orange
            'B': '#eac54f',  # Yellow
            'C': '#8ec44a',  # Light Green
            'D': '#46b26b',  # Green
            'E': '#3bb8c3',  # Cyan
            'F': '#6674de'   # Blue
        }

    def vprint(self, message):
        """Print only if verbose mode is enabled"""
        if self.verbose:
            print(message)

    def load_game_id_cache(self):
        """Load cached Steam game IDs"""
        if os.path.exists(self.game_id_cache_file):
            try:
                with open(self.game_id_cache_file, 'r') as f:
                    return json.load(f)
            except:
                return {}
        return {}

    def save_game_id_cache(self):
        """Save Steam game IDs to cache"""
        with open(self.game_id_cache_file, 'w') as f:
            json.dump(self.game_id_cache, f, indent=2)

    def search_steam_game(self, game_name):
        """Search for a game on Steam and return the app ID"""
        cache_key = game_name.lower().strip()

        # Check hard-coded overrides first (for games whose short name won't search well)
        if cache_key in self.steam_id_overrides:
            self.vprint(f"Using hard-coded Steam ID for {game_name}: {self.steam_id_overrides[cache_key]}")
            return self.steam_id_overrides[cache_key]

        # Check cache
        if cache_key in self.game_id_cache:
            self.vprint(f"Found {game_name} in cache: {self.game_id_cache[cache_key]}")
            return self.game_id_cache[cache_key]

        self.vprint(f"Searching Steam for: {game_name}")

        try:
            # Use Steam's search API
            search_url = f"https://store.steampowered.com/api/storesearch/?term={quote(game_name)}&l=english&cc=US"

            response = requests.get(search_url, timeout=10)
            response.raise_for_status()

            data = response.json()

            if 'items' in data and len(data['items']) > 0:
                # Find the best match by comparing names
                best_match = None
                best_score = 0

                for item in data['items']:
                    score = self._score_candidate(game_name, item.get('name', ''))
                    self.vprint(f"  {item.get('name', '')}: score {score:.2f}")

                    if score > best_score:
                        best_score = score
                        best_match = item

                # A wrong match is worse than no match: the wrong game's art
                # would be rendered AND the bad ID cached. Below the threshold
                # we bail out and let the caller draw a named placeholder.
                if best_match and best_score >= self.MIN_MATCH_SCORE:
                    app_id = best_match['id']

                    # Cache the result
                    self.game_id_cache[cache_key] = app_id
                    self.save_game_id_cache()

                    self.vprint(f"✅ Best match: '{best_match['name']}' (ID: {app_id}, score: {best_score:.2f})")
                    return app_id
                else:
                    print(f"⚠️  No confident Steam match for '{game_name}' "
                          f"(best score {best_score:.2f}); add it to steam_id_overrides "
                          f"in tier_list_generator.py if the search name is unusual")
                    return None
            else:
                self.vprint(f"No Steam results found for {game_name}")
                return None

        except Exception as e:
            self.vprint(f"Error searching Steam for {game_name}: {e}")
            return None

    # Reject search matches scoring below this (see _score_candidate; an
    # exact or substring match scores well above it, a fuzzy-only match on a
    # similar-but-different title falls below it).
    MIN_MATCH_SCORE = 0.75

    # Word-level replacements applied during normalization
    ROMAN_NUMERALS = {'ii': '2', 'iii': '3', 'iv': '4',
                      'vi': '6', 'vii': '7', 'viii': '8', 'ix': '9'}

    # Store entries that are not the game itself
    NON_GAME_TOKENS = ('soundtrack', 'ost', 'demo', 'playtest', 'dlc',
                       'bundle', 'artbook', 'art book', 'beta', 'supporter pack')

    def _normalize_name(self, name):
        """Normalize a game name for comparison: lowercase, strip trademark
        symbols and punctuation, unify roman/arabic numerals."""
        name = name.lower()
        name = re.sub(r'[™®©]', '', name)
        name = name.replace('&', ' and ')
        name = re.sub(r'[^\w\s]', ' ', name)
        words = [self.ROMAN_NUMERALS.get(w, w) for w in name.split()]
        return ' '.join(words)

    def _sequel_numbers(self, normalized_name):
        """Sequel numbers present as whole words ('spelunky 2' -> {'2'})."""
        return set(re.findall(r'\b[2-9]\b', normalized_name))

    def _score_candidate(self, search_name, item_name):
        """Score how well a Steam search result matches the searched name.

        All checks operate on normalized names and whole words — substring
        checks on raw names caused wrong matches (the letter 'v' or 'iv'
        inside a word used to count as a sequel marker).
        """
        from difflib import SequenceMatcher

        search_norm = self._normalize_name(search_name)
        item_norm = self._normalize_name(item_name)

        score = SequenceMatcher(None, search_norm, item_norm).ratio()

        if search_norm == item_norm:
            score += 1.0  # Perfect match bonus
        elif search_norm in item_norm or item_norm in search_norm:
            score += 0.5  # Substring match bonus

        # Sequel handling: compare the sets of whole-word sequel numbers
        search_nums = self._sequel_numbers(search_norm)
        item_nums = self._sequel_numbers(item_norm)
        if item_nums - search_nums:
            score -= 0.5  # item is a sequel we didn't search for
        if search_nums - item_nums:
            score -= 0.5  # we searched for a sequel; item isn't it
        if search_nums and search_nums == item_nums:
            score += 0.2  # sequel numbers line up exactly

        # Demote soundtracks/demos/DLC unless explicitly searched for
        item_words = set(item_norm.split())
        search_words = set(search_norm.split())
        for token in self.NON_GAME_TOKENS:
            token_words = set(token.split())
            if token_words <= item_words and not token_words <= search_words:
                score -= 0.6
                break

        return score

    def _safe_filename(self, game_name):
        safe_name = re.sub(r'[^\w\s-]', '', game_name).strip()
        return re.sub(r'[-\s]+', '_', safe_name)

    # ------------------------------------------------------------------
    # Vertical library-capsule images (600x900, primary art for tiles)
    # ------------------------------------------------------------------

    def _find_capsule_url(self, app_id):
        """Return the URL of the best vertical library capsule for an app,
        or None if the game has no vertical capsule art at all."""
        # Standard CDN paths cover most games
        candidates = [
            f"https://steamcdn-a.akamaihd.net/steam/apps/{app_id}/library_600x900_2x.jpg",
            f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{app_id}/library_600x900_2x.jpg",
            f"https://steamcdn-a.akamaihd.net/steam/apps/{app_id}/library_600x900.jpg",
            f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{app_id}/library_600x900.jpg",
        ]
        for url in candidates:
            try:
                resp = requests.head(url, timeout=10, allow_redirects=True)
                if resp.status_code == 405:  # CDN rejects HEAD; probe with GET
                    resp = requests.get(url, timeout=10, stream=True)
                if resp.status_code == 200:
                    return url
            except requests.RequestException:
                continue

        # Newer games host assets under hashed filenames; ask the store API
        # where the capsule actually lives.
        try:
            input_json = json.dumps({
                "ids": [{"appid": int(app_id)}],
                "context": {"country_code": "US"},
                "data_request": {"include_assets": True},
            })
            api_url = ("https://api.steampowered.com/IStoreBrowseService/GetItems/v1/"
                       f"?input_json={quote(input_json)}")
            resp = requests.get(api_url, timeout=10)
            resp.raise_for_status()
            items = resp.json().get("response", {}).get("store_items", [])
            if items:
                assets = items[0].get("assets", {})
                filename = assets.get("library_capsule_2x") or assets.get("library_capsule")
                url_format = assets.get("asset_url_format")  # e.g. "steam/apps/123/${FILENAME}"
                if filename and url_format:
                    path = url_format.replace("${FILENAME}", filename)
                    return f"https://shared.fastly.steamstatic.com/store_item_assets/{path}"
        except Exception as e:
            self.vprint(f"Store API asset lookup failed for app {app_id}: {e}")

        return None

    def _download_image(self, url, image_path):
        """Download an image, verify it decodes, and cache it. Returns the
        opened Image, or None on any failure (nothing is cached on failure,
        so a transient error doesn't poison the cache)."""
        try:
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            with open(image_path, 'wb') as f:
                f.write(response.content)
            Image.open(image_path).verify()  # decode check; verify() closes
            return Image.open(image_path)
        except Exception as e:
            self.vprint(f"Error downloading image {url}: {e}")
            if os.path.exists(image_path):
                os.remove(image_path)
            return None

    def get_game_tile_image(self, game_name):
        """Get the vertical (600x900) capsule image for a game, falling back to
        a composed vertical tile if no capsule art exists."""
        image_path = os.path.join(self.cache_dir, f"{self._safe_filename(game_name)}_capsule.jpg")

        if os.path.exists(image_path):
            self.vprint(f"Using cached capsule for {game_name}")
            try:
                return Image.open(image_path)
            except:
                self.vprint(f"Cached capsule corrupted for {game_name}, re-downloading...")
                os.remove(image_path)

        app_id = self.search_steam_game(game_name)

        if app_id:
            capsule_url = self._find_capsule_url(app_id)
            if capsule_url:
                self.vprint(f"Downloading capsule for {game_name}: {capsule_url}")
                img = self._download_image(capsule_url, image_path)
                if img is not None:
                    return img
                self.vprint(f"Capsule download failed for {game_name}")
            else:
                self.vprint(f"No vertical capsule found for {game_name} (app {app_id})")

        # No capsule art: compose a vertical tile from the header image + title
        return self.create_vertical_fallback_tile(game_name)

    def create_vertical_fallback_tile(self, game_name, width=600, height=900):
        """Build a 600x900 tile for games without capsule art: header image
        (if available) centered above the game title on a dark background."""
        tile = Image.new('RGB', (width, height), color='#2a2a2a')
        draw = ImageDraw.Draw(tile)
        font = self._load_font(44)

        header = None
        try:
            header = self.get_steam_header_image(game_name, allow_placeholder=False)
        except Exception:
            header = None

        text_y = height // 2
        if header is not None:
            # Scale header to tile width, place in upper-middle area
            ratio = width / header.width
            scaled = header.resize((width, int(header.height * ratio)), Image.Resampling.LANCZOS)
            header_y = (height - scaled.height) // 2 - 60
            tile.paste(scaled, (0, header_y))
            text_y = header_y + scaled.height + 40

        # Word-wrap the title
        words = game_name.split()
        lines, line = [], ""
        for word in words:
            candidate = f"{line} {word}".strip()
            if draw.textbbox((0, 0), candidate, font=font)[2] > width - 40 and line:
                lines.append(line)
                line = word
            else:
                line = candidate
        lines.append(line)

        for text_line in lines:
            bbox = draw.textbbox((0, 0), text_line, font=font)
            draw.text(((width - (bbox[2] - bbox[0])) // 2, text_y), text_line,
                      fill='white', font=font)
            text_y += (bbox[3] - bbox[1]) + 14

        return tile

    # ------------------------------------------------------------------
    # Horizontal header images (fallback source only)
    # ------------------------------------------------------------------

    def get_steam_header_image(self, game_name, allow_placeholder=True):
        """Get the Steam header image (460x215 horizontal) for a game."""
        image_path = os.path.join(self.cache_dir, f"{self._safe_filename(game_name)}.jpg")

        # Check if we already have the image cached
        if os.path.exists(image_path):
            self.vprint(f"Using cached image for {game_name}")
            try:
                return Image.open(image_path)
            except:
                self.vprint(f"Cached image corrupted for {game_name}, re-downloading...")
                os.remove(image_path)

        # Search for the game on Steam
        app_id = self.search_steam_game(game_name)

        if app_id:
            self.vprint(f"Downloading header image for {game_name} (ID: {app_id})")

            # Try the standard CDN URL first
            header_url = f"https://cdn.akamai.steamstatic.com/steam/apps/{app_id}/header.jpg"
            img = self._download_image(header_url, image_path)
            if img is not None:
                return img

            # Some newer games use a hashed URL; ask appdetails for the real one
            try:
                self.vprint(f"Standard CDN URL failed for {game_name}, fetching URL from appdetails API")
                details_url = f"https://store.steampowered.com/api/appdetails?appids={app_id}&filters=basic"
                details_resp = requests.get(details_url, timeout=10)
                details_resp.raise_for_status()
                details_data = details_resp.json()
                header_url = details_data.get(str(app_id), {}).get("data", {}).get("header_image")
                if header_url:
                    self.vprint(f"Using appdetails header URL: {header_url}")
                    img = self._download_image(header_url, image_path)
                    if img is not None:
                        return img
                else:
                    self.vprint(f"No header_image in appdetails for app {app_id}")
            except Exception as e:
                self.vprint(f"Error downloading header image for {game_name}: {e}")

        if not allow_placeholder:
            return None

        # Fallback: create a placeholder image
        self.vprint(f"Creating placeholder for {game_name}")
        return self.create_placeholder_image(game_name)

    def create_placeholder_image(self, game_name, width=460, height=215):
        """Create a placeholder image for games without Steam images"""
        img = Image.new('RGB', (width, height), color='#2a2a2a')
        draw = ImageDraw.Draw(img)
        font = self._load_font(24)

        # Calculate text position
        bbox = draw.textbbox((0, 0), game_name, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        x = (width - text_width) // 2
        y = (height - text_height) // 2

        # Draw the text
        draw.text((x, y), game_name, fill='white', font=font)

        return img

    def _load_font(self, size, bold=False):
        """Load a TrueType font, trying common locations."""
        names = (["arialbd.ttf", "Arial Bold.ttf",
                  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"] if bold else
                 ["arial.ttf", "Arial.ttf",
                  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"])
        for name in names:
            try:
                return ImageFont.truetype(name, size)
            except (OSError, IOError):
                continue
        print("Warning: Using default font instead of TrueType font")
        return ImageFont.load_default()

    def resize_image(self, img, target_height):
        """Resize image to target height while maintaining aspect ratio"""
        original_width, original_height = img.size
        aspect_ratio = original_width / original_height
        new_width = int(target_height * aspect_ratio)

        return img.resize((new_width, target_height), Image.Resampling.LANCZOS)

    # ------------------------------------------------------------------
    # Tier list rendering
    # ------------------------------------------------------------------

    def generate_tier_list(self, tiers, output_path="tier_list.png",
                           tile_width=None, max_games_per_row=None,
                           row_gap=None, tier_label_width=None):
        """Generate the visual tier list image.

        Tiles are uniform vertical capsules (2:3), so layout is exact:
        canvas width = tier_label_width + max_games_per_row * tile_width.
        """
        tile_width = tile_width or self.TILE_WIDTH
        max_games_per_row = max_games_per_row or self.MAX_GAMES_PER_ROW
        row_gap = self.ROW_GAP if row_gap is None else row_gap
        tier_label_width = tier_label_width or self.TIER_LABEL_WIDTH

        tile_height = (tile_width * 3) // 2  # 2:3 vertical capsule aspect

        canvas_width = (tier_label_width + self.LABEL_GAP
                        + max_games_per_row * tile_width)

        tier_order = ['S', 'A', 'B', 'C', 'D', 'E', 'F']
        present_tiers = [t for t in tier_order if t in tiers]
        tier_heights = {}
        for tier in present_tiers:
            num_rows = math.ceil(len(tiers[tier]) / max_games_per_row)
            tier_heights[tier] = num_rows * tile_height + (num_rows - 1) * row_gap
        canvas_height = (sum(tier_heights.values())
                         + self.TIER_BAND * (len(present_tiers) - 1))

        print(f"Canvas size: {canvas_width}x{canvas_height} "
              f"(tiles {tile_width}x{tile_height}, max {max_games_per_row} per row)")

        canvas = Image.new('RGB', (canvas_width, canvas_height),
                           color=self.BACKGROUND)

        # Tier letter font scales with tile size
        font_size = max(24, min(int(tile_height * 0.19), 84))
        tier_font = self._load_font(font_size, bold=True)

        current_y = 0

        for tier in present_tiers:
            games = tiers[tier]
            tier_height = tier_heights[tier]

            # Colored tier label column spanning all rows of this tier
            tier_bg = Image.new('RGB', (tier_label_width, tier_height),
                                color=self.tier_colors[tier])
            canvas.paste(tier_bg, (0, current_y))

            # White tier letter with dark outline + drop shadow so it reads
            # on the lighter tier colors
            draw = ImageDraw.Draw(canvas)
            bbox = draw.textbbox((0, 0), tier, font=tier_font,
                                 stroke_width=self.LETTER_OUTLINE)
            text_x = (tier_label_width - (bbox[2] - bbox[0])) // 2 - bbox[0]
            text_y = current_y + (tier_height - (bbox[3] - bbox[1])) // 2 - bbox[1]
            outline = dict(stroke_width=self.LETTER_OUTLINE, stroke_fill='#26272b')
            draw.text((text_x + 3, text_y + 3), tier, fill='#26272b',
                      font=tier_font, **outline)
            draw.text((text_x, text_y), tier, fill='white',
                      font=tier_font, **outline)

            for i, game_name in enumerate(games):
                print(f"Processing {game_name}...")

                row, col = divmod(i, max_games_per_row)
                game_x = tier_label_width + self.LABEL_GAP + col * tile_width
                game_y = current_y + row * (tile_height + row_gap)

                game_img = self.get_game_tile_image(game_name)
                if game_img.size != (tile_width, tile_height):
                    game_img = game_img.resize((tile_width, tile_height),
                                               Image.Resampling.LANCZOS)

                canvas.paste(game_img, (game_x, game_y))

            current_y += tier_height + self.TIER_BAND

        canvas.save(output_path, 'PNG', optimize=True)
        print(f"Tier list saved as {output_path}")

        return canvas


def main():
    """Simple test function"""
    generator = TierListGenerator(verbose=True)

    # Test tier list
    test_tiers = {
        'S': ['Slay the Spire', 'Balatro'],
        'A': ['Into the Breach', 'Hades'],
        'B': ['Dead Cells', 'Risk of Rain 2'],
        'C': ['FTL', 'Spelunky 2']
    }

    generator.generate_tier_list(test_tiers, "test_tierlist.png")


if __name__ == "__main__":
    main()
