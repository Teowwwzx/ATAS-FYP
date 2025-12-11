"""merge_org_status_and_chat_branch

Revision ID: 9f0a1b2c3d4e
Revises: 869e69bb0efa, 3a1b8c9d0e12
Create Date: 2025-12-11 11:45:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f0a1b2c3d4e'
down_revision: Union[str, None] = ('869e69bb0efa', '3a1b8c9d0e12')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge revision; no schema changes."""
    pass


def downgrade() -> None:
    """Downgrade merge; no schema changes."""
    pass

