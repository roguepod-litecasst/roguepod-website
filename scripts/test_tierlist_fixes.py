#!/usr/bin/env python3
"""
Test script to verify tier list fixes:
1. Name mapping for "Spelunky HD" -> "Spelunky"
2. Vertical expansion for tiers with > 9 games
"""

import sys
import os

# Add the scripts directory to the path
sys.path.insert(0, os.path.dirname(__file__))

from tier_list_generator import TierListGenerator

def test_vertical_expansion():
    """Test that tiers properly wrap after 9 games"""
    print("=" * 60)
    print("TEST: Vertical Expansion (9 games per row)")
    print("=" * 60)

    generator = TierListGenerator(verbose=True)

    # Create a test tier list with one tier having more than 9 games
    test_tiers = {
        'S': ['Slay the Spire', 'Balatro', 'Into the Breach'],
        'A': [
            'Hades',
            'Dead Cells',
            'Risk of Rain 2',
            'FTL',
            'Spelunky',
            'Celeste',
            'Hollow Knight',
            'Enter the Gungeon',
            'Binding of Isaac',
            # These should wrap to second row:
            'Noita',
            'Nuclear Throne',
            'Rogue Legacy',
            'Crypt of the NecroDancer',
            'Downwell',
        ],
        'B': ['Monster Train', 'Darkest Dungeon'],
    }

    output_path = "test_vertical_expansion.png"

    print(f"\nGenerating test tier list with A tier having {len(test_tiers['A'])} games...")
    print(f"Expected: A tier should have 2 rows (9 games in first row, {len(test_tiers['A']) - 9} in second row)")

    generator.generate_tier_list(test_tiers, output_path)

    print(f"\n✅ Test tier list generated: {output_path}")
    print("Please open the image to verify:")
    print("  - A tier should have 2 rows")
    print("  - First row should have 9 games")
    print(f"  - Second row should have {len(test_tiers['A']) - 9} games")
    print("  - Games should be tightly packed (no gaps)")
    print()

def test_name_mapping():
    """Test that the name mapping works for Spelunky HD"""
    print("=" * 60)
    print("TEST: Name Mapping (Spelunky HD -> Spelunky)")
    print("=" * 60)

    from automated_tierlist_updater import AutomatedTierListUpdater

    updater = AutomatedTierListUpdater(verbose=True)

    # Create mock episodes with "Spelunky HD"
    mock_episodes = [
        {'title': 'Spelunky HD', 'pub_date': '2024-01-01'},
        {'title': 'Slay the Spire', 'pub_date': '2024-01-02'},
        {'title': 'Balatro', 'pub_date': '2024-01-03'},
    ]

    print("\nExtracting game names from mock episodes:")
    game_names = updater.extract_game_names_from_episodes(mock_episodes)

    print(f"\nExtracted game names: {game_names}")

    if 'Spelunky' in game_names and 'Spelunky HD' not in game_names:
        print("✅ Name mapping works correctly!")
        print("   'Spelunky HD' was mapped to 'Spelunky'")
    else:
        print("❌ Name mapping failed!")
        print(f"   Expected 'Spelunky' in game_names, got: {game_names}")

    print()

def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("TIER LIST FIXES TEST SUITE")
    print("=" * 60)
    print()

    # Test 1: Name mapping
    test_name_mapping()

    # Test 2: Vertical expansion
    test_vertical_expansion()

    print("=" * 60)
    print("ALL TESTS COMPLETED")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Review the generated test image: test_vertical_expansion.png")
    print("2. Verify that A tier properly wraps after 9 games")
    print("3. If everything looks good, the fixes are working correctly!")
    print()

if __name__ == "__main__":
    main()
