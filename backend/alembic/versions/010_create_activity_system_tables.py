"""create activity system tables

Revision ID: 010_create_activity_system_tables
Revises: 009_add_media_and_links_to_posts
Create Date: 2026-09-22 12:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.models.profile import GUID

# revision identifiers, used by Alembic.
revision: str = '010_create_activity_system_tables'
down_revision: Union[str, None] = '009_add_media_and_links_to_posts'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. activities table
    op.create_table(
        'activities',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('host_user_id', GUID(), nullable=False),
        sa.Column('intent_type', sa.String(length=20), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('activity_type', sa.String(length=20), nullable=False, server_default='RECURRING'),
        sa.Column('frequency', sa.String(length=50), nullable=True),
        sa.Column('day_of_week', sa.String(length=50), nullable=True),
        sa.Column('time_of_day', sa.String(length=50), nullable=True),
        sa.Column('timezone', sa.String(length=50), nullable=True, server_default='IST (UTC+5:30)'),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('max_participants', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('meeting_platform', sa.String(length=50), nullable=False, server_default='Google Meet'),
        sa.Column('meeting_url', sa.String(length=512), nullable=False),
        sa.Column('private_notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_activities_host_user_id', 'activities', ['host_user_id'])
    op.create_index('ix_activities_intent_type', 'activities', ['intent_type'])
    op.create_index('ix_activities_status', 'activities', ['status'])
    op.create_index('ix_activities_intent_status', 'activities', ['intent_type', 'status'])
    op.create_index('ix_activities_host_status', 'activities', ['host_user_id', 'status'])

    # 2. activity_participants table
    op.create_table(
        'activity_participants',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('activity_id', GUID(), nullable=False),
        sa.Column('user_id', GUID(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='JOINED'),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('left_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('activity_id', 'user_id', name='uq_activity_participant')
    )
    op.create_index('ix_activity_participants_activity_id', 'activity_participants', ['activity_id'])
    op.create_index('ix_activity_participants_user_id', 'activity_participants', ['user_id'])
    op.create_index('ix_activity_participants_status', 'activity_participants', ['status'])
    op.create_index('ix_activity_participants_activity_user', 'activity_participants', ['activity_id', 'user_id'])

    # 3. activity_sessions table
    op.create_table(
        'activity_sessions',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('activity_id', GUID(), nullable=False),
        sa.Column('session_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('scheduled_at', sa.String(length=100), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='UPCOMING'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_activity_sessions_activity_id', 'activity_sessions', ['activity_id'])
    op.create_index('ix_activity_sessions_status', 'activity_sessions', ['status'])

    # 4. activity_invitations table
    op.create_table(
        'activity_invitations',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('activity_id', GUID(), nullable=False),
        sa.Column('invited_user_id', GUID(), nullable=False),
        sa.Column('invited_by_user_id', GUID(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='PENDING'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('activity_id', 'invited_user_id', name='uq_activity_invitation')
    )
    op.create_index('ix_activity_invitations_activity_id', 'activity_invitations', ['activity_id'])
    op.create_index('ix_activity_invitations_invited_user_id', 'activity_invitations', ['invited_user_id'])
    op.create_index('ix_activity_invitations_invited_by_user_id', 'activity_invitations', ['invited_by_user_id'])
    op.create_index('ix_activity_invitations_status', 'activity_invitations', ['status'])


def downgrade() -> None:
    op.drop_table('activity_invitations')
    op.drop_table('activity_sessions')
    op.drop_table('activity_participants')
    op.drop_table('activities')
