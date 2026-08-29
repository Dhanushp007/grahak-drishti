"""Add an outbox claim timestamp for safe worker concurrency."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007_worker_claims"
down_revision: Union[str, None] = "0006_dark_pattern_aggregate"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("outbox_events", sa.Column("claimed_at", sa.DateTime(timezone=True)))
    op.create_index("ix_outbox_events_unclaimed", "outbox_events", ["claimed_at"])


def downgrade() -> None:
    raise RuntimeError("Worker claims migration cannot be downgraded automatically.")