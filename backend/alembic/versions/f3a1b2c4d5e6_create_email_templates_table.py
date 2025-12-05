"""create email templates table

Revision ID: f3a1b2c4d5e6
Revises: 18b2481347f8
Create Date: 2025-12-05 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "f3a1b2c4d5e6"
down_revision = "18b2481347f8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "email_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("subject", sa.String(), nullable=False),
        sa.Column("body_html", sa.Text(), nullable=False),
        sa.Column("variables", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )


def downgrade() -> None:
    op.drop_table("email_templates")

