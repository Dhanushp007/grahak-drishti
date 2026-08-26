import argparse
import time
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from services.ai.app.classifier import ComplaintInput
from services.ai.app.duplicates import build_complaint_record, detect_duplicate
from services.api.app.db import SessionLocal
from services.api.app.intelligence import analyze_complaint
from services.api.app.models import Complaint, ComplaintAnalysisRecord, OutboxEvent


def _duplicate_summary(session: Session, complaint: Complaint) -> dict[str, object]:
    candidate = build_complaint_record(
        complaint.id,
        ComplaintInput(
            description=complaint.description,
            company_name=complaint.company_name,
            amount_involved=complaint.amount_involved,
        ),
        complaint.submitted_at,
    )
    decisions = []
    for existing in session.scalars(
        select(Complaint).where(Complaint.id != complaint.id).limit(100)
    ):
        comparison = build_complaint_record(
            existing.id,
            ComplaintInput(
                description=existing.description,
                company_name=existing.company_name,
                amount_involved=existing.amount_involved,
            ),
            existing.submitted_at,
        )
        decision = detect_duplicate(candidate, comparison)
        if decision.decision != "not_duplicate":
            decisions.append(decision)
    best = max(decisions, key=lambda decision: decision.score, default=None)
    return {
        "decision": best.decision if best else "not_duplicate",
        "score": best.score if best else 0.0,
        "candidate_count": len(decisions),
    }


def process_complaint_event(session: Session, event: OutboxEvent) -> None:
    if event.event_type != "complaint.created.v1":
        event.processed_at = datetime.now(UTC)
        session.commit()
        return
    complaint = session.get(Complaint, event.aggregate_id)
    if complaint is None:
        raise ValueError("complaint for event was not found")
    existing = session.scalar(
        select(ComplaintAnalysisRecord).where(
            ComplaintAnalysisRecord.complaint_id == complaint.id
        )
    )
    if existing is None:
        analysis, _ = analyze_complaint(session, complaint)
        analysis.analysis = {
            **analysis.analysis,
            "duplicate_detection": _duplicate_summary(session, complaint),
        }
        session.commit()
    event.attempts += 1
    event.processed_at = datetime.now(UTC)
    session.commit()


def process_pending_events(session: Session, limit: int = 100) -> int:
    events = list(
        session.scalars(
            select(OutboxEvent)
            .where(OutboxEvent.processed_at.is_(None))
            .order_by(OutboxEvent.created_at)
            .limit(limit)
        )
    )
    processed = 0
    for event in events:
        try:
            process_complaint_event(session, event)
        except Exception:
            event.attempts += 1
            session.commit()
            raise
        processed += 1
    return processed


def run_once(limit: int = 100) -> int:
    with SessionLocal() as session:
        return process_pending_events(session, limit)


def run_forever(interval_seconds: float = 1.0, limit: int = 100) -> None:
    while True:
        run_once(limit)
        time.sleep(interval_seconds)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Consume complaint outbox events.")
    parser.add_argument(
        "--once", action="store_true", help="Process one batch and exit."
    )
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--interval", type=float, default=1.0)
    arguments = parser.parse_args()
    if arguments.once:
        print(f"Processed {run_once(arguments.limit)} complaint events.")
    else:
        run_forever(arguments.interval, arguments.limit)