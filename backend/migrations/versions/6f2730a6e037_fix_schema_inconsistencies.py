"""fix schema inconsistencies

Revision ID: 6f2730a6e037
Revises: 3be3104a272a
Create Date: 2026-05-12 20:40:42.974726

"""

from typing import Sequence, Union



# revision identifiers, used by Alembic.
revision: str = "6f2730a6e037"
down_revision: Union[str, Sequence[str], None] = "3be3104a272a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema (No-op)."""
    pass


def downgrade() -> None:
    """Downgrade schema (No-op)."""
    pass
