"""create activity posts table

Revision ID: 005_create_activity_posts_table
Revises: 004_create_connections_table
Create Date: 2026-09-19 18:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '005_create_activity_posts_table'
down_revision: Union[str, None] = '004_create_connections_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    uuid_type = postgresql.UUID(as_uuid=True) if is_postgres else sa.CHAR(36)

    op.create_table(
        'activity_posts',
        sa.Column('id', uuid_type, primary_key=True, nullable=False),
        sa.Column('author_id', uuid_type, nullable=False),
        sa.Column('activity_type', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )

    op.create_index(op.f('ix_activity_posts_author_id'), 'activity_posts', ['author_id'], unique=False)
    op.create_index(op.f('ix_activity_posts_activity_type'), 'activity_posts', ['activity_type'], unique=False)
    op.create_index(op.f('ix_activity_posts_created_at'), 'activity_posts', ['created_at'], unique=False)
    op.create_index('ix_activity_posts_author_created', 'activity_posts', ['author_id', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_activity_posts_author_created', table_name='activity_posts')
    op.drop_index(op.f('ix_activity_posts_created_at'), table_name='activity_posts')
    op.drop_index(op.f('ix_activity_posts_activity_type'), table_name='activity_posts')
    op.drop_index(op.f('ix_activity_posts_author_id'), table_name='activity_posts')
    op.drop_table('activity_posts')
