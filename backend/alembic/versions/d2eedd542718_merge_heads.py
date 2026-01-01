"""merge_heads

Revision ID: d2eedd542718
Revises: 6ee0337837d4, f6da033b1814
Create Date: 2026-01-01 14:37:06.928013

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd2eedd542718'
down_revision: Union[str, None] = ('6ee0337837d4', 'f6da033b1814')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
