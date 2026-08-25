"""Create private complaint intake and outbox tables."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_complaints"
down_revision: Union[str, None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "complaints",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("docket_number", sa.String(length=24), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("company_name", sa.String(length=200), nullable=True),
        sa.Column("amount_involved", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column(
            "currency", sa.String(length=3), server_default="INR", nullable=False
        ),
        sa.Column(
            "status", sa.String(length=32), server_default="submitted", nullable=False
        ),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "amount_involved IS NULL OR amount_involved >= 0",
            name="ck_complaints_amount_non_negative",
        ),
        sa.CheckConstraint("currency = 'INR'", name="ck_complaints_currency_inr"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("docket_number"),
    )
    op.create_index("ix_complaints_status", "complaints", ["status"])
    op.create_index("ix_complaints_submitted_at", "complaints", ["submitted_at"])

    op.create_table(
        "complaint_contacts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("complaint_id", sa.String(length=36), nullable=False),
        sa.Column("contact_type", sa.String(length=16), nullable=False),
        sa.Column("contact_digest", sa.String(length=64), nullable=False),
        sa.CheckConstraint(
            "contact_type IN ('email', 'phone')", name="ck_complaint_contacts_type"
        ),
        sa.ForeignKeyConstraint(
            ["complaint_id"], ["complaints.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("complaint_id"),
    )
    op.create_index(
        "ix_complaint_contacts_digest", "complaint_contacts", ["contact_digest"]
    )

    op.create_table(
        "complaint_status_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("complaint_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("message", sa.String(length=300), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["complaint_id"], ["complaints.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_complaint_status_events_complaint",
        "complaint_status_events",
        ["complaint_id", "occurred_at"],
    )

    op.create_table(
        "outbox_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("event_type", sa.String(length=120), nullable=False),
        sa.Column("aggregate_id", sa.String(length=36), nullable=False),
        sa.Column("trace_id", sa.String(length=36), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key"),
    )
    op.create_index("ix_outbox_events_unpublished", "outbox_events", ["published_at"])


def downgrade() -> None:
    raise RuntimeError(
        "The complaint migration is data-bearing and cannot be downgraded "
        "automatically."
    )
