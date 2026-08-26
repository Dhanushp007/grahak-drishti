import hashlib
import hmac
import re
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from services.ai.app.classifier import ComplaintInput, classify_complaint
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
    cluster = _find_matching_cluster(
        session, analysis.issue.value, analysis.company_name
    )
    routing = recommend_route(analysis)
    now = datetime.now(UTC)
    record = ComplaintAnalysisRecord(
        id=str(uuid4()),
        complaint_id=complaint.id,
        cluster_key=cluster.cluster_key if cluster else None,
        analysis={
            "classification": analysis.model_dump(mode="json"),
            "routing": routing.model_dump(mode="json"),
        },
        analyzed_at=now,
    )
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
    session: Session, corroboration_id: str, payload: EvidenceCreate
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
        synthetic_flag=True,
        validation_status="pending-review",
        review_note="Synthetic demo evidence submitted for review.",
        submitted_at=datetime.now(UTC),
    )
    corroboration.status = "accepted_for_signal"
    cluster.confirmations += 1
    cluster.evidence_backed_count += 1
    session.add(evidence)
    session.commit()
    session.refresh(evidence)
    return evidence, corroboration, cluster, True
