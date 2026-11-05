"""
Unit tests for the review report: each flag carries the segment id, the reason, the
highest flagged severity (None for a pipeline message), and the segment's source and
best translation, so a client never parses the reason or re-splits the text.
"""
from llm_translate.review import (
    EMPTY_REVISION,
    STILL_WRONG,
    UNREADABLE_REVIEW,
    CheckedSegment,
    ReviewError,
    build_report,
)
from llm_translate.services.llm_client import Usage


def error(severity, category="meaning"):
    return ReviewError(category=category, severity=severity, explanation=f"{severity} {category} problem")


def test_a_flag_carries_its_source_and_best_translation():
    segments = [
        CheckedSegment(translation="Hola"),
        CheckedSegment(
            translation="Adiós revisado", revised=True, errors=[error("major")],
            flag=f"{STILL_WRONG}: major meaning error: major meaning problem",
        ),
    ]
    report = build_report(segments, ["/greeting", "/farewell"], ["Hello", "Bye"], "fast", Usage())
    assert [flag.model_dump() for flag in report.flags] == [{
        "segment": "/farewell",
        "reason": f"{STILL_WRONG}: major meaning error: major meaning problem",
        "severity": "major",
        "source": "Bye",
        "translation": "Adiós revisado",
    }]


def test_the_severity_is_the_highest_flagged_error():
    segment = CheckedSegment(
        translation="x", revised=True, errors=[error("minor"), error("major"), error("critical", "format")],
        flag=f"{STILL_WRONG}: ...",
    )
    assert build_report([segment], [1], ["a"], None, Usage()).flags[0].severity == "critical"


def test_an_empty_revision_flag_carries_the_first_reviews_severity():
    segment = CheckedSegment(translation="Hola", errors=[error("critical")], flag=f"{EMPTY_REVISION}: ...")
    assert build_report([segment], [1], ["Hello"], None, Usage()).flags[0].severity == "critical"


def test_a_pipeline_message_has_no_severity():
    unreadable = CheckedSegment(translation="Hola", flag=UNREADABLE_REVIEW)
    # a lost placeholder after a revision whose second review found only a minor error
    lost = CheckedSegment(translation="Adiós", errors=[error("minor")], flag="revision lost or changed a placeholder")
    report = build_report([unreadable, lost], [1, 2], ["Hello", "Bye"], None, Usage())
    assert [flag.severity for flag in report.flags] == [None, None]
    assert [flag.source for flag in report.flags] == ["Hello", "Bye"]
