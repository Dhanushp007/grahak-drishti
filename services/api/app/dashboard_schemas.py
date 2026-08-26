from pydantic import BaseModel, ConfigDict, Field

from services.api.app.issue_schemas import PublicIssueResponse


class DashboardKpi(BaseModel):
    label: str
    value: int = Field(ge=0)
    change: str
    tone: str


class DashboardOverview(BaseModel):
    model_config = ConfigDict(extra="forbid")

    as_of: str
    data_label: str
    kpis: list[DashboardKpi]
    issues: list[PublicIssueResponse]
    signal_strength: int = Field(ge=0, le=100)
    synthetic_notice: str


class GeographyPoint(BaseModel):
    state: str
    reports: int = Field(ge=0)
    evidence_backed: int = Field(ge=0)
    share: int = Field(ge=0, le=100)


class GeographyResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data_label: str
    issue_filter: str | None = None
    states: list[GeographyPoint]
