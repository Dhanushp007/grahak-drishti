from sqlalchemy import func, select
from sqlalchemy.orm import Session

from services.api.app.db import Base, SessionLocal
from services.api.app.models import (
    Complaint,
    ComplaintAnalysisRecord,
    EvidenceRecord,
    IssueClusterRecord,
    SyntheticConsumer,
    SyntheticMerchant,
    SyntheticSignal,
)

REQUIRED_CLUSTERS = {
    "REFUND-DELAY-QUICKKART",
    "HIDDEN-CHARGE-STREAMBOX",
    "WARRANTY-REJECTION-HOMETECH",
    "COUNTERFEIT-PRODUCT-MARKETMART",
    "SUBSCRIPTION-ISSUE-NEWSPLUS",
}


def count(session: Session, model: type[Base]) -> int:
    return int(session.scalar(select(func.count()).select_from(model)) or 0)


def as_int(value: object) -> int:
    return int(value) if isinstance(value, (int, float, str)) else 0


def validate() -> None:
    with SessionLocal() as session:
        complaints = count(session, Complaint)
        analyses = count(session, ComplaintAnalysisRecord)
        clusters = list(session.scalars(select(IssueClusterRecord)))
        consumers = count(session, SyntheticConsumer)
        merchants = count(session, SyntheticMerchant)
        signals = count(session, SyntheticSignal)
        evidence = count(session, EvidenceRecord)
        states = session.scalars(
            select(Complaint.state).where(Complaint.state.is_not(None))
        ).all()
        cluster_keys = {cluster.cluster_key for cluster in clusters}
        failures = []
        if complaints < 1900:
            failures.append(
                f"expected approximately 2,000 complaints, found {complaints}"
            )
        if analyses != complaints:
            failures.append(
                f"expected one analysis per complaint, found {analyses} analyses"
            )
        if not 20 <= len(clusters) <= 30:
            failures.append(f"expected 20-30 clusters, found {len(clusters)}")
        if not 500 <= consumers <= 800:
            failures.append(f"expected 500-800 consumers, found {consumers}")
        if not 25 <= merchants <= 40:
            failures.append(f"expected 25-40 merchants, found {merchants}")
        if not 20 <= signals <= 50:
            failures.append(f"expected 20-50 signals, found {signals}")
        if not 100 <= evidence <= 300:
            failures.append(f"expected 100-300 evidence records, found {evidence}")
        if len(set(states)) < 15:
            failures.append(f"expected at least 15 states, found {len(set(states))}")
        missing = REQUIRED_CLUSTERS - cluster_keys
        if missing:
            failures.append(f"missing showcase clusters: {sorted(missing)}")
        for cluster in clusters:
            analysis_count = session.scalar(
                select(func.count()).select_from(ComplaintAnalysisRecord).where(
                    ComplaintAnalysisRecord.cluster_key == cluster.cluster_key
                )
            )
            if int(analysis_count or 0) != cluster.reported_count:
                failures.append(
                    f"cluster {cluster.cluster_key} count does not match its "
                    "complaint analyses"
                )
            geography_evidence = sum(
                as_int(point.get("evidence_backed", 0))
                for point in cluster.geography or []
            )
            if geography_evidence != cluster.evidence_backed_count:
                failures.append(
                    f"cluster {cluster.cluster_key} geography evidence does not "
                    "match its evidence records"
                )
            if cluster.reported_count < 1:
                failures.append(f"cluster {cluster.cluster_key} has no complaints")
        if failures:
            raise SystemExit("Demo data validation failed:\n- " + "\n- ".join(failures))
        print(
            f"Demo data valid: {complaints} complaints, {len(clusters)} clusters, "
            f"{consumers} consumers, {merchants} merchants, "
            f"{evidence} evidence records."
        )


if __name__ == "__main__":
    validate()
