import hashlib
import hmac
import re
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from services.api.app.config import get_settings
from services.api.app.models import (
    Complaint,
    ComplaintAnalysisRecord,
    ComplaintContact,
    ComplaintStatusEvent,
    IssueClusterRecord,
    OutboxEvent,
)
from services.api.app.schemas import (
    ComplaintCreate,
    ComplaintUpdate,
    ContactInput,
    TrackingRequest,
)


class ComplaintNotFoundError(Exception):
    pass


class ComplaintEditWindowExpiredError(Exception):
    pass


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


def _contact_digest(contact_value: str) -> str:
    secret = get_settings().contact_hash_secret.encode()
    return hmac.new(secret, contact_value.encode(), hashlib.sha256).hexdigest()


def _new_docket() -> str:
    return f"GD-{uuid4().hex[:12].upper()}"


def create_complaint(
    session: Session, payload: ComplaintCreate, idempotency_key: str | None
) -> Complaint:
    now = datetime.now(UTC)
    complaint = Complaint(
        id=str(uuid4()),
        docket_number=_new_docket(),
        description=payload.description,
        company_name=payload.company_name,
        amount_involved=payload.amount_involved,
        state=payload.state,
        currency=payload.currency,
        status="submitted",
        submitted_at=now,
        updated_at=now,
    )
    contact_value, contact_type = payload.contact.normalized()
    trace_id = str(uuid4())

    with session.begin():
        if idempotency_key:
            existing_event = session.scalar(
                select(OutboxEvent).where(
                    OutboxEvent.idempotency_key == idempotency_key
                )
            )
            if existing_event is not None:
                existing_complaint = session.get(Complaint, existing_event.aggregate_id)
                if existing_complaint is not None:
                    return existing_complaint
        session.add(complaint)
        session.add(
            ComplaintContact(
                id=str(uuid4()),
                complaint_id=complaint.id,
                contact_type=contact_type,
                contact_digest=_contact_digest(contact_value),
            )
        )
        session.add(
            ComplaintStatusEvent(
                id=str(uuid4()),
                complaint_id=complaint.id,
                status="submitted",
                label="Complaint submitted",
                message="Your complaint has been received.",
                occurred_at=now,
            )
        )
        session.add(
            OutboxEvent(
                id=str(uuid4()),
                event_type="complaint.created.v1",
                aggregate_id=complaint.id,
                trace_id=trace_id,
                idempotency_key=idempotency_key,
                payload={
                    "event_type": "complaint.created.v1",
                    "aggregate_id": complaint.id,
                    "trace_id": trace_id,
                },
                created_at=now,
            )
        )
    return complaint


def track_complaint(
    session: Session, payload: TrackingRequest
) -> tuple[Complaint, list[ComplaintStatusEvent]]:
    contact_value, _ = payload.contact.normalized()
    complaint = session.scalar(
        select(Complaint)
        .join(ComplaintContact, ComplaintContact.complaint_id == Complaint.id)
        .where(
            Complaint.docket_number == payload.docket_number,
            ComplaintContact.contact_digest == _contact_digest(contact_value),
        )
    )
    if complaint is None:
        raise ComplaintNotFoundError

    events = list(
        session.scalars(
            select(ComplaintStatusEvent)
            .where(ComplaintStatusEvent.complaint_id == complaint.id)
            .order_by(ComplaintStatusEvent.occurred_at)
        )
    )
    return complaint, events


def list_my_reports(session: Session, contact: ContactInput) -> list[Complaint]:
    contact_value, _ = contact.normalized()
    return list(
        session.scalars(
            select(Complaint)
            .join(ComplaintContact, ComplaintContact.complaint_id == Complaint.id)
            .where(ComplaintContact.contact_digest == _contact_digest(contact_value))
            .order_by(Complaint.submitted_at.desc())
        )
    )


def update_complaint(
    session: Session, docket_number: str, payload: ComplaintUpdate
) -> Complaint:
    contact_value, _ = payload.contact.normalized()
    complaint = session.scalar(
        select(Complaint)
        .join(ComplaintContact, ComplaintContact.complaint_id == Complaint.id)
        .where(
            Complaint.docket_number == docket_number,
            ComplaintContact.contact_digest == _contact_digest(contact_value),
        )
    )
    if complaint is None:
        raise ComplaintNotFoundError
    now = datetime.now(UTC)
    if now >= _as_utc(complaint.submitted_at) + timedelta(hours=48):
        raise ComplaintEditWindowExpiredError

    previous_analysis = session.scalar(
        select(ComplaintAnalysisRecord).where(
            ComplaintAnalysisRecord.complaint_id == complaint.id
        )
    )
    if previous_analysis is not None:
        previous_cluster = (
            session.scalar(
                select(IssueClusterRecord).where(
                    IssueClusterRecord.cluster_key == previous_analysis.cluster_key
                )
            )
            if previous_analysis.cluster_key
            else None
        )
        if previous_cluster is not None:
            previous_cluster.reported_count = max(
                previous_cluster.reported_count - 1, 1
            )
            if complaint.amount_involved is not None:
                previous_cluster.total_reported_amount = max(
                    (previous_cluster.total_reported_amount or Decimal(0))
                    - complaint.amount_involved,
                    Decimal(0),
                )
        session.delete(previous_analysis)

    complaint.description = payload.description
    complaint.company_name = payload.company_name
    complaint.amount_involved = payload.amount_involved
    complaint.state = payload.state
    complaint.status = "submitted"
    complaint.updated_at = now
    session.add(
        ComplaintStatusEvent(
            id=str(uuid4()),
            complaint_id=complaint.id,
            status="updated",
            label="Report updated",
            message="Your report was updated and queued for a fresh advisory analysis.",
            occurred_at=now,
        )
    )
    session.add(
        OutboxEvent(
            id=str(uuid4()),
            event_type="complaint.created.v1",
            aggregate_id=complaint.id,
            trace_id=str(uuid4()),
            payload={
                "event_type": "complaint.created.v1",
                "aggregate_id": complaint.id,
                "trace_id": str(uuid4()),
            },
            created_at=now,
        )
    )
    session.commit()
    session.refresh(complaint)
    return complaint


def normalize_phone(value: str) -> str:
    return re.sub(r"[\s().-]", "", value)
