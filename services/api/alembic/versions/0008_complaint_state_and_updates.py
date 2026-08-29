"""Add complaint state and update timestamps."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008_complaint_state_and_updates"
down_revision: Union[str, None] = "0007_worker_claims"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("complaints", sa.Column("state", sa.String(length=80)))
    op.add_column(
        "complaints",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    connection = op.get_bind()
    connection.execute(sa.text("UPDATE complaints SET updated_at = submitted_at"))
    if connection.dialect.name != "sqlite":
        op.alter_column("complaints", "updated_at", nullable=False)


def downgrade() -> None:
    op.drop_column("complaints", "updated_at")
    op.drop_column("complaints", "state")