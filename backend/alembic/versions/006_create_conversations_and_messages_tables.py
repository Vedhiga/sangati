"""create conversations, conversation_participants, and messages tables

Revision ID: 006_create_conversations_and_messages_tables
Revises: 005_create_activity_posts_table
Create Date: 2026-09-19 18:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '006_create_conversations_and_messages_tables'
down_revision: Union[str, None] = '005_create_activity_posts_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    uuid_type = postgresql.UUID(as_uuid=True) if is_postgres else sa.CHAR(36)

    # 1. Conversations table
    op.create_table(
        'conversations',
        sa.Column('id', uuid_type, primary_key=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f('ix_conversations_last_message_at'), 'conversations', ['last_message_at'], unique=False)

    # 2. Conversation participants table
    op.create_table(
        'conversation_participants',
        sa.Column('id', uuid_type, primary_key=True, nullable=False),
        sa.Column('conversation_id', uuid_type, sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', uuid_type, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.UniqueConstraint('conversation_id', 'user_id', name='uq_conversation_participant'),
    )
    op.create_index(op.f('ix_conversation_participants_conversation_id'), 'conversation_participants', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_conversation_participants_user_id'), 'conversation_participants', ['user_id'], unique=False)

    # 3. Messages table
    op.create_table(
        'messages',
        sa.Column('id', uuid_type, primary_key=True, nullable=False),
        sa.Column('conversation_id', uuid_type, sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sender_id', uuid_type, nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index(op.f('ix_messages_conversation_id'), 'messages', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_messages_sender_id'), 'messages', ['sender_id'], unique=False)
    op.create_index(op.f('ix_messages_created_at'), 'messages', ['created_at'], unique=False)
    op.create_index('ix_messages_conversation_created', 'messages', ['conversation_id', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_messages_conversation_created', table_name='messages')
    op.drop_index(op.f('ix_messages_created_at'), table_name='messages')
    op.drop_index(op.f('ix_messages_sender_id'), table_name='messages')
    op.drop_index(op.f('ix_messages_conversation_id'), table_name='messages')
    op.drop_table('messages')

    op.drop_index(op.f('ix_conversation_participants_user_id'), table_name='conversation_participants')
    op.drop_index(op.f('ix_conversation_participants_conversation_id'), table_name='conversation_participants')
    op.drop_table('conversation_participants')

    op.drop_index(op.f('ix_conversations_last_message_at'), table_name='conversations')
    op.drop_table('conversations')
