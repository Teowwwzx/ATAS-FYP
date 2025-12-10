"""add_is_onboarded_column

Revision ID: 869e69bb0efa
Revises: 72d3c7f96bf6
Create Date: 2025-12-09 19:03:12.927614

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '869e69bb0efa'
down_revision: Union[str, None] = '72d3c7f96bf6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('profiles', sa.Column('is_onboarded', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('profiles', 'is_onboarded')
