"""add_organization_status

Revision ID: 3a1b8c9d0e12
Revises: 2136482fa6d8
Create Date: 2025-12-11 10:15:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a1b8c9d0e12'
down_revision: Union[str, None] = '2136482fa6d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create enum type for organization status
    status_enum = sa.Enum('pending', 'approved', 'rejected', name='organizationstatus')
    status_enum.create(op.get_bind(), checkfirst=True)

    # Add column with server_default 'approved' to backfill existing rows
    op.add_column('organizations', sa.Column('status', status_enum, nullable=False, server_default='approved'))

    # Optional: remove server default to rely on application-level default thereafter
    op.alter_column('organizations', 'status', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop column and enum type
    op.drop_column('organizations', 'status')
    status_enum = sa.Enum('pending', 'approved', 'rejected', name='organizationstatus')
    status_enum.drop(op.get_bind(), checkfirst=True)

