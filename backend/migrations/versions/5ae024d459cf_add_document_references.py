"""add document_references

Revision ID: 5ae024d459cf
Revises: 4ecac63fb244
Create Date: 2026-05-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5ae024d459cf'
down_revision: Union[str, None] = '3f96eac560d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('document_references',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('appointment_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('file_name', sa.String(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('content_type', sa.String(), nullable=False),
        sa.Column('document_type', sa.String(), nullable=False),
        sa.Column('uploaded_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
        sa.ForeignKeyConstraint(['uploaded_by_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_document_references_appointment_id'), 'document_references', ['appointment_id'], unique=False)
    op.create_index(op.f('ix_document_references_patient_id'), 'document_references', ['patient_id'], unique=False)
    op.create_index(op.f('ix_document_references_uploaded_by_user_id'), 'document_references', ['uploaded_by_user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_document_references_uploaded_by_user_id'), table_name='document_references')
    op.drop_index(op.f('ix_document_references_patient_id'), table_name='document_references')
    op.drop_index(op.f('ix_document_references_appointment_id'), table_name='document_references')
    op.drop_table('document_references')
