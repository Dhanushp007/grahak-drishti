import hashlib
import hmac
import re
from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from services.ai.app.classifier import (
    ComplaintAnalysis,
    ComplaintInput,
    classify_complaint,
)
from services.ai.app.dark_patterns import analyze_dark_pattern
from services.api.app.config import get_settings
from services.api.app.issue_schemas import CorroborationCreate, EvidenceCreate
from services.api.app.models import (
    Complaint,
    ComplaintAnalysisRecord,
    ComplaintStatusEvent,
    CorroborationRecord,
    EvidenceRecord,
    IssueClusterRecord,
)
from services.routing_engine.app.routing import recommend_route


class CorroborationNotFoundError(Exception):
    pass


def _as_int(value: object) -> int:
    return int(value) if isinstance(value, (int, float, str)) else 0


def _confirmation_digest(value: str) -> str:
    secret = get_settings().contact_hash_secret.encode()
    return hmac.new(secret, value.strip().encode(), hashlib.sha256).hexdigest()


def _slug(value: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "-", value.upper()).strip("-")


def _find_matching_cluster(
    session: Session, issue: str, company_name: str | None
) -> IssueClusterRecord | None:
    if company_name:
        exact_key = f"{_slug(issue)}-{_slug(company_name)}"
        exact = session.scalar(
            select(IssueClusterRecord).where(
                IssueClusterRecord.cluster_key == exact_key
            )
        )
        if exact is not None:
            return exact
    return session.scalar(
        select(IssueClusterRecord)
        .where(IssueClusterRecord.issue == issue)
        .order_by(IssueClusterRecord.reported_count.desc())
    )


def _create_issue_cluster(
    session: Session, complaint: Complaint, analysis: ComplaintAnalysis
) -> IssueClusterRecord:
    issue_value = analysis.issue.value
    company_name = analysis.company_name
    company_key = _slug(company_name) if company_name else "UNKNOWN"
    issue_key = _slug(issue_value)
    now = complaint.submitted_at
    amount = complaint.amount_involved
    cluster = IssueClusterRecord(
        cluster_id=str(uuid4()),
        cluster_key=f"{issue_key}-{company_key}",
        title=(
            f"{issue_value.replace('_', ' ').capitalize()} reports involving "
            f"{company_name}"
            if company_name
            else f"{issue_value.replace('_', ' ').capitalize()} reports"
        ),
        company_name=company_name,
        sector=analysis.sector.value,
        issue=issue_value,
        reported_count=1,
        confirmations=0,
        evidence_backed_count=0,
        reviewed_count=0,
        total_reported_amount=amount,
        states_affected=0,
        growth_rate=0,
        severity=Decimal(str(analysis.severity.confidence)),
        unresolved_rate=1,
        first_reported_at=now,
        last_reported_at=now,
        trend=[{"month": now.strftime("%b"), "reports": 1}],
        geography=(
            [{"state": complaint.state, "reports": 1, "evidence_backed": 0}]
            if complaint.state
            else []
        ),
        routing=None,
    )
    session.add(cluster)
    return cluster


def _update_cluster_aggregates(
    cluster: IssueClusterRecord, complaint: Complaint
) -> None:
    if complaint.state:
        geography = list(cluster.geography or [])
        state_point = next(
            (point for point in geography if point.get("state") == complaint.state),
            None,
        )
        if state_point is None:
            geography.append(
                {"state": complaint.state, "reports": 1, "evidence_backed": 0}
            )
        else:
            state_point["reports"] = _as_int(state_point.get("reports", 0)) + 1
        cluster.geography = geography
        cluster.states_affected = len(geography)
    trend = list(cluster.trend or [])
    month = complaint.submitted_at.strftime("%b")
    month_point = next(
        (point for point in trend if point.get("month") == month), None
    )
    if month_point is None:
        trend.append({"month": month, "reports": 1})
    else:
        month_point["reports"] = _as_int(month_point.get("reports", 0)) + 1
    cluster.trend = trend


def analyze_complaint(
    session: Session, complaint: Complaint
) -> tuple[ComplaintAnalysisRecord, IssueClusterRecord | None]:
    existing = session.scalar(
        select(ComplaintAnalysisRecord).where(
            ComplaintAnalysisRecord.complaint_id == complaint.id
        )
    )
    if existing is not None:
        cluster = (
            session.scalar(
                select(IssueClusterRecord).where(
                    IssueClusterRecord.cluster_key == existing.cluster_key
                )
            )
            if existing.cluster_key
            else None
        )
        return existing, cluster

    analysis = classify_complaint(
        ComplaintInput(
            description=complaint.description,
            company_name=complaint.company_name,
            amount_involved=complaint.amount_involved,
        )
    )
    dark_pattern = analyze_dark_pattern(complaint.description)
    cluster = _find_matching_cluster(
        session, analysis.issue.value, analysis.company_name
    )
    created_cluster = False
    if cluster is None:
        cluster = _create_issue_cluster(session, complaint, analysis)
        created_cluster = True
    if dark_pattern.status == "potential_concern":
        cluster.potential_dark_pattern_count += 1
    routing = recommend_route(analysis, dark_pattern)
    now = datetime.now(UTC)
    record = ComplaintAnalysisRecord(
        id=str(uuid4()),
        complaint_id=complaint.id,
        cluster_key=cluster.cluster_key if cluster else None,
        analysis={
            "classification": analysis.model_dump(mode="json"),
            "dark_pattern": dark_pattern.model_dump(mode="json"),
            "routing": routing.model_dump(mode="json"),
        },
        analyzed_at=now,
    )
    if not created_cluster:
        cluster.reported_count += 1
        if complaint.amount_involved is not None:
            cluster.total_reported_amount = (
                cluster.total_reported_amount or Decimal(0)
            ) + complaint.amount_involved
        cluster.last_reported_at = max(cluster.last_reported_at, complaint.submitted_at)
        _update_cluster_aggregates(cluster, complaint)
    session.add(record)
    complaint.status = "analyzed"
    session.add(
        ComplaintStatusEvent(
            id=str(uuid4()),
            complaint_id=complaint.id,
            status="analyzed",
            label="Issue understood",
            message="Your report was organized into an advisory consumer issue signal.",
            occurred_at=now,
        )
    )
    session.commit()
    session.refresh(record)
    return record, cluster


def create_corroboration(
    session: Session, cluster_key: str, payload: CorroborationCreate
) -> tuple[CorroborationRecord, bool]:
    cluster = session.scalar(
        select(IssueClusterRecord).where(IssueClusterRecord.cluster_key == cluster_key)
    )
    if cluster is None:
        raise ValueError("issue not found")
    digest = _confirmation_digest(payload.confirmation_key)
    existing = session.scalar(
        select(CorroborationRecord).where(
            CorroborationRecord.cluster_id == cluster.cluster_id,
            CorroborationRecord.confirmation_digest == digest,
        )
    )
    if existing is not None:
        return existing, False
    record = CorroborationRecord(
        id=str(uuid4()),
        cluster_id=cluster.cluster_id,
        confirmation_digest=digest,
        explanation=payload.explanation.strip() if payload.explanation else None,
        status="pending_evidence",
        submitted_at=datetime.now(UTC),
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record, True


def submit_evidence(
    session: Session,
    corroboration_id: str,
    payload: EvidenceCreate,
    *,
    storage_key: str | None = None,
    content_type: str | None = None,
    file_size_bytes: int | None = None,
    sha256_digest: str | None = None,
) -> tuple[EvidenceRecord, CorroborationRecord, IssueClusterRecord, bool]:
    corroboration = session.get(CorroborationRecord, corroboration_id)
    if corroboration is None:
        raise ValueError("corroboration not found")
    cluster = session.get(IssueClusterRecord, corroboration.cluster_id)
    if cluster is None:
        raise ValueError("issue not found")
    existing = session.scalar(
        select(EvidenceRecord).where(
            EvidenceRecord.corroboration_id == corroboration_id
        )
    )
    if existing is not None:
        return existing, corroboration, cluster, False
    evidence = EvidenceRecord(
        id=str(uuid4()),
        corroboration_id=corroboration_id,
        evidence_type=payload.evidence_type,
        filename=payload.filename.strip() if payload.filename else None,
        storage_key=storage_key,
        content_type=content_type,
        file_size_bytes=file_size_bytes,
        sha256_digest=sha256_digest,
        synthetic_flag=storage_key is None,
        validation_status="pending-review",
        review_note=(
            "Synthetic demo evidence submitted for review."
            if storage_key is None
            else "Uploaded evidence submitted for review."
        ),
        submitted_at=datetime.now(UTC),
    )
    corroboration.status = "accepted_for_signal"
    cluster.confirmations += 1
    cluster.evidence_backed_count += 1
    session.add(evidence)
    session.commit()
    session.refresh(evidence)
    return evidence, corroboration, cluster, True
