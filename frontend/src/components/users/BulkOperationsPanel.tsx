'use client';

import { UserRole } from '@/types/auth';
import { User } from '@/types/users';
import {
    CheckCircle as ActivateIcon,
    Block as BlockIcon,
    Delete as DeleteIcon,
    GroupAdd as GroupIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Typography,
} from '@mui/material';
import React from 'react';

interface BulkOperationsPanelProps {
  selectedUsers: number[];
  users: User[];
  onBulkOperation: (operation: string, additionalData?: unknown) => Promise<void>;
  onCancel: () => void;
}

export function BulkOperationsPanel({
  selectedUsers,
  users,
  onBulkOperation,
  onCancel,
}: BulkOperationsPanelProps) {
  const [operation, setOperation] = React.useState<string>('');
  const [newRole, setNewRole] = React.useState<UserRole>('PC');
  const [isLoading, setIsLoading] = React.useState(false);

  const selectedUserObjects = users.filter(user => selectedUsers.includes(user.id));
  const selectedCount = selectedUsers.length;

  const handleExecute = async () => {
    if (!operation) return;

    setIsLoading(true);
    try {
      const additionalData = operation === 'change_role' ? { role: newRole } : undefined;
      await onBulkOperation(operation, additionalData);
    } catch (error) {
      console.error('Bulk operation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getOperationIcon = (op: string) => {
    switch (op) {
      case 'activate': return <ActivateIcon />;
      case 'deactivate': return <BlockIcon />;
      case 'change_role': return <GroupIcon />;
      case 'delete': return <DeleteIcon />;
      default: return null;
    }
  };

  const getOperationColor = (op: string): 'primary' | 'secondary' | 'error' | 'warning' => {
    switch (op) {
      case 'activate': return 'primary';
      case 'deactivate': return 'warning';
      case 'change_role': return 'secondary';
      case 'delete': return 'error';
      default: return 'primary';
    }
  };

  const getActionButtonText = () => {
    switch (operation) {
      case 'activate': return `Activate ${selectedCount} user${selectedCount > 1 ? 's' : ''}`;
      case 'deactivate': return `Deactivate ${selectedCount} user${selectedCount > 1 ? 's' : ''}`;
      case 'change_role': return `Change role of ${selectedCount} user${selectedCount > 1 ? 's' : ''} to ${newRole}`;
      case 'delete': return `Delete ${selectedCount} user${selectedCount > 1 ? 's' : ''}`;
      default: return 'Execute';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Bulk Operations
        </Typography>
        <Button variant="outlined" size="small" onClick={onCancel}>
          Cancel Selection
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        {selectedCount} user{selectedCount > 1 ? 's' : ''} selected
      </Alert>

      {/* Selected Users Preview */}
      <Box mb={2}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Selected Users:
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          {selectedUserObjects.slice(0, 5).map(user => (
            <Chip
              key={user.id}
              label={user.full_name}
              size="small"
              variant="outlined"
            />
          ))}
          {selectedUserObjects.length > 5 && (
            <Chip
              label={`+${selectedUserObjects.length - 5} more`}
              size="small"
              variant="outlined"
              color="primary"
            />
          )}
        </Box>
      </Box>

      {/* Operation Selection */}
      <Box display="flex" gap={2} alignItems="flex-end" mb={2}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Select Operation</InputLabel>
          <Select
            value={operation}
            label="Select Operation"
            onChange={(e) => setOperation(e.target.value)}
            disabled={isLoading}
          >
            <MenuItem value="activate">
              <Box display="flex" alignItems="center" gap={1}>
                <ActivateIcon fontSize="small" />
                Activate Users
              </Box>
            </MenuItem>
            <MenuItem value="deactivate">
              <Box display="flex" alignItems="center" gap={1}>
                <BlockIcon fontSize="small" />
                Deactivate Users
              </Box>
            </MenuItem>
            <MenuItem value="change_role">
              <Box display="flex" alignItems="center" gap={1}>
                <GroupIcon fontSize="small" />
                Change Role
              </Box>
            </MenuItem>
            <MenuItem value="delete">
              <Box display="flex" alignItems="center" gap={1}>
                <DeleteIcon fontSize="small" />
                Delete Users
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        {/* Role Selection (only for change_role operation) */}
        {operation === 'change_role' && (
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>New Role</InputLabel>
            <Select
              value={newRole}
              label="New Role"
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              disabled={isLoading}
            >
              <MenuItem value="HR">HR</MenuItem>
              <MenuItem value="PC">PC</MenuItem>
              <MenuItem value="RM">RM</MenuItem>
            </Select>
          </FormControl>
        )}

        {/* Execute Button */}
        <Button
          variant="contained"
          color={getOperationColor(operation)}
          onClick={handleExecute}
          disabled={!operation || isLoading}
          startIcon={getOperationIcon(operation)}
          sx={{ minWidth: 120 }}
        >
          {isLoading ? 'Processing...' : 'Execute'}
        </Button>
      </Box>

      {/* Operation Preview */}
      {operation && (
        <Alert 
          severity={operation === 'delete' ? 'warning' : 'info'} 
          sx={{ mt: 1 }}
        >
          <Typography variant="body2">
            <strong>Confirm:</strong> {getActionButtonText()}
          </Typography>
          {operation === 'delete' && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Warning:</strong> This action cannot be undone.
            </Typography>
          )}
        </Alert>
      )}
    </Box>
  );
}