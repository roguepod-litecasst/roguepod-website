#!/usr/bin/env python3
"""Offline unit tests for the Steam search matching in tier_list_generator.

No network needed — these test the scoring logic that decides which Steam
search result (if any) is the game we asked for. Run with:

    cd scripts && python3 test_steam_matching.py
"""

import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(__file__))

from tier_list_generator import TierListGenerator


def make_generator():
    # Point the cache at a temp dir so tests never touch steam_images/
    g = TierListGenerator.__new__(TierListGenerator)
    g.verbose = False
    g.cache_dir = tempfile.mkdtemp()
    g.game_id_cache = {}
    return g


def check(condition, message):
    status = "PASS" if condition else "FAIL"
    print(f"  [{status}] {message}")
    return condition


def test_normalization(g):
    print("Name normalization:")
    ok = True
    ok &= check(g._normalize_name("Returnal™") == "returnal",
                "trademark symbols stripped")
    ok &= check(g._normalize_name("Hades II") == g._normalize_name("Hades 2"),
                "roman numerals unified with arabic")
    ok &= check(g._normalize_name("FTL: Faster Than Light")
                == "ftl faster than light",
                "punctuation stripped")
    ok &= check(g._normalize_name("Crypt of the NecroDancer")
                == "crypt of the necrodancer",
                "case folded")
    return ok


def test_sequel_handling(g):
    print("Sequel handling:")
    ok = True
    # Searching the base game must prefer it over its sequel
    ok &= check(g._score_candidate("Spelunky", "Spelunky")
                > g._score_candidate("Spelunky", "Spelunky 2"),
                "base-game search prefers base game over sequel")
    # Searching the sequel must prefer it over the base game
    ok &= check(g._score_candidate("Spelunky 2", "Spelunky 2")
                > g._score_candidate("Spelunky 2", "Spelunky"),
                "sequel search prefers sequel over base game")
    # Roman-numeral sequels count as sequels
    ok &= check(g._score_candidate("Hades", "Hades II")
                < g._score_candidate("Hades", "Hades"),
                "roman-numeral sequel penalized on base-game search")
    ok &= check(g._score_candidate("Hades 2", "Hades II") >= 2.0,
                "'Hades 2' matches Steam's 'Hades II' as exact")
    # The old bug: letters like 'v'/'iv' inside words counted as sequel
    # markers, silently disabling the penalty
    ok &= check(g._score_candidate("Star of Providence", "Star of Providence 2")
                < g._score_candidate("Star of Providence", "Star of Providence"),
                "'v' inside a word doesn't disable the sequel penalty")
    ok &= check(g._score_candidate("Vampire Survivors", "Vampire Survivors")
                >= 2.0,
                "'iv' inside 'Survivors' doesn't penalize an exact match")
    return ok


def test_non_game_entries(g):
    print("Non-game store entries:")
    ok = True
    ok &= check(g._score_candidate("Hades", "Hades - Original Soundtrack")
                < g._score_candidate("Hades", "Hades"),
                "soundtrack demoted below the game")
    ok &= check(g._score_candidate("Peglin", "Peglin Demo")
                < TierListGenerator.MIN_MATCH_SCORE,
                "demo alone falls below the acceptance threshold")
    ok &= check(g._score_candidate("Inscryption", "Inscryption")
                >= 2.0,
                "token match must be whole-word (no substring false hits)")
    return ok


def test_threshold(g):
    print("Acceptance threshold:")
    t = TierListGenerator.MIN_MATCH_SCORE
    ok = True
    # Real matches that must pass
    for search, item in [
        ("Returnal", "Returnal™"),
        ("The Binding of Isaac: Rebirth", "The Binding of Isaac: Rebirth"),
        ("Curious Expedition", "The Curious Expedition"),
        ("FTL", "FTL: Faster Than Light"),
        ("Crypt of the Necrodancer", "Crypt of the NecroDancer"),
    ]:
        ok &= check(g._score_candidate(search, item) >= t,
                    f"accepts '{search}' -> '{item}'")
    # Unrelated games that must be rejected rather than rendered wrong
    for search, item in [
        ("Gambonanza", "Gwent: The Witcher Card Game"),
        ("Coal LLC", "Coal Mining Simulator"),
        ("Minos", "Minecraft Dungeons"),
    ]:
        ok &= check(g._score_candidate(search, item) < t,
                    f"rejects '{search}' -> '{item}'")
    return ok


if __name__ == "__main__":
    g = make_generator()
    results = [
        test_normalization(g),
        test_sequel_handling(g),
        test_non_game_entries(g),
        test_threshold(g),
    ]
    if all(results):
        print("\nAll tests passed ✅")
        sys.exit(0)
    print("\nSome tests FAILED ❌")
    sys.exit(1)
