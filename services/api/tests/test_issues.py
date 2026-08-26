from collections.abc import Generator
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from services.api.app.db import Base, get_db
from services.api.app.main import app
from services.api.app.models import IssueClusterRecord


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


def test_confirmation_is_idempotent_for_the_same_key(issue_client: TestClient) -> None:
    path = "/api/v1/issues/REFUND-DELAY-EXAMPLE-SELLER/confirm"
    first = issue_client.post(
        path, headers={"X-Confirmation-Key": "browser-confirmation-1"}
    )
    second = issue_client.post(
        path, headers={"X-Confirmation-Key": "browser-confirmation-1"}
    )

    assert first.status_code == second.status_code == 200
    assert first.json() == {
        "cluster_key": "REFUND-DELAY-EXAMPLE-SELLER",
        "confirmations": 9,
        "recorded": True,
    }
    assert second.json() == {
        "cluster_key": "REFUND-DELAY-EXAMPLE-SELLER",
        "confirmations": 9,
        "recorded": False,
    }


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
