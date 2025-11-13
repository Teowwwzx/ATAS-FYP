"""Rename join_source to join_method on event_participants

Revision ID: 8c21f5a9b123
Revises: 7b9c8d1e2f34
Create Date: 2025-10-30 22:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8c21f5a9b123'
down_revision: Union[str, None] = '7b9c8d1e2f34'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL supports column rename via ALTER TABLE
    op.alter_column('event_participants', 'join_source', new_column_name='join_method')


def downgrade() -> None:
    op.alter_column('event_participants', 'join_method', new_column_name='join_source')