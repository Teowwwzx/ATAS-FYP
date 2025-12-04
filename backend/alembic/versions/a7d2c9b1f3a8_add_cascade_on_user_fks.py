"""Add cascade deletes for user-linked foreign keys

Revision ID: a7d2c9b1f3a8
Revises: 6b434b9b4e23
Create Date: 2025-12-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7d2c9b1f3a8'
down_revision: Union[str, None] = '6b434b9b4e23'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: apply ON DELETE behavior for FKs referencing users.id."""
    # audit_logs.user_id -> CASCADE
    op.drop_constraint('audit_logs_user_id_fkey', 'audit_logs', type_='foreignkey')
    op.create_foreign_key(None, 'audit_logs', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # user_roles.user_id -> CASCADE
    op.drop_constraint('user_roles_user_id_fkey', 'user_roles', type_='foreignkey')
    op.create_foreign_key(None, 'user_roles', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # users.referred_by -> SET NULL
    op.drop_constraint('users_referred_by_fkey', 'users', type_='foreignkey')
    op.create_foreign_key(None, 'users', 'users', ['referred_by'], ['id'], ondelete='SET NULL')

    # follows.follower_id, follows.followee_id -> CASCADE
    op.drop_constraint('follows_follower_id_fkey', 'follows', type_='foreignkey')
    op.create_foreign_key(None, 'follows', 'users', ['follower_id'], ['id'], ondelete='CASCADE')
    op.drop_constraint('follows_followee_id_fkey', 'follows', type_='foreignkey')
    op.create_foreign_key(None, 'follows', 'users', ['followee_id'], ['id'], ondelete='CASCADE')

    # organization_members.user_id -> CASCADE
    op.drop_constraint('organization_members_user_id_fkey', 'organization_members', type_='foreignkey')
    op.create_foreign_key(None, 'organization_members', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # organizations.owner_id -> CASCADE
    op.drop_constraint('organizations_owner_id_fkey', 'organizations', type_='foreignkey')
    op.create_foreign_key(None, 'organizations', 'users', ['owner_id'], ['id'], ondelete='CASCADE')

    # notifications.recipient_id, notifications.actor_id -> CASCADE
    op.drop_constraint('notifications_recipient_id_fkey', 'notifications', type_='foreignkey')
    op.create_foreign_key(None, 'notifications', 'users', ['recipient_id'], ['id'], ondelete='CASCADE')
    op.drop_constraint('notifications_actor_id_fkey', 'notifications', type_='foreignkey')
    op.create_foreign_key(None, 'notifications', 'users', ['actor_id'], ['id'], ondelete='CASCADE')

    # events.organizer_id -> CASCADE
    op.drop_constraint('events_organizer_id_fkey', 'events', type_='foreignkey')
    op.create_foreign_key(None, 'events', 'users', ['organizer_id'], ['id'], ondelete='CASCADE')

    # event_participants.user_id -> CASCADE
    op.drop_constraint('event_participants_user_id_fkey', 'event_participants', type_='foreignkey')
    op.create_foreign_key(None, 'event_participants', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # event_reminders.user_id -> CASCADE
    op.drop_constraint('event_reminders_user_id_fkey', 'event_reminders', type_='foreignkey')
    op.create_foreign_key(None, 'event_reminders', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # event_checklist_items.assigned_user_id, created_by_user_id -> CASCADE
    op.drop_constraint('event_checklist_items_assigned_user_id_fkey', 'event_checklist_items', type_='foreignkey')
    op.create_foreign_key(None, 'event_checklist_items', 'users', ['assigned_user_id'], ['id'], ondelete='CASCADE')
    op.drop_constraint('event_checklist_items_created_by_user_id_fkey', 'event_checklist_items', type_='foreignkey')
    op.create_foreign_key(None, 'event_checklist_items', 'users', ['created_by_user_id'], ['id'], ondelete='CASCADE')

    # event_proposals.created_by_user_id -> CASCADE
    op.drop_constraint('event_proposals_created_by_user_id_fkey', 'event_proposals', type_='foreignkey')
    op.create_foreign_key(None, 'event_proposals', 'users', ['created_by_user_id'], ['id'], ondelete='CASCADE')

    # event_proposal_comments.user_id -> CASCADE
    op.drop_constraint('event_proposal_comments_user_id_fkey', 'event_proposal_comments', type_='foreignkey')
    op.create_foreign_key(None, 'event_proposal_comments', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # reviews.reviewer_id, reviews.reviewee_id -> CASCADE
    op.drop_constraint('reviews_reviewer_id_fkey', 'reviews', type_='foreignkey')
    op.create_foreign_key(None, 'reviews', 'users', ['reviewer_id'], ['id'], ondelete='CASCADE')
    op.drop_constraint('reviews_reviewee_id_fkey', 'reviews', type_='foreignkey')
    op.create_foreign_key(None, 'reviews', 'users', ['reviewee_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    """Downgrade schema: revert ON DELETE behavior."""
    op.drop_constraint(None, 'reviews', type_='foreignkey')
    op.create_foreign_key('reviews_reviewee_id_fkey', 'reviews', 'users', ['reviewee_id'], ['id'])
    op.drop_constraint(None, 'reviews', type_='foreignkey')
    op.create_foreign_key('reviews_reviewer_id_fkey', 'reviews', 'users', ['reviewer_id'], ['id'])

    op.drop_constraint(None, 'event_proposal_comments', type_='foreignkey')
    op.create_foreign_key('event_proposal_comments_user_id_fkey', 'event_proposal_comments', 'users', ['user_id'], ['id'])

    op.drop_constraint(None, 'event_proposals', type_='foreignkey')
    op.create_foreign_key('event_proposals_created_by_user_id_fkey', 'event_proposals', 'users', ['created_by_user_id'], ['id'])

    op.drop_constraint(None, 'event_checklist_items', type_='foreignkey')
    op.create_foreign_key('event_checklist_items_created_by_user_id_fkey', 'event_checklist_items', 'users', ['created_by_user_id'], ['id'])
    op.drop_constraint(None, 'event_checklist_items', type_='foreignkey')
    op.create_foreign_key('event_checklist_items_assigned_user_id_fkey', 'event_checklist_items', 'users', ['assigned_user_id'], ['id'])

    op.drop_constraint(None, 'event_reminders', type_='foreignkey')
    op.create_foreign_key('event_reminders_user_id_fkey', 'event_reminders', 'users', ['user_id'], ['id'])

    op.drop_constraint(None, 'event_participants', type_='foreignkey')
    op.create_foreign_key('event_participants_user_id_fkey', 'event_participants', 'users', ['user_id'], ['id'])

    op.drop_constraint(None, 'events', type_='foreignkey')
    op.create_foreign_key('events_organizer_id_fkey', 'events', 'users', ['organizer_id'], ['id'])

    op.drop_constraint(None, 'notifications', type_='foreignkey')
    op.create_foreign_key('notifications_actor_id_fkey', 'notifications', 'users', ['actor_id'], ['id'])
    op.drop_constraint(None, 'notifications', type_='foreignkey')
    op.create_foreign_key('notifications_recipient_id_fkey', 'notifications', 'users', ['recipient_id'], ['id'])

    op.drop_constraint(None, 'organizations', type_='foreignkey')
    op.create_foreign_key('organizations_owner_id_fkey', 'organizations', 'users', ['owner_id'], ['id'])

    op.drop_constraint(None, 'organization_members', type_='foreignkey')
    op.create_foreign_key('organization_members_user_id_fkey', 'organization_members', 'users', ['user_id'], ['id'])

    op.drop_constraint(None, 'follows', type_='foreignkey')
    op.create_foreign_key('follows_followee_id_fkey', 'follows', 'users', ['followee_id'], ['id'])
    op.drop_constraint(None, 'follows', type_='foreignkey')
    op.create_foreign_key('follows_follower_id_fkey', 'follows', 'users', ['follower_id'], ['id'])

    op.drop_constraint(None, 'users', type_='foreignkey')
    op.create_foreign_key('users_referred_by_fkey', 'users', 'users', ['referred_by'], ['id'])

    op.drop_constraint(None, 'user_roles', type_='foreignkey')
    op.create_foreign_key('user_roles_user_id_fkey', 'user_roles', 'users', ['user_id'], ['id'])

    op.drop_constraint(None, 'audit_logs', type_='foreignkey')
    op.create_foreign_key('audit_logs_user_id_fkey', 'audit_logs', 'users', ['user_id'], ['id'])

