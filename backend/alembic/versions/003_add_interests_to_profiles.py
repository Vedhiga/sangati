"""add interests to profiles

Revision ID: 003_add_interests_to_profiles
Revises: 002_create_user_activities_table
Create Date: 2026-09-19 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_add_interests_to_profiles'
down_revision: Union[str, None] = '002_create_user_activities_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('profiles', sa.Column('interests', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('profiles', 'interests')
