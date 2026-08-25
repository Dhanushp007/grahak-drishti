from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from services.ai.app.classifier import (
    ComplaintAnalysis,
    ComplaintInput,
    classify_complaint,
)
from services.ai.app.embeddings import (
    DeterministicEmbeddingProvider,
    EmbeddingProvider,
    EmbeddingResult,
    cosine_similarity,
)

DuplicateDecisionType = Literal[
    "duplicate_candidate", "related_candidate", "not_duplicate", "needs_review"
]


class ComplaintRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    complaint_id: str = Field(min_length=1, max_length=36)
    description: str = Field(min_length=1, max_length=5000)
    company_name: str | None = Field(default=None, max_length=200)
    amount_involved: Decimal | None = Field(
        default=None, ge=0, max_digits=12, decimal_places=2
    )
    submitted_at: datetime
    analysis: ComplaintAnalysis
    embedding: EmbeddingResult


class DuplicateDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decision: DuplicateDecisionType
    score: float = Field(ge=0, le=1)
    compared_to: str
    semantic_similarity: float = Field(ge=-1, le=1)
    metadata_score: float = Field(ge=0, le=1)
    reasons: list[str] = Field(min_length=1, max_length=10)


def build_complaint_record(
    complaint_id: str,
    payload: ComplaintInput,
    submitted_at: datetime | None = None,
    provider: EmbeddingProvider | None = None,
) -> ComplaintRecord:
    embedding_provider = provider or DeterministicEmbeddingProvider()
    return ComplaintRecord(
        complaint_id=complaint_id,
        description=payload.description,
        company_name=payload.company_name,
        amount_involved=payload.amount_involved,
        submitted_at=submitted_at or datetime.now(UTC),
        analysis=classify_complaint(payload),
        embedding=embedding_provider.embed(payload.description),
    )


def detect_duplicate(
    candidate: ComplaintRecord, existing: ComplaintRecord
) -> DuplicateDecision:
    semantic_similarity = cosine_similarity(candidate.embedding, existing.embedding)
    company_match = _company_match(candidate.company_name, existing.company_name)
    sector_match = _value_match(
        candidate.analysis.sector.value, existing.analysis.sector.value
    )
    issue_match = _value_match(
        candidate.analysis.issue.value, existing.analysis.issue.value
    )
    time_match = _time_match(candidate.submitted_at, existing.submitted_at)
    amount_match = _amount_match(candidate.amount_involved, existing.amount_involved)
    metadata_score = (
        company_match * 0.4
        + sector_match * 0.2
        + issue_match * 0.2
        + time_match * 0.1
        + amount_match * 0.1
    )
    score = max(0.0, min(1.0, semantic_similarity * 0.6 + metadata_score * 0.4))
    reasons = [
        f"Semantic similarity: {semantic_similarity:.2f}",
        f"Company metadata match: {company_match:.2f}",
        f"Sector metadata match: {sector_match:.2f}",
        f"Issue metadata match: {issue_match:.2f}",
        f"Time-window match: {time_match:.2f}",
        f"Monetary context match: {amount_match:.2f}",
    ]

    if (
        candidate.analysis.status == "needs_review"
        or existing.analysis.status == "needs_review"
    ):
        decision: DuplicateDecisionType = "needs_review"
    elif (
        semantic_similarity >= 0.25
        and score >= 0.55
        and time_match > 0
        and _metadata_is_compatible(candidate, existing)
    ):
        decision = "duplicate_candidate"
    elif semantic_similarity >= 0.35 and score >= 0.55:
        decision = "related_candidate"
    else:
        decision = "not_duplicate"

    return DuplicateDecision(
        decision=decision,
        score=score,
        compared_to=existing.complaint_id,
        semantic_similarity=semantic_similarity,
        metadata_score=metadata_score,
        reasons=reasons,
    )


def _company_match(left: str | None, right: str | None) -> float:
    if not left or not right:
        return 0.0
    return (
        1.0
        if " ".join(left.lower().split()) == " ".join(right.lower().split())
        else 0.0
    )


def _value_match(left: str, right: str) -> float:
    return 1.0 if left == right and left != "other" else 0.0


def _time_match(left: datetime, right: datetime) -> float:
    difference_days = abs((left - right).total_seconds()) / 86400
    if difference_days <= 30:
        return 1.0
    if difference_days <= 90:
        return 0.5
    return 0.0


def _amount_match(left: Decimal | None, right: Decimal | None) -> float:
    if left is None or right is None:
        return 0.5
    if left == right:
        return 1.0
    larger = max(left, right)
    difference = abs(left - right) / larger if larger else Decimal(0)
    if difference <= Decimal("0.10"):
        return 1.0
    if difference <= Decimal("0.50"):
        return 0.5
    return 0.0


def _metadata_is_compatible(
    candidate: ComplaintRecord, existing: ComplaintRecord
) -> bool:
    same_company = _company_match(candidate.company_name, existing.company_name) == 1.0
    same_sector = (
        _value_match(candidate.analysis.sector.value, existing.analysis.sector.value)
        == 1.0
    )
    same_issue = (
        _value_match(candidate.analysis.issue.value, existing.analysis.issue.value)
        == 1.0
    )
    return same_company and same_sector and same_issue
