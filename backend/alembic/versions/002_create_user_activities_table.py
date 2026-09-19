"""create user_activities table

Revision ID: 002_create_user_activities_table
Revises: 001_create_profiles_table
Create Date: 2026-09-19 16:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_create_user_activities_table'
down_revision: Union[str, None] = '001_create_profiles_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    uuid_type = postgresql.UUID(as_uuid=True) if is_postgres else sa.CHAR(36)

    op.create_table(
        'user_activities',
        sa.Column('id', uuid_type, primary_key=True, nullable=False),
        sa.Column('user_id', uuid_type, nullable=False),
        sa.Column('activity_type', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )

    op.create_index(op.f('ix_user_activities_user_id'), 'user_activities', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_activities_user_id'), table_name='user_activities')
    op.drop_table('user_activities')
