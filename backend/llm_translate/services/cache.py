"""
In-process, bounded LRU cache of finished translations.
"""
import hashlib
import json
from collections import OrderedDict
from typing import Any, Optional


def cache_key(**parts: Any) -> str:
    """A stable SHA-256 hash of the parts that decide a translation's output."""
    return hashlib.sha256(json.dumps(parts, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()


class TranslationCache:
    """
    Least-recently-used cache holding at most `max_entries` results.

    Not shared between processes; lost on restart.
    """

    def __init__(self, max_entries: int):
        if max_entries < 1:
            raise ValueError("max_entries must be at least 1")
        self.max_entries = max_entries
        self._entries: "OrderedDict[str, Any]" = OrderedDict()

    def __len__(self) -> int:
        return len(self._entries)

    def get(self, key: str) -> Optional[Any]:
        """The cached value, now the most recently used, or None."""
        if key not in self._entries:
            return None
        self._entries.move_to_end(key)
        return self._entries[key]

    def put(self, key: str, value: Any) -> None:
        """Store a value, evicting the least recently used one when full."""
        self._entries[key] = value
        self._entries.move_to_end(key)
        while len(self._entries) > self.max_entries:
            self._entries.popitem(last=False)


_shared_cache: Optional[TranslationCache] = None


def get_translation_cache(max_entries: int) -> Optional[TranslationCache]:
    """
    The app-wide cache for `max_entries` (`LLM_CACHE_SIZE`), or None when it is 0 (off).

    The same cache is reused while the size stays the same.
    """
    global _shared_cache
    if max_entries < 1:
        _shared_cache = None
        return None
    if _shared_cache is None or _shared_cache.max_entries != max_entries:
        _shared_cache = TranslationCache(max_entries)
    return _shared_cache
