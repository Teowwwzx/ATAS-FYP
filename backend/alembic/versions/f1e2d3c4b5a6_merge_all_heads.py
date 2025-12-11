"""merge_all_heads

Revision ID: f1e2d3c4b5a6
Revises: 9f0a1b2c3d4e, 8a1c2f4f9b1a
Create Date: 2025-12-11 11:52:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1e2d3c4b5a6'
down_revision: Union[str, None] = ('9f0a1b2c3d4e', '8a1c2f4f9b1a')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge heads; no schema changes."""
    pass


def downgrade() -> None:
    """Downgrade merge; no schema changes."""
    pass

