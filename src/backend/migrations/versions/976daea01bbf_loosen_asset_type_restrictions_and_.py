"""Loosen asset type restrictions and update sensitivity enum

Revision ID: 976daea01bbf
Revises: 5e6191c9e0a0
Create Date: 2025-10-16 15:05:44.672019

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '976daea01bbf'
down_revision: Union[str, Sequence[str], None] = '5e6191c9e0a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('assets', 'type',
               existing_type=sa.Enum('HW', 'SW', 'DATA', 'USER', 'SERVICE', name='assettypeenum'),
               type_=sa.String(length=50),
               existing_nullable=True)

    op.execute("ALTER TYPE datasensitivityenum ADD VALUE IF NOT EXISTS 'Medium'")


def downgrade() -> None:
    op.alter_column('assets', 'type',
               existing_type=sa.String(length=50),
               type_=sa.Enum('HW', 'SW', 'DATA', 'USER', 'SERVICE', name='assettypeenum'),
               existing_nullable=True)
    
    # Downgrading enum values is complex and potentially data-destructive.
    # For this migration, we will leave the 'Medium' value in the enum.
    # A manual data migration would be required to safely downgrade.
    pass
