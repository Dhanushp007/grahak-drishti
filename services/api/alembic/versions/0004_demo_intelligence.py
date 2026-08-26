"""Add complaint analysis and evidence-backed demo intelligence records."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_demo_intelligence"
down_revision: Union[str, None] = "0003_issue_signals"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "issue_clusters",
        sa.Column(
            "evidence_backed_count", sa.Integer(), server_default="0", nullable=False
        ),
    )
    op.add_column(
        "issue_clusters",
        sa.Column("reviewed_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column("issue_clusters", sa.Column("trend", sa.JSON(), nullable=True))
    op.add_column("issue_clusters", sa.Column("geography", sa.JSON(), nullable=True))
    op.add_column("issue_clusters", sa.Column("routing", sa.JSON(), nullable=True))

    op.create_table(
        "complaint_analyses",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("complaint_id", sa.String(length=36), nullable=False),
        sa.Column("cluster_key", sa.String(length=160), nullable=True),
        sa.Column("analysis", sa.JSON(), nullable=False),
        sa.Column("analyzed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["complaint_id"], ["complaints.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("complaint_id"),
    )
    op.create_table(
        "corroborations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("cluster_id", sa.String(length=36), nullable=False),
        sa.Column("confirmation_digest", sa.String(length=64), nullable=False),
        sa.Column("explanation", sa.String(length=500), nullable=True),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default="pending_evidence",
            nullable=False,
        ),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["cluster_id"], ["issue_clusters.cluster_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "cluster_id",
            "confirmation_digest",
            name="uq_corroborations_cluster_digest",
        ),
    )
    op.create_index("ix_corroborations_cluster", "corroborations", ["cluster_id"])
    op.create_table(
        "evidence_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("corroboration_id", sa.String(length=36), nullable=False),
        sa.Column("evidence_type", sa.String(length=64), nullable=False),
        sa.Column("filename", sa.String(length=200), nullable=True),
        sa.Column(
            "synthetic_flag", sa.Boolean(), server_default=sa.true(), nullable=False
        ),
        sa.Column(
            "validation_status",
            sa.String(length=32),
            server_default="pending-review",
            nullable=False,
        ),
        sa.Column("review_note", sa.String(length=300), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["corroboration_id"], ["corroborations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("corroboration_id"),
    )


def downgrade() -> None:
    raise RuntimeError(
        "The demo intelligence migration is data-bearing and cannot be "
        "downgraded automatically."
    )