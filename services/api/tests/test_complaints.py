from collections.abc import Generator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from services.api.app.db import Base, get_db
from services.api.app.main import app
from services.api.app.models import Complaint, ComplaintStatusEvent, OutboxEvent
from services.complaint_worker.app.worker import process_pending_events


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db() -> Generator[Session, None, None]:
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
    engine.dispose()


def complaint_payload() -> dict[str, object]:
    return {
        "description": "Refund has not arrived after cancellation.",
        "company_name": "Example Seller",
        "amount_involved": "1499.00",
        "contact": {"email": "Consumer@Example.com"},
    }


def test_submit_and_track_complaint_without_exposing_private_fields(
    client: TestClient,
) -> None:
    created = client.post(
        "/api/v1/complaints",
        json=complaint_payload(),
        headers={"Idempotency-Key": "submission-001"},
    )

    assert created.status_code == 201
    assert created.headers["location"] == "/api/v1/complaints/track"
    created_body = created.json()
    assert set(created_body) == {"docket_number", "status", "submitted_at"}

    tracked = client.post(
        "/api/v1/complaints/track",
        json={
            "docket_number": created_body["docket_number"],
            "contact": {"email": " consumer@example.com "},
        },
    )

    assert tracked.status_code == 200
    assert tracked.json()["status"] == "submitted"
    assert tracked.json()["timeline"][0]["label"] == "Complaint submitted"
    assert "description" not in tracked.json()
    assert "contact" not in tracked.json()


def test_idempotency_key_returns_the_original_docket(client: TestClient) -> None:
    first = client.post(
        "/api/v1/complaints",
        json=complaint_payload(),
        headers={"Idempotency-Key": "submission-002"},
    )
    second = client.post(
        "/api/v1/complaints",
        json=complaint_payload(),
        headers={"Idempotency-Key": "submission-002"},
    )

    assert first.status_code == second.status_code == 201
    assert first.json()["docket_number"] == second.json()["docket_number"]


def test_unknown_docket_and_wrong_contact_share_safe_error(client: TestClient) -> None:
    unknown = client.post(
        "/api/v1/complaints/track",
        json={
            "docket_number": "GD-AAAAAAAAAAAA",
            "contact": {"email": "consumer@example.com"},
        },
    )
    created = client.post("/api/v1/complaints", json=complaint_payload())
    wrong_contact = client.post(
        "/api/v1/complaints/track",
        json={
            "docket_number": created.json()["docket_number"],
            "contact": {"email": "wrong@example.com"},
        },
    )

    assert unknown.status_code == wrong_contact.status_code == 404
    assert (
        unknown.json()
        == wrong_contact.json()
        == {
            "error": {
                "code": "COMPLAINT_NOT_FOUND",
                "message": "Complaint could not be found",
            }
        }
    )


def test_invalid_payload_uses_stable_validation_error(client: TestClient) -> None:
    response = client.post(
        "/api/v1/complaints",
        json={"description": " ", "contact": {"email": "not-an-email"}},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_initial_case_event_and_outbox_are_written_together(client: TestClient) -> None:
    response = client.post("/api/v1/complaints", json=complaint_payload())
    docket = response.json()["docket_number"]

    override = app.dependency_overrides[get_db]
    session = next(override())
    try:
        complaint = session.scalar(
            select(Complaint).where(Complaint.docket_number == docket)
        )
        assert complaint is not None
        assert (
            session.scalar(
                select(func.count())
                .select_from(ComplaintStatusEvent)
                .where(ComplaintStatusEvent.complaint_id == complaint.id)
            )
            == 1
        )
        assert (
            session.scalar(
                select(func.count())
                .select_from(OutboxEvent)
                .where(OutboxEvent.aggregate_id == complaint.id)
            )
            == 1
        )
    finally:
        session.close()


def test_my_reports_edit_window_and_reprocessing(client: TestClient) -> None:
    created = client.post("/api/v1/complaints", json=complaint_payload())
    docket = created.json()["docket_number"]
    contact = {"email": "consumer@example.com"}

    reports = client.post("/api/v1/complaints/my-reports", json={"contact": contact})
    assert reports.status_code == 200
    assert reports.json()[0]["editable"] is True
    assert reports.json()[0]["editable_until"]

    updated = client.patch(
        f"/api/v1/complaints/{docket}",
        json={
            "contact": contact,
            "description": "The refund is still delayed after my cancellation.",
            "company_name": "Example Seller",
            "amount_involved": "1599.00",
            "state": "Maharashtra",
        },
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "submitted"

    override = app.dependency_overrides[get_db]
    session = next(override())
    try:
        complaint = session.scalar(
            select(Complaint).where(Complaint.docket_number == docket)
        )
        assert complaint is not None
        complaint.submitted_at = datetime.now(UTC) - timedelta(hours=47)
        session.commit()
    finally:
        session.close()
    inside = client.patch(
        f"/api/v1/complaints/{docket}",
        json={
            "contact": contact,
            "description": "Updated within the allowed window.",
            "company_name": "Example Seller",
            "amount_involved": "1599.00",
            "state": "Maharashtra",
        },
    )
    assert inside.status_code == 200

    override = app.dependency_overrides[get_db]
    session = next(override())
    try:
        complaint = session.scalar(
            select(Complaint).where(Complaint.docket_number == docket)
        )
        assert complaint is not None
        complaint.submitted_at = datetime.now(UTC) - timedelta(hours=48)
        session.commit()
    finally:
        session.close()
    boundary = client.patch(
        f"/api/v1/complaints/{docket}",
        json={
            "contact": contact,
            "description": "The boundary must be read-only.",
            "company_name": "Example Seller",
            "amount_involved": "1599.00",
            "state": "Maharashtra",
        },
    )
    assert boundary.status_code == 409
    assert boundary.json()["error"]["code"] == "COMPLAINT_EDIT_WINDOW_EXPIRED"

    override = app.dependency_overrides[get_db]
    session = next(override())
    try:
        complaint = session.scalar(
            select(Complaint).where(Complaint.docket_number == docket)
        )
        assert complaint is not None
        complaint.submitted_at = datetime.now(UTC) - timedelta(hours=49)
        session.commit()
    finally:
        session.close()
    outside = client.patch(
        f"/api/v1/complaints/{docket}",
        json={
            "contact": contact,
            "description": "An update after the window must fail.",
            "company_name": "Example Seller",
            "amount_involved": "1599.00",
            "state": "Maharashtra",
        },
    )
    assert outside.status_code == 409

    assert process_pending_events(next(app.dependency_overrides[get_db]())) >= 1
