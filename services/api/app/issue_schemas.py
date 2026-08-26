from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class PublicIssueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    cluster_id: str
    cluster_key: str
    title: str
    company_name: str | None
    sector: str
    issue: str
    reported_count: int = Field(ge=1)
    confirmations: int = Field(ge=0)
    evidence_backed_count: int = Field(default=0, ge=0)
    reviewed_count: int = Field(default=0, ge=0)
    potential_dark_pattern_count: int = Field(default=0, ge=0)
    total_reported_amount: Decimal | None
    states_affected: int = Field(ge=0)
    growth_rate: Decimal
    severity: Decimal
    unresolved_rate: Decimal
    first_reported_at: datetime
    last_reported_at: datetime
    trend: list[dict[str, object]] | None = None
    geography: list[dict[str, object]] | None = None
    routing: dict[str, object] | None = None


class IssueConfirmationResponse(BaseModel):
    cluster_key: str
    confirmations: int = Field(ge=0)
    recorded: bool


class CorroborationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    confirmation_key: str = Field(min_length=16, max_length=128)
    explanation: str | None = Field(default=None, max_length=500)


class CorroborationResponse(BaseModel):
    corroboration_id: str
    cluster_key: str
    status: str
    evidence_required: bool


class EvidenceCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    evidence_type: str = Field(min_length=3, max_length=64)
    filename: str | None = Field(default=None, max_length=200)


class EvidenceResponse(BaseModel):
    corroboration_id: str
    cluster_key: str
    status: str
    validation_status: str
    confirmations: int = Field(ge=0)
    evidence_backed_count: int = Field(ge=0)
    recorded: bool
    synthetic_flag: bool
    filename: str | None = None
    file_size_bytes: int | None = None
