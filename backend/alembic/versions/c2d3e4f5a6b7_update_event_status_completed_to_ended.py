"""
update event status 'completed' to 'ended'

Revision ID: c2d3e4f5a6b7
Revises: b1a2c3d4e5f6
Create Date: 2025-12-03
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c2d3e4f5a6b7'
down_revision = 'b1a2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ensure enum includes 'ended' (must be committed before usage)
    op.execute("ALTER TYPE eventstatus ADD VALUE IF NOT EXISTS 'ended'")


def downgrade() -> None:
    pass
