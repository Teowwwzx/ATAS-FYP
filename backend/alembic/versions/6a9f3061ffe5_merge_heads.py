"""Merge heads

Revision ID: 6a9f3061ffe5
Revises: 5c1a2b3e4d6f, 5f0bf587331b
Create Date: 2025-12-31 13:08:12.258557

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6a9f3061ffe5'
down_revision: Union[str, None] = ('5c1a2b3e4d6f', '5f0bf587331b')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
