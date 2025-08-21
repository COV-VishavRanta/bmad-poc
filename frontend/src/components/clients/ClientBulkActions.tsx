import RoleGuard from '@/components/auth/RoleGuard';
import { Client } from '@/types/client';
import {
    Cancel as ClearIcon,
    Delete as DeleteIcon,
    Download as ExportIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
    Alert,
    AlertTitle,
    Box,
    Button,
    Chip,
    Divider,
    Stack,
    Typography,
} from '@mui/material';
import React from 'react';

interface ClientBulkActionsProps {
  selectedClients: Client[];
  onClearSelection: () => void;
  onBulkDeactivate: (clientIds: number[]) => void;
  onBulkExport: (clientIds: number[]) => void;
  onRefresh: () => void;
}

const ClientBulkActions: React.FC<ClientBulkActionsProps> = ({
  selectedClients,
  onClearSelection,
  onBulkDeactivate,
  onBulkExport,
  onRefresh,
}) => {
  const selectedCount = selectedClients.length;
  const activeSelectedCount = selectedClients.filter(c => c.status === 'active').length;
  const inactiveSelectedCount = selectedClients.filter(c => c.status === 'inactive').length;

  if (selectedCount === 0) {
    return null;
  }

  const handleBulkDeactivate = () => {
    const activeClientIds = selectedClients
      .filter(client => client.status === 'active')
      .map(client => client.id);
    
    if (activeClientIds.length > 0) {
      onBulkDeactivate(activeClientIds);
    }
  };

  const handleBulkExport = () => {
    const clientIds = selectedClients.map(client => client.id);
    onBulkExport(clientIds);
  };

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        p: 2,
        mb: 2,
        borderRadius: 1,
        boxShadow: 1,
      }}
    >
      <Stack spacing={2}>
        {/* Selection Summary */}
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h6" color="primary">
              {selectedCount} client{selectedCount > 1 ? 's' : ''} selected
            </Typography>
            <Stack direction="row" spacing={1}>
              {activeSelectedCount > 0 && (
                <Chip
                  label={`${activeSelectedCount} Active`}
                  color="success"
                  size="small"
                  variant="outlined"
                />
              )}
              {inactiveSelectedCount > 0 && (
                <Chip
                  label={`${inactiveSelectedCount} Inactive`}
                  color="error"
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>
          
          <Button
            startIcon={<ClearIcon />}
            onClick={onClearSelection}
            size="small"
            variant="outlined"
          >
            Clear Selection
          </Button>
        </Box>

        <Divider />

        {/* Bulk Actions */}
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {/* Export Action - Available to all roles */}
          <Button
            startIcon={<ExportIcon />}
            onClick={handleBulkExport}
            variant="outlined"
            size="small"
          >
            Export Selected
          </Button>

          {/* Refresh Action */}
          <Button
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            variant="outlined"
            size="small"
          >
            Refresh Data
          </Button>

          {/* Deactivate Action - Only for HR/PC roles and only if active clients selected */}
          <RoleGuard allowedRoles={['HR', 'PC']}>
            {activeSelectedCount > 0 && (
              <Button
                startIcon={<DeleteIcon />}
                onClick={handleBulkDeactivate}
                variant="outlined"
                color="error"
                size="small"
              >
                Deactivate ({activeSelectedCount})
              </Button>
            )}
          </RoleGuard>
        </Stack>

        {/* Warning for inactive clients */}
        {inactiveSelectedCount > 0 && (
          <Alert severity="info" variant="outlined">
            <AlertTitle>Selection Notice</AlertTitle>
            {inactiveSelectedCount} inactive client{inactiveSelectedCount > 1 ? 's' : ''} selected. 
            Only active clients can be deactivated.
          </Alert>
        )}

        {/* Action Limitations Notice */}
        <RoleGuard allowedRoles={['RM']} fallback={null}>
          <Alert severity="warning" variant="outlined" sx={{ fontSize: '0.875rem' }}>
            <AlertTitle>Limited Access</AlertTitle>
            As a Resource Manager, you can export client data but cannot modify client status.
          </Alert>
        </RoleGuard>
      </Stack>
    </Box>
  );
};

export default ClientBulkActions;