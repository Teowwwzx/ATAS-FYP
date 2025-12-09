"""Enable pgvector and create embeddings tables

Revision ID: pgvector_embeddings_20251209
Revises: 
Create Date: 2025-12-09
"""

from alembic import op


revision = 'pgvector_embeddings_20251209'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # Expert embeddings table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS expert_embeddings (
            user_id UUID PRIMARY KEY,
            source_text TEXT,
            embedding VECTOR(1536),
            model_name TEXT DEFAULT 'text-embedding-3-small',
            embedding_version TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
    )

    # Event embeddings table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS event_embeddings (
            event_id UUID PRIMARY KEY,
            summary TEXT,
            embedding VECTOR(1536),
            model_name TEXT DEFAULT 'text-embedding-3-small',
            embedding_version TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
    )

    # Indexes using ivfflat (safe default)
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS expert_embeddings_embedding_idx
        ON expert_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS event_embeddings_embedding_idx
        ON event_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS expert_embeddings_embedding_idx;")
    op.execute("DROP INDEX IF EXISTS event_embeddings_embedding_idx;")
    op.execute("DROP TABLE IF EXISTS expert_embeddings;")
    op.execute("DROP TABLE IF EXISTS event_embeddings;")
    # Do not drop extension to avoid impacting other objects

