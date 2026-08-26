"""Add aggregate potential dark-pattern issue counts."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_dark_pattern_aggregate"
down_revision: Union[str, None] = "0005_worker_uploads_seed_entities"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "issue_clusters",
        sa.Column(
            "potential_dark_pattern_count",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )


def downgrade() -> None:
    raise RuntimeError(
        "The dark-pattern aggregate migration is data-bearing and cannot be "
        "downgraded automatically."
    )