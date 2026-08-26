from services.ai.app.classifier import ComplaintInput, classify_complaint
from services.ai.app.dark_patterns import analyze_dark_pattern
from services.routing_engine.app.routing import recommend_route


def test_dark_pattern_routes_to_an_advisory_ccpa_signal() -> None:
    analysis = classify_complaint(
        ComplaintInput(description="A subscription checkout issue.")
    )
    dark_pattern = analyze_dark_pattern("Free trial with auto-renew enabled")

    recommendation = recommend_route(analysis, dark_pattern)

    assert recommendation.route == "ccpa_signal"
    assert recommendation.advisory is True
    assert "Potential dark pattern" in recommendation.reason


def test_e_commerce_complaint_starts_with_company_grievance() -> None:
    analysis = classify_complaint(
        ComplaintInput(description="The seller has not issued my refund.")
    )

    recommendation = recommend_route(analysis)

    assert recommendation.route == "company_grievance_channel"
    assert recommendation.advisory is True
