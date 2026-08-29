from collections.abc import Generator
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from services.api.app.db import Base, get_db
from services.api.app.main import app
from services.api.app.models import IssueClusterRecord
from services.complaint_worker.app.worker import process_pending_events


@pytest.fixture()
def issue_client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = session_factory()
    session.add(
        IssueClusterRecord(
            cluster_id="cluster-1",
            cluster_key="REFUND-DELAY-EXAMPLE-SELLER",
            title="Refund delay reports involving Example Seller",
            company_name="Example Seller",
            sector="e_commerce",
            issue="refund_delay",
            reported_count=2,
            confirmations=8,
            total_reported_amount=Decimal("2499.00"),
            states_affected=2,
            growth_rate=Decimal("1.2"),
            severity=Decimal("0.7"),
            unresolved_rate=Decimal("0.5"),
            first_reported_at=datetime(2026, 1, 1, tzinfo=UTC),
            last_reported_at=datetime(2026, 1, 14, tzinfo=UTC),
        )
    )
    session.commit()
    session.close()

    def override_get_db() -> Generator[Session, None, None]:
        request_session = session_factory()
        try:
            yield request_session
        finally:
            request_session.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
    engine.dispose()


def test_public_issue_read_excludes_private_fields(issue_client: TestClient) -> None:
    response = issue_client.get("/api/v1/issues/REFUND-DELAY-EXAMPLE-SELLER")

    assert response.status_code == 200
    body = response.json()
    assert body["reported_count"] == 2
    assert body["confirmations"] == 8
    assert "member_ids" not in body
    assert "description" not in body


def test_public_issue_list_is_aggregate_only(issue_client: TestClient) -> None:
    response = issue_client.get("/api/v1/issues")

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["cluster_key"] == "REFUND-DELAY-EXAMPLE-SELLER"
    assert "member_ids" not in response.json()[0]


def test_blind_confirmation_requires_supporting_evidence(
    issue_client: TestClient,
) -> None:
    path = "/api/v1/issues/REFUND-DELAY-EXAMPLE-SELLER/confirm"
    response = issue_client.post(
        path, headers={"X-Confirmation-Key": "browser-confirmation-1"}
    )

    assert response.status_code == 409
    assert response.json() == {
        "error": {
            "code": "CORROBORATION_REQUIRED",
            "message": "Submit supporting evidence before adding a consumer signal.",
        }
    }


def test_corroboration_updates_metrics_only_after_evidence(
    issue_client: TestClient,
) -> None:
    path = "/api/v1/issues/REFUND-DELAY-EXAMPLE-SELLER"
    started = issue_client.post(
        f"{path}/corroborations",
        json={
            "confirmation_key": "browser-confirmation-1234",
            "explanation": "The refund confirmation email is still unresolved.",
        },
    )

    assert started.status_code == 200
    assert started.json()["status"] == "pending_evidence"
    assert started.json()["evidence_required"] is True

    corroboration_id = started.json()["corroboration_id"]
    evidence = issue_client.post(
        f"/api/v1/issues/corroborations/{corroboration_id}/evidence",
        json={
            "evidence_type": "refund/cancellation screenshot",
            "filename": "demo-refund.png",
        },
    )

    assert evidence.status_code == 200
    assert evidence.json()["status"] == "accepted_for_signal"
    assert evidence.json()["validation_status"] == "pending-review"
    assert evidence.json()["confirmations"] == 9
    assert evidence.json()["evidence_backed_count"] == 1

    duplicate = issue_client.post(
        f"/api/v1/issues/corroborations/{corroboration_id}/evidence",
        json={"evidence_type": "refund/cancellation screenshot"},
    )
    assert duplicate.status_code == 200
    assert duplicate.json()["recorded"] is False


def test_real_evidence_upload_is_stored_and_hashed(
    issue_client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("EVIDENCE_STORAGE_DIR", str(tmp_path))
    started = issue_client.post(
        "/api/v1/issues/REFUND-DELAY-EXAMPLE-SELLER/corroborations",
        json={"confirmation_key": "upload-confirmation-1234"},
    )
    corroboration_id = started.json()["corroboration_id"]

    uploaded = issue_client.post(
        f"/api/v1/issues/corroborations/{corroboration_id}/evidence/upload",
        data={"evidence_type": "order screenshot"},
        files={"upload": ("refund-proof.png", b"demo-proof-bytes", "image/png")},
    )

    assert uploaded.status_code == 200
    assert uploaded.json()["synthetic_flag"] is False
    assert uploaded.json()["filename"] == "refund-proof.png"
    assert uploaded.json()["file_size_bytes"] == len(b"demo-proof-bytes")
    assert len(list(tmp_path.iterdir())) == 1


def test_evidence_upload_rejects_unsupported_content_type(
    issue_client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("EVIDENCE_STORAGE_DIR", str(tmp_path))
    started = issue_client.post(
        "/api/v1/issues/REFUND-DELAY-EXAMPLE-SELLER/corroborations",
        json={"confirmation_key": "upload-confirmation-5678"},
    )
    corroboration_id = started.json()["corroboration_id"]

    rejected = issue_client.post(
        f"/api/v1/issues/corroborations/{corroboration_id}/evidence/upload",
        data={"evidence_type": "other supporting proof"},
        files={
            "upload": ("proof.exe", b"not-an-image", "application/octet-stream")
        },
    )

    assert rejected.status_code == 422
    assert rejected.json()["error"]["code"] == "INVALID_EVIDENCE_FILE"
    assert list(tmp_path.iterdir()) == []


def test_unknown_issue_returns_the_same_safe_not_found_error(
    issue_client: TestClient,
) -> None:
    response = issue_client.get("/api/v1/issues/unknown")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "ISSUE_NOT_FOUND",
            "message": "Issue could not be found",
        }
    }


def test_golden_complaint_matches_an_issue_and_dashboard(
    issue_client: TestClient,
) -> None:
    created = issue_client.post(
        "/api/v1/complaints",
        json={
            "description": (
                "I cancelled my QuickKart order 12 days ago. The refund of INR "
                "3499 was confirmed but I still have not received it."
            ),
            "company_name": "QuickKart",
            "amount_involved": "3499.00",
            "contact": {"email": "golden@example.com"},
        },
    )
    assert created.status_code == 201

    intelligence = issue_client.post(
        "/api/v1/complaints/intelligence",
        json={
            "docket_number": created.json()["docket_number"],
            "contact": {"email": "GOLDEN@example.com"},
        },
    )
    assert intelligence.status_code == 202

    override = app.dependency_overrides[get_db]
    session = next(override())
    try:
        assert process_pending_events(session) == 1
    finally:
        session.close()

    intelligence = issue_client.post(
        "/api/v1/complaints/intelligence",
        json={
            "docket_number": created.json()["docket_number"],
            "contact": {"email": "GOLDEN@example.com"},
        },
    )
    assert intelligence.status_code == 200
    assert (
        intelligence.json()["analysis"]["classification"]["issue"]["value"]
        == "refund_delay"
    )
    assert (
        intelligence.json()["matched_issue"]["cluster_key"]
        == "REFUND-DELAY-EXAMPLE-SELLER"
    )

    overview = issue_client.get("/api/v1/dashboard/overview")
    assert overview.status_code == 200
    assert overview.json()["data_label"] == "Synthetic demonstration data"
