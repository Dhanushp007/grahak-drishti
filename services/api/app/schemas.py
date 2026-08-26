import re
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from services.api.app.issue_schemas import PublicIssueResponse


class ContactInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str | None = Field(default=None, max_length=320)
    phone: str | None = Field(default=None, max_length=20)

    @model_validator(mode="after")
    def validate_contact(self) -> "ContactInput":
        if (self.email is None) == (self.phone is None):
            raise ValueError("provide exactly one email or phone")
        if self.email is not None:
            normalized_email = self.email.strip().lower()
            if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", normalized_email):
                raise ValueError("provide a valid email")
            self.email = normalized_email
        if self.phone is not None:
            normalized_phone = re.sub(r"[\s().-]", "", self.phone)
            if not re.fullmatch(r"\+?[1-9]\d{9,14}", normalized_phone):
                raise ValueError("provide a valid phone number")
            self.phone = normalized_phone
        return self

    def normalized(self) -> tuple[str, Literal["email", "phone"]]:
        if self.email is not None:
            return self.email, "email"
        assert self.phone is not None
        return self.phone, "phone"


class ComplaintCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1, max_length=5000)
    company_name: str | None = Field(default=None, max_length=200)
    amount_involved: Decimal | None = Field(
        default=None, ge=0, max_digits=12, decimal_places=2
    )
    currency: Literal["INR"] = "INR"
    contact: ContactInput

    @model_validator(mode="after")
    def normalize_text(self) -> "ComplaintCreate":
        self.description = self.description.strip()
        if not self.description:
            raise ValueError("description must not be blank")
        if self.company_name is not None:
            self.company_name = self.company_name.strip() or None
        return self


class TrackingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    docket_number: str = Field(pattern=r"^GD-[A-Z0-9]{12}$")
    contact: ContactInput


class ComplaintCreated(BaseModel):
    docket_number: str
    status: str
    submitted_at: datetime


class TimelineEvent(BaseModel):
    status: str
    label: str
    message: str
    occurred_at: datetime


class ComplaintTracking(BaseModel):
    docket_number: str
    status: str
    submitted_at: datetime
    timeline: list[TimelineEvent]


class ComplaintIntelligenceResponse(BaseModel):
    docket_number: str
    status: str
    analyzed_at: datetime
    analysis: dict[str, object]
    matched_issue: PublicIssueResponse | None = None
