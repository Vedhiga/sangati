"""add post interactions tables

Revision ID: 012_add_post_interactions_tables
Revises: 011_add_activity_conversation_relationship
Create Date: 2026-09-23 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.models.profile import GUID

# revision identifiers, used by Alembic.
revision: str = '012_add_post_interactions_tables'
down_revision: Union[str, None] = '011_add_activity_conversation_relationship'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    # 1. post_likes
    if 'post_likes' not in tables:
        op.create_table(
            'post_likes',
            sa.Column('id', GUID(), nullable=False),
            sa.Column('post_id', GUID(), nullable=False),
            sa.Column('user_id', GUID(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['post_id'], ['activity_posts.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('post_id', 'user_id', name='uq_post_like')
        )
        op.create_index('ix_post_likes_post_id', 'post_likes', ['post_id'])
        op.create_index('ix_post_likes_user_id', 'post_likes', ['user_id'])

    # 2. post_reactions
    if 'post_reactions' not in tables:
        op.create_table(
            'post_reactions',
            sa.Column('id', GUID(), nullable=False),
            sa.Column('post_id', GUID(), nullable=False),
            sa.Column('user_id', GUID(), nullable=False),
            sa.Column('reaction_type', sa.String(length=20), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['post_id'], ['activity_posts.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('post_id', 'user_id', 'reaction_type', name='uq_post_reaction')
        )
        op.create_index('ix_post_reactions_post_id', 'post_reactions', ['post_id'])
        op.create_index('ix_post_reactions_user_id', 'post_reactions', ['user_id'])
        op.create_index('ix_post_reactions_post_user', 'post_reactions', ['post_id', 'user_id'])

    # 3. post_comments
    if 'post_comments' not in tables:
        op.create_table(
            'post_comments',
            sa.Column('id', GUID(), nullable=False),
            sa.Column('post_id', GUID(), nullable=False),
            sa.Column('author_id', GUID(), nullable=False),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['post_id'], ['activity_posts.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_post_comments_post_id', 'post_comments', ['post_id'])
        op.create_index('ix_post_comments_author_id', 'post_comments', ['author_id'])
        op.create_index('ix_post_comments_post_created', 'post_comments', ['post_id', 'created_at'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if 'post_comments' in tables:
        op.drop_table('post_comments')
    if 'post_reactions' in tables:
        op.drop_table('post_reactions')
    if 'post_likes' in tables:
        op.drop_table('post_likes')
