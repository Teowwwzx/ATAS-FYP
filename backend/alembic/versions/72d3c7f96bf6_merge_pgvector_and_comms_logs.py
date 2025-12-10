"""merge_pgvector_and_comms_logs

Revision ID: 72d3c7f96bf6
Revises: pgvector_embeddings_20251209, 7fe70ea36a18
Create Date: 2025-12-09 19:00:21.423033

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '72d3c7f96bf6'
down_revision: Union[str, None] = ('pgvector_embeddings_20251209', '7fe70ea36a18')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
