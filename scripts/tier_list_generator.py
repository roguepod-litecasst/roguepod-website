#!/usr/bin/env python3
"""
Tier List Generator for RoguePod LiteCast

This module generates visual tier lists with Steam game images.
"""

import requests
import json
import os
import re
from PIL import Image, ImageDraw, ImageFont
from urllib.parse import quote
import time


class TierListGenerator:
    def __init__(self, verbose=False):
        self.verbose = verbose
        self.cache_dir = "steam_images"
        self.game_id_cache_file = os.path.join(self.cache_dir, "game_ids.json")
        
        # Ensure cache directory exists
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Load cached game IDs
        self.game_id_cache = self.load_game_id_cache()
        
        # TierMaker-style colors
        self.tier_colors = {
            'S': '#ff7f7f',  # Red
            'A': '#ffbf7f',  # Orange  
            'B': '#ffdf7f',  # Yellow
            'C': '#bfff7f',  # Light Green
            'D': '#7fff7f',  # Green
            'E': '#7fffff',  # Cyan
            'F': '#7f7fff'   # Blue
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
        # Check cache first
        cache_key = game_name.lower().strip()
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
                    item_name = item.get('name', '').lower()
                    search_name = game_name.lower()
                    
                    # Calculate similarity score
                    score = self._calculate_name_similarity(search_name, item_name)
                    
                    # Bonus points for exact matches or very close matches
                    if search_name == item_name:
                        score += 1.0  # Perfect match bonus
                    elif search_name in item_name or item_name in search_name:
                        score += 0.5  # Substring match bonus
                    
                    # Penalty for sequels when not searching for them
                    if not any(num in search_name for num in ['2', '3', '4', '5', 'ii', 'iii', 'iv', 'v']):
                        if any(num in item_name for num in ['2', '3', '4', '5', 'ii', 'iii', 'iv', 'v']):
                            score -= 0.3  # Penalty for sequels
                    
                    self.vprint(f"  {item_name}: score {score:.2f}")
                    
                    if score > best_score:
                        best_score = score
                        best_match = item
                
                if best_match:
                    app_id = best_match['id']
                    
                    # Cache the result
                    self.game_id_cache[cache_key] = app_id
                    self.save_game_id_cache()
                    
                    self.vprint(f"✅ Best match: '{best_match['name']}' (ID: {app_id}, score: {best_score:.2f})")
                    return app_id
                else:
                    self.vprint(f"No good matches found for {game_name}")
                    return None
            else:
                self.vprint(f"No Steam results found for {game_name}")
                return None
                
        except Exception as e:
            self.vprint(f"Error searching Steam for {game_name}: {e}")
            return None
    
    def _calculate_name_similarity(self, name1, name2):
        """Calculate similarity between two game names"""
        from difflib import SequenceMatcher
        return SequenceMatcher(None, name1, name2).ratio()
    
    def get_steam_header_image(self, game_name):
        """Get the Steam header image for a game"""
        # Clean up the game name for filename
        safe_name = re.sub(r'[^\w\s-]', '', game_name).strip()
        safe_name = re.sub(r'[-\s]+', '_', safe_name)
        image_path = os.path.join(self.cache_dir, f"{safe_name}.jpg")
        
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
            try:
                # Download the header image
                header_url = f"https://cdn.akamai.steamstatic.com/steam/apps/{app_id}/header.jpg"
                
                self.vprint(f"Downloading header image for {game_name} (ID: {app_id})")
                
                response = requests.get(header_url, timeout=15)
                response.raise_for_status()
                
                # Save to cache
                with open(image_path, 'wb') as f:
                    f.write(response.content)
                
                # Open and return the image
                return Image.open(image_path)
                
            except Exception as e:
                self.vprint(f"Error downloading header image for {game_name}: {e}")
        
        # Fallback: create a placeholder image
        self.vprint(f"Creating placeholder for {game_name}")
        return self.create_placeholder_image(game_name)
    
    def create_placeholder_image(self, game_name, width=460, height=215):
        """Create a placeholder image for games without Steam images"""
        img = Image.new('RGB', (width, height), color='#2a2a2a')
        draw = ImageDraw.Draw(img)
        
        try:
            # Try to use a decent font
            font = ImageFont.truetype("arial.ttf", 24)
        except:
            try:
                font = ImageFont.truetype("Arial.ttf", 24)
            except:
                try:
                    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
                except:
                    font = ImageFont.load_default()
        
        # Calculate text position
        bbox = draw.textbbox((0, 0), game_name, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        x = (width - text_width) // 2
        y = (height - text_height) // 2
        
        # Draw the text
        draw.text((x, y), game_name, fill='white', font=font)
        
        return img
    
    def resize_image(self, img, target_height):
        """Resize image to target height while maintaining aspect ratio"""
        original_width, original_height = img.size
        aspect_ratio = original_width / original_height
        new_width = int(target_height * aspect_ratio)
        
        return img.resize((new_width, target_height), Image.Resampling.LANCZOS)
    
    def generate_tier_list(self, tiers, output_path="tier_list.png"):
        """Generate the visual tier list"""
        # Configuration - match TierMaker style
        game_height = 120  # Height of each game image
        tier_label_width = 100
        max_games_per_row = 9  # Maximum games per row before wrapping
        row_spacing = 10  # Spacing between rows within a tier

        # Calculate the actual width needed by checking image dimensions
        # Steam header images are typically 460x215, so when resized to height 120:
        estimated_image_width = int((460/215) * game_height)  # ~257px

        # Calculate dimensions dynamically
        # Canvas width is based on max_games_per_row (not total games in tier)
        canvas_width = tier_label_width + (max_games_per_row * estimated_image_width)

        # Calculate total canvas height by summing each tier's height
        # Each tier's height depends on how many rows it needs
        import math
        canvas_height = 0
        tier_heights = {}  # Store calculated height for each tier

        tier_order = ['S', 'A', 'B', 'C', 'D', 'E', 'F']
        for tier in tier_order:
            if tier not in tiers:
                continue
            num_games = len(tiers[tier])
            num_rows = math.ceil(num_games / max_games_per_row)
            tier_height = num_rows * game_height + (num_rows - 1) * row_spacing
            tier_heights[tier] = tier_height
            canvas_height += tier_height

        print(f"Canvas size: {canvas_width}x{canvas_height} (max {max_games_per_row} games per row)")
        
        # Create canvas with dark background like TierMaker
        canvas = Image.new('RGB', (canvas_width, canvas_height), color='#1a1a1a')

        # Calculate font size based on game height for better scaling
        # Use 25% of game height as base, but ensure minimum and maximum sizes
        base_font_size = int(game_height * 0.25)  # 25% of game height
        font_size = max(16, min(base_font_size, 36))  # Between 16 and 36
        
        try:
            tier_font = ImageFont.truetype("arial.ttf", font_size)
        except:
            try:
                # Try other common font names
                tier_font = ImageFont.truetype("Arial.ttf", font_size)
            except:
                try:
                    tier_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
                except:
                    # Fallback to default font, but make it bigger
                    tier_font = ImageFont.load_default()
                    print(f"Warning: Using default font instead of TrueType font")

        print(f"Using font size: {font_size}px (game height: {game_height}px)")

        current_y = 0

        # Process each tier
        for tier_index, tier in enumerate(tier_order):
            if tier not in tiers:
                continue

            games = tiers[tier]
            tier_height = tier_heights[tier]

            # Draw tier label background (spans all rows in this tier)
            tier_bg = Image.new('RGB', (tier_label_width, tier_height),
                              color=self.tier_colors[tier])
            canvas.paste(tier_bg, (0, current_y))

            # Draw tier label text centered in the tier label area
            draw = ImageDraw.Draw(canvas)

            # Get text bounding box for precise centering
            bbox = draw.textbbox((0, 0), tier, font=tier_font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]

            # Center the text both horizontally and vertically in the label area
            text_x = (tier_label_width - text_width) // 2
            text_y = current_y + (tier_height - text_height) // 2

            # Draw the text (no shadow)
            draw.text((text_x, text_y), tier, fill='black', font=tier_font)

            # Add games to this tier with wrapping after max_games_per_row
            game_x = tier_label_width
            game_y = current_y

            for i, game_name in enumerate(games):
                print(f"Processing {game_name}...")

                # Check if we need to wrap to next row
                if i > 0 and i % max_games_per_row == 0:
                    game_x = tier_label_width  # Reset to start of new row
                    game_y += game_height + row_spacing  # Move to next row

                # Get game image
                game_img = self.get_steam_header_image(game_name)
                game_img = self.resize_image(game_img, game_height)

                # Paste game image at current position
                canvas.paste(game_img, (game_x, game_y))

                # Move x position for next game (no gap between games in same row)
                game_x += game_img.width

            # Draw subtle tier separator line (except for last tier)
            if tier_index < len([t for t in tier_order if t in tiers]) - 1:
                draw = ImageDraw.Draw(canvas)
                line_y = current_y + tier_height
                draw.line([(0, line_y), (canvas_width, line_y)], fill='#444444', width=1)

            current_y += tier_height
        
        # Save the tier list
        canvas.save(output_path, 'PNG', quality=95)
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