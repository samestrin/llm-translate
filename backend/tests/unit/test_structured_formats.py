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
        "/title", "/greeting", "/menu/items/0", "/menu/items/1", "/menu/zebra", "/alpha",
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
    assert document.render({"/a": "ü"}) == '{"a": "ü"}'


@pytest.mark.parametrize("bad", ["{", "", "{'a': 1}"])
def test_json_malformed_is_a_400_without_the_file(bad):
    with pytest.raises(TranslationError) as raised:
        json_format.parse(bad)
    assert raised.value.status_code == 400
    assert "malformed" in raised.value.message


def test_yaml_translates_values_and_keeps_comments_keys_and_style():
    document = yaml_format.parse(fixture("app.yaml"))
    ids = [s.id for s in document.segments]
    assert ids == ["/title", "/greeting", "/menu/items/0", "/menu/items/1", "/menu/zebra",
                   "/common", "/help", "/alpha"]
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


# Review fixes: id collisions, guards and fallbacks

def test_json_ids_do_not_collide_for_dotted_keys():
    text = '{"a.b": "X", "a": {"b": "Y"}, "c/d": "Z", "c": {"d": "W"}}'
    document = json_format.parse(text)
    assert len({s.id for s in document.segments}) == 4
    assert json.loads(document.render({s.id: s.text for s in document.segments})) == json.loads(text)
    out = json.loads(document.render({s.id: f"T{s.text}" for s in document.segments}))
    assert out == {"a.b": "TX", "a": {"b": "TY"}, "c/d": "TZ", "c": {"d": "TW"}}


def test_yaml_ids_do_not_collide_for_dotted_keys():
    text = '"a.b": X\na:\n  b: Y\n"[0]": Z\n'
    document = yaml_format.parse(text)
    assert len({s.id for s in document.segments}) == 3
    assert document.render({s.id: s.text for s in document.segments}) == text
    out = YAML().load(document.render({s.id: f"T{s.text}" for s in document.segments}))
    assert out["a.b"] == "TX" and out["a"]["b"] == "TY" and out["[0]"] == "TZ"


def test_json_multiline_without_indent_falls_back_to_two_spaces():
    document = json_format.parse('{\n"a": "x"\n}')
    assert document.render({"/a": "y"}) == '{\n  "a": "y"\n}'


def test_yaml_blank_values_are_not_segments_and_survive():
    text = 'a: ""\nb: "  "\nc: text\n'
    document = yaml_format.parse(text)
    assert [s.id for s in document.segments] == ["/c"]
    assert document.render({"/c": "texte"}) == 'a: ""\nb: "  "\nc: texte\n'


def test_yaml_shared_nodes_are_translated_once_and_keep_anchor_and_alias():
    text = "base: &base\n  label: Hello\n  tags:\n    - one\nother: *base\nlist: &l\n  - two\nagain: *l\n"
    document = yaml_format.parse(text)
    assert [s.id for s in document.segments] == ["/base/label", "/base/tags/0", "/list/0"]
    result = document.render({s.id: f"[fr] {s.text}" for s in document.segments})
    assert "base: &base\n  label: '[fr] Hello'" in result
    assert "other: *base" in result and "again: *l" in result
    assert result.count("[fr] Hello") == 1
    data = YAML().load(result)
    assert data["other"]["label"] == "[fr] Hello" and data["again"] == ["[fr] two"]


def test_unknown_segment_id_in_a_render_leaves_the_text_alone():
    from llm_translate.formats.base import needs
    document = json_format.parse('{"a": "x", "b": ""}')
    assert needs(document, {})("/b", "") == ""


def test_po_malformed_is_a_400():
    with pytest.raises(TranslationError) as raised:
        po_format.parse("garbage garbage\n")
    assert raised.value.status_code == 400 and "malformed" in raised.value.message


def test_po_fuzzy_and_other_flags_are_kept():
    text = fixture("app.po").replace("#: src/app.py:20\n", "#: src/app.py:20\n#, fuzzy\n")
    document = po_format.parse(text)
    po = polib.pofile(document.render(translate_all(document)))
    plural = [e for e in po if e.msgid_plural][0]
    assert plural.flags == ["fuzzy"]
