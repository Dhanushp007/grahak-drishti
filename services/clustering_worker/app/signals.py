from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SignalPriority = Literal["low", "medium", "high"]


class SignalMetrics(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cluster_id: str = Field(min_length=1, max_length=36)
    reported_cases: int = Field(ge=1)
    confirmations: int = Field(ge=0)
    states_affected: int = Field(ge=0, le=36)
    financial_impact: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    growth_rate: float = Field(ge=0)
    severity: float = Field(ge=0, le=1)
    unresolved_rate: float = Field(ge=0, le=1)


class SignalComponent(BaseModel):
    name: str
    weight: float = Field(gt=0, le=1)
    normalized_value: float = Field(ge=0, le=1)
    contribution: float = Field(ge=0, le=1)


class ConsumerSignal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cluster_id: str
    reported_cases: int
    confirmations: int
    score: float = Field(ge=0, le=1)
    priority: SignalPriority
    components: list[SignalComponent] = Field(min_length=1, max_length=6)
    explanation: str


SIGNAL_WEIGHTS = {
    "affected_consumers": 0.25,
    "growth_rate": 0.20,
    "financial_impact": 0.20,
    "severity": 0.15,
    "unresolved_rate": 0.10,
    "geographic_spread": 0.10,
}


def calculate_consumer_signal(metrics: SignalMetrics) -> ConsumerSignal:
    values = {
        "affected_consumers": min(metrics.reported_cases / 10_000, 1.0),
        "growth_rate": min(metrics.growth_rate / 3.0, 1.0),
        "financial_impact": min(float(metrics.financial_impact) / 10_000_000, 1.0),
        "severity": metrics.severity,
        "unresolved_rate": metrics.unresolved_rate,
        "geographic_spread": min(metrics.states_affected / 28, 1.0),
    }
    components = [
        SignalComponent(
            name=name,
            weight=weight,
            normalized_value=values[name],
            contribution=values[name] * weight,
        )
        for name, weight in SIGNAL_WEIGHTS.items()
    ]
    score = min(1.0, sum(component.contribution for component in components))
    priority: SignalPriority = (
        "high" if score >= 0.7 else "medium" if score >= 0.4 else "low"
    )
    return ConsumerSignal(
        cluster_id=metrics.cluster_id,
        reported_cases=metrics.reported_cases,
        confirmations=metrics.confirmations,
        score=score,
        priority=priority,
        components=components,
        explanation=(
            "Priority is calculated from affected consumers, growth, financial impact, "
            "severity, unresolved rate, and geographic spread."
        ),
    )