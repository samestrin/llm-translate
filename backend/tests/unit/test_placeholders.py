"""
Unit tests for placeholder and tag protection: what gets masked for each
placeholder style, the round trip through a translation, and the failure
when the translation loses, changes, duplicates, adds or misorders one.
"""
import pytest

from llm_translate.formats.placeholders import PlaceholderError, protect, restore
from llm_translate.utils.exceptions import ErrorType, TranslationError


def roundtrip(source: str, translate) -> str:
    """Mask `source`, run the masked text through `translate`, restore the result."""
    protected = protect(source)
    return restore(protected, translate(protected.text), segment="s1")


def failure(source: str, translation_of_masked: str, segment="s1") -> PlaceholderError:
    protected = protect(source)
    with pytest.raises(PlaceholderError) as raised:
        restore(protected, translation_of_masked, segment=segment)
    return raised.value


# What gets masked, per style

@pytest.mark.parametrize("source, placeholders", [
    # Brace placeholders: named, positional, empty, formatted, mustache, template literal
    ("Hello {name}", ["{name}"]),
    ("{0} of {1}", ["{0}", "{1}"]),
    ("Got {} items", ["{}"]),
    ("Total {amount, number, currency}", ["{amount, number, currency}"]),
    ("Hi {{user.name}}!", ["{{user.name}}"]),
    ("Hi ${user}", ["${user}"]),
    # printf: plain, positional, flags and precision, Python named, escaped percent
    ("Hello %s", ["%s"]),
    ("%d files", ["%d"]),
    ("%1$d of %2$s", ["%1$d", "%2$s"]),
    ("%.2f and %-5s and %05d and %ld", ["%.2f", "%-5s", "%05d", "%ld"]),
    ("Hi %(name)s", ["%(name)s"]),
    ("100%% done", ["%%"]),
    ("%s%s", ["%s", "%s"]),
    ("%1$d%2$d", ["%1$d", "%2$d"]),
    ("file%s and 150%d", ["%s", "%d"]),
    # HTML tags: open, close, self-closing, attributes, comments
    ("Click <b>here</b>", ["<b>", "</b>"]),
    ('See <a href="/x" class="y">docs</a>', ['<a href="/x" class="y">', "</a>"]),
    ("Line<br/>break<br>", ["<br/>", "<br>"]),
    ("A<!-- note -->B", ["<!-- note -->"]),
    # Markdown: inline code, emphasis markers, links, images, autolinks
    ("Run `npm test` now", ["`npm test`"]),
    ("This is **bold** and __this__ and ~~gone~~", ["**", "**", "__", "__", "~~", "~~"]),
    ("Read [the docs](https://x.io/a) first", ["[", "](https://x.io/a)"]),
    ("Read [the docs][ref] first", ["[", "][ref]"]),
    ("![a cat](cat.png)", ["![", "](cat.png)"]),
    ("Mail <https://x.io> now", ["<https://x.io>"]),
])
def test_each_style_is_masked(source, placeholders):
    protected = protect(source)
    assert protected.placeholders == placeholders
    # Nothing that was masked is left in the text the model sees
    remaining = protected.text
    for index in range(len(placeholders)):
        remaining = remaining.replace(f"⟦{index}⟧", "", 1)
    for original in set(placeholders):
        assert original not in remaining


@pytest.mark.parametrize("text", [
    "Plain text, nothing to keep",
    "100% sure",           # a percent sign followed by a space is not printf
    "50% discount",
    "Das ist 100%ig",      # a conversion followed by a letter is a word, not printf
    "Gut zu 50%iger Sicherheit",
    "50%off today",
    "a < b and c > d",     # comparison, not a tag
    "2 * 3 * 4",           # a lone asterisk is not emphasis
    "snake_case_name",     # a lone underscore is not emphasis
])
def test_text_with_no_placeholders_is_left_alone(text):
    protected = protect(text)
    assert protected.text == text
    assert protected.placeholders == []
    assert restore(protected, text.upper(), segment=1) == text.upper()


def test_icu_plural_keeps_its_structure_and_leaves_the_branches_translatable():
    source = "{count, plural, one {# file} other {# files}}"
    protected = protect(source)
    assert protected.placeholders == ["{count, plural,", "one {", "#", "}", "other {", "#", "}", "}"]
    # The words in the branches are left for the model
    assert "file" in protected.text and "files" in protected.text
    spanish = {"file": "archivo", "files": "archivos"}

    def translate(text):
        return text.replace("files", spanish["files"]).replace("file", spanish["file"])

    assert roundtrip(source, translate) == "{count, plural, one {# archivo} other {# archivos}}"


def test_icu_select_with_a_nested_placeholder_and_offset():
    source = "{gender, select, male {He} female {She} other {They}} invited {guest}"
    protected = protect(source)
    assert protected.placeholders == [
        "{gender, select,", "male {", "}", "female {", "}", "other {", "}", "}", "{guest}",
    ]
    assert roundtrip(source, lambda t: t.replace(" invited", " invitó a")) == (
        "{gender, select, male {He} female {She} other {They}} invitó a {guest}"
    )


def test_icu_plural_with_offset_exact_match_and_a_nested_argument():
    source = "{n, plural, offset:1 =0 {nobody} =1 {{host}} other {{host} and # others}}"
    protected = protect(source)
    assert protected.placeholders == [
        "{n, plural, offset:1", "=0 {", "}", "=1 {", "{host}", "}", "other {", "{host}", "#", "}", "}",
    ]
    assert roundtrip(source, lambda t: t.replace("nobody", "nadie").replace("and", "y").replace("others", "otros")) == (
        "{n, plural, offset:1 =0 {nadie} =1 {{host}} other {{host} y # otros}}"
    )


def test_selectordinal_is_icu_too():
    source = "{pos, selectordinal, one {#st} other {#th}}"
    assert protect(source).placeholders == ["{pos, selectordinal,", "one {", "#", "}", "other {", "#", "}", "}"]


def test_a_hash_outside_a_plural_is_text():
    protected = protect("Issue #4 for {name}")
    assert protected.placeholders == ["{name}"]


def test_unbalanced_icu_braces_are_not_treated_as_icu():
    # No closing brace: nothing to protect as a message, the text goes as is
    protected = protect("{count, plural, one {# file}")
    assert "{count, plural," not in protected.placeholders


# Round trip

def test_placeholders_may_move_when_the_language_needs_it():
    assert roundtrip("{name} has %d files", lambda t: t.replace("⟦0⟧ has ⟦1⟧ files", "⟦1⟧ archivos tiene ⟦0⟧")) == (
        "%d archivos tiene {name}"
    )


def test_tags_and_placeholders_round_trip_byte_for_byte():
    source = 'Hi <b class="x">{name}</b>, run `make` or see [docs](https://e.x/a?b=1) for **%1$s**'
    translated = roundtrip(source, lambda t: t.replace("Hi", "Hola").replace("run", "ejecuta").replace("see", "mira"))
    assert translated == (
        'Hola <b class="x">{name}</b>, ejecuta `make` or mira [docs](https://e.x/a?b=1) for **%1$s**'
    )


def test_text_that_already_looks_like_a_mask_is_protected_too():
    source = "Keep ⟦0⟧ and {name}"
    protected = protect(source)
    assert protected.placeholders == ["⟦0⟧", "{name}"]
    assert restore(protected, protected.text, segment="s") == source


# Failures

def test_a_missing_placeholder_fails_and_names_the_segment():
    error = failure("Hello {name}", "Hola", segment="greeting.title")
    assert error.segment == "greeting.title"
    assert error.missing == ["{name}"]
    assert "greeting.title" in error.message
    assert "{name}" in error.message


def test_a_changed_placeholder_fails():
    # The model translated the mask's content instead of keeping it
    error = failure("Hello {name}", "Hola {nombre}")
    assert error.missing == ["{name}"]
    assert error.unexpected == ["{nombre}"]


@pytest.mark.parametrize("source, broken", [
    ("Hello %s", "Hola %d"),
    ("%1$d of %2$s", "⟦0⟧ de %2$d"),
    ("Click <b>here</b>", "Haz clic ⟦0⟧aquí</strong>"),
    ("Run `npm test`", "Ejecuta `npm prueba`"),
    ("[docs](https://x.io)", "⟦0⟧documentos](https://y.io)"),
    ("{count, plural, one {# file} other {# files}}", "⟦0⟧ ⟦1⟧# archivo⟦3⟧ ⟦4⟧⟦5⟧ archivos⟦6⟧⟦7⟧"),
])
def test_a_changed_placeholder_fails_for_each_style(source, broken):
    error = failure(source, broken)
    assert error.missing


def test_a_duplicated_placeholder_fails():
    error = failure("Hello {name}", "Hola ⟦0⟧ ⟦0⟧")
    assert error.duplicated == ["{name}"]
    assert error.missing == []


def test_a_mask_the_source_never_had_fails():
    error = failure("Hello {name}", "Hola ⟦0⟧ ⟦7⟧")
    assert error.unexpected == ["⟦7⟧"]


def test_a_placeholder_the_model_made_up_fails():
    error = failure("Hello {name}", "Hola ⟦0⟧, tienes %d")
    assert error.unexpected == ["%d"]


def test_a_tag_closed_before_it_opens_fails():
    error = failure("Click <b>here</b>", "Haz clic ⟦1⟧aquí⟦0⟧")
    assert error.misordered == ["<b>", "</b>"]


def test_an_icu_message_whose_structure_is_shuffled_fails():
    source = "{count, plural, one {# file} other {# files}}"
    # The model swapped the closing brace of `one` with the opening of `other`
    error = failure(source, "⟦0⟧ ⟦1⟧⟦2⟧ archivo⟦4⟧ ⟦3⟧⟦5⟧ archivos⟦6⟧⟦7⟧")
    assert error.misordered


def test_markdown_link_parts_must_stay_in_order():
    error = failure("[docs](https://x.io)", "⟦1⟧documentos⟦0⟧")
    assert error.misordered == ["[", "](https://x.io)"]


def test_tags_that_are_not_pairs_may_move_freely():
    assert roundtrip("A<br>B<br/>C", lambda t: "⟦1⟧C B A⟦0⟧") == "<br/>C B A<br>"


def test_the_failure_is_a_translation_error_reported_like_a_bad_model_answer():
    error = failure("Hello {name}", "Hola", segment=3)
    assert isinstance(error, TranslationError)
    assert error.error_type == ErrorType.API_ERROR
    assert error.status_code == 500
    assert error.segment == 3
    assert "Segment 3" in error.message
    assert error.to_dict()["error"]["message"] == error.message


@pytest.mark.parametrize("source", [
    "{count, plural,",                  # ends after the header
    "{count, plural, one}",             # a selector with no branch
    "{count, plural, one {# file",      # a branch that never closes
    "{count, plural, }",                # no branch at all
])
def test_a_malformed_icu_message_is_not_masked_as_one(source):
    protected = protect(source)
    assert not any(p.startswith("{count, plural,") and p != source for p in protected.placeholders)
    assert protected.groups == []
    assert restore(protected, protected.text, segment="s") == source


@pytest.mark.parametrize("source", ["%s%s", "%d%d", "%1$d%2$d", "file%s", "150%d."])
def test_glued_printf_placeholders_round_trip(source):
    protected = protect(source)
    assert restore(protected, protected.text, segment="s") == source


@pytest.mark.parametrize("source, broken", [
    ("file%s", "archivo%d"),
    ("a%s", "a⟦0⟧%d"),
    ("150%s", "150%d"),
])
def test_a_changed_printf_placeholder_after_a_letter_or_digit_fails(source, broken):
    error = failure(source, broken)
    assert error.missing or error.unexpected
