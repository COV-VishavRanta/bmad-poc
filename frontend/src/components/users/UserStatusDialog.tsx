'use client';

import { UserRole } from '@/types/auth';
import { User } from '@/types/users';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Typography,
} from '@mui/material';

interface UserStatusDialogProps {
  open: boolean;
  user: User | null;
  action: 'activate' | 'deactivate' | 'change-role' | null;
  newRole?: UserRole;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const getRolePermissions = (role: UserRole): string[] => {
  const permissions = {
    HR: [
      'Full user management access',
      'Create and edit all users',
      'Manage client relationships',
      'Oversee all projects and SOWs',
      'Access to all system features',
      'Generate comprehensive reports'
    ],
    PC: [
      'Manage client relationships',
      'Create and manage projects',
      'Handle SOW creation and updates',
      'View project timelines',
      'Generate client and project reports'
    ],
    RM: [
      'Manage team assignments',
      'Oversee project timelines',
      'Coordinate team resources',
      'View assignment history',
      'Generate resource reports'
    ]
  };
  return permissions[role] || [];
};

export function UserStatusDialog({
  open,
  user,
  action,
  newRole,
  onConfirm,
  onCancel,
  loading = false
}: UserStatusDialogProps) {
  if (!user || !action) return null;

  const getDialogContent = () => {
    switch (action) {
      case 'activate':
        return {
          title: 'Activate User',
          content: (
            <DialogContentText>
              Are you sure you want to activate <strong>{user.full_name}</strong>?
              <br /><br />
              This will:
              <ul>
                <li>Allow the user to log in to the system</li>
                <li>Restore their previous role permissions</li>
                <li>Enable them to access their assigned features</li>
              </ul>
            </DialogContentText>
          ),
          confirmText: 'Activate User',
          confirmColor: 'primary' as const
        };

      case 'deactivate':
        return {
          title: 'Deactivate User',
          content: (
            <DialogContentText>
              Are you sure you want to deactivate <strong>{user.full_name}</strong>?
              <br /><br />
              <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                This will immediately:
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>Prevent the user from logging in</li>
                  <li>Terminate any active sessions</li>
                  <li>Revoke all system access</li>
                  <li>Remove them from active assignments</li>
                </ul>
              </Alert>
              This action can be reversed by reactivating the user later.
            </DialogContentText>
          ),
          confirmText: 'Deactivate User',
          confirmColor: 'error' as const
        };

      case 'change-role':
        if (!newRole) return null;
        const currentPermissions = getRolePermissions(user.role);
        const newPermissions = getRolePermissions(newRole);
        
        return {
          title: 'Change User Role',
          content: (
            <Box>
              <DialogContentText>
                Are you sure you want to change <strong>{user.full_name}</strong>&apos;s role 
                from <Chip label={user.role} size="small" /> to <Chip label={newRole} size="small" color="primary" />?
              </DialogContentText>
              
              <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                This will immediately update their permissions and may terminate their current session.
              </Alert>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Current Permissions ({user.role}):
                </Typography>
                <Box sx={{ mb: 2 }}>
                  {currentPermissions.map((permission, index) => (
                    <Typography key={index} variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      • {permission}
                    </Typography>
                  ))}
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  New Permissions ({newRole}):
                </Typography>
                <Box>
                  {newPermissions.map((permission, index) => (
                    <Typography key={index} variant="body2" color="primary" sx={{ fontSize: '0.85rem' }}>
                      • {permission}
                    </Typography>
                  ))}
                </Box>
              </Box>
            </Box>
          ),
          confirmText: 'Change Role',
          confirmColor: 'primary' as const
        };

      default:
        return null;
    }
  };

  const dialogContent = getDialogContent();
  if (!dialogContent) return null;

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>{dialogContent.title}</DialogTitle>
      <DialogContent>
        {dialogContent.content}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color={dialogContent.confirmColor}
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Processing...' : dialogContent.confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}