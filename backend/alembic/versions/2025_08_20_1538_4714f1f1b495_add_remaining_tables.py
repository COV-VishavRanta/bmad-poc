"""add_remaining_tables

Revision ID: 4714f1f1b495
Revises: 526562e78ecc
Create Date: 2025-08-20 15:38:07.089081

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = '4714f1f1b495'
down_revision: Union[str, Sequence[str], None] = '526562e78ecc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    
    # Create sows table
    op.create_table('sows',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('draft', 'active', 'completed', 'cancelled', name='sowstatus'), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('total_fte', mysql.DECIMAL(4, 2), nullable=False, default=0.00),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('start_date <= end_date OR start_date IS NULL OR end_date IS NULL', name='chk_sow_date_order'),
        sa.CheckConstraint('total_fte >= 0', name='chk_sow_total_fte_positive')
    )
    op.create_index('idx_sows_client_id', 'sows', ['client_id'])
    op.create_index('idx_sows_status', 'sows', ['status'])
    op.create_index('idx_sows_dates', 'sows', ['start_date', 'end_date'])
    
    # Create groups table
    op.create_table('groups',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('sow_id', sa.Integer(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id']),
        sa.ForeignKeyConstraint(['sow_id'], ['sows.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('start_date <= end_date', name='chk_group_date_order')
    )
    op.create_index('idx_groups_client_id', 'groups', ['client_id'])
    op.create_index('idx_groups_dates', 'groups', ['start_date', 'end_date'])
    op.create_index('uk_groups_name_client', 'groups', ['name', 'client_id'], unique=True)
    
    # Create projects table
    op.create_table('projects',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('project_type', sa.Enum('Development', 'Maintenance', 'Consulting', 'Support', name='projecttype'), nullable=False),
        sa.Column('status', sa.Enum('planned', 'active', 'on_hold', 'completed', 'cancelled', name='projectstatus'), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=True),
        sa.Column('sow_id', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id']),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id']),
        sa.ForeignKeyConstraint(['sow_id'], ['sows.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('start_date <= end_date', name='chk_project_date_order')
    )
    op.create_index('idx_projects_client_id', 'projects', ['client_id'])
    op.create_index('idx_projects_group_id', 'projects', ['group_id'])
    op.create_index('idx_projects_status', 'projects', ['status'])
    op.create_index('idx_projects_dates', 'projects', ['start_date', 'end_date'])


def downgrade() -> None:
    """Downgrade schema."""
    
    # Drop tables in reverse order
    op.drop_table('projects')
    op.drop_table('groups')
    op.drop_table('sows')
