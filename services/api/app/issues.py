import hashlib
import hmac
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from services.api.app.config import get_settings
from services.api.app.models import ConsumerConfirmation, IssueClusterRecord


class IssueNotFoundError(Exception):
    pass


def _confirmation_digest(confirmation_key: str) -> str:
    secret = get_settings().contact_hash_secret.encode()
    return hmac.new(
        secret, confirmation_key.strip().encode(), hashlib.sha256
    ).hexdigest()


def get_issue_cluster(session: Session, cluster_key: str) -> IssueClusterRecord:
    cluster = session.scalar(
        select(IssueClusterRecord).where(IssueClusterRecord.cluster_key == cluster_key)
    )
    if cluster is None:
        raise IssueNotFoundError
    return cluster


def list_issue_clusters(session: Session) -> list[IssueClusterRecord]:
    return list(
        session.scalars(
            select(IssueClusterRecord).order_by(
                IssueClusterRecord.reported_count.desc(),
                IssueClusterRecord.last_reported_at.desc(),
            )
        )
    )


def confirm_issue(
    session: Session, cluster_key: str, confirmation_key: str
) -> tuple[IssueClusterRecord, bool]:
    cluster = get_issue_cluster(session, cluster_key)
    digest = _confirmation_digest(confirmation_key)
    existing = session.scalar(
        select(ConsumerConfirmation).where(
            ConsumerConfirmation.cluster_id == cluster.cluster_id,
            ConsumerConfirmation.confirmation_digest == digest,
        )
    )
    if existing is not None:
        return cluster, False

    try:
        session.add(
            ConsumerConfirmation(
                id=str(uuid4()),
                cluster_id=cluster.cluster_id,
                confirmation_digest=digest,
                created_at=datetime.now(UTC),
            )
        )
        cluster.confirmations += 1
        session.commit()
    except IntegrityError:
        session.rollback()
        return get_issue_cluster(session, cluster_key), False
    return cluster, True
