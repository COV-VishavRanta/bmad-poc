'use client';

import { UnauthorizedAccess } from '@/components/common/UnauthorizedAccess';
import { GroupActions } from '@/components/groups/GroupActions';
import { GroupEditModal } from '@/components/groups/GroupEditModal';
import { GroupFilters } from '@/components/groups/GroupFilters';
import { GroupFormModal } from '@/components/groups/GroupFormModal';
import { GroupStats } from '@/components/groups/GroupStats';
import { GroupTable } from '@/components/groups/GroupTable';
import { usePermissions } from '@/hooks/usePermissions';
import { useGroupStore } from '@/store/groups';
import { Group } from '@/types/group';
import { Add as AddIcon, Download as DownloadIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import React, { useEffect } from 'react';

export default function GroupsPage() {
  const {
    groups,
    isLoading,
    error,
    totalCount,
    selectedGroups,
    fetchGroups,
    clearError,
  } = useGroupStore();

  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<Group | null>(null);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (error) {
      // Auto-clear error after 5 seconds
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const { canViewGroups, canCreateGroups } = usePermissions();

  // Check if user has permission to view groups
  if (!canViewGroups) {
    return (
      <UnauthorizedAccess 
        message="You don't have permission to view groups. Please contact your administrator for access."
      />
    );
  }

  const handleCreateGroup = () => {
    setCreateModalOpen(true);
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setEditModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchGroups(); // Refresh the group list
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Group Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Organize and manage project groups to maintain organizational hierarchy
          </Typography>
        </Box>
        
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {canViewGroups && (
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              disabled={selectedGroups.length === 0}
            >
              Export Selected ({selectedGroups.length})
            </Button>
          )}
          
          {canCreateGroups && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateGroup}
            >
              Create Group
            </Button>
          )}
        </Stack>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          onClose={clearError}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Group Statistics */}
        <GroupStats />

        {/* Filters and Actions */}
        <Paper sx={{ p: 3 }}>
          <GroupFilters />
        </Paper>

        {/* Group Actions */}
        <GroupActions />

        {/* Group Table */}
        <Paper sx={{ p: 0, overflow: 'hidden' }}>
          {isLoading && groups.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Loading groups...
              </Typography>
            </Box>
          ) : (
            <>
              <GroupTable groups={groups} onEdit={handleEditGroup} />
              
              {/* Results Summary */}
              {!isLoading && (
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Showing {groups.length} of {totalCount} groups
                    </Typography>
                    {selectedGroups.length > 0 && (
                      <Typography variant="body2" fontWeight="medium">
                        {selectedGroups.length} selected
                      </Typography>
                    )}
                  </Stack>
                </Box>
              )}
            </>
          )}
        </Paper>
      </Stack>

      {/* Modals */}
      <GroupFormModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      <GroupEditModal
        open={editModalOpen}
        group={editingGroup}
        onClose={() => {
          setEditModalOpen(false);
          setEditingGroup(null);
        }}
        onSuccess={handleModalSuccess}
      />
    </Box>
  );
}