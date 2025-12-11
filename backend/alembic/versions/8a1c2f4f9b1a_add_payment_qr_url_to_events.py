"""add_payment_qr_url_to_events

Revision ID: 8a1c2f4f9b1a
Revises: 2136482fa6d8
Create Date: 2025-12-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8a1c2f4f9b1a'
down_revision: Union[str, None] = '2136482fa6d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('events', sa.Column('payment_qr_url', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('events', 'payment_qr_url')

