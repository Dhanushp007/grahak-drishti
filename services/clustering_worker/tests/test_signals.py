from decimal import Decimal

from services.clustering_worker.app.signals import (
    SignalMetrics,
    calculate_consumer_signal,
)


def test_signal_score_exposes_the_weighted_breakdown() -> None:
    signal = calculate_consumer_signal(
        SignalMetrics(
            cluster_id="cluster-1",
            reported_cases=4381,
            confirmations=8712,
            states_affected=12,
            financial_impact=Decimal("3140000"),
            growth_rate=2.4,
            severity=0.8,
            unresolved_rate=0.29,
        )
    )

    assert signal.priority == "medium"
    assert round(signal.score, 3) == 0.524
    assert len(signal.components) == 6
    assert signal.components[0].name == "affected_consumers"
    assert signal.components[0].weight == 0.25
    assert "growth" in signal.explanation


def test_low_impact_signal_is_low_priority() -> None:
    signal = calculate_consumer_signal(
        SignalMetrics(
            cluster_id="cluster-2",
            reported_cases=10,
            confirmations=2,
            states_affected=1,
            financial_impact=Decimal("100"),
            growth_rate=0.05,
            severity=0.1,
            unresolved_rate=0.1,
        )
    )

    assert signal.priority == "low"
    assert signal.score < 0.4