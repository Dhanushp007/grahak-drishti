import re
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from services.ai.app.duplicates import ComplaintRecord, DuplicateDecision


class IssueCluster(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cluster_id: str = Field(min_length=1, max_length=36)
    cluster_key: str = Field(min_length=1, max_length=160)
    title: str = Field(min_length=1, max_length=240)
    company_name: str | None
    sector: str
    issue: str
    reported_count: int = Field(ge=1)
    total_reported_amount: Decimal | None
    first_reported_at: datetime
    last_reported_at: datetime
    confidence: float = Field(ge=0, le=1)
    member_ids: list[str] = Field(min_length=1)


class PublicIssueCluster(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cluster_id: str
    cluster_key: str
    title: str
    company_name: str | None
    sector: str
    issue: str
    reported_count: int = Field(ge=1)
    total_reported_amount: Decimal | None
    first_reported_at: datetime
    last_reported_at: datetime


def create_issue_cluster(
    anchor: ComplaintRecord,
    candidates: list[tuple[ComplaintRecord, DuplicateDecision]],
    cluster_id: str,
) -> IssueCluster:
    records = [anchor]
    for record, decision in candidates:
        if decision.decision != "duplicate_candidate":
            raise ValueError("only duplicate candidates can join an issue cluster")
        if decision.compared_to != anchor.complaint_id:
            raise ValueError("duplicate candidate must compare to the cluster anchor")
        records.append(record)

    _validate_cluster_metadata(records)
    amounts = [record.amount_involved for record in records]
    reported_amounts = [amount for amount in amounts if amount is not None]
    issue_label = _label(anchor.analysis.issue.value)
    company_name = anchor.company_name.strip() if anchor.company_name else None
    company_key = _slug(company_name) if company_name else "UNKNOWN"
    cluster_key = f"{_slug(anchor.analysis.issue.value)}-{company_key}"
    return IssueCluster(
        cluster_id=cluster_id,
        cluster_key=cluster_key,
        title=(
            f"{issue_label} reports involving {company_name}"
            if company_name
            else f"{issue_label} reports"
        ),
        company_name=company_name,
        sector=anchor.analysis.sector.value,
        issue=anchor.analysis.issue.value,
        reported_count=len(records),
        total_reported_amount=sum(reported_amounts, Decimal(0))
        if reported_amounts
        else None,
        first_reported_at=min(record.submitted_at for record in records),
        last_reported_at=max(record.submitted_at for record in records),
        confidence=min([decision.score for _, decision in candidates] or [1.0]),
        member_ids=[record.complaint_id for record in records],
    )


def to_public_cluster(cluster: IssueCluster) -> PublicIssueCluster:
    return PublicIssueCluster(
        cluster_id=cluster.cluster_id,
        cluster_key=cluster.cluster_key,
        title=cluster.title,
        company_name=cluster.company_name,
        sector=cluster.sector,
        issue=cluster.issue,
        reported_count=cluster.reported_count,
        total_reported_amount=cluster.total_reported_amount,
        first_reported_at=cluster.first_reported_at,
        last_reported_at=cluster.last_reported_at,
    )


def _validate_cluster_metadata(records: list[ComplaintRecord]) -> None:
    anchor = records[0]
    for record in records[1:]:
        if record.company_name != anchor.company_name:
            raise ValueError("cluster records must have matching companies")
        if record.analysis.sector.value != anchor.analysis.sector.value:
            raise ValueError("cluster records must have matching sectors")
        if record.analysis.issue.value != anchor.analysis.issue.value:
            raise ValueError("cluster records must have matching issues")


def _slug(value: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "-", value.upper()).strip("-")


def _label(value: str) -> str:
    return value.replace("_", " ").capitalize()