from datetime import UTC, datetime, timedelta

from services.ai.app.classifier import ComplaintInput
from services.ai.app.duplicates import build_complaint_record, detect_duplicate


def test_same_company_refunds_become_duplicate_candidates() -> None:
    submitted_at = datetime(2026, 1, 10, tzinfo=UTC)
    first = build_complaint_record(
        "complaint-1",
        ComplaintInput(
            description=(
                "The seller cancelled my laptop order but the refund has not arrived."
            ),
            company_name="Example Seller",
            amount_involved="1499.00",
        ),
        submitted_at,
    )
    second = build_complaint_record(
        "complaint-2",
        ComplaintInput(
            description="Refund not received after my order was cancelled.",
            company_name=" example seller ",
            amount_involved="1499.00",
        ),
        submitted_at + timedelta(days=4),
    )

    decision = detect_duplicate(second, first)

    assert decision.decision == "duplicate_candidate"
    assert decision.compared_to == "complaint-1"
    assert decision.score >= 0.55
    assert len(decision.reasons) == 6


def test_different_company_does_not_become_a_duplicate() -> None:
    submitted_at = datetime(2026, 1, 10, tzinfo=UTC)
    first = build_complaint_record(
        "complaint-1",
        ComplaintInput(
            description="Refund has not arrived after cancellation.",
            company_name="First Seller",
        ),
        submitted_at,
    )
    second = build_complaint_record(
        "complaint-2",
        ComplaintInput(
            description="Refund has not arrived after cancellation.",
            company_name="Second Seller",
        ),
        submitted_at,
    )

    decision = detect_duplicate(second, first)

    assert decision.decision != "duplicate_candidate"
    assert decision.reasons[1] == "Company metadata match: 0.00"


def test_low_confidence_records_require_human_review() -> None:
    first = build_complaint_record(
        "complaint-1", ComplaintInput(description="Something happened.")
    )
    second = build_complaint_record(
        "complaint-2", ComplaintInput(description="Something else.")
    )

    decision = detect_duplicate(second, first)

    assert decision.decision == "needs_review"


def test_old_complaints_are_not_duplicate_candidates_without_metadata_support() -> None:
    first = build_complaint_record(
        "complaint-1",
        ComplaintInput(
            description="The delivery of my product failed.", company_name="Seller"
        ),
        datetime(2025, 1, 1, tzinfo=UTC),
    )
    second = build_complaint_record(
        "complaint-2",
        ComplaintInput(
            description="The delivery of my product failed.",
            company_name="Other Seller",
        ),
        datetime(2026, 1, 1, tzinfo=UTC),
    )

    decision = detect_duplicate(second, first)

    assert decision.decision != "duplicate_candidate"
    assert decision.reasons[4] == "Time-window match: 0.00"
