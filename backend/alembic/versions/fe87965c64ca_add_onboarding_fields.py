"""add_onboarding_fields

Revision ID: fe87965c64ca
Revises: 869e69bb0efa
Create Date: 2025-12-09 19:20:13.384048

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fe87965c64ca'
down_revision: Union[str, None] = '869e69bb0efa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('profiles', sa.Column('country', sa.String(), nullable=True))
    op.add_column('profiles', sa.Column('city', sa.String(), nullable=True))
    op.add_column('profiles', sa.Column('origin_country', sa.String(), nullable=True))
    op.add_column('profiles', sa.Column('can_be_speaker', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('profiles', sa.Column('intents', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('profiles', 'intents')
    op.drop_column('profiles', 'can_be_speaker')
    op.drop_column('profiles', 'origin_country')
    op.drop_column('profiles', 'city')
    op.drop_column('profiles', 'country')
