from collections.abc import Generator
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from services.api.app.complaints import create_complaint
from services.api.app.db import Base
from services.api.app.models import ComplaintAnalysisRecord, OutboxEvent
from services.api.app.schemas import ComplaintCreate, ContactInput
from services.complaint_worker.app.worker import process_pending_events


@pytest.fixture()
def worker_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = factory()
    yield session
    session.close()
    engine.dispose()


def test_worker_consumes_complaint_event_idempotently(worker_session: Session) -> None:
    complaint = create_complaint(
        worker_session,
        ComplaintCreate(
            description="Refund has not arrived after my QuickKart cancellation.",
            company_name="QuickKart",
            amount_involved=Decimal("3499.00"),
            contact=ContactInput(email="worker@example.test"),
        ),
        idempotency_key="worker-event-1",
    )

    assert process_pending_events(worker_session) == 1
    analysis = worker_session.scalar(
        select(ComplaintAnalysisRecord).where(
            ComplaintAnalysisRecord.complaint_id == complaint.id
        )
    )
    event = worker_session.scalar(
        select(OutboxEvent).where(OutboxEvent.aggregate_id == complaint.id)
    )
    assert analysis is not None
    classification = analysis.analysis["classification"]
    assert isinstance(classification, dict)
    issue = classification["issue"]
    assert isinstance(issue, dict)
    assert issue["value"] == "refund_delay"
    assert "duplicate_detection" in analysis.analysis
    assert event is not None
    assert event.processed_at is not None
    assert process_pending_events(worker_session) == 0