"""
add 'published' to eventstatus enum

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2025-12-03
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE eventstatus ADD VALUE IF NOT EXISTS 'published'")


def downgrade() -> None:
    pass

