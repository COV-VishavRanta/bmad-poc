import { usePermissions } from '@/hooks/usePermissions';
import { useGroupStore } from '@/store/groups';
import {
    Archive as ArchiveIcon,
    Delete as DeleteIcon,
    Download as DownloadIcon,
    MoreVert as MoreIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Typography,
} from '@mui/material';
import React from 'react';

export const GroupActions: React.FC = () => {
  const { canEditGroups, canDeleteGroups } = usePermissions();
  const { 
    selectedGroups, 
    groups, 
    clearGroupSelection,
    performBulkOperation,
    isBulkOperationInProgress 
  } = useGroupStore();
  
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [bulkActionResult, setBulkActionResult] = React.useState<string | null>(null);

  const selectedGroupsData = React.useMemo(() => {
    return groups.filter(g => selectedGroups.includes(g.id));
  }, [groups, selectedGroups]);

  const canPerformBulkActions = canEditGroups;
  const canDelete = canDeleteGroups;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleBulkExport = async () => {
    try {
      const csvContent = [
        ['ID', 'Name', 'Client', 'Status', 'Start Date', 'End Date', 'Active Projects', 'Team Members', 'Created By', 'Created Date'].join(','),
        ...selectedGroupsData.map(group => [
          group.id,
          `"${group.name}"`,
          `"${group.clientName}"`,
          group.status,
          group.startDate,
          group.endDate,
          (group as { activeProjectCount?: number }).activeProjectCount || 0,
          (group as { teamMembersCount?: number }).teamMembersCount || 0,
          `"${group.creatorName || 'System'}"`,
          new Date(group.createdAt).toLocaleDateString(),
        ].join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `groups_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      setBulkActionResult(`Successfully exported ${selectedGroups.length} groups`);
      setTimeout(() => setBulkActionResult(null), 5000);
    } catch {
      setBulkActionResult('Failed to export groups');
      setTimeout(() => setBulkActionResult(null), 5000);
    }
    handleMenuClose();
  };

  const handleBulkArchive = async () => {
    try {
      await performBulkOperation({
        type: 'status_change',
        groupIds: selectedGroups,
        data: { newStatus: 'archived' }
      });
      setBulkActionResult(`Successfully archived ${selectedGroups.length} groups`);
      setTimeout(() => setBulkActionResult(null), 5000);
      clearGroupSelection();
    } catch {
      setBulkActionResult('Failed to archive groups');
      setTimeout(() => setBulkActionResult(null), 5000);
    }
    handleMenuClose();
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedGroups.length} groups? This action cannot be undone.`)) {
      try {
        await performBulkOperation({
          type: 'delete',
          groupIds: selectedGroups
        });
        setBulkActionResult(`Successfully deleted ${selectedGroups.length} groups`);
        setTimeout(() => setBulkActionResult(null), 5000);
        clearGroupSelection();
      } catch {
        setBulkActionResult('Failed to delete groups');
        setTimeout(() => setBulkActionResult(null), 5000);
      }
    }
    handleMenuClose();
  };

  const hasSelectedGroups = selectedGroups.length > 0;

  if (!hasSelectedGroups) {
    return null;
  }

  return (
    <Box>
      {bulkActionResult && (
        <Alert 
          severity={bulkActionResult.includes('Failed') ? 'error' : 'success'} 
          onClose={() => setBulkActionResult(null)}
          sx={{ mb: 2 }}
        >
          {bulkActionResult}
        </Alert>
      )}

      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        p: 2,
        bgcolor: 'primary.light',
        borderRadius: 1,
        mb: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body1" fontWeight="medium">
            {selectedGroups.length} groups selected
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedGroupsData.map(group => (
              <Chip
                key={group.id}
                label={group.name}
                size="small"
                onDelete={() => {
                  // This functionality would need to be implemented in the store
                  // For now, just clear the entire selection
                  clearGroupSelection();
                }}
              />
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={clearGroupSelection}
          >
            Clear Selection
          </Button>
          
          <Button
            variant="contained"
            size="small"
            onClick={handleMenuOpen}
            endIcon={<MoreIcon />}
            disabled={isBulkOperationInProgress}
          >
            Actions
          </Button>
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleBulkExport}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export to CSV</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => window.open('/groups/reports', '_blank')}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Reports</ListItemText>
        </MenuItem>

        {canPerformBulkActions && (
          <>
            <Divider />
            
            <MenuItem onClick={handleBulkArchive}>
              <ListItemIcon>
                <ArchiveIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Archive Groups</ListItemText>
            </MenuItem>
          </>
        )}

        {canDelete && (
          <>
            <Divider />
            
            <MenuItem 
              onClick={handleBulkDelete}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Delete Groups</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};