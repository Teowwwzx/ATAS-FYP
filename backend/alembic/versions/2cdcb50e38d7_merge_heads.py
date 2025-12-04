"""merge heads

Revision ID: 2cdcb50e38d7
Revises: a7d2c9b1f3a8, e5f6a7b8c9d0
Create Date: 2025-12-04 13:30:23.101051

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2cdcb50e38d7'
down_revision: Union[str, None] = ('a7d2c9b1f3a8', 'e5f6a7b8c9d0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
