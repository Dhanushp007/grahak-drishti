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
    total_reported_amount: Decimal | None
    states_affected: int = Field(ge=0)
    growth_rate: Decimal
    severity: Decimal
    unresolved_rate: Decimal
    first_reported_at: datetime
    last_reported_at: datetime


class IssueConfirmationResponse(BaseModel):
    cluster_key: str
    confirmations: int = Field(ge=0)
    recorded: bool
