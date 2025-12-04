"""
update rows: set status 'completed' to 'ended'

Revision ID: d4e5f6a7b8c9
Revises: c2d3e4f5a6b7
Create Date: 2025-12-03
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4e5f6a7b8c9'
down_revision = 'c2d3e4f5a6b7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE events SET status='ended' WHERE status='completed'")


def downgrade() -> None:
    op.execute("UPDATE events SET status='completed' WHERE status='ended'")

