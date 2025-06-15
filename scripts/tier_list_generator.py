import re
import requests
from PIL import Image, ImageDraw, ImageFont
import io
import json
from urllib.parse import quote
import time
import os
import hashlib
import argparse

class TierListGenerator:
    def __init__(self, cache_dir="steam_images", verbose=False):
        # Create cache directory
        self.cache_dir = cache_dir
        self.verbose = verbose
        os.makedirs(cache_dir, exist_ok=True)
        
        # Load cached game IDs
        self.cache_file = os.path.join(cache_dir, "game_ids.json")
        self.cached_ids = self.load_cache()
        
        # Tier colors similar to tiermaker
        self.tier_colors = {
            'S': '#FF7F7F',  # Red
            'A': '#FFBF7F',  # Orange  
            'B': '#FFDF7F',  # Yellow
            'C': '#FFFF7F',  # Light Yellow
            'D': '#BFFF7F',  # Light Green
            'E': '#7FFF7F',  # Green
            'F': '#7FBFFF'   # Blue
        }
        
        # Manual Steam app ID overrides for problematic games
        self.steam_id_overrides = {
            'rogue legacy': 241600,  # Original Rogue Legacy
            'rogue legacy 2': 1253920,  # Rogue Legacy 2
            'spelunky': 239350,  # Original Spelunky HD
            'spelunky 2': 418530,  # Spelunky 2
            # Add more overrides as needed
        }
        
        # Steam API setup (you might need to get an API key for better results)
        self.steam_search_url = "https://store.steampowered.com/api/storesearch/"

    def vprint(self, message):
        """Print only if verbose mode is enabled"""
        if self.verbose:
            print(message)
        
    def load_cache(self):
        """Load cached game IDs from file"""
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, 'r') as f:
                    return json.load(f)
            except:
                return {}
        return {}
    
    def save_cache(self):
        """Save cached game IDs to file"""
        with open(self.cache_file, 'w') as f:
            json.dump(self.cached_ids, f, indent=2)
    
    def get_cache_filename(self, game_name, app_id):
        """Generate a safe filename for cached images"""
        if app_id is None:
            return None
        
        # Create a hash to handle special characters and long names
        name_hash = hashlib.md5(game_name.lower().encode()).hexdigest()[:8]
        safe_name = re.sub(r'[^\w\s-]', '', game_name.lower()).strip()
        safe_name = re.sub(r'[-\s]+', '_', safe_name)[:20]  # Limit length
        return f"{safe_name}_{app_id}_{name_hash}.jpg"

    def parse_tier_file(self, file_path):
        """Parse the tier list text file"""
        tiers = {}
        
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Extract each tier using regex
        tier_pattern = r'([A-Z])\s*Tier:\s*([^\n]+)'
        matches = re.findall(tier_pattern, content, re.IGNORECASE)
        
        for tier, games_str in matches:
            tier = tier.upper()
            # Split games by comma and clean up
            games = [game.strip() for game in games_str.split(',')]
            tiers[tier] = games
            
        return tiers
    
    def search_steam_game(self, game_name):
        """Search for a game on Steam and return app ID"""
        for attempt in range(3):
            try:
                params = {
                    'term': game_name,
                    'l': 'english',
                    'cc': 'US'
                }
                
                self.vprint(f"  Searching Steam (attempt {attempt + 1}/3)...")
                response = requests.get(self.steam_search_url, params=params, timeout=15)
                if response.status_code == 200:
                    data = response.json()
                    if data.get('items'):
                        self.vprint(f"  Found {len(data['items'])} results for '{game_name}'")
                        
                        # Look for exact or best match
                        for item in data['items']:
                            item_name = item['name'].lower()
                            search_name = game_name.lower()
                            
                            # Exact match
                            if item_name == search_name:
                                self.vprint(f"    Exact match: {item['name']} (ID: {item['id']})")
                                return item['id']
                        
                        # If no exact match, look for close matches
                        for item in data['items']:
                            item_name = item['name'].lower()
                            search_name = game_name.lower()
                            
                            # Check if search term is contained in the item name
                            if search_name in item_name:
                                # For games without numbers, prefer results without numbers
                                if not any(char.isdigit() for char in search_name):
                                    if not any(char.isdigit() for char in item_name):
                                        self.vprint(f"    Close match (no numbers): {item['name']} (ID: {item['id']})")
                                        return item['id']
                                else:
                                    self.vprint(f"    Close match: {item['name']} (ID: {item['id']})")
                                    return item['id']
                        
                        # If still no match, return first result
                        first_item = data['items'][0]
                        self.vprint(f"    Using first result: {first_item['name']} (ID: {first_item['id']})")
                        return first_item['id']
                else:
                    self.vprint(f"  HTTP {response.status_code} on search attempt {attempt + 1}")
                    
            except requests.exceptions.Timeout:
                self.vprint(f"  Search timeout on attempt {attempt + 1} for '{game_name}'")
                if attempt < 2:  # Don't sleep on the last attempt
                    time.sleep(2)
            except Exception as e:
                self.vprint(f"  Search error on attempt {attempt + 1} for '{game_name}': {e}")
                if attempt < 2:
                    time.sleep(2)
        
        self.vprint(f"  Failed to search for '{game_name}' after 3 attempts")
        return None

    def get_steam_header_image(self, game_name):
        """Get Steam header image for a game"""
        game_name_lower = game_name.lower()
        
        # Step 1: Try to get app_id from various sources
        app_id = self._get_app_id(game_name_lower)
        
        # Step 2: Download image using app_id
        if app_id:
            return self._download_and_cache_image(game_name, app_id)
        
        print(f"  Failed to get image for {game_name}, using placeholder")
        return self.create_placeholder_image(game_name)
    
    def get_steam_header_image(self, game_name):
        """Get Steam header image for a game"""
        game_name_lower = game_name.lower()
        
        # Step 1: Check if we have a cached image
        cached_image = self._get_cached_image(game_name_lower)
        if cached_image:
            return cached_image
        
        # Step 2: Get app_id from various sources
        app_id = self._get_app_id(game_name_lower)
        
        # Step 3: Download image using app_id
        if app_id:
            return self._download_and_cache_image(game_name, app_id)
        
        print(f"  Failed to get image for {game_name}, using placeholder")
        return self.create_placeholder_image(game_name)
    
    def _get_cached_image(self, game_name_lower):
        """Check if we have a valid cached image"""
        if game_name_lower in self.cached_ids:
            app_id = self.cached_ids[game_name_lower]
            self.vprint(f"  Found in cache with app_id: {app_id}")
            
            cache_filename = self.get_cache_filename(game_name_lower, app_id)
            if cache_filename:
                cache_path = os.path.join(self.cache_dir, cache_filename)
                if os.path.exists(cache_path):
                    print(f"  Using cached image for {game_name_lower.title()}")
                    try:
                        return Image.open(cache_path)
                    except Exception as e:
                        print(f"  Error loading cached image: {e}")
                else:
                    self.vprint(f"  Cache file doesn't exist, will re-download")
        return None
    
    def _get_app_id(self, game_name_lower):
        """Get app_id from cache, overrides, or Steam search"""
        # Check cache first
        if game_name_lower in self.cached_ids:
            app_id = self.cached_ids[game_name_lower]
            self.vprint(f"  Using cached app_id: {app_id}")
            return app_id
        
        # Try manual overrides
        app_id = self.steam_id_overrides.get(game_name_lower)
        if app_id:
            self.vprint(f"  Using manual override app_id: {app_id}")
            return app_id
        
        # Search Steam as last resort
        self.vprint(f"  No app_id available, searching Steam...")
        app_id = self.search_steam_game(game_name_lower.title())
        
        if app_id:
            # Cache the new app_id
            self.cached_ids[game_name_lower] = app_id
            self.save_cache()
            self.vprint(f"  Saved new app_id {app_id} to cache")
            return app_id
        
        return None
    
    def _get_current_steam_image_url(self, app_id):
        """Try to get the current Steam header image URL with hash"""
        try:
            # Get the Steam store page
            store_url = f"https://store.steampowered.com/app/{app_id}/"
            response = requests.get(store_url, timeout=10)
            
            if response.status_code == 200:
                # Look for the header image in the HTML
                import re
                # Pattern to match Steam header image URLs with hashes
                pattern = rf'https://shared\.fastly\.steamstatic\.com/store_item_assets/steam/apps/{app_id}/[a-f0-9]+/header\.jpg'
                match = re.search(pattern, response.text)
                
                if match:
                    self.vprint(f"  Found current header image URL with hash")
                    return match.group(0)
        except Exception as e:
            self.vprint(f"  Could not fetch current image URL: {e}")
        
        # Fallback to the standard URL
        return f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{app_id}/header.jpg"

    def _download_and_cache_image(self, game_name, app_id):
        """Download image from Steam and cache it"""
        # Try to get the current image URL (with fallback)
        image_url = self._get_current_steam_image_url(app_id)
        
        for attempt in range(3):
            try:
                print(f"  Downloading image (attempt {attempt + 1}/3)...")
                response = requests.get(image_url, timeout=15)
                if response.status_code == 200:
                    img = Image.open(io.BytesIO(response.content))
                    
                    # Save to cache
                    self._save_to_cache(game_name, app_id, img)
                    
                    # Delay after downloading
                    time.sleep(0.5)
                    return img
                else:
                    self.vprint(f"  HTTP {response.status_code}")
                    # If the hashed URL fails, try the fallback on next attempt
                    if attempt == 0:
                        image_url = f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{app_id}/header.jpg"
                        self.vprint(f"  Trying fallback URL")
            except Exception as e:
                print(f"  Error on attempt {attempt + 1}: {e}")
                if attempt < 2:
                    time.sleep(2)
        
        return None
    
    def _save_to_cache(self, game_name, app_id, img):
        """Save image to cache"""
        cache_filename = self.get_cache_filename(game_name, app_id)
        if cache_filename:
            cache_path = os.path.join(self.cache_dir, cache_filename)
            try:
                img.save(cache_path, 'JPEG', quality=90)
                self.vprint(f"  Cached image as {cache_filename}")
            except Exception as e:
                print(f"  Error saving cache: {e}")
    
    def create_placeholder_image(self, game_name):
        """Create a placeholder image for games we can't find"""
        # Steam header dimensions are typically 460x215
        img = Image.new('RGB', (460, 215), color='#2a2a2a')
        draw = ImageDraw.Draw(img)
        
        try:
            # Try to use a reasonable font
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            font = ImageFont.load_default()
        
        # Wrap text if it's too long
        words = game_name.split()
        lines = []
        current_line = ""
        
        for word in words:
            test_line = current_line + " " + word if current_line else word
            bbox = draw.textbbox((0, 0), test_line, font=font)
            if bbox[2] - bbox[0] < 400:  # Leave some margin
                current_line = test_line
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word
        
        if current_line:
            lines.append(current_line)
        
        # Center the text
        total_height = len(lines) * 25
        start_y = (215 - total_height) // 2
        
        for i, line in enumerate(lines):
            bbox = draw.textbbox((0, 0), line, font=font)
            text_width = bbox[2] - bbox[0]
            x = (460 - text_width) // 2
            y = start_y + i * 25
            draw.text((x, y), line, fill='white', font=font)
        
        return img
    
    def resize_image(self, img, target_height=120):
        """Resize image maintaining aspect ratio to exact target height"""
        original_width, original_height = img.size
        aspect_ratio = original_width / original_height
        new_width = int(target_height * aspect_ratio)
        return img.resize((new_width, target_height), Image.Resampling.LANCZOS)
    
    def generate_tier_list(self, tiers, output_path="tier_list.png"):
        """Generate the visual tier list"""
        # Configuration - match TierMaker style
        game_height = 120  # Height of each game image
        tier_height = game_height  # Tier height same as game height
        tier_label_width = 100
        
        # Calculate the actual width needed by checking image dimensions
        # Steam header images are typically 460x215, so when resized to height 120:
        estimated_image_width = int((460/215) * game_height)  # ~257px
        
        # Calculate dimensions dynamically with NO margins between games
        max_games_in_tier = max(len(games) for games in tiers.values()) if tiers else 0
        
        # Calculate canvas width: label + (images with no gaps between them)
        if max_games_in_tier > 0:
            canvas_width = tier_label_width + (max_games_in_tier * estimated_image_width)
        else:
            canvas_width = tier_label_width + 200
            
        canvas_height = len(tiers) * tier_height
        
        print(f"Canvas size: {canvas_width}x{canvas_height} (max {max_games_in_tier} games per tier)")
        
        # Create canvas with dark background like TierMaker
        canvas = Image.new('RGB', (canvas_width, canvas_height), color='#1a1a1a')
        
        try:
            tier_font = ImageFont.truetype("arial.ttf", 42)  # Reduced from 48 to 42
        except:
            tier_font = ImageFont.load_default()
        
        current_y = 0
        
        # Process each tier
        tier_order = ['S', 'A', 'B', 'C', 'D', 'E', 'F']
        
        for tier_index, tier in enumerate(tier_order):
            if tier not in tiers:
                continue
                
            games = tiers[tier]
            
            # Draw tier label background
            tier_bg = Image.new('RGB', (tier_label_width, tier_height), 
                              color=self.tier_colors[tier])
            canvas.paste(tier_bg, (0, current_y))
            
            # Draw tier label text
            draw = ImageDraw.Draw(canvas)
            bbox = draw.textbbox((0, 0), tier, font=tier_font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            text_x = (tier_label_width - text_width) // 2
            text_y = current_y + (tier_height - text_height) // 2
            draw.text((text_x, text_y), tier, fill='black', font=tier_font)
            
            # Add games to this tier with NO gaps
            game_x = tier_label_width
            
            for i, game_name in enumerate(games):
                print(f"Processing {game_name}...")
                
                # Get game image
                game_img = self.get_steam_header_image(game_name)
                game_img = self.resize_image(game_img, game_height)
                
                # Paste game image directly adjacent to previous (no margin)
                canvas.paste(game_img, (game_x, current_y))
                
                # Update position for next game (no gap)
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
    parser = argparse.ArgumentParser(description='Generate visual tier lists from text files')
    parser.add_argument('-v', '--verbose', action='store_true', 
                      help='Enable verbose output with detailed debugging information')
    parser.add_argument('--input', default='tierlist.txt',
                      help='Input tier list file (default: tierlist.txt)')
    parser.add_argument('--output', default='my_tier_list.png',
                      help='Output image file (default: my_tier_list.png)')
    
    args = parser.parse_args()
    
    generator = TierListGenerator(verbose=args.verbose)
    
    # Example usage
    try:
        # Parse the tier file
        tiers = generator.parse_tier_file(args.input)
        print("Parsed tiers:", tiers)
        
        # Generate the tier list
        generator.generate_tier_list(tiers, args.output)
        
    except FileNotFoundError:
        print(f"Please create a '{args.input}' file with your tier list data")
        print("Example format:")
        print("S Tier: Slay the Spire, Balatro")
        print("A Tier: Into the Breach, Crypt of the Necrodancer")
        print("...")

if __name__ == "__main__":
    main()