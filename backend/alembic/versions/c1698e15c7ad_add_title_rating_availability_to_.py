"""Add title, rating, availability to profiles

Revision ID: c1698e15c7ad
Revises: f3a1b2c4d5e6
Create Date: 2025-12-07 13:53:12.659870

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1698e15c7ad'
down_revision: Union[str, None] = 'f3a1b2c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('profiles', sa.Column('title', sa.String(), nullable=True))
    # Use server_default to handle existing rows
    op.add_column('profiles', sa.Column('average_rating', sa.Float(), nullable=False, server_default='0.0'))
    op.add_column('profiles', sa.Column('availability', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('profiles', 'availability')
    op.drop_column('profiles', 'average_rating')
    op.drop_column('profiles', 'title')
