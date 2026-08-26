from services.ai.app.dark_patterns import analyze_dark_pattern


def test_detects_potential_subscription_trap_with_guidance() -> None:
    result = analyze_dark_pattern(
        "Start your free trial today. Auto-renew is enabled. Cancel subscription "
        "in settings."
    )

    assert result.pattern == "subscription_trap"
    assert result.status == "potential_concern"
    assert result.confidence > 0.8
    assert result.evidence
    assert "CCPA" in result.official_guidance
    assert "violation" not in result.explanation.lower()


def test_unmatched_evidence_is_not_presented_as_a_concern() -> None:
    result = analyze_dark_pattern("Product details and shipping address")

    assert result.pattern == "none_detected"
    assert result.status == "not_detected"
