"""enhance_group_model_and_add_history

Revision ID: enhance_group_model_and_add_history
Revises: 099a4f65c6f3
Create Date: 2025-08-22 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'enhance_group_model_and_add_history'
down_revision: Union[str, Sequence[str], None] = '099a4f65c6f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    
    # Add status and created_by columns to groups table
    op.add_column('groups', sa.Column('status', sa.Enum('active', 'completed', 'cancelled', 'archived', name='groupstatus'), nullable=False, server_default='active'))
    op.add_column('groups', sa.Column('created_by', sa.Integer(), nullable=True))
    
    # Add foreign key constraint for created_by
    op.create_foreign_key('fk_groups_created_by', 'groups', 'users', ['created_by'], ['id'])
    
    # Add indexes for new columns
    op.create_index('idx_groups_status', 'groups', ['status'])
    op.create_index('idx_groups_sow_id', 'groups', ['sow_id'])
    
    # Create group_history table
    op.create_table('group_history',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('changed_by', sa.Integer(), nullable=True),
        sa.Column('action', sa.Enum('created', 'updated', 'deleted', 'status_changed', 'projects_added', 'projects_removed', name='grouphistoryaction'), nullable=False),
        sa.Column('changed_fields', sa.JSON(), nullable=True),
        sa.Column('old_values', sa.JSON(), nullable=True),
        sa.Column('new_values', sa.JSON(), nullable=True),
        sa.Column('change_metadata', sa.JSON(), nullable=True),
        sa.Column('changed_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id']),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add indexes for group_history table
    op.create_index('idx_group_history_group_id', 'group_history', ['group_id'])
    op.create_index('idx_group_history_action', 'group_history', ['action'])
    op.create_index('idx_group_history_changed_at', 'group_history', ['changed_at'])


def downgrade() -> None:
    """Downgrade schema."""
    
    # Drop group_history table
    op.drop_table('group_history')
    
    # Remove added columns from groups table
    op.drop_constraint('fk_groups_created_by', 'groups', type_='foreignkey')
    op.drop_index('idx_groups_status', 'groups')
    op.drop_index('idx_groups_sow_id', 'groups')
    op.drop_column('groups', 'created_by')
    op.drop_column('groups', 'status')