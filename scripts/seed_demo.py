import argparse
from collections import Counter
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any, cast
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from services.ai.app.classifier import ComplaintInput, classify_complaint
from services.ai.app.dark_patterns import analyze_dark_pattern
from services.api.app.complaints import _contact_digest
from services.api.app.db import SessionLocal
from services.api.app.models import (
    Complaint,
    ComplaintAnalysisRecord,
    ComplaintContact,
    ComplaintStatusEvent,
    CorroborationRecord,
    EvidenceRecord,
    IssueClusterRecord,
    OutboxEvent,
    SyntheticConsumer,
    SyntheticMerchant,
    SyntheticSignal,
)
from services.routing_engine.app.routing import recommend_route

STATES = (
    "Maharashtra",
    "Karnataka",
    "Delhi",
    "Uttar Pradesh",
    "Tamil Nadu",
    "Gujarat",
    "West Bengal",
    "Telangana",
    "Rajasthan",
    "Kerala",
    "Bihar",
    "Punjab",
    "Madhya Pradesh",
    "Andhra Pradesh",
    "Odisha",
    "Haryana",
    "Assam",
    "Jharkhand",
    "Chhattisgarh",
    "Uttarakhand",
)

MERCHANTS = (
    ("QuickKart", "e_commerce"),
    ("StreamBox", "digital_services"),
    ("HomeTech", "consumer_durables"),
    ("MarketMart", "e_commerce"),
    ("NewsPlus", "digital_services"),
    ("DemoBank", "banking"),
    ("ConnectTel", "telecom"),
    ("SafeLife", "insurance"),
    ("QuickMeal", "food_delivery"),
    ("TravelNow", "travel"),
    ("QuickKart Marketplace", "e_commerce"),
    ("StreamBox Billing", "digital_services"),
    ("HomeTech Service Hub", "consumer_durables"),
    ("MarketMart Sellers", "e_commerce"),
    ("NewsPlus Digital", "digital_services"),
    ("DemoBank Cards", "banking"),
    ("ConnectTel Mobile", "telecom"),
    ("SafeLife Claims", "insurance"),
    ("QuickMeal Kitchens", "food_delivery"),
    ("TravelNow Airlines", "travel"),
    ("UrbanCart", "e_commerce"),
    ("PaySpring", "digital_payments"),
    ("BrightAppliances", "consumer_durables"),
    ("DailyBasket", "e_commerce"),
    ("LearnLoop", "digital_services"),
    ("Coastal Bank", "banking"),
    ("FiberFirst", "telecom"),
    ("ShieldSure", "insurance"),
    ("FreshRoute", "food_delivery"),
    ("HolidayCircle", "travel"),
)

SCENARIOS: tuple[dict[str, Any], ...] = (
    {
        "cluster_id": "demo-cluster-refund-delays",
        "cluster_key": "REFUND-DELAY-QUICKKART",
        "related_key": "REFUND-DELAY-QUICKKART-RELATED",
        "title": "Refund delays on QuickKart",
        "company_name": "QuickKart",
        "sector": "e_commerce",
        "issue": "refund_delay",
        "primary_count": 438,
        "related_count": 8,
        "amount": Decimal("3499.00"),
        "severity": Decimal("0.86"),
        "growth_rate": Decimal("2.40"),
        "description": "I cancelled my QuickKart order and the refund was confirmed, but the money has not returned.",
        "states": STATES[:12],
        "routing": {
            "route": "company_grievance_channel",
            "confidence": 0.62,
            "reason": "Start with the company grievance channel before consumer-system escalation.",
            "advisory": True,
            "source": "Deterministic e-commerce navigation rule",
        },
    },
    {
        "cluster_id": "demo-cluster-hidden-charges",
        "cluster_key": "HIDDEN-CHARGE-STREAMBOX",
        "related_key": "HIDDEN-CHARGE-STREAMBOX-RELATED",
        "title": "Hidden charges on StreamBox",
        "company_name": "StreamBox",
        "sector": "digital_services",
        "issue": "hidden_charge",
        "primary_count": 286,
        "related_count": 8,
        "amount": Decimal("149.00"),
        "severity": Decimal("0.71"),
        "growth_rate": Decimal("1.41"),
        "description": "At StreamBox checkout an extra convenience fee was not clearly shown before payment.",
        "states": STATES[:9],
        "routing": {
            "route": "consumer_grievance_system",
            "confidence": 0.50,
            "reason": "Potential hidden charge pattern requires authorized consumer-protection review.",
            "advisory": True,
            "source": "Deterministic issue navigation rule",
        },
    },
    {
        "cluster_id": "demo-cluster-warranty-rejection",
        "cluster_key": "WARRANTY-REJECTION-HOMETECH",
        "related_key": "WARRANTY-REJECTION-HOMETECH-RELATED",
        "title": "Warranty rejection by HomeTech",
        "company_name": "HomeTech",
        "sector": "consumer_durables",
        "issue": "warranty_service",
        "primary_count": 241,
        "related_count": 8,
        "amount": Decimal("4999.00"),
        "severity": Decimal("0.79"),
        "growth_rate": Decimal("1.82"),
        "description": "My HomeTech appliance stopped working during warranty and the service centre rejected the repair.",
        "states": STATES[:8],
        "routing": {
            "route": "consumer_grievance_system",
            "confidence": 0.35,
            "reason": "Documented warranty service complaints should be reviewed through the consumer grievance system.",
            "advisory": True,
            "source": "Deterministic fallback navigation rule",
        },
    },
    {
        "cluster_id": "demo-cluster-fake-listings",
        "cluster_key": "COUNTERFEIT-PRODUCT-MARKETMART",
        "related_key": "COUNTERFEIT-PRODUCT-MARKETMART-RELATED",
        "title": "Potentially counterfeit listings on MarketMart",
        "company_name": "MarketMart",
        "sector": "e_commerce",
        "issue": "counterfeit_product",
        "primary_count": 193,
        "related_count": 8,
        "amount": Decimal("2599.00"),
        "severity": Decimal("0.83"),
        "growth_rate": Decimal("1.09"),
        "description": "The MarketMart product received was not genuine and differed substantially from the listing.",
        "states": STATES[:7],
        "routing": {
            "route": "ccpa_signal",
            "confidence": 0.60,
            "reason": "A potential counterfeit pattern should be submitted as an advisory signal for authorized review.",
            "advisory": True,
            "source": "Deterministic consumer-protection navigation rule",
        },
    },
    {
        "cluster_id": "demo-cluster-subscription-traps",
        "cluster_key": "SUBSCRIPTION-ISSUE-NEWSPLUS",
        "related_key": "SUBSCRIPTION-ISSUE-NEWSPLUS-RELATED",
        "title": "Subscription cancellation friction on NewsPlus",
        "company_name": "NewsPlus",
        "sector": "digital_services",
        "issue": "subscription_issue",
        "primary_count": 167,
        "related_count": 8,
        "amount": Decimal("799.00"),
        "severity": Decimal("0.68"),
        "growth_rate": Decimal("0.94"),
        "description": "My NewsPlus free trial auto-renewed and charged me before the renewal was clear.",
        "states": STATES[:6],
        "routing": {
            "route": "ccpa_signal",
            "confidence": 0.60,
            "reason": "Potential dark-pattern concern should be reviewed as an advisory signal.",
            "advisory": True,
            "source": "Deterministic consumer-protection navigation rule",
        },
    },
    {
        "cluster_id": "demo-cluster-bank-fees",
        "cluster_key": "UNEXPECTED-SERVICE-FEE-DEMOBANK",
        "related_key": "UNEXPECTED-SERVICE-FEE-DEMOBANK-RELATED",
        "title": "Unexpected service fees on DemoBank",
        "company_name": "DemoBank",
        "sector": "banking",
        "issue": "unexpected_service_fee",
        "primary_count": 122,
        "related_count": 5,
        "amount": Decimal("299.00"),
        "severity": Decimal("0.65"),
        "growth_rate": Decimal("0.87"),
        "description": "DemoBank charged an unexpected service fee that was not clear when I opened the account.",
        "states": STATES[2:14],
        "routing": {
            "route": "sector_regulator_review",
            "confidence": 0.50,
            "reason": "Banking fee complaints may need sector-specific review after company escalation.",
            "advisory": True,
            "source": "Deterministic banking navigation rule",
        },
    },
    {
        "cluster_id": "demo-cluster-telecom-billing",
        "cluster_key": "UNEXPECTED-BILLING-CONNECTTEL",
        "related_key": "UNEXPECTED-BILLING-CONNECTTEL-RELATED",
        "title": "Unexpected billing on ConnectTel",
        "company_name": "ConnectTel",
        "sector": "telecom",
        "issue": "telecom_billing",
        "primary_count": 122,
        "related_count": 5,
        "amount": Decimal("399.00"),
        "severity": Decimal("0.67"),
        "growth_rate": Decimal("0.81"),
        "description": "My ConnectTel bill contains a service charge that I did not knowingly activate.",
        "states": STATES[4:16],
        "routing": {
            "route": "sector_regulator_review",
            "confidence": 0.50,
            "reason": "Unexpected telecom billing should be reviewed through the provider and sector pathway.",
            "advisory": True,
            "source": "Deterministic telecom navigation rule",
        },
    },
    {
        "cluster_id": "demo-cluster-insurance-delay",
        "cluster_key": "CLAIM-DELAY-SAFELIFE",
        "related_key": "CLAIM-DELAY-SAFELIFE-RELATED",
        "title": "Claim processing delays at SafeLife",
        "company_name": "SafeLife",
        "sector": "insurance",
        "issue": "claim_delay",
        "primary_count": 122,
        "related_count": 5,
        "amount": Decimal("18500.00"),
        "severity": Decimal("0.74"),
        "growth_rate": Decimal("0.76"),
        "description": "My SafeLife insurance claim is pending beyond the timeline communicated to me.",
        "states": STATES[6:18],
        "routing": {
            "route": "sector_regulator_review",
            "confidence": 0.50,
            "reason": "Claim delays should be reviewed through the insurer and sector-specific pathway.",
            "advisory": True,
            "source": "Deterministic insurance navigation rule",
        },
    },
    {
        "cluster_id": "demo-cluster-food-quality",
        "cluster_key": "FOOD-QUALITY-QUICKMEAL",
        "related_key": "FOOD-QUALITY-QUICKMEAL-RELATED",
        "title": "Food quality and refund issues on QuickMeal",
        "company_name": "QuickMeal",
        "sector": "food_delivery",
        "issue": "food_quality_refund",
        "primary_count": 122,
        "related_count": 5,
        "amount": Decimal("649.00"),
        "severity": Decimal("0.70"),
        "growth_rate": Decimal("0.69"),
        "description": "The QuickMeal food order was different from what I ordered and the refund is unresolved.",
        "states": STATES[8:20],
        "routing": {
            "route": "company_grievance_channel",
            "confidence": 0.55,
            "reason": "Start with the delivery platform before consumer-system escalation.",
            "advisory": True,
            "source": "Deterministic food-delivery navigation rule",
        },
    },
    {
        "cluster_id": "demo-cluster-travel-refunds",
        "cluster_key": "CANCELLATION-REFUND-TRAVELNOW",
        "related_key": "CANCELLATION-REFUND-TRAVELNOW-RELATED",
        "title": "Cancellation refund delays on TravelNow",
        "company_name": "TravelNow",
        "sector": "travel",
        "issue": "cancellation_refund",
        "primary_count": 122,
        "related_count": 5,
        "amount": Decimal("12499.00"),
        "severity": Decimal("0.76"),
        "growth_rate": Decimal("0.63"),
        "description": "TravelNow cancelled my booking but the confirmed refund has not arrived.",
        "states": STATES[:12],
        "routing": {
            "route": "company_grievance_channel",
            "confidence": 0.55,
            "reason": "Start with the travel provider before consumer-system escalation.",
            "advisory": True,
            "source": "Deterministic travel navigation rule",
        },
    },
)


def _stable_id(value: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"grahak-drishti-demo:{value}"))


def _timestamp(index: int) -> datetime:
    return datetime(2026, 1, 1, tzinfo=UTC) + timedelta(days=index % 180)


def _cluster_values(scenario: dict[str, Any], key: str, count: int) -> dict[str, Any]:
    return {
        "cluster_id": str(scenario["cluster_id"])
        if key == scenario["cluster_key"]
        else _stable_id(f"cluster-{key}"),
        "cluster_key": key,
        "title": scenario["title"],
        "company_name": scenario["company_name"],
        "sector": scenario["sector"],
        "issue": scenario["issue"],
        "reported_count": count,
        "confirmations": 0,
        "evidence_backed_count": 0,
        "reviewed_count": 0,
        "potential_dark_pattern_count": 0,
        "total_reported_amount": Decimal(0),
        "states_affected": 0,
        "growth_rate": scenario["growth_rate"],
        "severity": scenario["severity"],
        "unresolved_rate": Decimal("0.58"),
        "first_reported_at": _timestamp(0),
        "last_reported_at": _timestamp(count),
        "trend": [],
        "geography": [],
        "routing": scenario["routing"],
    }


def _clear_demo_records(session: Session) -> None:
    complaint_ids = [_stable_id(f"complaint-{index}") for index in range(1, 2001)]
    corroboration_ids = [
        _stable_id(f"corroboration-{index}") for index in range(1, 201)
    ]
    session.execute(
        delete(EvidenceRecord).where(
            EvidenceRecord.corroboration_id.in_(corroboration_ids)
        )
    )
    session.execute(
        delete(CorroborationRecord).where(CorroborationRecord.id.in_(corroboration_ids))
    )
    session.execute(
        delete(ComplaintStatusEvent).where(
            ComplaintStatusEvent.complaint_id.in_(complaint_ids)
        )
    )
    session.execute(
        delete(ComplaintAnalysisRecord).where(
            ComplaintAnalysisRecord.complaint_id.in_(complaint_ids)
        )
    )
    session.execute(
        delete(ComplaintContact).where(ComplaintContact.complaint_id.in_(complaint_ids))
    )
    session.execute(
        delete(OutboxEvent).where(OutboxEvent.aggregate_id.in_(complaint_ids))
    )
    session.execute(delete(Complaint).where(Complaint.id.in_(complaint_ids)))
    cluster_ids = [str(item["cluster_id"]) for item in SCENARIOS]
    cluster_ids.extend(
        _stable_id(f"cluster-{item['related_key']}") for item in SCENARIOS
    )
    session.execute(
        delete(IssueClusterRecord).where(IssueClusterRecord.cluster_id.in_(cluster_ids))
    )
    session.execute(
        delete(SyntheticSignal).where(
            SyntheticSignal.signal_id.in_(
                [_stable_id(f"signal-{index}") for index in range(1, 41)]
            )
        )
    )
    session.execute(
        delete(SyntheticConsumer).where(
            SyntheticConsumer.consumer_id.in_(
                [_stable_id(f"consumer-{index}") for index in range(1, 601)]
            )
        )
    )
    session.execute(
        delete(SyntheticMerchant).where(
            SyntheticMerchant.merchant_id.in_(
                [_stable_id(f"merchant-{index}") for index in range(1, 31)]
            )
        )
    )
    session.commit()


def seed(reset: bool = False) -> None:
    with SessionLocal() as session:
        if reset:
            _clear_demo_records(session)
        if (
            session.scalar(
                select(IssueClusterRecord).where(
                    IssueClusterRecord.cluster_key == SCENARIOS[0]["cluster_key"]
                )
            )
            is not None
        ):
            print("Deterministic demo data already exists; use --reset to restore it.")
            return
        for index, (name, sector) in enumerate(MERCHANTS, start=1):
            session.add(
                SyntheticMerchant(
                    merchant_id=_stable_id(f"merchant-{index}"),
                    name=name,
                    sector=sector,
                )
            )
        for index in range(1, 601):
            session.add(
                SyntheticConsumer(
                    consumer_id=_stable_id(f"consumer-{index}"),
                    display_name=f"Demo Consumer {index:03d}",
                    state=STATES[(index - 1) % len(STATES)],
                )
            )
        session.flush()
        global_index = 0
        for scenario in SCENARIOS:
            specs = (
                (str(scenario["cluster_key"]), int(scenario["primary_count"])),
                (str(scenario["related_key"]), int(scenario["related_count"])),
            )
            for cluster_key, count in specs:
                states = cast(tuple[str, ...], scenario["states"])
                cluster = IssueClusterRecord(
                    **_cluster_values(scenario, cluster_key, count)
                )
                session.add(cluster)
                session.flush()
                state_counts: Counter[str] = Counter()
                evidence_counts: Counter[str] = Counter()
                month_counts: Counter[str] = Counter()
                for local_index in range(count):
                    global_index += 1
                    complaint_id = _stable_id(f"complaint-{global_index}")
                    submitted_at = _timestamp(global_index)
                    state = states[local_index % len(states)]
                    amount = Decimal(scenario["amount"]) + Decimal(local_index % 7 * 25)
                    description = f"{scenario['description']} Reference {global_index}."
                    session.add(
                        Complaint(
                            id=complaint_id,
                            docket_number=f"GD-{complaint_id.replace('-', '').upper()[:12]}",
                            description=description,
                            company_name=str(scenario["company_name"]),
                            amount_involved=amount,
                            state=state,
                            status="analyzed",
                            submitted_at=submitted_at,
                            updated_at=submitted_at,
                        )
                    )
                    session.add(
                        ComplaintContact(
                            id=_stable_id(f"contact-{global_index}"),
                            complaint_id=complaint_id,
                            contact_type="email",
                            contact_digest=_contact_digest(
                                f"consumer-{global_index}@example.test"
                            ),
                        )
                    )
                    session.add(
                        ComplaintStatusEvent(
                            id=_stable_id(f"status-{global_index}"),
                            complaint_id=complaint_id,
                            status="analyzed",
                            label="Issue understood",
                            message="This synthetic report was organized into an advisory issue signal.",
                            occurred_at=submitted_at,
                        )
                    )
                    analysis = classify_complaint(
                        ComplaintInput(
                            description=description,
                            company_name=str(scenario["company_name"]),
                            amount_involved=amount,
                        )
                    )
                    dark_pattern = analyze_dark_pattern(description)
                    routing = recommend_route(analysis, dark_pattern)
                    session.add(
                        ComplaintAnalysisRecord(
                            id=_stable_id(f"analysis-{global_index}"),
                            complaint_id=complaint_id,
                            cluster_key=cluster_key,
                            analysis={
                                "classification": analysis.model_dump(mode="json"),
                                "dark_pattern": dark_pattern.model_dump(mode="json"),
                                "routing": routing.model_dump(mode="json"),
                            },
                            analyzed_at=submitted_at,
                        )
                    )
                    state_counts[state] += 1
                    month_counts[submitted_at.strftime("%b")] += 1
                    if global_index % 10 == 0:
                        corroboration_id = _stable_id(
                            f"corroboration-{global_index // 10}"
                        )
                        session.add(
                            CorroborationRecord(
                                id=corroboration_id,
                                cluster_id=cluster.cluster_id,
                                confirmation_digest=_contact_digest(
                                    f"evidence-{global_index}@example.test"
                                ),
                                explanation="Synthetic supporting proof for the demo dataset.",
                                status="accepted_for_signal",
                                submitted_at=submitted_at,
                            )
                        )
                        session.add(
                            EvidenceRecord(
                                id=_stable_id(f"evidence-{global_index // 10}"),
                                corroboration_id=corroboration_id,
                                evidence_type="order screenshot",
                                filename="synthetic-demo-proof.png",
                                synthetic_flag=True,
                                validation_status="accepted-for-signal",
                                review_note="Synthetic demo evidence; not legally verified.",
                                submitted_at=submitted_at,
                            )
                        )
                        cluster.confirmations += 1
                        cluster.evidence_backed_count += 1
                        cluster.reviewed_count += 1
                        evidence_counts[state] += 1
                cluster.total_reported_amount = sum(
                    (
                        Decimal(scenario["amount"]) + Decimal(index % 7 * 25)
                        for index in range(count)
                    ),
                    Decimal(0),
                )
                cluster.states_affected = len(state_counts)
                cluster.geography = [
                    {
                        "state": state,
                        "reports": reports,
                        "evidence_backed": evidence_counts.get(state, 0),
                    }
                    for state, reports in state_counts.most_common()
                ]
                cluster.trend = [
                    {"month": month, "reports": month_counts.get(month, 0)}
                    for month in ("Jan", "Feb", "Mar", "Apr", "May", "Jun")
                ]
                if str(scenario["issue"]) == "subscription_issue":
                    cluster.potential_dark_pattern_count = max(1, count // 4)
        for index in range(1, 41):
            scenario = SCENARIOS[(index - 1) % len(SCENARIOS)]
            session.add(
                SyntheticSignal(
                    signal_id=_stable_id(f"signal-{index}"),
                    cluster_key=str(scenario["cluster_key"]),
                    consumer_id=_stable_id(f"consumer-{index}"),
                    signal_type="evidence_backed" if index % 2 == 0 else "reported",
                    created_at=_timestamp(index),
                )
            )
        session.commit()
    print(
        "Seeded 2,000 complaints across 10 synthetic issue niches and "
        "20 issue clusters."
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the deterministic demo dataset.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Clear demo-owned records before reseeding.",
    )
    seed(reset=parser.parse_args().reset)
