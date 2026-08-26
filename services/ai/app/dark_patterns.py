from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

PatternType = Literal[
    "false_urgency",
    "basket_sneaking",
    "confirm_shaming",
    "subscription_trap",
    "deceptive_interface",
    "none_detected",
]


class DarkPatternAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pattern: PatternType
    confidence: float = Field(ge=0, le=1)
    explanation: str
    evidence: list[str] = Field(min_length=1, max_length=5)
    official_guidance: str
    status: Literal["potential_concern", "not_detected", "needs_review"]


PATTERN_RULES: tuple[tuple[PatternType, tuple[str, ...], str, str, float], ...] = (
    (
        "false_urgency",
        ("only 1 left", "ends in", "hurry", "limited time", "last chance"),
        "The interface may create pressure through urgency or scarcity language.",
        (
            "CCPA dark-pattern guidance: false urgency should be reviewed against "
            "the interface context."
        ),
        0.88,
    ),
    (
        "basket_sneaking",
        ("added to your cart", "preselected", "insurance added", "protection plan"),
        (
            "An additional product or service may be added without a clear "
            "affirmative choice."
        ),
        "CCPA dark-pattern guidance: review unexpected additions and consent controls.",
        0.86,
    ),
    (
        "confirm_shaming",
        (
            "no, i hate saving",
            "no thanks, i don't care",
            "are you sure you want to miss",
        ),
        (
            "The interface may use emotionally loaded language to steer a "
            "consumer's choice."
        ),
        "CCPA dark-pattern guidance: review coercive or manipulative choice language.",
        0.9,
    ),
    (
        "subscription_trap",
        ("free trial", "auto-renew", "autorenew", "cancel subscription", "recurring"),
        "Subscription terms or cancellation controls may not be sufficiently clear.",
        (
            "CCPA dark-pattern guidance: review recurring billing disclosure and "
            "cancellation flow."
        ),
        0.87,
    ),
)


def analyze_dark_pattern(evidence_text: str) -> DarkPatternAnalysis:
    normalized = " ".join(evidence_text.lower().split())
    for pattern, keywords, explanation, guidance, confidence in PATTERN_RULES:
        matches = [keyword for keyword in keywords if keyword in normalized]
        if matches:
            return DarkPatternAnalysis(
                pattern=pattern,
                confidence=confidence,
                explanation=explanation,
                evidence=[f"Matched evidence text: {match}" for match in matches[:3]],
                official_guidance=guidance,
                status="potential_concern",
            )
    return DarkPatternAnalysis(
        pattern="none_detected",
        confidence=0.35,
        explanation=(
            "No supported dark-pattern phrase was detected in the supplied "
            "evidence."
        ),
        evidence=["No supported pattern phrase matched"],
        official_guidance=(
            "No specific guidance reference selected; human review may still be "
            "appropriate."
        ),
        status="not_detected",
    )
