"""create notifications table

Revision ID: 007_create_notifications_table
Revises: 006_create_conversations_and_messages_tables
Create Date: 2026-09-19 19:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '007_create_notifications_table'
down_revision: Union[str, None] = '006_create_conversations_and_messages_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    uuid_type = postgresql.UUID(as_uuid=True) if is_postgres else sa.CHAR(36)

    op.create_table(
        'notifications',
        sa.Column('id', uuid_type, primary_key=True, nullable=False),
        sa.Column('recipient_id', uuid_type, nullable=False),
        sa.Column('actor_id', uuid_type, nullable=True),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('reference_id', uuid_type, nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('0' if not is_postgres else 'FALSE')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index(op.f('ix_notifications_recipient_id'), 'notifications', ['recipient_id'], unique=False)
    op.create_index(op.f('ix_notifications_actor_id'), 'notifications', ['actor_id'], unique=False)
    op.create_index('ix_notifications_recipient_created', 'notifications', ['recipient_id', 'created_at'], unique=False)
    op.create_index('ix_notifications_recipient_is_read', 'notifications', ['recipient_id', 'is_read'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_notifications_recipient_is_read', table_name='notifications')
    op.drop_index('ix_notifications_recipient_created', table_name='notifications')
    op.drop_index(op.f('ix_notifications_actor_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_recipient_id'), table_name='notifications')
    op.drop_table('notifications')
