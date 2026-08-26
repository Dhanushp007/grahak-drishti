import argparse
from datetime import UTC, datetime
from decimal import Decimal
from typing import cast
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import delete, select

from services.ai.app.classifier import ComplaintInput, classify_complaint
from services.ai.app.dark_patterns import analyze_dark_pattern
from services.api.app.complaints import _contact_digest
from services.api.app.db import SessionLocal
from services.api.app.models import (
    Complaint,
    ComplaintAnalysisRecord,
    ComplaintContact,
    ConsumerConfirmation,
    CorroborationRecord,
    EvidenceRecord,
    IssueClusterRecord,
    SyntheticConsumer,
    SyntheticSignal,
)
from services.routing_engine.app.routing import recommend_route


def _date(day: int) -> datetime:
    return datetime(2026, 1, day, tzinfo=UTC)


def _geography(values: list[tuple[str, int, int]]) -> list[dict[str, object]]:
    return [
        {"state": state, "reports": reports, "evidence_backed": evidence_backed}
        for state, reports, evidence_backed in values
    ]


def _stable_id(value: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"grahak-drishti-demo:{value}"))


SCENARIOS = (
    {
        "cluster_id": "demo-cluster-refund-delays",
        "cluster_key": "REFUND-DELAY-QUICKKART",
        "title": "Refund delays on QuickKart",
        "company_name": "QuickKart",
        "sector": "e_commerce",
        "issue": "refund_delay",
        "reported_count": 438,
        "confirmations": 178,
        "evidence_backed_count": 312,
        "reviewed_count": 178,
        "potential_dark_pattern_count": 0,
        "total_reported_amount": Decimal("3140000.00"),
        "states_affected": 12,
        "growth_rate": Decimal("2.40"),
        "severity": Decimal("0.86"),
        "unresolved_rate": Decimal("0.78"),
        "first_reported_at": _date(1),
        "last_reported_at": _date(26),
        "trend": [
            {"month": "Jan", "reports": 82},
            {"month": "Feb", "reports": 107},
            {"month": "Mar", "reports": 141},
            {"month": "Apr", "reports": 196},
            {"month": "May", "reports": 284},
            {"month": "Jun", "reports": 438},
        ],
        "geography": _geography(
            [
                ("Maharashtra", 72, 51),
                ("Karnataka", 58, 41),
                ("Delhi", 49, 37),
                ("Uttar Pradesh", 45, 31),
                ("Tamil Nadu", 41, 29),
                ("Gujarat", 38, 26),
                ("West Bengal", 34, 23),
                ("Telangana", 31, 22),
                ("Rajasthan", 27, 19),
                ("Kerala", 24, 17),
                ("Bihar", 11, 8),
                ("Punjab", 8, 8),
            ]
        ),
        "routing": {
            "route": "company_grievance_channel",
            "confidence": 0.62,
            "reason": (
                "Start with the company grievance channel before "
                "consumer-system escalation."
            ),
            "advisory": True,
            "source": "Deterministic e-commerce navigation rule",
        },
    },
    {
        "cluster_id": "demo-cluster-hidden-charges",
        "cluster_key": "HIDDEN-CHARGE-STREAMBOX",
        "title": "Hidden charges on StreamBox",
        "company_name": "StreamBox",
        "sector": "digital_services",
        "issue": "hidden_charge",
        "reported_count": 286,
        "confirmations": 96,
        "evidence_backed_count": 153,
        "reviewed_count": 64,
        "potential_dark_pattern_count": 0,
        "total_reported_amount": Decimal("428600.00"),
        "states_affected": 9,
        "growth_rate": Decimal("1.41"),
        "severity": Decimal("0.71"),
        "unresolved_rate": Decimal("0.59"),
        "first_reported_at": _date(3),
        "last_reported_at": _date(25),
        "trend": [
            {"month": month, "reports": count}
            for month, count in (
                ("Jan", 52),
                ("Feb", 68),
                ("Mar", 91),
                ("Apr", 129),
                ("May", 201),
                ("Jun", 286),
            )
        ],
        "geography": _geography(
            [
                ("Maharashtra", 64, 32),
                ("Delhi", 47, 26),
                ("Karnataka", 39, 22),
                ("Tamil Nadu", 31, 17),
                ("Gujarat", 27, 15),
                ("Telangana", 25, 14),
                ("West Bengal", 21, 12),
                ("Kerala", 18, 9),
                ("Rajasthan", 14, 6),
            ]
        ),
        "routing": {
            "route": "consumer_grievance_system",
            "confidence": 0.5,
            "reason": (
                "Potential hidden charge pattern requires authorized "
                "consumer-protection review."
            ),
            "advisory": True,
            "source": "Deterministic issue navigation rule",
        },
    },
    {
        "cluster_id": "demo-cluster-warranty-rejection",
        "cluster_key": "WARRANTY-REJECTION-HOMETECH",
        "title": "Warranty rejection by HomeTech",
        "company_name": "HomeTech",
        "sector": "consumer_durables",
        "issue": "warranty_service",
        "reported_count": 241,
        "confirmations": 74,
        "evidence_backed_count": 121,
        "reviewed_count": 49,
        "potential_dark_pattern_count": 0,
        "total_reported_amount": Decimal("1198000.00"),
        "states_affected": 8,
        "growth_rate": Decimal("1.82"),
        "severity": Decimal("0.79"),
        "unresolved_rate": Decimal("0.63"),
        "first_reported_at": _date(4),
        "last_reported_at": _date(24),
        "trend": [
            {"month": month, "reports": count}
            for month, count in (
                ("Jan", 44),
                ("Feb", 58),
                ("Mar", 76),
                ("Apr", 103),
                ("May", 159),
                ("Jun", 241),
            )
        ],
        "geography": _geography(
            [
                ("Maharashtra", 53, 28),
                ("Karnataka", 42, 23),
                ("Delhi", 34, 18),
                ("Uttar Pradesh", 31, 15),
                ("Gujarat", 27, 13),
                ("Tamil Nadu", 23, 11),
                ("Rajasthan", 18, 8),
                ("Kerala", 13, 5),
            ]
        ),
        "routing": {
            "route": "consumer_grievance_system",
            "confidence": 0.35,
            "reason": (
                "Documented warranty service complaints should be reviewed "
                "through the consumer grievance system."
            ),
            "advisory": True,
            "source": "Deterministic fallback navigation rule",
        },
    },
    {
        "cluster_id": "demo-cluster-fake-listings",
        "cluster_key": "COUNTERFEIT-PRODUCT-MARKETMART",
        "title": "Potentially counterfeit listings on MarketMart",
        "company_name": "MarketMart",
        "sector": "e_commerce",
        "issue": "counterfeit_product",
        "reported_count": 193,
        "confirmations": 61,
        "evidence_backed_count": 88,
        "reviewed_count": 37,
        "potential_dark_pattern_count": 0,
        "total_reported_amount": Decimal("682400.00"),
        "states_affected": 7,
        "growth_rate": Decimal("1.09"),
        "severity": Decimal("0.83"),
        "unresolved_rate": Decimal("0.55"),
        "first_reported_at": _date(6),
        "last_reported_at": _date(23),
        "trend": [
            {"month": month, "reports": count}
            for month, count in (
                ("Jan", 36),
                ("Feb", 43),
                ("Mar", 59),
                ("Apr", 72),
                ("May", 124),
                ("Jun", 193),
            )
        ],
        "geography": _geography(
            [
                ("Delhi", 41, 19),
                ("Maharashtra", 37, 18),
                ("Karnataka", 30, 15),
                ("Uttar Pradesh", 27, 12),
                ("Gujarat", 23, 10),
                ("West Bengal", 19, 8),
                ("Tamil Nadu", 16, 6),
            ]
        ),
        "routing": {
            "route": "ccpa_signal",
            "confidence": 0.6,
            "reason": (
                "A potential counterfeit pattern should be submitted as an "
                "advisory signal for authorized review."
            ),
            "advisory": True,
            "source": "Deterministic consumer-protection navigation rule",
        },
    },
    {
        "cluster_id": "demo-cluster-subscription-traps",
        "cluster_key": "SUBSCRIPTION-ISSUE-NEWSPLUS",
        "title": "Subscription cancellation friction on NewsPlus",
        "company_name": "NewsPlus",
        "sector": "digital_services",
        "issue": "subscription_issue",
        "reported_count": 167,
        "confirmations": 53,
        "evidence_backed_count": 79,
        "reviewed_count": 28,
        "potential_dark_pattern_count": 47,
        "total_reported_amount": Decimal("251600.00"),
        "states_affected": 6,
        "growth_rate": Decimal("0.94"),
        "severity": Decimal("0.68"),
        "unresolved_rate": Decimal("0.48"),
        "first_reported_at": _date(8),
        "last_reported_at": _date(22),
        "trend": [
            {"month": month, "reports": count}
            for month, count in (
                ("Jan", 29),
                ("Feb", 34),
                ("Mar", 46),
                ("Apr", 61),
                ("May", 99),
                ("Jun", 167),
            )
        ],
        "geography": _geography(
            [
                ("Maharashtra", 35, 17),
                ("Delhi", 29, 14),
                ("Karnataka", 27, 14),
                ("Tamil Nadu", 25, 12),
                ("Telangana", 24, 11),
                ("Gujarat", 27, 11),
            ]
        ),
        "routing": {
            "route": "ccpa_signal",
            "confidence": 0.6,
            "reason": (
                "Potential dark-pattern concern should be reviewed as an "
                "advisory signal."
            ),
            "advisory": True,
            "source": "Deterministic consumer-protection navigation rule",
        },
    },
)


def seed(reset: bool = False) -> None:
    with SessionLocal() as session:
        if reset:
            for model in (
                EvidenceRecord,
                CorroborationRecord,
                ConsumerConfirmation,
                ComplaintAnalysisRecord,
                Complaint,
                IssueClusterRecord,
                SyntheticSignal,
                SyntheticConsumer,
            ):
                session.execute(delete(model))
            session.commit()
        for values in SCENARIOS:
            existing = session.scalar(
                select(IssueClusterRecord).where(
                    IssueClusterRecord.cluster_key == values["cluster_key"]
                )
            )
            if existing is None:
                session.add(IssueClusterRecord(**values))
            else:
                for key, value in values.items():
                    setattr(existing, key, value)
        session.flush()
        for consumer_index in range(1, 26):
            consumer_id = _stable_id(f"consumer-{consumer_index}")
            scenario = SCENARIOS[(consumer_index - 1) % len(SCENARIOS)]
            geography = cast(list[dict[str, object]], scenario["geography"])
            state = str(geography[0]["state"])
            company_name = str(scenario["company_name"])
            issue_name = str(scenario["issue"])
            consumer = session.get(SyntheticConsumer, consumer_id)
            if consumer is None:
                consumer = SyntheticConsumer(
                    consumer_id=consumer_id,
                    display_name=f"Demo Consumer {consumer_index:02d}",
                    state=state,
                )
                session.add(consumer)
            cluster_key = str(scenario["cluster_key"])
            session.merge(
                SyntheticSignal(
                    signal_id=_stable_id(f"signal-{consumer_index}"),
                    cluster_key=cluster_key,
                    consumer_id=consumer_id,
                    signal_type="evidence_backed"
                    if consumer_index % 2 == 0
                    else "reported",
                    created_at=_date(consumer_index),
                )
            )
            complaint_id = _stable_id(f"complaint-{consumer_index}")
            if session.get(Complaint, complaint_id) is not None:
                continue
            description = (
                f"My {company_name} order has the {issue_name.replace('_', ' ')} "
                "problem and it is still unresolved."
            )
            if issue_name == "subscription_issue":
                description += " The free trial auto-renewed before I could cancel it."
            complaint = Complaint(
                id=complaint_id,
                docket_number=f"GD-{complaint_id.replace('-', '').upper()[:12]}",
                description=description,
                company_name=company_name,
                amount_involved=Decimal("3499.00"),
                status="analyzed",
                submitted_at=_date(consumer_index),
            )
            session.add(complaint)
            session.add(
                ComplaintContact(
                    id=_stable_id(f"contact-{consumer_index}"),
                    complaint_id=complaint_id,
                    contact_type="email",
                    contact_digest=_contact_digest(
                        f"consumer-{consumer_index}@example.test"
                    ),
                )
            )
            analysis = classify_complaint(
                ComplaintInput(
                    description=description,
                    company_name=complaint.company_name,
                    amount_involved=complaint.amount_involved,
                )
            )
            dark_pattern = analyze_dark_pattern(description)
            routing = recommend_route(analysis, dark_pattern)
            session.add(
                ComplaintAnalysisRecord(
                    id=_stable_id(f"analysis-{consumer_index}"),
                    complaint_id=complaint_id,
                    cluster_key=cluster_key,
                    analysis={
                        "classification": analysis.model_dump(mode="json"),
                        "dark_pattern": dark_pattern.model_dump(mode="json"),
                        "routing": routing.model_dump(mode="json"),
                    },
                    analyzed_at=_date(consumer_index),
                )
            )
            if consumer_index % 2 == 0:
                corroboration_id = _stable_id(f"corroboration-{consumer_index}")
                cluster = session.scalar(
                    select(IssueClusterRecord).where(
                        IssueClusterRecord.cluster_key == cluster_key
                    )
                )
                if cluster is not None:
                    session.add(
                        CorroborationRecord(
                            id=corroboration_id,
                            cluster_id=cluster.cluster_id,
                            confirmation_digest=_contact_digest(
                                f"consumer-{consumer_index}@example.test"
                            ),
                            explanation=(
                                "Synthetic supporting proof for the demo scenario."
                            ),
                            status="accepted_for_signal",
                            submitted_at=_date(consumer_index),
                        )
                    )
                    session.add(
                        EvidenceRecord(
                            id=_stable_id(f"evidence-{consumer_index}"),
                            corroboration_id=corroboration_id,
                            evidence_type="order screenshot",
                            filename="synthetic-demo-proof.png",
                            synthetic_flag=True,
                            validation_status="accepted-for-signal",
                            review_note=(
                                "Synthetic demo evidence; not legally verified."
                            ),
                            submitted_at=_date(consumer_index),
                        )
                    )
        session.commit()
    print(f"Seeded {len(SCENARIOS)} synthetic issue scenarios.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the deterministic demo dataset.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Explicitly clear demo complaint/intelligence records before seeding.",
    )
    seed(reset=parser.parse_args().reset)
