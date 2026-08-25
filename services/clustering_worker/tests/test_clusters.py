from datetime import UTC, datetime, timedelta

import pytest

from services.ai.app.classifier import ComplaintInput
from services.ai.app.duplicates import build_complaint_record, detect_duplicate
from services.clustering_worker.app.clusters import (
    create_issue_cluster,
    to_public_cluster,
)


def test_duplicate_candidates_form_an_aggregate_public_cluster() -> None:
    submitted_at = datetime(2026, 1, 10, tzinfo=UTC)
    anchor = build_complaint_record(
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
    candidate = build_complaint_record(
        "complaint-2",
        ComplaintInput(
            description="Refund not received after my order was cancelled.",
            company_name="Example Seller",
            amount_involved="1000.00",
        ),
        submitted_at + timedelta(days=4),
    )
    decision = detect_duplicate(candidate, anchor)

    cluster = create_issue_cluster(anchor, [(candidate, decision)], "cluster-1")
    public_cluster = to_public_cluster(cluster)

    assert cluster.cluster_key == "REFUND-DELAY-EXAMPLE-SELLER"
    assert cluster.title == "Refund delay reports involving Example Seller"
    assert cluster.reported_count == 2
    assert cluster.total_reported_amount == 2499
    assert cluster.member_ids == ["complaint-1", "complaint-2"]
    assert public_cluster.reported_count == 2
    assert "member_ids" not in public_cluster.model_dump()
    assert "description" not in public_cluster.model_dump()


def test_non_duplicate_candidate_cannot_join_cluster() -> None:
    record = build_complaint_record(
        "complaint-1",
        ComplaintInput(description="Refund has not arrived.", company_name="Seller"),
    )

    with pytest.raises(ValueError, match="only duplicate candidates"):
        create_issue_cluster(
            record,
            [
                (
                    record,
                    detect_duplicate(record, record).model_copy(
                        update={"decision": "related_candidate"}
                    ),
                )
            ],
            "cluster-1",
        )


def test_mismatched_company_cannot_join_cluster() -> None:
    anchor = build_complaint_record(
        "complaint-1",
        ComplaintInput(
            description="Refund has not arrived.", company_name="Seller A"
        ),
    )
    candidate = build_complaint_record(
        "complaint-2",
        ComplaintInput(
            description="Refund has not arrived.", company_name="Seller B"
        ),
    )
    decision = detect_duplicate(candidate, anchor).model_copy(
        update={"decision": "duplicate_candidate"}
    )

    with pytest.raises(ValueError, match="matching companies"):
        create_issue_cluster(anchor, [(candidate, decision)], "cluster-1")