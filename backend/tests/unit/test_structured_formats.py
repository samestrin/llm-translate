"""
Round trips for JSON, YAML and PO on fixtures: values are translated, and keys,
order, comments, plural forms and placeholders stay.
"""
import json
from pathlib import Path

import polib
import pytest
from ruamel.yaml import YAML

from llm_translate.formats import json_format, po_format, yaml_format
from llm_translate.formats.placeholders import protect, restore
from llm_translate.utils.exceptions import TranslationError

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures" / "formats"


def fixture(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def translate_all(document, fn=lambda text: f"[fr] {text}"):
    """Run every segment through placeholder protection and a fake model, as the pipeline does."""
    out = {}
    for segment in document.segments:
        protected = protect(segment.text)
        out[segment.id] = restore(protected, fn(protected.text), segment.id)
    return out


def test_json_translates_values_only_and_keeps_order():
    document = json_format.parse(fixture("app.json"))
    assert [s.id for s in document.segments] == [
        "title", "greeting", "menu.items[0]", "menu.items[1]", "menu.zebra", "alpha",
    ]
    result = document.render(translate_all(document))
    source, out = json.loads(fixture("app.json")), json.loads(result)
    assert list(out) == list(source)
    assert list(out["menu"]) == ["items", "zebra"]
    assert out["title"] == "[fr] My App"
    assert out["greeting"] == "[fr] Hello {name}, you have %d messages"
    assert out["menu"]["items"] == ["[fr] Open", "[fr] Save as <b>new</b>", 7]
    assert (out["count"], out["enabled"], out["nothing"], out["blank"]) == (3, True, None, "")
    assert result.startswith('{\n  "title"') and result.endswith("}\n")


def test_json_identity_round_trip_keeps_indent_and_final_newline():
    text = json.dumps(json.loads(fixture("app.json")), indent=4, ensure_ascii=False) + "\n"
    document = json_format.parse(text)
    assert document.render({s.id: s.text for s in document.segments}) == text


def test_json_keeps_non_ascii_and_compact_form():
    document = json_format.parse('{"a":"é"}')
    assert document.render({"a": "ü"}) == '{"a": "ü"}'


@pytest.mark.parametrize("bad", ["{", "", "{'a': 1}"])
def test_json_malformed_is_a_400_without_the_file(bad):
    with pytest.raises(TranslationError) as raised:
        json_format.parse(bad)
    assert raised.value.status_code == 400
    assert "malformed" in raised.value.message


def test_yaml_translates_values_and_keeps_comments_keys_and_style():
    document = yaml_format.parse(fixture("app.yaml"))
    ids = [s.id for s in document.segments]
    assert ids == ["title", "greeting", "menu.items[0]", "menu.items[1]", "menu.zebra",
                   "common", "help", "alpha"]
    result = document.render(translate_all(document))
    assert "# Strings for the settings page" in result
    assert "# shown in the header" in result
    assert "# The menu" in result
    assert 'greeting: "[fr] Hello {name}"' in result
    assert "- '[fr] Save as <b>new</b>'" in result
    assert "common: &common '[fr] Shared text'" in result
    assert "again: *common" in result
    assert "help: |\n  [fr] First line\n  Second line with %s" in result
    data = YAML().load(result)
    assert list(data) == ["title", "greeting", "count", "enabled", "menu", "common", "again", "help", "alpha"]
    assert data["count"] == 3 and data["enabled"] is True
    assert data["again"] == "[fr] Shared text"


def test_yaml_identity_round_trip_is_byte_identical():
    text = fixture("app.yaml")
    document = yaml_format.parse(text)
    assert document.render({s.id: s.text for s in document.segments}) == text


def test_yaml_malformed_is_a_400():
    with pytest.raises(TranslationError) as raised:
        yaml_format.parse("a: [1, 2\nb: : :")
    assert raised.value.status_code == 400


def test_po_fills_msgstr_and_keeps_comments_context_flags_and_plurals():
    document = po_format.parse(fixture("app.po"))
    assert [s.id for s in document.segments] == [
        "msgid 'Hello %s'", "msgctxt 'menu' msgid 'Open'",
        "msgid '%d file'[0]", "msgid '%d file'[1]", "msgid 'Zebra'",
    ]
    result = document.render(translate_all(document), language="fr")
    po = polib.pofile(result)
    assert [e.msgid for e in po if not e.obsolete] == ["Hello %s", "Open", "%d file", "Zebra"]
    hello, menu, plural, zebra = [e for e in po if not e.obsolete]
    assert hello.msgstr == "[fr] Hello %s"
    assert hello.comment == "Extracted comment" and hello.occurrences == [("src/app.py", "10")]
    assert "python-format" in hello.flags
    assert menu.msgctxt == "menu" and menu.msgstr == "[fr] Open"
    assert plural.msgstr_plural == {0: "[fr] %d file", 1: "[fr] %d files"}
    assert po.metadata["Language"] == "fr"
    assert po.metadata["Project-Id-Version"] == "demo 1.0"
    assert [e.msgid for e in po.obsolete_entries()] == ["Gone"]
    assert po.obsolete_entries()[0].msgstr == "Parti"
    assert po.metadata["Plural-Forms"] == "nplurals=2; plural=(n != 1);"


def test_po_plural_forms_follow_the_target_language_header():
    text = fixture("app.po").replace("nplurals=2; plural=(n != 1);",
                                     "nplurals=3; plural=(n%10==1 ? 0 : 1)")
    document = po_format.parse(text)
    result = document.render(translate_all(document))
    plural = [e for e in polib.pofile(result) if e.msgid_plural][0]
    assert sorted(plural.msgstr_plural) == [0, 1, 2]


def test_po_placeholders_are_checked_per_segment():
    from llm_translate.formats.placeholders import PlaceholderError
    document = po_format.parse(fixture("app.po"))
    with pytest.raises(PlaceholderError) as raised:
        translate_all(document, lambda masked: "Bonjour")
    assert "Hello %s" in str(raised.value)


def test_po_missing_translation_is_an_error():
    document = po_format.parse(fixture("app.po"))
    with pytest.raises(TranslationError):
        document.render({})
