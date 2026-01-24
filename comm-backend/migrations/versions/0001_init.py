"""init

Revision ID: 0001_init
Revises:
Create Date: 2026-01-23

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "comm_users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_comm_users_email", "comm_users", ["email"], unique=True)

    op.create_table(
        "comm_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nickname", sa.String(length=50), nullable=True),
        sa.Column("avatar_url", sa.String(length=512), nullable=True),
        sa.Column("bio", sa.String(length=255), nullable=True),
        sa.Column("enrollment_year", sa.Integer(), nullable=True),
        sa.Column("interests", postgresql.ARRAY(sa.String()), nullable=True, server_default=sa.text("'{}'")),
    )
    op.create_index("ix_comm_profiles_user_id", "comm_profiles", ["user_id"], unique=False)

    op.create_table(
        "comm_posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=100), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("media_urls", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("location", sa.String(length=100), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=True),
        sa.Column("extra", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("likes_count", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("comments_count", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("collects_count", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_comm_posts_user_id", "comm_posts", ["user_id"], unique=False)

    op.create_table(
        "comm_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.String(length=1000), nullable=False),
        sa.Column("likes_count", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("root_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reply_to_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["post_id"], ["comm_posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_id"], ["comm_comments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["root_id"], ["comm_comments.id"], ondelete="SET NULL"),
    )

    op.create_table(
        "comm_interactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_type", sa.String(length=20), nullable=False),
        sa.Column("action", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_comm_interactions_user_id", "comm_interactions", ["user_id"], unique=False)
    op.create_index("ix_comm_interactions_target_id", "comm_interactions", ["target_id"], unique=False)
    op.create_index(
        "idx_user_target_action",
        "comm_interactions",
        ["user_id", "target_id", "action"],
        unique=True,
    )

    op.create_table(
        "comm_follows",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("follower_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("following_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_comm_follows_follower_id", "comm_follows", ["follower_id"], unique=False)
    op.create_index("ix_comm_follows_following_id", "comm_follows", ["following_id"], unique=False)

    op.create_table(
        "comm_collections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_comm_collections_user_id", "comm_collections", ["user_id"], unique=False)

    op.create_table(
        "comm_notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("payload", sa.String(length=1000), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_comm_notifications_user_id", "comm_notifications", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_comm_notifications_user_id", table_name="comm_notifications")
    op.drop_table("comm_notifications")

    op.drop_index("ix_comm_collections_user_id", table_name="comm_collections")
    op.drop_table("comm_collections")

    op.drop_index("ix_comm_follows_following_id", table_name="comm_follows")
    op.drop_index("ix_comm_follows_follower_id", table_name="comm_follows")
    op.drop_table("comm_follows")

    op.drop_index("idx_user_target_action", table_name="comm_interactions")
    op.drop_index("ix_comm_interactions_target_id", table_name="comm_interactions")
    op.drop_index("ix_comm_interactions_user_id", table_name="comm_interactions")
    op.drop_table("comm_interactions")

    op.drop_table("comm_comments")

    op.drop_index("ix_comm_posts_user_id", table_name="comm_posts")
    op.drop_table("comm_posts")

    op.drop_index("ix_comm_profiles_user_id", table_name="comm_profiles")
    op.drop_table("comm_profiles")

    op.drop_index("ix_comm_users_email", table_name="comm_users")
    op.drop_table("comm_users")

