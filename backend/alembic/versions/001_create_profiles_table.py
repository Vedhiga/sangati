"""create profiles table

Revision ID: 001_create_profiles_table
Revises: 
Create Date: 2026-09-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_create_profiles_table'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use native PG UUID if on postgresql, otherwise CHAR(36)
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    uuid_type = postgresql.UUID(as_uuid=True) if is_postgres else sa.CHAR(36)

    op.create_table(
        'profiles',
        sa.Column('id', uuid_type, primary_key=True, nullable=False),
        sa.Column('user_id', uuid_type, nullable=False),
        sa.Column('username', sa.String(length=30), nullable=False),
        sa.Column('display_name', sa.String(length=50), nullable=False),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )

    op.create_index(op.f('ix_profiles_user_id'), 'profiles', ['user_id'], unique=True)
    op.create_index(op.f('ix_profiles_username'), 'profiles', ['username'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_profiles_username'), table_name='profiles')
    op.drop_index(op.f('ix_profiles_user_id'), table_name='profiles')
    op.drop_table('profiles')
