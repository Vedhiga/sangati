"""create connections table

Revision ID: 004_create_connections_table
Revises: 003_add_interests_to_profiles
Create Date: 2026-09-19 17:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '004_create_connections_table'
down_revision: Union[str, None] = '003_add_interests_to_profiles'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    uuid_type = postgresql.UUID(as_uuid=True) if is_postgres else sa.CHAR(36)

    op.create_table(
        'connections',
        sa.Column('id', uuid_type, primary_key=True, nullable=False),
        sa.Column('requester_id', uuid_type, nullable=False),
        sa.Column('receiver_id', uuid_type, nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='PENDING'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.UniqueConstraint('requester_id', 'receiver_id', name='uq_connections_requester_receiver')
    )

    op.create_index(op.f('ix_connections_requester_id'), 'connections', ['requester_id'], unique=False)
    op.create_index(op.f('ix_connections_receiver_id'), 'connections', ['receiver_id'], unique=False)
    op.create_index(op.f('ix_connections_status'), 'connections', ['status'], unique=False)
    op.create_index('ix_connections_receiver_status', 'connections', ['receiver_id', 'status'], unique=False)
    op.create_index('ix_connections_requester_status', 'connections', ['requester_id', 'status'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_connections_requester_status', table_name='connections')
    op.drop_index('ix_connections_receiver_status', table_name='connections')
    op.drop_index(op.f('ix_connections_status'), table_name='connections')
    op.drop_index(op.f('ix_connections_receiver_id'), table_name='connections')
    op.drop_index(op.f('ix_connections_requester_id'), table_name='connections')
    op.drop_table('connections')
