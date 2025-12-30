"""add_checklist_visibility_and_link

Revision ID: add_checklist_visibility_20251230
Revises: 0e5b19c6be28
Create Date: 2025-12-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_checklist_visibility_20251230'
down_revision: Union[str, None] = '0e5b19c6be28'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum type for checklist visibility if not exists
    op.execute("""
    DO $$ 
    BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checklistvisibility') THEN 
            CREATE TYPE checklistvisibility AS ENUM ('internal', 'external'); 
        END IF; 
    END $$;
    """)

    # Add columns to event_checklist_items
    op.add_column('event_checklist_items', sa.Column('visibility', sa.Enum('internal', 'external', name='checklistvisibility'), nullable=False, server_default='internal'))
    op.add_column('event_checklist_items', sa.Column('audience_role', sa.Enum('organizer', 'committee', 'speaker', 'sponsor', 'audience', 'student', 'teacher', name='eventparticipantrole'), nullable=True))
    op.add_column('event_checklist_items', sa.Column('link_url', sa.String(), nullable=True))

    # Remove server default after backfill
    op.alter_column('event_checklist_items', 'visibility', server_default=None)


def downgrade() -> None:
    # Drop columns
    op.drop_column('event_checklist_items', 'link_url')
    op.drop_column('event_checklist_items', 'audience_role')
    op.drop_column('event_checklist_items', 'visibility')
    # Drop enum type if not used elsewhere
    op.execute("DROP TYPE IF EXISTS checklistvisibility")
