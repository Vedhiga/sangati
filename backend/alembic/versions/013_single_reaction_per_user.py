"""single reaction per user constraint

Revision ID: 013_single_reaction_per_user
Revises: 012_add_post_interactions_tables
Create Date: 2026-09-24 10:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '013_single_reaction_per_user'
down_revision: Union[str, None] = '012_add_post_interactions_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if 'post_reactions' in tables:
        # Try dropping old uq_post_reaction if present
        try:
            op.drop_constraint('uq_post_reaction', 'post_reactions', type_='unique')
        except Exception:
            pass
        
        # Add new uq_post_reaction_user on (post_id, user_id)
        try:
            op.create_unique_constraint('uq_post_reaction_user', 'post_reactions', ['post_id', 'user_id'])
        except Exception:
            pass


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if 'post_reactions' in tables:
        try:
            op.drop_constraint('uq_post_reaction_user', 'post_reactions', type_='unique')
        except Exception:
            pass
        try:
            op.create_unique_constraint('uq_post_reaction', 'post_reactions', ['post_id', 'user_id', 'reaction_type'])
        except Exception:
            pass
