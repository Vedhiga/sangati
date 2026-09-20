"""add media and link fields to activity_posts table

Revision ID: 009_add_media_and_links_to_posts
Revises: 008_add_group_fields_to_conversations
Create Date: 2026-09-20 16:58:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '009_add_media_and_links_to_posts'
down_revision: Union[str, None] = '008_add_group_fields_to_conversations'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('activity_posts', sa.Column('media_url', sa.String(), nullable=True))
    op.add_column('activity_posts', sa.Column('media_type', sa.String(), nullable=True))
    op.add_column('activity_posts', sa.Column('link_url', sa.String(), nullable=True))
    op.add_column('activity_posts', sa.Column('link_title', sa.String(), nullable=True))
    op.add_column('activity_posts', sa.Column('link_description', sa.String(), nullable=True))
    op.add_column('activity_posts', sa.Column('link_image', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('activity_posts', 'link_image')
    op.drop_column('activity_posts', 'link_description')
    op.drop_column('activity_posts', 'link_title')
    op.drop_column('activity_posts', 'link_url')
    op.drop_column('activity_posts', 'media_type')
    op.drop_column('activity_posts', 'media_url')
