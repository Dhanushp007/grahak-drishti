from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from services.api.app.dashboard import dashboard_geography, dashboard_overview
from services.api.app.dashboard_schemas import DashboardOverview, GeographyResponse
from services.api.app.db import get_db
from services.api.app.issue_routes import read_public_issue, read_public_issues
from services.api.app.issue_schemas import PublicIssueResponse

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=DashboardOverview)
def read_dashboard_overview(
    session: Annotated[Session, Depends(get_db)],
) -> DashboardOverview:
    return dashboard_overview(session)


@router.get("/issues", response_model=list[PublicIssueResponse])
def read_dashboard_issues(
    session: Annotated[Session, Depends(get_db)],
) -> list[PublicIssueResponse]:
    return read_public_issues(session)


@router.get("/issues/{cluster_key}", response_model=PublicIssueResponse)
def read_dashboard_issue(
    cluster_key: str, session: Annotated[Session, Depends(get_db)]
) -> PublicIssueResponse:
    return read_public_issue(cluster_key, session)


@router.get("/geography", response_model=GeographyResponse)
def read_dashboard_geography(
    session: Annotated[Session, Depends(get_db)], issue: str | None = None
) -> GeographyResponse:
    return dashboard_geography(session, issue)
