from typing import Annotated

from fastapi import APIRouter, Depends, Header, Response, status
from sqlalchemy.orm import Session

from services.api.app.complaints import create_complaint, track_complaint
from services.api.app.db import get_db
from services.api.app.schemas import (
    ComplaintCreate,
    ComplaintCreated,
    ComplaintTracking,
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
