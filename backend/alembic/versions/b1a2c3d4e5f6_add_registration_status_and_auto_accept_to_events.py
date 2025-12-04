"""
add registration_status and auto_accept_registration to events

Revision ID: b1a2c3d4e5f6
Revises: a3f1b2c4d567
Create Date: 2025-12-03
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b1a2c3d4e5f6'
down_revision = 'a3f1b2c4d567'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum type for registration_status if using PostgreSQL
    registration_enum = sa.Enum('opened', 'closed', name='event_registration_status')
    registration_enum.create(op.get_bind(), checkfirst=True)

    # Add columns to events
    op.add_column('events', sa.Column('registration_status', registration_enum, nullable=False, server_default='opened'))
    op.add_column('events', sa.Column('auto_accept_registration', sa.Boolean(), nullable=False, server_default=sa.text('true')))

    # Drop server_default to avoid future inserts relying on it implicitly
    op.alter_column('events', 'registration_status', server_default=None)
    op.alter_column('events', 'auto_accept_registration', server_default=None)


def downgrade() -> None:
    # Drop columns
    op.drop_column('events', 'auto_accept_registration')
    op.drop_column('events', 'registration_status')

    # Drop enum type
    registration_enum = sa.Enum('opened', 'closed', name='event_registration_status')
    registration_enum.drop(op.get_bind(), checkfirst=True)

