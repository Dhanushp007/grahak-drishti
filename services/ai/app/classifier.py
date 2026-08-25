import re
from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ModelSource = Literal["deterministic_rules"]
AnalysisStatus = Literal["classified", "needs_review"]


class ComplaintInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1, max_length=5000)
    company_name: str | None = Field(default=None, max_length=200)
    amount_involved: Decimal | None = Field(
        default=None, ge=0, max_digits=12, decimal_places=2
    )
    evidence_types: list[str] = Field(default_factory=list, max_length=20)


class ClassifiedField(BaseModel):
    value: str
    confidence: float = Field(ge=0, le=1)
    evidence: list[str] = Field(min_length=1, max_length=5)


class AnalysisProvenance(BaseModel):
    source: ModelSource
    model_id: str
    prompt_version: str
    analyzed_at: datetime


class ComplaintAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    company_name: str | None
    sector: ClassifiedField
    issue: ClassifiedField
    severity: ClassifiedField
    financial_impact: Decimal | None
    evidence_types: list[str]
    potential_authority: ClassifiedField
    duplicate_hint: ClassifiedField
    status: AnalysisStatus
    provenance: AnalysisProvenance


Rule = tuple[str, tuple[str, ...], str, float]

SECTOR_RULES: tuple[Rule, ...] = (
    (
        "e_commerce",
        ("order", "delivery", "refund", "seller", "product"),
        "e-commerce",
        0.9,
    ),
    (
        "digital_payments",
        ("upi", "wallet", "payment", "transaction"),
        "digital payments",
        0.88,
    ),
    (
        "banking",
        ("bank", "account", "charge", "debit", "credit"),
        "banking",
        0.84,
    ),
    (
        "telecom",
        ("mobile", "recharge", "broadband", "telecom", "network"),
        "telecom",
        0.84,
    ),
)

ISSUE_RULES: tuple[Rule, ...] = (
    (
        "refund_delay",
        ("refund", "money back", "not returned", "return my money"),
        "refund delay",
        0.94,
    ),
    (
        "delivery_failure",
        ("delivery", "delivered", "shipment", "order not received"),
        "delivery problem",
        0.88,
    ),
    (
        "warranty_service",
        ("warranty", "repair", "service center", "replacement"),
        "warranty or service issue",
        0.88,
    ),
    (
        "payment_problem",
        ("payment", "charged", "debited", "transaction", "upi"),
        "payment problem",
        0.86,
    ),
    (
        "hidden_charge",
        ("hidden charge", "extra charge", "convenience fee", "unexpected fee"),
        "potential hidden charge",
        0.91,
    ),
    (
        "subscription_issue",
        ("subscription", "auto-renew", "autorenew", "cancel membership"),
        "subscription issue",
        0.91,
    ),
    (
        "counterfeit_product",
        ("fake product", "counterfeit", "duplicate product", "not genuine"),
        "potential counterfeit product",
        0.92,
    ),
)

SEVERITY_RULES: tuple[tuple[str, tuple[str, ...], float], ...] = (
    ("critical", ("fraud", "stolen", "identity theft", "threat"), 0.9),
    ("high", ("large amount", "repeated", "multiple times", "legal notice"), 0.8),
    ("medium", ("blocked", "charged", "not received", "not returned"), 0.72),
)


def _match_rule(
    text: str, rules: tuple[Rule, ...], fallback_value: str, fallback_label: str
) -> ClassifiedField:
    for value, keywords, label, confidence in rules:
        matches = [keyword for keyword in keywords if keyword in text]
        if matches:
            return ClassifiedField(
                value=value,
                confidence=confidence,
                evidence=[f"Matched phrase: {match}" for match in matches[:3]],
            )
    return ClassifiedField(
        value=fallback_value,
        confidence=0.25,
        evidence=[fallback_label],
    )


def _severity(text: str) -> ClassifiedField:
    for value, keywords, confidence in SEVERITY_RULES:
        matches = [keyword for keyword in keywords if keyword in text]
        if matches:
            return ClassifiedField(
                value=value,
                confidence=confidence,
                evidence=[f"Matched phrase: {match}" for match in matches[:3]],
            )
    return ClassifiedField(
        value="low",
        confidence=0.55,
        evidence=["No high-severity phrase matched"],
    )


def _authority(issue: ClassifiedField, sector: ClassifiedField) -> ClassifiedField:
    if issue.confidence < 0.5 or sector.confidence < 0.5:
        return ClassifiedField(
            value="unknown",
            confidence=0.2,
            evidence=["Classification confidence is too low for a routing hint"],
        )
    if sector.value == "e_commerce":
        return ClassifiedField(
            value="company_grievance_channel_or_consumer_grievance_system",
            confidence=0.62,
            evidence=[
                "E-commerce issue requires company-first or consumer grievance review"
            ],
        )
    return ClassifiedField(
        value="consumer_grievance_system_or_sector_review",
        confidence=0.5,
        evidence=[
            f"Sector identified as {sector.value}; authoritative routing is deferred"
        ],
    )


def classify_complaint(payload: ComplaintInput) -> ComplaintAnalysis:
    normalized = re.sub(r"\s+", " ", payload.description.strip().lower())
    sector = _match_rule(
        normalized, SECTOR_RULES, "other", "No supported sector phrase matched"
    )
    issue = _match_rule(
        normalized, ISSUE_RULES, "other", "No supported issue phrase matched"
    )
    severity = _severity(normalized)
    minimum_confidence = min(sector.confidence, issue.confidence)
    duplicate_hint = ClassifiedField(
        value="candidate" if minimum_confidence >= 0.5 else "not_enough_information",
        confidence=minimum_confidence,
        evidence=[
            "Semantic similarity and metadata checks are required before "
            "duplicate classification"
        ],
    )
    return ComplaintAnalysis(
        company_name=payload.company_name.strip() if payload.company_name else None,
        sector=sector,
        issue=issue,
        severity=severity,
        financial_impact=payload.amount_involved,
        evidence_types=payload.evidence_types,
        potential_authority=_authority(issue, sector),
        duplicate_hint=duplicate_hint,
        status="classified" if minimum_confidence >= 0.5 else "needs_review",
        provenance=AnalysisProvenance(
            source="deterministic_rules",
            model_id="rules-complaint-understanding-v1",
            prompt_version="not_applicable",
            analyzed_at=datetime.now(UTC),
        ),
    )
