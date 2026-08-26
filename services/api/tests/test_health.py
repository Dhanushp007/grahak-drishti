from fastapi.testclient import TestClient

from services.api.app.main import app

client = TestClient(app)


def test_health_returns_service_status() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "api",
        "version": "0.1.0",
    }


def test_demo_login_returns_a_synthetic_role_session() -> None:
    response = client.post("/api/v1/demo/login", json={"role": "government"})

    assert response.status_code == 200
    assert response.json() == {
        "role": "government",
        "display_name": "Demo Government Official",
        "session_label": "Synthetic analyst session",
        "synthetic": True,
    }
