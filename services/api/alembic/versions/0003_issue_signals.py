"""Create aggregate issue and consumer confirmation tables."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_issue_signals"
down_revision: Union[str, None] = "0002_complaints"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "issue_clusters",
        sa.Column("cluster_id", sa.String(length=36), nullable=False),
        sa.Column("cluster_key", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=240), nullable=False),
        sa.Column("company_name", sa.String(length=200), nullable=True),
        sa.Column("sector", sa.String(length=80), nullable=False),
        sa.Column("issue", sa.String(length=80), nullable=False),
        sa.Column("reported_count", sa.Integer(), nullable=False),
        sa.Column("confirmations", sa.Integer(), server_default="0", nullable=False),
        sa.Column("total_reported_amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("states_affected", sa.Integer(), server_default="0", nullable=False),
        sa.Column("growth_rate", sa.Numeric(8, 4), server_default="0", nullable=False),
        sa.Column("severity", sa.Numeric(5, 4), server_default="0", nullable=False),
        sa.Column(
            "unresolved_rate", sa.Numeric(5, 4), server_default="0", nullable=False
        ),
        sa.Column("first_reported_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_reported_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "reported_count >= 1", name="ck_issue_clusters_reported_count"
        ),
        sa.CheckConstraint(
            "confirmations >= 0", name="ck_issue_clusters_confirmations"
        ),
        sa.CheckConstraint(
            "total_reported_amount IS NULL OR total_reported_amount >= 0",
            name="ck_issue_clusters_amount_non_negative",
        ),
        sa.PrimaryKeyConstraint("cluster_id"),
        sa.UniqueConstraint("cluster_key"),
    )
    op.create_index(
        "ix_issue_clusters_sector_issue", "issue_clusters", ["sector", "issue"]
    )
    op.create_table(
        "consumer_confirmations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("cluster_id", sa.String(length=36), nullable=False),
        sa.Column("confirmation_digest", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["cluster_id"], ["issue_clusters.cluster_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "cluster_id",
            "confirmation_digest",
            name="uq_consumer_confirmations_cluster_digest",
        ),
    )
    op.create_index(
        "ix_consumer_confirmations_cluster",
        "consumer_confirmations",
        ["cluster_id"],
    )


def downgrade() -> None:
    raise RuntimeError(
        "The issue signal migration is data-bearing and cannot be downgraded "
        "automatically."
    )
