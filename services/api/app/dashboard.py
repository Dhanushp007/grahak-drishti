from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from services.api.app.dashboard_schemas import (
    DashboardKpi,
    DashboardOverview,
    GeographyPoint,
    GeographyResponse,
)
from services.api.app.issue_schemas import PublicIssueResponse
from services.api.app.models import IssueClusterRecord


def _as_int(value: object) -> int:
    if isinstance(value, (int, float, str)):
        return int(value)
    return 0


def _clusters(session: Session) -> list[IssueClusterRecord]:
    return list(
        session.scalars(
            select(IssueClusterRecord).order_by(
                IssueClusterRecord.reported_count.desc(),
                IssueClusterRecord.last_reported_at.desc(),
            )
        )
    )


def dashboard_overview(session: Session) -> DashboardOverview:
    clusters = _clusters(session)
    total_reports = sum(cluster.reported_count for cluster in clusters)
    high_severity = sum(cluster.severity >= 0.75 for cluster in clusters)
    fraud_clusters = sum(
        cluster.issue in {"counterfeit_product", "subscription_issue"}
        for cluster in clusters
    )
    dark_pattern_reports = sum(
        cluster.potential_dark_pattern_count for cluster in clusters
    )
    top_issues = [
        PublicIssueResponse.model_validate(cluster) for cluster in clusters[:5]
    ]
    signal_strength = (
        round(
            sum(float(cluster.severity) for cluster in clusters)
            / len(clusters)
            * 100
        )
        if clusters
        else 0
    )
    return DashboardOverview(
        as_of=datetime.now(UTC).strftime("%d %b %Y, %H:%M UTC"),
        data_label="Synthetic demonstration data",
        kpis=[
            DashboardKpi(
                label="New complaints", value=total_reports, change="+18%", tone="coral"
            ),
            DashboardKpi(
                label="Systemic issues", value=len(clusters), change="+12", tone="teal"
            ),
            DashboardKpi(
                label="High-severity issues",
                value=high_severity,
                change="+4",
                tone="yellow",
            ),
            DashboardKpi(
                label="Potential fraud clusters",
                value=fraud_clusters,
                change="+2",
                tone="ink",
            ),
            DashboardKpi(
                label="Potential dark-pattern reports",
                value=dark_pattern_reports,
                change="+7",
                tone="coral",
            ),
        ],
        issues=top_issues,
        signal_strength=signal_strength,
        synthetic_notice=(
            "Figures are synthetic and are not official government statistics."
        ),
    )


def dashboard_geography(
    session: Session, issue_filter: str | None = None
) -> GeographyResponse:
    clusters = _clusters(session)
    if issue_filter:
        clusters = [
            cluster for cluster in clusters if cluster.cluster_key == issue_filter
        ]
    state_totals: dict[str, dict[str, int]] = {}
    for cluster in clusters:
        for point in cluster.geography or []:
            state = str(point.get("state", "Unknown"))
            state_totals.setdefault(state, {"reports": 0, "evidence_backed": 0})
            state_totals[state]["reports"] += _as_int(point.get("reports", 0))
            state_totals[state]["evidence_backed"] += _as_int(
                point.get("evidence_backed", 0)
            )
    total_reports = sum(values["reports"] for values in state_totals.values())
    states = [
        GeographyPoint(
            state=state,
            reports=values["reports"],
            evidence_backed=values["evidence_backed"],
            share=round(values["reports"] * 100 / total_reports)
            if total_reports
            else 0,
        )
        for state, values in sorted(
            state_totals.items(), key=lambda item: item[1]["reports"], reverse=True
        )
    ]
    return GeographyResponse(
        data_label="Synthetic state-level issue distribution",
        issue_filter=issue_filter,
        states=states,
    )
