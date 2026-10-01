"""Spotting inconsistent category/type names before they become duplicates."""

from collections import Counter, defaultdict
from difflib import SequenceMatcher

from . import spec
from .normalize import name_key


def canonical_spellings(names, existing=()):
    """Map each name key to one spelling.

    An existing name in the database always wins; otherwise the most common
    spelling in the file wins. 'Test equipment' and 'Test Equipment' share
    a key, so they become the same category.
    """
    by_key = defaultdict(Counter)
    for name in names:
        by_key[name_key(name)][name] += 1
    chosen = {key: counts.most_common(1)[0][0] for key, counts in by_key.items()}
    for name in existing:
        chosen[name_key(name)] = name
    return chosen


def similar_pairs(names, existing=(), threshold=spec.SIMILAR_NAME_THRESHOLD):
    """Return (new_name, similar_name) pairs that are probably typos of each other.

    Only names that would be *created* by this import are checked, against
    every other name in the file and in the database.
    """
    existing_keys = {name_key(n): n for n in existing}
    file_keys = {}
    for name in names:
        file_keys.setdefault(name_key(name), name)

    candidates = {**file_keys, **existing_keys}
    seen = set()
    pairs = []
    for key in sorted(file_keys):
        if key in existing_keys:
            continue
        for other_key in sorted(candidates):
            pair = frozenset((key, other_key))
            if other_key == key or pair in seen:
                continue
            if SequenceMatcher(None, key, other_key).ratio() >= threshold:
                seen.add(pair)
                pairs.append((file_keys[key], candidates[other_key]))
    return pairs
