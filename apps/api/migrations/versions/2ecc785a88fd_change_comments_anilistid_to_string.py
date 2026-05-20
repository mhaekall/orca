"""change_comments_anilistId_to_string

Revision ID: 2ecc785a88fd
Revises: 59c32ca98aa4
Create Date: 2026-05-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2ecc785a88fd'
down_revision: Union[str, None] = '59c32ca98aa4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('comments', 'anilistId',
               existing_type=sa.Integer(),
               type_=sa.String(),
               existing_nullable=False)


def downgrade() -> None:
    op.alter_column('comments', 'anilistId',
               existing_type=sa.String(),
               type_=sa.Integer(),
               existing_nullable=False,
               postgresql_using="\"anilistId\"::integer")
