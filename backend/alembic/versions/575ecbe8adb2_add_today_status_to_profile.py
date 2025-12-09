"""add_today_status_to_profile

Revision ID: 575ecbe8adb2
Revises: fe87965c64ca
Create Date: 2025-12-09 19:43:34.465507

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '575ecbe8adb2'
down_revision: Union[str, None] = 'fe87965c64ca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('profiles', sa.Column('today_status', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('profiles', 'today_status')
