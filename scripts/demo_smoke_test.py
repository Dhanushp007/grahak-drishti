import json
import os
import time
from collections.abc import Mapping
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE_URL = os.getenv("DEMO_BASE_URL", "http://127.0.0.1:8002")
REQUEST_TIMEOUT_SECONDS = 5.0
HEALTH_TIMEOUT_ATTEMPTS = 40


def request_json(
    method: str,
    path: str,
    payload: Mapping[str, Any] | None = None,
    headers: Mapping[str, str] | None = None,
) -> tuple[int, Mapping[str, Any]]:
    body = json.dumps(payload).encode() if payload is not None else None
    request_headers = {"Content-Type": "application/json"} if body else {}
    if headers:
        request_headers.update(headers)
    request = Request(
        f"{BASE_URL}{path}",
        data=body,
        headers=request_headers,
        method=method,
    )
    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            return response.status, json.load(response)
    except HTTPError as error:
        return error.code, json.loads(error.read().decode())


def wait_for_intelligence(docket: str, contact: Mapping[str, Any]) -> Mapping[str, Any]:
    for _ in range(40):
        status, body = request_json(
            "POST",
            "/api/v1/complaints/intelligence",
            {"docket_number": docket, "contact": contact},
        )
        if status == 200:
            return body
        if status != 202:
            raise AssertionError(f"Unexpected intelligence response: {status} {body}")
        time.sleep(0.1)
    raise AssertionError("Complaint intelligence was not processed")


def wait_for_health() -> None:
    for _ in range(HEALTH_TIMEOUT_ATTEMPTS):
        try:
            status, body = request_json("GET", "/health")
        except URLError:
            continue
        if status == 200 and body.get("status") == "ok":
            return
    raise AssertionError("Demo API did not become healthy")


def run_demo_flow() -> None:
    wait_for_health()
    login_status, login = request_json(
        "POST", "/api/v1/demo/login", {"role": "citizen"}
    )
    assert login_status == 200
    assert login.get("synthetic") is True

    complaint_status, complaint = request_json(
        "POST",
        "/api/v1/complaints",
        {
            "description": (
                "I cancelled my QuickKart order 12 days ago. The refund of INR "
                "3499 was confirmed but I still have not received it."
            ),
            "company_name": "QuickKart",
            "amount_involved": "3499.00",
            "contact": {"email": "demo-flow@example.com"},
        },
    )
    assert complaint_status == 201
    docket = str(complaint["docket_number"])

    tracking_status, tracking = request_json(
        "POST",
        "/api/v1/complaints/track",
        {"docket_number": docket, "contact": {"email": "DEMO-FLOW@example.com"}},
    )
    assert tracking_status == 200
    assert tracking["status"] == "submitted"

    intelligence = wait_for_intelligence(
        docket, {"email": "demo-flow@example.com"}
    )
    assert (
        intelligence["analysis"]["classification"]["issue"]["value"]
        == "refund_delay"
    )
    assert intelligence["matched_issue"]["cluster_key"] == "REFUND-DELAY-QUICKKART"

    blind_status, blind = request_json(
        "POST",
        "/api/v1/issues/REFUND-DELAY-QUICKKART/confirm",
        headers={"X-Confirmation-Key": "blind-confirmation-demo"},
    )
    assert blind_status == 409
    assert blind["error"]["code"] == "CORROBORATION_REQUIRED"

    corroboration_status, corroboration = request_json(
        "POST",
        "/api/v1/issues/REFUND-DELAY-QUICKKART/corroborations",
        {
            "confirmation_key": "demo-flow-confirmation-001",
            "explanation": "Synthetic demo proof for the golden journey.",
        },
    )
    assert corroboration_status == 200
    assert corroboration["status"] == "pending_evidence"

    evidence_status, evidence = request_json(
        "POST",
        f"/api/v1/issues/corroborations/{corroboration['corroboration_id']}/evidence",
        {
            "evidence_type": "refund/cancellation screenshot",
            "filename": "demo-refund-confirmation.png",
        },
    )
    assert evidence_status == 200
    assert evidence["recorded"] is True
    assert evidence["validation_status"] == "pending-review"

    dashboard_status, dashboard = request_json("GET", "/api/v1/dashboard/overview")
    assert dashboard_status == 200
    assert dashboard["data_label"] == "Synthetic demonstration data"
    assert dashboard["issues"][0]["cluster_key"] == "REFUND-DELAY-QUICKKART"

    geography_status, geography = request_json("GET", "/api/v1/dashboard/geography")
    assert geography_status == 200
    assert any(state["state"] == "Maharashtra" for state in geography["states"])
    print(
        "Demo flow smoke test passed: login, complaint, intelligence, "
        "evidence, dashboard"
    )


if __name__ == "__main__":
    run_demo_flow()