from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from services.api.app.complaints import (
    ComplaintNotFoundError,
    _as_utc,
    create_complaint,
    list_my_reports,
    track_complaint,
    update_complaint,
)
from services.api.app.db import get_db
from services.api.app.issue_schemas import PublicIssueResponse
from services.api.app.models import ComplaintAnalysisRecord, IssueClusterRecord
from services.api.app.schemas import (
    ComplaintCreate,
    ComplaintCreated,
    ComplaintIntelligenceResponse,
    ComplaintReport,
    ComplaintTracking,
    ComplaintUpdate,
    ContactRequest,
    TimelineEvent,
    TrackingRequest,
)

router = APIRouter(prefix="/api/v1/complaints", tags=["complaints"])


@router.post("", response_model=ComplaintCreated, status_code=status.HTTP_201_CREATED)
def submit_complaint(
    payload: ComplaintCreate,
    response: Response,
    session: Annotated[Session, Depends(get_db)],
    idempotency_key: Annotated[str | None, Header(max_length=128)] = None,
) -> ComplaintCreated:
    complaint = create_complaint(session, payload, idempotency_key)
    response.headers["Location"] = "/api/v1/complaints/track"
    return ComplaintCreated(
        docket_number=complaint.docket_number,
        status=complaint.status,
        submitted_at=complaint.submitted_at,
    )


@router.post("/track", response_model=ComplaintTracking)
def track_submitted_complaint(
    payload: TrackingRequest, session: Annotated[Session, Depends(get_db)]
) -> ComplaintTracking:
    complaint, events = track_complaint(session, payload)
    return ComplaintTracking(
        docket_number=complaint.docket_number,
        status=complaint.status,
        submitted_at=complaint.submitted_at,
        timeline=[
            TimelineEvent(
                status=event.status,
                label=event.label,
                message=event.message,
                occurred_at=event.occurred_at,
            )
            for event in events
        ],
    )


@router.post("/my-reports", response_model=list[ComplaintReport])
def read_my_reports(
    payload: ContactRequest, session: Annotated[Session, Depends(get_db)]
) -> list[ComplaintReport]:
    reports = list_my_reports(session, payload.contact)
    if not reports:
        raise ComplaintNotFoundError
    now = datetime.now(UTC)
    return [
        ComplaintReport(
            docket_number=report.docket_number,
            description=report.description,
            company_name=report.company_name,
            amount_involved=report.amount_involved,
            state=report.state,
            status=report.status,
            submitted_at=report.submitted_at,
            updated_at=report.updated_at,
            editable_until=_as_utc(report.submitted_at) + timedelta(hours=48),
            editable=now < _as_utc(report.submitted_at) + timedelta(hours=48),
        )
        for report in reports
    ]


@router.patch("/{docket_number}", response_model=ComplaintReport)
def edit_submitted_complaint(
    docket_number: str,
    payload: ComplaintUpdate,
    session: Annotated[Session, Depends(get_db)],
) -> ComplaintReport:
    complaint = update_complaint(session, docket_number.upper(), payload)
    return ComplaintReport(
        docket_number=complaint.docket_number,
        description=complaint.description,
        company_name=complaint.company_name,
        amount_involved=complaint.amount_involved,
        state=complaint.state,
        status=complaint.status,
        submitted_at=complaint.submitted_at,
        updated_at=complaint.updated_at,
        editable_until=_as_utc(complaint.submitted_at) + timedelta(hours=48),
        editable=True,
    )


@router.post("/intelligence", response_model=ComplaintIntelligenceResponse)
def read_complaint_intelligence(
    payload: TrackingRequest, session: Annotated[Session, Depends(get_db)]
) -> ComplaintIntelligenceResponse | JSONResponse:
    complaint, _ = track_complaint(session, payload)
    record = session.scalar(
        select(ComplaintAnalysisRecord).where(
            ComplaintAnalysisRecord.complaint_id == complaint.id
        )
    )
    if record is None:
        return JSONResponse(
            status_code=status.HTTP_202_ACCEPTED,
            content={
                "docket_number": complaint.docket_number,
                "status": "processing",
                "message": "Your advisory issue summary is still being prepared.",
            },
        )
    cluster = (
        session.scalar(
            select(IssueClusterRecord).where(
                IssueClusterRecord.cluster_key == record.cluster_key
            )
        )
        if record.cluster_key
        else None
    )
    return ComplaintIntelligenceResponse(
        docket_number=complaint.docket_number,
        status=complaint.status,
        analyzed_at=record.analyzed_at,
        analysis=record.analysis,
        matched_issue=PublicIssueResponse.model_validate(cluster)
        if cluster is not None
        else None,
    )
