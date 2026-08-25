import json
import os
import subprocess
import sys
import time
from collections.abc import Mapping
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE_URL = os.getenv("SMOKE_BASE_URL", "http://127.0.0.1:8001")
STARTUP_TIMEOUT_SECONDS = 30.0
REQUEST_TIMEOUT_SECONDS = 5.0


def request_json(
    method: str, path: str, payload: Mapping[str, Any] | None = None
) -> tuple[int, Mapping[str, Any], Mapping[str, str]]:
    body = json.dumps(payload).encode() if payload is not None else None
    request = Request(
        f"{BASE_URL}{path}",
        data=body,
        headers={"Content-Type": "application/json"} if body else {},
        method=method,
    )
    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            return response.status, json.load(response), dict(response.headers)
    except HTTPError as error:
        response_body = error.read().decode()
        raise AssertionError(
            f"{method} {path} returned HTTP {error.code}: {response_body}"
        ) from error
    except URLError as error:
        raise AssertionError(f"{method} {path} failed: {error.reason}") from error


def wait_for_health() -> None:
    deadline = time.monotonic() + STARTUP_TIMEOUT_SECONDS
    last_error = "no response"
    while time.monotonic() < deadline:
        try:
            status, body, _ = request_json("GET", "/health")
            if status == 200 and body == {
                "status": "ok",
                "service": "api",
                "version": "0.1.0",
            }:
                return
            last_error = f"unexpected response: HTTP {status} {body}"
        except AssertionError as error:
            last_error = str(error)
        time.sleep(0.25)
    raise AssertionError(
        f"API did not become healthy within {STARTUP_TIMEOUT_SECONDS}s: {last_error}"
    )


def run_smoke_test() -> None:
    server = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "services.api.app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            BASE_URL.rsplit(":", 1)[-1],
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        wait_for_health()

        status, created, headers = request_json(
            "POST",
            "/api/v1/complaints",
            {
                "description": "Refund has not arrived after cancellation.",
                "company_name": "Smoke Test Seller",
                "amount_involved": "1499.00",
                "contact": {"email": "smoke@example.com"},
            },
        )
        assert status == 201
        assert headers.get("location") == "/api/v1/complaints/track"
        assert set(created) == {"docket_number", "status", "submitted_at"}

        status, tracked, _ = request_json(
            "POST",
            "/api/v1/complaints/track",
            {
                "docket_number": created["docket_number"],
                "contact": {"email": "SMOKE@example.com"},
            },
        )
        assert status == 200
        assert tracked["docket_number"] == created["docket_number"]
        assert tracked["status"] == "submitted"
        assert "description" not in tracked
        assert "contact" not in tracked
        print("API smoke test passed: health, complaint submission, and tracking")
    finally:
        server.terminate()
        try:
            output, _ = server.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
            output, _ = server.communicate()
        if sys.exc_info()[0] is not None and output:
            print(f"API server output:\n{output}", file=sys.stderr)


if __name__ == "__main__":
    run_smoke_test()