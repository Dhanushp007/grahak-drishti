import re
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class IntakeModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class FieldProvenance(IntakeModel):
    source: Literal["consumer", "assistant", "manual", "derived", "system"] = (
        "consumer"
    )
    confidence: float = Field(default=1.0, ge=0, le=1)
    evidence: list[str] = Field(default_factory=list, max_length=20)
    needs_review: bool = False
    note: str | None = Field(default=None, max_length=500)


class IntakeComplaint(IntakeModel):
    docket_number: str | None = Field(default=None, max_length=24)
    description: str | None = Field(default=None, max_length=5000)
    language: Literal["en", "hi", "te", "ta", "ml", "kn", "bn", "auto"] | None = None
    source_channel: Literal["voice", "web", "text"] = "voice"
    submitted_at: datetime | None = None
    self_assessed_priority: str | None = Field(default=None, max_length=32)

    @field_validator("language", mode="before")
    @classmethod
    def normalize_language(cls, value: str | None) -> str | None:
        if value is None:
            return None
        aliases = {
            "english": "en",
            "en": "en",
            "hindi": "hi",
            "hi": "hi",
            "telugu": "te",
            "te": "te",
            "tamil": "ta",
            "ta": "ta",
            "malayalam": "ml",
            "ml": "ml",
            "kannada": "kn",
            "kn": "kn",
            "bengali": "bn",
            "bangla": "bn",
            "bn": "bn",
            "auto": "auto",
        }
        if isinstance(value, str):
            return aliases.get(value.strip().lower(), value)
        return value


class IntakeContact(IntakeModel):
    email: str | None = Field(default=None, max_length=320)
    phone: str | None = Field(default=None, max_length=20)
    preferred_method: Literal["email", "phone"] | None = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        return value.strip().lower() if value else None

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        return re.sub(r"[\s().-]", "", value) if value else None


class IntakeAddress(IntakeModel):
    line1: str | None = Field(default=None, max_length=200)
    line2: str | None = Field(default=None, max_length=200)
    city: str | None = Field(default=None, max_length=100)
    district: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=80)
    postal_code: str | None = Field(default=None, max_length=12)


class IntakeConsumer(IntakeModel):
    consumer_type: str | None = Field(default=None, max_length=40)
    full_name: str | None = Field(default=None, max_length=160)
    contact: IntakeContact = Field(default_factory=IntakeContact)
    address: IntakeAddress = Field(default_factory=IntakeAddress)


class IntakeIncident(IntakeModel):
    sector: str | None = Field(default=None, max_length=80)
    category: str | None = Field(default=None, max_length=120)
    subcategory: str | None = Field(default=None, max_length=160)
    occurred_on: date | None = None
    discovered_on: date | None = None
    date_precision: str | None = Field(default=None, max_length=32)
    is_recurring: bool | None = None
    urgency: str | None = Field(default=None, max_length=32)
    what_was_promised: str | None = Field(default=None, max_length=3000)
    what_happened: str | None = Field(default=None, max_length=5000)


class IntakeBusiness(IntakeModel):
    company_name: str | None = Field(default=None, max_length=200)
    seller_name: str | None = Field(default=None, max_length=200)
    marketplace_or_channel: str | None = Field(default=None, max_length=200)
    website_or_app: str | None = Field(default=None, max_length=300)
    business_location: str | None = Field(default=None, max_length=200)


class IntakeTransaction(IntakeModel):
    product_or_service: str | None = Field(default=None, max_length=300)
    product_identifier: str | None = Field(default=None, max_length=120)
    order_reference: str | None = Field(default=None, max_length=120)
    invoice_reference: str | None = Field(default=None, max_length=120)
    booking_or_policy_reference: str | None = Field(default=None, max_length=120)
    transaction_date: date | None = None
    delivery_date: date | None = None
    cancellation_date: date | None = None
    order_status: str | None = Field(default=None, max_length=64)
    delivery_status: str | None = Field(default=None, max_length=64)
    amount_paid: Decimal | None = Field(
        default=None, ge=0, max_digits=12, decimal_places=2
    )
    amount_disputed: Decimal | None = Field(
        default=None, ge=0, max_digits=12, decimal_places=2
    )
    refund_expected: Decimal | None = Field(
        default=None, ge=0, max_digits=12, decimal_places=2
    )
    refund_received: Decimal | None = Field(
        default=None, ge=0, max_digits=12, decimal_places=2
    )
    remaining_loss: Decimal | None = Field(
        default=None, ge=0, max_digits=12, decimal_places=2
    )
    currency: Literal["INR"] = "INR"
    payment_method: str | None = Field(default=None, max_length=64)
    payment_reference_last_four: str | None = Field(default=None, max_length=4)
    reference_verification_status: str | None = Field(default=None, max_length=64)


class ResolutionAttempt(IntakeModel):
    attempted_on: date | None = None
    channel: str | None = Field(default=None, max_length=64)
    ticket_reference: str | None = Field(default=None, max_length=120)
    response_received: bool | None = None
    response_summary: str | None = Field(default=None, max_length=1500)
    outcome: str | None = Field(default=None, max_length=64)


class RequestedRemedy(IntakeModel):
    primary: str | None = Field(default=None, max_length=80)
    amount_requested: Decimal | None = Field(
        default=None, ge=0, max_digits=12, decimal_places=2
    )
    other_requests: list[str] = Field(default_factory=list, max_length=20)
    compensation_requested: bool | None = None


class Escalation(IntakeModel):
    previous_authorities_contacted: list[str] = Field(
        default_factory=list, max_length=20
    )
    preferred_next_step: str | None = Field(default=None, max_length=100)
    nch_reference: str | None = Field(default=None, max_length=120)
    regulator_reference: str | None = Field(default=None, max_length=120)
    e_jagriti_reference: str | None = Field(default=None, max_length=120)
    official_escalation_requested: bool = False


class IntakeEvidence(IntakeModel):
    evidence_id: str | None = Field(default=None, max_length=120)
    evidence_type: str | None = Field(default=None, max_length=80)
    filename: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=1500)
    storage_key: str | None = Field(default=None, max_length=300)
    content_type: str | None = Field(default=None, max_length=120)
    file_size_bytes: int | None = Field(default=None, ge=0)
    sha256: str | None = Field(default=None, max_length=64)
    synthetic_flag: bool = False
    review_status: str | None = Field(default=None, max_length=64)
    redaction_status: str | None = Field(default=None, max_length=64)


class IntakeConsents(IntakeModel):
    privacy_notice_version: str | None = Field(default=None, max_length=64)
    case_processing: bool = False
    aggregate_intelligence: bool = False
    share_with_official_authority: bool = False
    accepted_at: datetime | None = None


class IntakeDataQuality(IntakeModel):
    reported_by: str = Field(default="consumer", max_length=40)
    verification_status: str = Field(default="unverified", max_length=64)
    legal_finding: bool = False
    notes: str | None = Field(default=None, max_length=1000)


class IntakeDraft(IntakeModel):
    schema_version: Literal["complaint-intake.v1"] = "complaint-intake.v1"
    record_type: Literal["complaint_intake_payload"] = "complaint_intake_payload"
    synthetic_flag: bool = False
    environment: str | None = Field(default=None, max_length=64)
    provider: str | None = Field(default=None, max_length=32)
    model: str | None = Field(default=None, max_length=120)
    complaint: IntakeComplaint = Field(default_factory=IntakeComplaint)
    consumer: IntakeConsumer = Field(default_factory=IntakeConsumer)
    incident: IntakeIncident = Field(default_factory=IntakeIncident)
    business: IntakeBusiness = Field(default_factory=IntakeBusiness)
    transaction: IntakeTransaction = Field(default_factory=IntakeTransaction)
    resolution_attempts: list[ResolutionAttempt] = Field(
        default_factory=list, max_length=20
    )
    requested_remedy: RequestedRemedy = Field(default_factory=RequestedRemedy)
    escalation: Escalation = Field(default_factory=Escalation)
    evidence: list[IntakeEvidence] = Field(default_factory=list, max_length=20)
    consents: IntakeConsents = Field(default_factory=IntakeConsents)
    data_quality: IntakeDataQuality = Field(default_factory=IntakeDataQuality)
    provenance: dict[str, FieldProvenance] = Field(default_factory=dict)

    def missing_required_fields(self) -> list[str]:
        missing: list[str] = []
        description = (self.complaint.description or "").strip()
        what_happened = (self.incident.what_happened or "").strip()
        if not (description or what_happened):
            missing.append("complaint.description")
        if not (self.consumer.contact.email or self.consumer.contact.phone):
            missing.append("consumer.contact")
        if not self.consents.case_processing:
            missing.append("consents.case_processing")
        return missing


_PATCH_PATH_PATTERN = re.compile(
    r"^(complaint|consumer|incident|business|transaction|resolution_attempts|"
    r"requested_remedy|escalation|evidence|consents|data_quality|provenance)"
    r"(?:\.[a-z][a-z0-9_]*|\[\d+\])*$"
)
_SYSTEM_PATCH_PATHS = {"complaint.docket_number", "complaint.submitted_at"}


class IntakePatch(IntakeModel):
    operation: Literal["set", "append", "remove"] = "set"
    path: str = Field(min_length=1, max_length=160)
    value: Any = None

    @field_validator("path")
    @classmethod
    def validate_path(cls, value: str) -> str:
        if not _PATCH_PATH_PATTERN.fullmatch(value):
            raise ValueError("path is not an allowed intake field")
        if value in _SYSTEM_PATCH_PATHS:
            raise ValueError("system fields cannot be changed in a draft patch")
        if value.startswith("provenance") and value.count(".") < 2:
            raise ValueError("provenance patches must target a field")
        return value


class IntakeNormalizeRequest(IntakeModel):
    draft: IntakeDraft
    transcript: str | None = Field(default=None, max_length=30000)
    language_hint: Literal["auto", "en", "hi", "te", "ta", "ml", "kn", "bn"] = "auto"

    @field_validator("language_hint", mode="before")
    @classmethod
    def normalize_language_hint(cls, value: str) -> str:
        aliases = {
            "english": "en",
            "en": "en",
            "hindi": "hi",
            "hi": "hi",
            "telugu": "te",
            "te": "te",
            "tamil": "ta",
            "ta": "ta",
            "malayalam": "ml",
            "ml": "ml",
            "kannada": "kn",
            "kn": "kn",
            "bengali": "bn",
            "bangla": "bn",
            "bn": "bn",
            "auto": "auto",
        }
        if isinstance(value, str):
            return aliases.get(value.strip().lower(), value)
        return value


class IntakeNormalizeResponse(IntakeModel):
    status: Literal[
        "ok", "needs_review", "provider_unavailable", "invalid_provider_output"
    ]
    draft: IntakeDraft
    missing_required: list[str] = Field(default_factory=list)
    provider: str = "gemini"
    model: str | None = None


class LiveTokenResponse(IntakeModel):
    token: str
    model: str
    expires_at: datetime
    new_session_expires_at: datetime