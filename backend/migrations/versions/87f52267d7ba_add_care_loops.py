"""add_care_loops

Revision ID: 87f52267d7ba
Revises: 5ae024d459cf
Create Date: 2026-05-29 21:21:38.598290

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '87f52267d7ba'
down_revision: Union[str, Sequence[str], None] = '5ae024d459cf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create care_loops table
    op.create_table(
        "care_loops",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("patient_id", sa.UUID(), nullable=False),
        sa.Column("practitioner_id", sa.UUID(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("chief_complaint", sa.String(length=500), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_notes", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], name=op.f("care_loops_patient_id_fkey")),
        sa.ForeignKeyConstraint(["practitioner_id"], ["practitioners.id"], name=op.f("care_loops_practitioner_id_fkey")),
        sa.PrimaryKeyConstraint("id", name=op.f("care_loops_pkey")),
        sa.CheckConstraint("status IN ('active', 'completed', 'cancelled')", name="care_loops_status_check"),
    )
    op.create_index(op.f("ix_care_loops_patient_id"), "care_loops", ["patient_id"], unique=False)

    # Link appointments table to care_loops
    op.add_column("appointments", sa.Column("care_loop_id", sa.UUID(), nullable=True))
    op.create_foreign_key(op.f("appointments_care_loop_id_fkey"), "appointments", "care_loops", ["care_loop_id"], ["id"])
    op.create_index(op.f("ix_appointments_care_loop_id"), "appointments", ["care_loop_id"], unique=False)

    # Link encounters table to care_loops
    op.add_column("encounters", sa.Column("care_loop_id", sa.UUID(), nullable=True))
    op.create_foreign_key(op.f("encounters_care_loop_id_fkey"), "encounters", "care_loops", ["care_loop_id"], ["id"])
    op.create_index(op.f("ix_encounters_care_loop_id"), "encounters", ["care_loop_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_encounters_care_loop_id"), table_name="encounters")
    op.drop_constraint(op.f("encounters_care_loop_id_fkey"), "encounters", type_="foreignkey")
    op.drop_column("encounters", "care_loop_id")

    op.drop_index(op.f("ix_appointments_care_loop_id"), table_name="appointments")
    op.drop_constraint(op.f("appointments_care_loop_id_fkey"), "appointments", type_="foreignkey")
    op.drop_column("appointments", "care_loop_id")

    op.drop_index(op.f("ix_care_loops_patient_id"), table_name="care_loops")
    op.drop_table("care_loops")
