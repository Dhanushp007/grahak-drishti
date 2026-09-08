from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from services.api.app.db import Base, get_db
from services.api.app.intake_routes import provider_dependency
from services.api.app.main import app


class FakeProvider:
    def create_live_token(self):
        from datetime import UTC, datetime, timedelta

        from services.ai.app.gemini_provider import LiveToken

        now = datetime.now(UTC)
        return LiveToken(
            token="ephemeral-test-token",
            model="test-live-model",
            expires_at=now + timedelta(minutes=30),
            new_session_expires_at=now + timedelta(minutes=1),
            config={},
        )

    def normalize(self, request):
        from services.ai.app.gemini_provider import NormalizedDraft

        request.draft.complaint.description = "Refund is delayed."
        request.draft.consumer.contact.email = "consumer@example.test"
        request.draft.consents.case_processing = True
        return NormalizedDraft(request.draft, "test-extraction-model")


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db() -> Generator[Session, None, None]:
        session = factory()
        try:
            yield session
        finally:
            session.close()

    Base.metadata.create_all(engine)
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[provider_dependency] = lambda: FakeProvider()
    yield TestClient(app)
    app.dependency_overrides.clear()
    engine.dispose()


def test_live_token_endpoint_returns_only_short_lived_session_credentials(
    client: TestClient,
) -> None:
    response = client.post("/api/v1/intake/live-token")

    assert response.status_code == 200
    assert response.json()["token"] == "ephemeral-test-token"
    assert "api_key" not in response.text
    assert response.json()["model"] == "test-live-model"


def test_normalize_endpoint_returns_validated_rich_draft(client: TestClient) -> None:
    response = client.post(
        "/api/v1/intake/normalize",
        json={
            "draft": {},
            "transcript": "My refund is delayed.",
            "language_hint": "auto",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["draft"]["complaint"]["description"] == "Refund is delayed."
    assert body["model"] == "test-extraction-model"


def test_normalize_endpoint_exposes_provider_failure_status(client: TestClient) -> None:
    from services.ai.app.gemini_provider import GeminiNotConfiguredError

    class UnavailableProvider:
        def normalize(self, request):
            raise GeminiNotConfiguredError("missing test provider")

    app.dependency_overrides[provider_dependency] = lambda: UnavailableProvider()
    response = client.post(
        "/api/v1/intake/normalize",
        json={"draft": {}, "transcript": "My refund is delayed."},
    )

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "provider_unavailable"
    assert body["provider_error"] == "not_configured"
    assert body["draft"]["complaint"]["description"] is None


def test_normalize_endpoint_exposes_safe_rate_limit_reason(client: TestClient) -> None:
    from services.ai.app.gemini_provider import GeminiProviderError

    class RateLimitedProvider:
        def normalize(self, request):
            raise GeminiProviderError("quota exhausted", reason="rate_limited")

    app.dependency_overrides[provider_dependency] = lambda: RateLimitedProvider()
    response = client.post(
        "/api/v1/intake/normalize",
        json={"draft": {}, "transcript": "My refund is delayed."},
    )

    assert response.status_code == 503
    assert response.json()["provider_error"] == "rate_limited"


def test_normalize_endpoint_preserves_draft_for_upstream_failure(
    client: TestClient,
) -> None:
    from services.ai.app.gemini_provider import GeminiProviderError

    class UpstreamFailureProvider:
        def normalize(self, request):
            raise GeminiProviderError("503 UNAVAILABLE", reason="upstream_failure")

    app.dependency_overrides[provider_dependency] = lambda: UpstreamFailureProvider()
    response = client.post(
        "/api/v1/intake/normalize",
        json={
            "draft": {"complaint": {"description": "Captured complaint details."}},
            "transcript": "The service is unavailable.",
        },
    )

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "provider_unavailable"
    assert body["provider_error"] == "upstream_failure"
    assert body["draft"]["complaint"]["description"] == "Captured complaint details."