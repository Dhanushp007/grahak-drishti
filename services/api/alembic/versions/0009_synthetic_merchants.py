"""Add synthetic merchant reference records for the demo dataset."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009_synthetic_merchants"
down_revision: Union[str, None] = "0008_complaint_state_and_updates"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "synthetic_merchants",
        sa.Column("merchant_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("sector", sa.String(length=80), nullable=False),
        sa.Column(
            "synthetic_flag", sa.Boolean(), server_default=sa.true(), nullable=False
        ),
        sa.PrimaryKeyConstraint("merchant_id"),
        sa.UniqueConstraint("name"),
    )


def downgrade() -> None:
    op.drop_table("synthetic_merchants")