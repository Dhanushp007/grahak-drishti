from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from services.ai.app.classifier import ComplaintAnalysis
from services.ai.app.dark_patterns import DarkPatternAnalysis

Route = Literal[
    "company_grievance_channel",
    "consumer_grievance_system",
    "ccpa_signal",
    "sector_regulator_review",
]


class RoutingRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    route: Route
    confidence: float = Field(ge=0, le=1)
    reason: str
    advisory: bool = True
    source: str


def recommend_route(
    analysis: ComplaintAnalysis, dark_pattern: DarkPatternAnalysis | None = None
) -> RoutingRecommendation:
    if dark_pattern and dark_pattern.status == "potential_concern":
        return RoutingRecommendation(
            route="ccpa_signal",
            confidence=0.6,
            reason=(
                "Potential dark pattern detected; submit an advisory signal for "
                "authorized review."
            ),
            source=dark_pattern.official_guidance,
        )
    if analysis.sector.value == "e_commerce":
        return RoutingRecommendation(
            route="company_grievance_channel",
            confidence=0.62,
            reason=(
                "Start with the company grievance channel before consumer-system "
                "escalation."
            ),
            source="Deterministic e-commerce navigation rule",
        )
    if analysis.sector.value in {"banking", "digital_payments", "telecom"}:
        return RoutingRecommendation(
            route="sector_regulator_review",
            confidence=0.5,
            reason=(
                "Sector identified; verify the applicable authorized regulator or "
                "grievance path."
            ),
            source="Deterministic sector navigation rule",
        )
    return RoutingRecommendation(
        route="consumer_grievance_system",
        confidence=0.35,
        reason=(
            "Use the consumer grievance system while an authorized analyst "
            "reviews the category."
        ),
        source="Deterministic fallback navigation rule",
    )
