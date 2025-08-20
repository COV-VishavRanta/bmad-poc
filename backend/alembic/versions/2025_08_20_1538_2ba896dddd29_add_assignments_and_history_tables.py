"""add_assignments_and_history_tables

Revision ID: 2ba896dddd29
Revises: 4714f1f1b495
Create Date: 2025-08-20 15:38:47.825072

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = '2ba896dddd29'
down_revision: Union[str, Sequence[str], None] = '4714f1f1b495'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    
    # Create sow_roles table
    op.create_table('sow_roles',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('sow_id', sa.Integer(), nullable=False),
        sa.Column('role_name', sa.Enum('Backend Developer', 'Frontend Developer', 'Designer', 'Tester', 'Business Analyst', 'Architect', 'Project Manager', name='sowrolename'), nullable=False),
        sa.Column('fte_allocation', mysql.DECIMAL(4, 2), nullable=False),
        sa.Column('hourly_rate', mysql.DECIMAL(8, 2), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(['sow_id'], ['sows.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('fte_allocation > 0', name='chk_sow_role_fte_positive'),
        sa.CheckConstraint('hourly_rate IS NULL OR hourly_rate > 0', name='chk_sow_role_rate_positive')
    )
    op.create_index('idx_sow_roles_sow_id', 'sow_roles', ['sow_id'])
    op.create_index('uk_sow_roles_sow_role', 'sow_roles', ['sow_id', 'role_name'], unique=True)
    
    # Create assignments table
    op.create_table('assignments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('role_name', sa.String(100), nullable=False),
        sa.Column('fte_allocation', mysql.DECIMAL(4, 2), nullable=False),
        sa.Column('status', sa.Enum('planned', 'active', 'completed', 'cancelled', name='assignmentstatus'), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('fte_allocation BETWEEN 0.1 AND 1.0', name='chk_fte_range'),
        sa.CheckConstraint('start_date <= end_date', name='chk_date_order')
    )
    op.create_index('idx_assignments_user_id', 'assignments', ['user_id'])
    op.create_index('idx_assignments_project_id', 'assignments', ['project_id'])
    op.create_index('idx_assignments_dates', 'assignments', ['start_date', 'end_date'])
    op.create_index('idx_assignments_status', 'assignments', ['status'])
    
    # Create history tables
    op.create_table('client_history',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('changed_by', sa.Integer(), nullable=True),
        sa.Column('action', sa.Enum('created', 'updated', 'deleted', 'activated', 'deactivated', name='clienthistoryaction'), nullable=False),
        sa.Column('changed_fields', sa.JSON(), nullable=True),
        sa.Column('old_values', sa.JSON(), nullable=True),
        sa.Column('new_values', sa.JSON(), nullable=True),
        sa.Column('changed_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id']),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_client_history_client_id', 'client_history', ['client_id'])
    op.create_index('idx_client_history_action', 'client_history', ['action'])
    op.create_index('idx_client_history_changed_at', 'client_history', ['changed_at'])
    
    op.create_table('project_history',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('changed_by', sa.Integer(), nullable=True),
        sa.Column('action', sa.Enum('created', 'updated', 'deleted', 'status_changed', name='projecthistoryaction'), nullable=False),
        sa.Column('changed_fields', sa.JSON(), nullable=True),
        sa.Column('old_values', sa.JSON(), nullable=True),
        sa.Column('new_values', sa.JSON(), nullable=True),
        sa.Column('changed_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_project_history_project_id', 'project_history', ['project_id'])
    op.create_index('idx_project_history_action', 'project_history', ['action'])
    op.create_index('idx_project_history_changed_at', 'project_history', ['changed_at'])
    
    op.create_table('sow_history',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('sow_id', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('changes_description', sa.Text(), nullable=True),
        sa.Column('roles_snapshot', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(['sow_id'], ['sows.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('start_date <= end_date', name='chk_sow_history_date_order'),
        sa.CheckConstraint('version_number > 0', name='chk_sow_history_version_positive')
    )
    op.create_index('idx_sow_history_sow_id', 'sow_history', ['sow_id'])
    op.create_index('idx_sow_history_version', 'sow_history', ['version_number'])
    op.create_index('uk_sow_history_sow_version', 'sow_history', ['sow_id', 'version_number'], unique=True)
    
    op.create_table('assignment_history',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('assignment_id', sa.Integer(), nullable=False),
        sa.Column('changed_by', sa.Integer(), nullable=True),
        sa.Column('action', sa.Enum('created', 'updated', 'deleted', 'status_changed', name='assignmenthistoryaction'), nullable=False),
        sa.Column('changed_fields', sa.JSON(), nullable=True),
        sa.Column('old_values', sa.JSON(), nullable=True),
        sa.Column('new_values', sa.JSON(), nullable=True),
        sa.Column('changed_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id']),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_assignment_history_assignment_id', 'assignment_history', ['assignment_id'])
    op.create_index('idx_assignment_history_action', 'assignment_history', ['action'])
    op.create_index('idx_assignment_history_changed_at', 'assignment_history', ['changed_at'])


def downgrade() -> None:
    """Downgrade schema."""
    
    # Drop tables in reverse order
    op.drop_table('assignment_history')
    op.drop_table('sow_history')
    op.drop_table('project_history')
    op.drop_table('client_history')
    op.drop_table('assignments')
    op.drop_table('sow_roles')
