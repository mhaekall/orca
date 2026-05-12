"""add swarm_vault table

Revision ID: 59c32ca98aa4
Revises: fc18bcc897be
Create Date: 2026-05-12 08:18:27.143476

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '59c32ca98aa4'
down_revision: str | Sequence[str] | None = 'fc18bcc897be'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'swarm_vault',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('anilistId', sa.Integer(), nullable=False),
        sa.Column('title', sa.Text(), nullable=True),
        sa.Column('episodeNumber', sa.Float(), nullable=False),
        sa.Column('providerId', sa.Text(), nullable=False),
        sa.Column('episodeUrl', sa.Text(), nullable=False),
        sa.Column('createdAt', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updatedAt', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('episodeUrl')
    )
    op.create_index('idx_swarm_vault_anilist_num', 'swarm_vault', ['anilistId', 'episodeNumber'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_swarm_vault_anilist_num', table_name='swarm_vault')
    op.drop_table('swarm_vault')
