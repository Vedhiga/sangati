"""add activity conversation relationship

Revision ID: 011_add_activity_conversation_relationship
Revises: 010_create_activity_system_tables
Create Date: 2026-09-22 14:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.models.profile import GUID

# revision identifiers, used by Alembic.
revision: str = '011_add_activity_conversation_relationship'
down_revision: Union[str, None] = '010_create_activity_system_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    
    convo_cols = [c['name'] for c in inspector.get_columns('conversations')]
    if 'conversation_type' not in convo_cols:
        op.add_column('conversations', sa.Column('conversation_type', sa.String(length=20), nullable=False, server_default='DIRECT'))
        op.create_index('ix_conversations_conversation_type', 'conversations', ['conversation_type'])
        
    if 'activity_id' not in convo_cols:
        op.add_column('conversations', sa.Column('activity_id', GUID(), nullable=True))
        op.create_index('ix_conversations_activity_id', 'conversations', ['activity_id'])
        
    if 'status' not in convo_cols:
        op.add_column('conversations', sa.Column('status', sa.String(length=20), nullable=False, server_default='ACTIVE'))
        op.create_index('ix_conversations_status', 'conversations', ['status'])

    act_cols = [c['name'] for c in inspector.get_columns('activities')]
    if 'conversation_id' not in act_cols:
        op.add_column('activities', sa.Column('conversation_id', GUID(), nullable=True))
        op.create_index('ix_activities_conversation_id', 'activities', ['conversation_id'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    act_cols = [c['name'] for c in inspector.get_columns('activities')]
    if 'conversation_id' in act_cols:
        op.drop_index('ix_activities_conversation_id', table_name='activities')
        op.drop_column('activities', 'conversation_id')

    convo_cols = [c['name'] for c in inspector.get_columns('conversations')]
    if 'status' in convo_cols:
        op.drop_index('ix_conversations_status', table_name='conversations')
        op.drop_column('conversations', 'status')
    if 'activity_id' in convo_cols:
        op.drop_index('ix_conversations_activity_id', table_name='conversations')
        op.drop_column('conversations', 'activity_id')
    if 'conversation_type' in convo_cols:
        op.drop_index('ix_conversations_conversation_type', table_name='conversations')
        op.drop_column('conversations', 'conversation_type')
