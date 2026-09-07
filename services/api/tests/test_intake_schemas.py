import json
from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest
from pydantic import ValidationError

from services.api.app.intake_schemas import IntakeDraft, IntakePatch


def test_complete_synthetic_template_validates() -> None:
    fixture_path = Path(__file__).resolve().parents[3] / "data" / "seed" / "sample-complaint-intake.json"
    draft = IntakeDraft.model_validate(json.loads(fixture_path.read_text(encoding="utf-8")))

    assert draft.schema_version == "complaint-intake.v1"
    assert draft.business.company_name == "QuickKart Demo Marketplace"
    assert draft.transaction.amount_disputed == Decimal("2499.00")
    assert draft.consents.case_processing is True
    assert draft.missing_required_fields() == []


def test_rich_fixture_shape_can_be_loaded_without_exposing_unknown_fields() -> None:
    draft = IntakeDraft.model_validate(
        {
            "schema_version": "complaint-intake.v1",
            "record_type": "complaint_intake_payload",
            "complaint": {"description": "Refund is delayed.", "language": "en"},
            "consumer": {
                "contact": {
                    "email": " Consumer@Example.com ",
                    "phone": "+91 98765 43210",
                    "preferred_method": "email",
                }
            },
            "incident": {"occurred_on": "2026-08-20"},
            "transaction": {"amount_disputed": "2499.00"},
            "consents": {"case_processing": True},
        }
    )

    assert draft.consumer.contact.email == "consumer@example.com"
    assert draft.consumer.contact.phone == "+919876543210"
    assert draft.incident.occurred_on == date(2026, 8, 20)
    assert draft.transaction.amount_disputed == Decimal("2499.00")
    assert draft.missing_required_fields() == []


def test_incomplete_draft_reports_required_fields() -> None:
    draft = IntakeDraft()

    assert draft.missing_required_fields() == [
        "complaint.description",
        "consumer.contact",
        "consents.case_processing",
    ]


def test_patch_rejects_system_fields_and_unknown_paths() -> None:
    assert IntakePatch(path="business.company_name", value="Example Seller")

    with pytest.raises(ValidationError):
        IntakePatch(path="complaint.docket_number", value="GD-ATTACK")
    with pytest.raises(ValidationError):
        IntakePatch(path="unknown.secret", value="private")
    with pytest.raises(ValidationError):
        IntakePatch(path="provenance", value={})