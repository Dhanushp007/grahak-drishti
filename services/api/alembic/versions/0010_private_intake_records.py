"""Add private confirmed rich complaint intake records."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010_private_intake_records"
down_revision: Union[str, None] = "0009_synthetic_merchants"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "complaint_intake_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("complaint_id", sa.String(length=36), nullable=False),
        sa.Column("schema_version", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column(
            "aggregate_intelligence",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
        sa.Column(
            "share_with_official_authority",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
        sa.Column("provider", sa.String(length=32), nullable=True),
        sa.Column("model", sa.String(length=120), nullable=True),
        sa.Column(
            "consumer_edited", sa.Boolean(), server_default=sa.false(), nullable=False
        ),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "aggregate_intelligence IN (TRUE, FALSE)",
            name="ck_complaint_intake_aggregate_intelligence",
        ),
        sa.ForeignKeyConstraint(
            ["complaint_id"], ["complaints.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("complaint_id"),
    )
    op.create_index(
        "ix_complaint_intake_records_aggregate",
        "complaint_intake_records",
        ["aggregate_intelligence"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_complaint_intake_records_aggregate",
        table_name="complaint_intake_records",
    )
    op.drop_table("complaint_intake_records")