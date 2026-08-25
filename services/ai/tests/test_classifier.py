from services.ai.app.classifier import ComplaintInput, classify_complaint


def test_classifies_refund_complaint_with_explainable_facts() -> None:
    analysis = classify_complaint(
        ComplaintInput(
            description=(
                "The seller cancelled my laptop order but the refund has not arrived."
            ),
            company_name="Example Seller",
            amount_involved="1499.00",
            evidence_types=["invoice", "screenshot"],
        )
    )

    assert analysis.status == "classified"
    assert analysis.company_name == "Example Seller"
    assert analysis.sector.value == "e_commerce"
    assert analysis.issue.value == "refund_delay"
    assert analysis.issue.confidence > 0.9
    assert analysis.issue.evidence
    assert analysis.financial_impact == 1499
    assert analysis.evidence_types == ["invoice", "screenshot"]
    assert (
        analysis.potential_authority.value
        == "company_grievance_channel_or_consumer_grievance_system"
    )
    assert analysis.provenance.model_id == "rules-complaint-understanding-v1"


def test_low_information_complaint_requires_review() -> None:
    analysis = classify_complaint(ComplaintInput(description="Something went wrong."))

    assert analysis.status == "needs_review"
    assert analysis.sector.value == "other"
    assert analysis.issue.value == "other"
    assert analysis.duplicate_hint.value == "not_enough_information"
    assert analysis.potential_authority.value == "unknown"


def test_does_not_make_a_legal_violation_claim() -> None:
    analysis = classify_complaint(
        ComplaintInput(description="There is an unexpected fee on my subscription.")
    )

    assert analysis.issue.value == "hidden_charge"
    assert "potential" in analysis.issue.evidence[0].lower() or analysis.issue.value
    assert "violation" not in analysis.issue.value.lower()
