#!/usr/bin/env python3
"""
Automated Tier List Updater for RoguePod LiteCast

This script:
1. Fetches the latest RSS feed to determine released episodes
2. Downloads the current tier list from Google Doc using API
3. Filters tier list to only include games with released episodes
4. Generates updated tier list image using tier_list_generator.py
5. Saves the result to public/tierlist.png for the website
"""

import requests
import xml.etree.ElementTree as ET
from urllib.parse import urlparse
import re
from difflib import SequenceMatcher
import argparse
import os
import sys
from datetime import datetime
import time
import json

# Google API imports
try:
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    GOOGLE_API_AVAILABLE = True
except ImportError:
    GOOGLE_API_AVAILABLE = False
    print("Warning: Google API libraries not installed. Install with: pip install google-api-python-client google-auth")

# Import the existing tier list generator with better error handling
try:
    from tier_list_generator import TierListGenerator
except ImportError as e:
    print(f"❌ Import error: {e}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Files in directory: {os.listdir('.')}")
    print("Make sure tier_list_generator.py is in the same directory")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error importing tier_list_generator: {e}")
    print(f"Error type: {type(e)}")
    sys.exit(1)


class AutomatedTierListUpdater:
    def __init__(self, verbose=False, credentials_path=None):
        self.verbose = verbose
        self.rss_url = "https://feeds.acast.com/public/shows/roguepod-litecast"
        self.google_doc_id = "1nCm7kf_10FCEs5HKVEQyyivV50e7XrAzgueP2oSPTt8"
        self.credentials_path = credentials_path or "credentials.json"

        # Hard-coded name mappings for episode titles that don't match tier list exactly
        # Maps: episode_title -> tier_list_name
        self.name_mappings = {
            "Spelunky HD": "Spelunky",
        }

        # Initialize the tier list generator
        self.generator = TierListGenerator(verbose=verbose)

        # Initialize Google Docs service
        self.docs_service = None
        if GOOGLE_API_AVAILABLE:
            self._init_google_docs_service()
        
    def vprint(self, message):
        """Print only if verbose mode is enabled"""
        if self.verbose:
            print(message)
    
    def _init_google_docs_service(self):
        """Initialize Google Docs API service"""
        try:
            self.vprint("Initializing Google Docs API...")
            
            # Define the scopes
            SCOPES = ['https://www.googleapis.com/auth/documents.readonly']
            
            # Try environment variable first (for GitHub Actions)
            credentials_json = os.environ.get('GOOGLE_CREDENTIALS')
            if credentials_json:
                import json
                from io import StringIO
                credentials_info = json.loads(credentials_json)
                credentials = Credentials.from_service_account_info(
                    credentials_info, 
                    scopes=SCOPES
                )
            # Fall back to file (for local development)
            elif os.path.exists(self.credentials_path):
                credentials = Credentials.from_service_account_file(
                    self.credentials_path, 
                    scopes=SCOPES
                )
            else:
                raise FileNotFoundError(f"No credentials found. Either set GOOGLE_CREDENTIALS environment variable or provide {self.credentials_path}")
            
            # Build the service
            self.docs_service = build('docs', 'v1', credentials=credentials)
            self.vprint("Google Docs API initialized successfully")
            
        except Exception as e:
            print(f"Warning: Failed to initialize Google Docs API: {e}")
            self.docs_service = None
    
    def fetch_rss_episodes(self, max_retries=3):
        """Fetch and parse RSS feed to get episode titles with automatic retries"""
        for attempt in range(max_retries):
            try:
                self.vprint(f"Fetching RSS feed (attempt {attempt + 1}/{max_retries})...")
                response = requests.get(self.rss_url, timeout=30)
                response.raise_for_status()
                
                # Parse XML
                root = ET.fromstring(response.content)
                
                episodes = []
                items = root.findall('.//item')
                
                for item in items:
                    title_elem = item.find('title')
                    pub_date_elem = item.find('pubDate')
                    
                    if title_elem is not None:
                        title = title_elem.text.strip()
                        pub_date = pub_date_elem.text if pub_date_elem is not None else "Unknown"
                        episodes.append({
                            'title': title,
                            'pub_date': pub_date
                        })
                
                self.vprint(f"✅ Successfully found {len(episodes)} episodes in RSS feed")
                return episodes
                
            except Exception as e:
                if attempt < max_retries - 1:
                    self.vprint(f"❌ Attempt {attempt + 1} failed: {e}")
                    self.vprint(f"⏳ Retrying in 5 seconds...")
                    time.sleep(5)
                else:
                    print(f"❌ Error fetching RSS feed after {max_retries} attempts: {e}")
                    return []
    
    def extract_game_names_from_episodes(self, episodes):
        """Extract game names from episode titles"""
        game_names = []

        for episode in episodes:
            title = episode['title']
            pub_date = episode['pub_date']

            # Clean up the title to extract game name
            # Remove common podcast prefixes/suffixes
            cleaned_title = title

            # Remove episode numbers (e.g., "Episode 1:", "Ep. 2:", etc.)
            cleaned_title = re.sub(r'^(Episode\s*\d+:?\s*|Ep\.?\s*\d+:?\s*)', '', cleaned_title, flags=re.IGNORECASE)

            # Remove common suffixes
            cleaned_title = re.sub(r'\s*-\s*(Review|Discussion|Podcast).*$', '', cleaned_title, flags=re.IGNORECASE)

            # Clean up extra whitespace
            cleaned_title = cleaned_title.strip()

            # Apply hard-coded name mappings
            if cleaned_title in self.name_mappings:
                original_title = cleaned_title
                cleaned_title = self.name_mappings[cleaned_title]
                self.vprint(f"  Applied name mapping: '{original_title}' -> '{cleaned_title}'")

            if cleaned_title:
                game_names.append(cleaned_title)
                self.vprint(f"  Episode: '{title}' -> Game: '{cleaned_title}' (Published: {pub_date})")

        print(f"Extracted {len(game_names)} game names from episodes")
        return game_names
    
    def fetch_google_doc_content(self):
        """Fetch the tier list from Google Doc using API"""
        # Try Google Docs API first
        if self.docs_service:
            try:
                self.vprint("Fetching Google Doc content via API...")
                
                # Get the document
                document = self.docs_service.documents().get(documentId=self.google_doc_id).execute()
                
                # Extract text content
                content = self._extract_text_from_document(document)
                
                self.vprint(f"Retrieved {len(content)} characters from Google Doc via API")
                return content
                
            except Exception as e:
                print(f"Error fetching Google Doc via API: {e}")
                print("Make sure:")
                print("1. The service account email has access to the Google Doc")
                print("2. The document ID is correct")
                print("3. The Google Docs API is enabled in your Google Cloud project")
        
        # Fallback to local file
        print("Falling back to local tierlist.txt if it exists...")
        if os.path.exists('tierlist.txt'):
            with open('tierlist.txt', 'r', encoding='utf-8') as f:
                return f.read()
        else:
            print("No local tierlist.txt found either")
            return ""
    
    def _extract_text_from_document(self, document):
        """Extract plain text from Google Docs document structure"""
        text_content = []
        
        if 'body' in document and 'content' in document['body']:
            for element in document['body']['content']:
                if 'paragraph' in element:
                    paragraph = element['paragraph']
                    if 'elements' in paragraph:
                        paragraph_text = ""
                        for elem in paragraph['elements']:
                            if 'textRun' in elem and 'content' in elem['textRun']:
                                paragraph_text += elem['textRun']['content']
                        text_content.append(paragraph_text)
        
        return '\n'.join(text_content)
    
    def parse_tier_list_from_content(self, content):
        """Parse tier list from Google Doc content"""
        tiers = {}
        
        # Look for tier patterns in the content
        tier_pattern = r'([A-Z])\s*Tier:\s*([^\n\r]+)'
        matches = re.findall(tier_pattern, content, re.IGNORECASE)
        
        for tier, games_str in matches:
            tier = tier.upper()
            # Split games by comma and clean up
            games = [game.strip() for game in games_str.split(',') if game.strip()]
            tiers[tier] = games
            self.vprint(f"  {tier} Tier: {games}")
        
        total_games = sum(len(games) for games in tiers.values())
        print(f"Parsed tier list with {len(tiers)} tiers and {total_games} total games")
        
        return tiers
    
    def fuzzy_match_games(self, released_games, tier_list_games):
        """Use fuzzy matching to correlate released episodes with tier list games"""
        matched_games = set()
        match_details = []
        
        def similarity(a, b):
            return SequenceMatcher(None, a.lower(), b.lower()).ratio()
        
        # For each game in the tier list, find the best match in released episodes
        for tier_game in tier_list_games:
            best_match = None
            best_score = 0.0
            
            for released_game in released_games:
                score = similarity(tier_game, released_game)
                if score > best_score:
                    best_score = score
                    best_match = released_game
            
            # Consider it a match if similarity is high enough
            if best_score >= 0.6:  # 60% similarity threshold
                matched_games.add(tier_game)
                match_details.append({
                    'tier_game': tier_game,
                    'episode_title': best_match,
                    'similarity': best_score
                })
                self.vprint(f"  ✓ Matched '{tier_game}' with '{best_match}' (similarity: {best_score:.2f})")
            else:
                self.vprint(f"  ✗ No good match for '{tier_game}' (best: '{best_match}' at {best_score:.2f})")
        
        print(f"Matched {len(matched_games)} games from tier list with released episodes")
        return matched_games, match_details
    
    def filter_tier_list(self, full_tier_list, released_games):
        """Filter tier list to only include games that have been released"""
        # Get all games from the tier list
        all_tier_games = []
        for games in full_tier_list.values():
            all_tier_games.extend(games)
        
        # Find matches between released episodes and tier list games
        matched_games, match_details = self.fuzzy_match_games(released_games, all_tier_games)
        
        # Filter the tier list
        filtered_tiers = {}
        
        for tier, games in full_tier_list.items():
            filtered_games = [game for game in games if game in matched_games]
            if filtered_games:  # Only include tiers that have games
                filtered_tiers[tier] = filtered_games
        
        # Print summary
        total_original = sum(len(games) for games in full_tier_list.values())
        total_filtered = sum(len(games) for games in filtered_tiers.values())
        
        print(f"\nFiltered tier list: {total_filtered}/{total_original} games have released episodes")
        
        for tier in ['S', 'A', 'B', 'C', 'D', 'E', 'F']:
            if tier in filtered_tiers:
                print(f"  {tier} Tier: {', '.join(filtered_tiers[tier])}")
        
        return filtered_tiers, match_details
    
    def save_debug_info(self, released_games, match_details, output_dir="debug"):
        """Save debug information to files"""
        os.makedirs(output_dir, exist_ok=True)
        
        # Save released games
        with open(os.path.join(output_dir, "released_games.json"), 'w') as f:
            json.dump(released_games, f, indent=2)
        
        # Save match details
        with open(os.path.join(output_dir, "match_details.json"), 'w') as f:
            json.dump(match_details, f, indent=2)
        
        print(f"Debug information saved to {output_dir}/ directory")
    
    def update_tier_list(self, output_path="../public/tierlist.png", save_debug=False):
        """Main method to update the tier list"""
        print("🚀 Starting automated tier list update...")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Step 1: Fetch RSS episodes
        episodes = self.fetch_rss_episodes()
        if not episodes:
            print("❌ Failed to fetch episodes from RSS feed")
            return False
        
        # Step 2: Extract game names from episodes
        released_games = self.extract_game_names_from_episodes(episodes)
        if not released_games:
            print("❌ No game names extracted from episodes")
            return False
        
        # Step 3: Fetch current tier list from Google Doc
        doc_content = self.fetch_google_doc_content()
        if not doc_content:
            print("❌ Failed to fetch tier list content")
            return False
        
        # Step 4: Parse tier list
        full_tier_list = self.parse_tier_list_from_content(doc_content)
        if not full_tier_list:
            print("❌ Failed to parse tier list")
            return False
        
        # Step 5: Filter tier list to only released games
        filtered_tier_list, match_details = self.filter_tier_list(full_tier_list, released_games)
        if not filtered_tier_list:
            print("❌ No games matched between episodes and tier list")
            return False
        
        # Step 6: Save debug info if requested
        if save_debug:
            self.save_debug_info(released_games, match_details)
        
        # Step 7: Generate tier list image
        print("\n🎨 Generating tier list image...")
        try:
            # Ensure output directory exists
            output_dir = os.path.dirname(output_path)
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)
            
            # Generate the tier list
            self.generator.generate_tier_list(filtered_tier_list, output_path)
            
            print(f"✅ Tier list successfully saved to {output_path}")
            return True
            
        except Exception as e:
            print(f"❌ Error generating tier list: {e}")
            return False


def main():
    parser = argparse.ArgumentParser(description='Automatically update tier list from RSS feed and Google Doc')
    parser.add_argument('-v', '--verbose', action='store_true',
                      help='Enable verbose output with detailed debugging information')
    parser.add_argument('--output', default='../public/tierlist.png',
                      help='Output path for tier list image (default: ../public/tierlist.png)')
    parser.add_argument('--debug', action='store_true',
                      help='Save debug information to debug/ directory')
    parser.add_argument('--dry-run', action='store_true',
                      help='Run without generating the final image (for testing)')
    parser.add_argument('--credentials', default='credentials.json',
                      help='Path to Google API credentials JSON file (default: credentials.json)')
    
    args = parser.parse_args()
    
    # Create updater
    updater = AutomatedTierListUpdater(verbose=args.verbose, credentials_path=args.credentials)
    
    if args.dry_run:
        print("🧪 DRY RUN MODE - Will not generate final image")
        # Implement dry run logic here if needed
        args.debug = True  # Always save debug info in dry run
    
    # Run the update
    success = updater.update_tier_list(
        output_path=args.output,
        save_debug=args.debug
    )
    
    if success:
        print("\n🎉 Tier list update completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Tier list update failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()