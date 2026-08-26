from typing import Annotated

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from services.api.app.db import get_db
from services.api.app.issue_schemas import (
    IssueConfirmationResponse,
    PublicIssueResponse,
)
from services.api.app.issues import confirm_issue, get_issue_cluster

router = APIRouter(prefix="/api/v1/issues", tags=["issues"])


@router.get("/{cluster_key}", response_model=PublicIssueResponse)
def read_public_issue(
    cluster_key: str, session: Annotated[Session, Depends(get_db)]
) -> PublicIssueResponse:
    return PublicIssueResponse.model_validate(get_issue_cluster(session, cluster_key))


@router.post("/{cluster_key}/confirm", response_model=IssueConfirmationResponse)
def confirm_public_issue(
    cluster_key: str,
    session: Annotated[Session, Depends(get_db)],
    confirmation_key: Annotated[
        str, Header(alias="X-Confirmation-Key", min_length=16, max_length=128)
    ],
) -> IssueConfirmationResponse:
    cluster, recorded = confirm_issue(session, cluster_key, confirmation_key)
    return IssueConfirmationResponse(
        cluster_key=cluster.cluster_key,
        confirmations=cluster.confirmations,
        recorded=recorded,
    )
