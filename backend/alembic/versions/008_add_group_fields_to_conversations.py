"""add title and is_group fields to conversations table

Revision ID: 008_add_group_fields_to_conversations
Revises: 007_create_notifications_table
Create Date: 2026-09-19 22:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '008_add_group_fields_to_conversations'
down_revision: Union[str, None] = '007_create_notifications_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    op.add_column('conversations', sa.Column('title', sa.String(100), nullable=True))
    op.add_column('conversations', sa.Column('is_group', sa.Boolean(), nullable=False, server_default=sa.text('0' if not is_postgres else 'FALSE')))


def downgrade() -> None:
    op.drop_column('conversations', 'is_group')
    op.drop_column('conversations', 'title')
