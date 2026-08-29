"""Add worker processing, upload metadata, and synthetic seed entity tables."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_worker_uploads_seed_entities"
down_revision: Union[str, None] = "0004_demo_intelligence"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "outbox_events", sa.Column("processed_at", sa.DateTime(timezone=True))
    )
    op.add_column("evidence_records", sa.Column("storage_key", sa.String(length=300)))
    op.add_column("evidence_records", sa.Column("content_type", sa.String(length=120)))
    op.add_column("evidence_records", sa.Column("file_size_bytes", sa.Integer()))
    op.add_column("evidence_records", sa.Column("sha256_digest", sa.String(length=64)))
    op.create_index("ix_outbox_events_unprocessed", "outbox_events", ["processed_at"])

    op.create_table(
        "synthetic_consumers",
        sa.Column("consumer_id", sa.String(length=36), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("state", sa.String(length=80), nullable=False),
        sa.Column(
            "synthetic_flag", sa.Boolean(), server_default=sa.true(), nullable=False
        ),
        sa.PrimaryKeyConstraint("consumer_id"),
    )
    op.create_table(
        "synthetic_signals",
        sa.Column("signal_id", sa.String(length=36), nullable=False),
        sa.Column("cluster_key", sa.String(length=160), nullable=False),
        sa.Column("consumer_id", sa.String(length=36), nullable=False),
        sa.Column("signal_type", sa.String(length=32), nullable=False),
        sa.Column(
            "synthetic_flag", sa.Boolean(), server_default=sa.true(), nullable=False
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["consumer_id"], ["synthetic_consumers.consumer_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("signal_id"),
    )
    op.create_index(
        "ix_synthetic_signals_cluster", "synthetic_signals", ["cluster_key"]
    )


def downgrade() -> None:
    raise RuntimeError(
        "The worker and seed entity migration is data-bearing and cannot be "
        "downgraded automatically."
    )