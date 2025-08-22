import { usePermissions } from '@/hooks/usePermissions';
import { useProjectStore } from '@/store/projects';
import {
    Delete as DeleteIcon,
    Download as DownloadIcon,
    MoreVert as MoreIcon,
    ChangeCircle as StatusIcon,
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

export const ProjectActions: React.FC = () => {
  const { canPerformBulkOperations, canDeleteProjects } = usePermissions();
  const { 
    selectedProjects, 
    projects, 
    clearProjectSelection,
    performBulkOperation,
    isBulkOperationInProgress 
  } = useProjectStore();
  
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [bulkActionResult, setBulkActionResult] = React.useState<string | null>(null);

  const selectedProjectsData = React.useMemo(() => {
    return projects.filter(p => selectedProjects.includes(p.id));
  }, [projects, selectedProjects]);

  const canPerformBulkActions = canPerformBulkOperations();
  const canDelete = canDeleteProjects;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleBulkExport = async () => {
    try {
      const csvContent = [
        ['ID', 'Name', 'Client', 'Status', 'Type', 'Start Date', 'End Date', 'SOW', 'FTE Allocated'].join(','),
        ...selectedProjectsData.map(project => [
          project.id,
          `"${project.name}"`,
          `"${project.clientName}"`,
          project.status,
          project.projectType,
          project.startDate,
          project.endDate,
          `"${project.sowName}"`,
          project.totalFteAssigned || 0
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projects_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setBulkActionResult(`Successfully exported ${selectedProjects.length} projects`);
      setTimeout(() => setBulkActionResult(null), 5000);
    } catch {
      setBulkActionResult('Failed to export projects');
      setTimeout(() => setBulkActionResult(null), 5000);
    }
    handleMenuClose();
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    try {
      const result = await performBulkOperation({
        type: 'status_change',
        projectIds: selectedProjects,
        data: { newStatus: newStatus as 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled' }
      });
      
      setBulkActionResult(
        `Status updated for ${result.success} projects. ${result.failed > 0 ? `${result.failed} failed.` : ''}`
      );
      setTimeout(() => setBulkActionResult(null), 5000);
    } catch {
      setBulkActionResult('Failed to update project statuses');
      setTimeout(() => setBulkActionResult(null), 5000);
    }
    handleMenuClose();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedProjects.length} projects? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await performBulkOperation({
        type: 'delete',
        projectIds: selectedProjects,
      });
      
      setBulkActionResult(
        `Deleted ${result.success} projects. ${result.failed > 0 ? `${result.failed} failed.` : ''}`
      );
      setTimeout(() => setBulkActionResult(null), 5000);
    } catch {
      setBulkActionResult('Failed to delete projects');
      setTimeout(() => setBulkActionResult(null), 5000);
    }
    handleMenuClose();
  };

  if (selectedProjects.length === 0) {
    return null;
  }

  return (
    <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
      {bulkActionResult && (
        <Alert 
          severity={bulkActionResult.includes('Failed') ? 'error' : 'success'}
          sx={{ mb: 2 }}
          onClose={() => setBulkActionResult(null)}
        >
          {bulkActionResult}
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body1" color="primary.main" fontWeight="medium">
            Bulk Actions
          </Typography>
          <Chip 
            label={`${selectedProjects.length} selected`} 
            size="small" 
            color="primary"
            variant="outlined"
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {/* Clear Selection */}
          <Button
            size="small"
            variant="outlined"
            onClick={clearProjectSelection}
            disabled={isBulkOperationInProgress}
          >
            Clear Selection
          </Button>

          {/* Quick Export */}
          <Button
            size="small"
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleBulkExport}
            disabled={isBulkOperationInProgress}
          >
            Export
          </Button>

          {/* More Actions Menu */}
          {canPerformBulkActions && (
            <>
              <Button
                size="small"
                variant="contained"
                endIcon={<MoreIcon />}
                onClick={handleMenuOpen}
                disabled={isBulkOperationInProgress}
              >
                More Actions
              </Button>

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
                <MenuItem onClick={() => handleBulkStatusChange('active')}>
                  <ListItemIcon>
                    <StatusIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Set Status to Active</ListItemText>
                </MenuItem>

                <MenuItem onClick={() => handleBulkStatusChange('on_hold')}>
                  <ListItemIcon>
                    <StatusIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Set Status to On Hold</ListItemText>
                </MenuItem>

                <MenuItem onClick={() => handleBulkStatusChange('completed')}>
                  <ListItemIcon>
                    <StatusIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Set Status to Completed</ListItemText>
                </MenuItem>

                <Divider />

                <MenuItem onClick={handleBulkExport}>
                  <ListItemIcon>
                    <DownloadIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Export Selected</ListItemText>
                </MenuItem>

                <MenuItem>
                  <ListItemIcon>
                    <ViewIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>View Details</ListItemText>
                </MenuItem>

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
                      <ListItemText>Delete Selected</ListItemText>
                    </MenuItem>
                  </>
                )}
              </Menu>
            </>
          )}
        </Box>
      </Box>

      {/* Selected Projects Summary */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Selected Projects:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 100, overflow: 'auto' }}>
          {selectedProjectsData.slice(0, 10).map((project) => (
            <Chip
              key={project.id}
              label={`${project.name} (${project.clientName})`}
              size="small"
              variant="outlined"
              onDelete={() => {
                // Remove this project from selection
                const newSelection = selectedProjects.filter(id => id !== project.id);
                useProjectStore.getState().setSelectedProjects(newSelection);
              }}
            />
          ))}
          {selectedProjectsData.length > 10 && (
            <Chip
              label={`+${selectedProjectsData.length - 10} more`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};