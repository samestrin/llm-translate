"""
The shape every markup format returns: the segments to translate, and a way
to put the translations back into the untouched rest of the file.
"""
from dataclasses import dataclass
from typing import Callable, List


@dataclass
class TextDocument:
    """
    A file split into translatable segments.

    Attributes:
        segments: The text to translate, in file order. Run each through
            `placeholders.protect` before the model and `placeholders.restore` after.
        render: Builds the file from one translation per segment. Everything that
            is not a segment (code, tags, attributes, whitespace) comes from the source.
    """
    segments: List[str]
    render: Callable[[List[str]], str]
