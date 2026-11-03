"""
Unit tests for Markdown and HTML files: what becomes a segment, and that
everything else (code blocks, links, attributes, markers, whitespace) comes
back byte for byte.
"""
import re
from pathlib import Path

import pytest

from llm_translate.formats import html_file, markdown_file
from llm_translate.formats.placeholders import protect, restore
from llm_translate.utils.exceptions import TranslationError

FIXTURES = Path(__file__).parent.parent / "fixtures"


def translate_all(document, mark=lambda text: f"[{text.upper()}]"):
    """Run every segment through protect, a fake model, and restore."""
    out = []
    for i, segment in enumerate(document.segments):
        protected = protect(segment)
        out.append(restore(protected, mark(protected.text), segment=i))
    return document.render(out)


def code_blocks(markdown: str):
    return re.findall(r"^```.*?^```$", markdown, re.DOTALL | re.MULTILINE)


# Markdown

def test_markdown_identity_translation_is_byte_identical():
    source = (FIXTURES / "sample.md").read_text()
    document = markdown_file.parse(source)
    assert document.render(document.segments) == source


def test_markdown_segments_are_text_only():
    document = markdown_file.parse((FIXTURES / "sample.md").read_text())
    assert document.segments == [
        "Getting *started*",
        "Install it with `pip install foo` and read the [docs](https://example.com/docs \"Docs\")\n"
        "for more.  See also [the guide][guide].",
        "A quoted line\nthat wraps.",
        "First item with `code`",
        "Second item\ncontinues here",
        "Setext heading",
        "Name",
        "Meaning",
        "foo",
        "A thing",
    ]


def test_markdown_keeps_every_code_block_byte_for_byte():
    source = (FIXTURES / "sample.md").read_text()
    translated = translate_all(markdown_file.parse(source))
    assert code_blocks(translated) == code_blocks(source) and len(code_blocks(source)) == 1
    assert "    indented code block\n\twith a tab\n" in translated
    assert '    return "{name}"' in translated and "# not translated   \n" in translated


def test_markdown_keeps_markers_links_front_matter_html_and_definitions():
    source = (FIXTURES / "sample.md").read_text()
    translated = translate_all(markdown_file.parse(source))
    assert translated.startswith("---\ntitle: Keep me\n---\n")
    assert "# [GETTING *STARTED*]\n" in translated
    assert "`pip install foo`" in translated
    assert '[DOCS](https://example.com/docs "Docs")' in translated
    assert "THE GUIDE][guide]" in translated
    assert '[guide]: https://example.com/guide "Guide title"\n' in translated
    assert '<div class="note">\n  <p>Raw HTML block</p>\n</div>' in translated
    assert "> [A QUOTED LINE\n> THAT WRAPS.]\n" in translated
    assert "- [SECOND ITEM\n  CONTINUES HERE]\n" in translated
    assert "[SETEXT HEADING]\n==============\n" in translated
    assert "| [NAME] | [MEANING] |\n|------|---------|\n| [FOO]  | [A THING] |" in translated


def test_markdown_translation_with_different_wrapping_keeps_the_prefix():
    document = markdown_file.parse("> one\n> two\n\nplain one line\n")
    assert document.render(["uno\ndos\ntres", "una linea\nsola"]) == "> uno\n> dos\n> tres\n\nuna linea sola\n"


def test_markdown_crlf_and_no_trailing_newline():
    source = "# Title\r\n\r\nSome text\r\n```\r\ncode\r\n```"
    document = markdown_file.parse(source)
    assert document.segments == ["Title", "Some text"]
    assert document.render(["Titulo", "Algo"]) == "# Titulo\r\n\r\nAlgo\r\n```\r\ncode\r\n```"


def test_markdown_without_text_has_no_segments():
    document = markdown_file.parse("```\ncode\n```\n")
    assert document.segments == []
    assert document.render([]) == "```\ncode\n```\n"


def test_markdown_render_needs_one_translation_per_segment():
    with pytest.raises(ValueError):
        markdown_file.parse("text").render([])


def test_markdown_lost_link_fails_the_segment():
    document = markdown_file.parse("See [docs](https://example.com).\n")
    protected = protect(document.segments[0])
    with pytest.raises(TranslationError):
        restore(protected, "Ver docs.", segment=0)


def test_markdown_unlocatable_block_is_a_400_error(monkeypatch):
    original = markdown_file.MarkdownIt.parse

    def broken(self, text, *args, **kwargs):
        tokens = original(self, text, *args, **kwargs)
        for token in tokens:
            if token.type == "inline":
                token.content = "not in the file"
        return tokens

    monkeypatch.setattr(markdown_file.MarkdownIt, "parse", broken)
    with pytest.raises(TranslationError) as raised:
        markdown_file.parse("hello\n")
    assert raised.value.status_code == 400


# HTML

def test_html_identity_translation_is_byte_identical():
    source = (FIXTURES / "sample.html").read_text()
    document = html_file.parse(source)
    assert document.render(document.segments) == source


def test_html_segments_are_text_nodes_only():
    document = html_file.parse((FIXTURES / "sample.html").read_text())
    assert document.segments == [
        "Hello & welcome",
        "Welcome",
        "Read the",
        "docs",
        "today.",
        "Thanks © 2026",
        "Use",
        "now.",
    ]


def test_html_keeps_tags_attributes_and_verbatim_elements():
    source = (FIXTURES / "sample.html").read_text()
    translated = translate_all(html_file.parse(source))
    assert '<h1 class="big" title="Do not touch">[WELCOME]</h1>' in translated
    assert '<a href="https://example.com/?a=1&amp;b=2">[DOCS]</a>' in translated
    assert "<title>[HELLO &amp; WELCOME]</title>" in translated
    assert "<pre>  keep\n    this   exactly &amp; &lt;</pre>" in translated
    assert "<code>pip install foo</code>" in translated
    assert "<style>p { color: red; }</style>" in translated
    assert '<script>var greeting = "Hello <b>";</script>' in translated
    assert "<textarea>\n  untouched\n  </textarea>" in translated
    assert "<!-- keep this comment -->" in translated
    assert '<img src="a.png" alt="A picture">' in translated
    assert translated.startswith('<!DOCTYPE html>\n<html lang="en">')
    assert "<br/>[THANKS © 2026]" in translated


def test_html_translation_is_escaped():
    document = html_file.parse("<p>Fish</p>")
    assert document.render(["Tom & Jerry <3"]) == "<p>Tom &amp; Jerry &lt;3</p>"


def test_html_keeps_surrounding_whitespace():
    document = html_file.parse("<p>\n   Hello\n</p>")
    assert document.segments == ["Hello"]
    assert document.render(["Hola"]) == "<p>\n   Hola\n</p>"


def test_html_without_text_has_no_segments():
    document = html_file.parse("<div><img src=x></div>")
    assert document.segments == []
    assert document.render([]) == "<div><img src=x></div>"


# Markdown tables: repeated and escaped cells

@pytest.mark.parametrize("source", [
    "| a | a |\n|---|---|\n| a | a |\n",
    "| foo | foo |\n|-----|-----|\n| foo | foo |\n",
    "a | a\n--|--\nx | x\n",
    "| a\\|b | c |\n|------|---|\n| d | e\\|f |\n",
    "| a |  | c |\n|---|---|---|\n|  | b | |\n",
])
def test_markdown_table_identity_is_byte_identical(source):
    document = markdown_file.parse(source)
    assert document.render(document.segments) == source


def test_markdown_table_cells_are_raw_source_and_translate_in_place():
    document = markdown_file.parse("| a\\|b | a |\n|------|---|\n| a | a |\n")
    assert document.segments == ["a\\|b", "a", "a", "a"]
    assert document.render(["1", "2", "3", "4"]) == "| 1 | 2 |\n|------|---|\n| 3 | 4 |\n"


# Guards

def test_html_processing_instruction_and_cdata_are_kept():
    source = '<?xml version="1.0"?><p>Hi</p><![CDATA[ keep me ]]>'
    document = html_file.parse(source)
    assert document.segments == ["Hi"]
    assert document.render(["Hola"]) == '<?xml version="1.0"?><p>Hola</p><![CDATA[ keep me ]]>'


def test_html_entities_inside_verbatim_text_are_kept():
    source = "<pre>a &amp; b &#60; c</pre><p>x</p>"
    document = html_file.parse(source)
    assert document.segments == ["x"]
    assert document.render(["y"]) == "<pre>a &amp; b &#60; c</pre><p>y</p>"


def test_html_unparseable_file_is_a_400_error(monkeypatch):
    def boom(self, data):
        raise RuntimeError("bad")

    monkeypatch.setattr(html_file.HTMLParser, "feed", boom)
    with pytest.raises(TranslationError) as raised:
        html_file.parse("<p>x</p>")
    assert raised.value.status_code == 400


def test_html_render_needs_one_translation_per_segment():
    with pytest.raises(ValueError):
        html_file.parse("<p>x</p>").render([])


@pytest.mark.parametrize("prefix, pad", [("  ", "  "), ("> ", "> "), ("- ", "  "), ("1. ", "   "), ("> - ", ">   ")])
def test_markdown_table_under_indentation_or_block_markers(prefix, pad):
    source = f"{prefix}| a | b |\n{pad}|---|---|\n{pad}| c | d |\n"
    document = markdown_file.parse(source)
    assert document.segments == ["a", "b", "c", "d"]
    assert document.render(document.segments) == source
    assert document.render(["1", "2", "3", "4"]) == f"{prefix}| 1 | 2 |\n{pad}|---|---|\n{pad}| 3 | 4 |\n"
