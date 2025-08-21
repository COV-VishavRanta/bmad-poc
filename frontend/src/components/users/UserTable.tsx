'use client';

import { UserRole } from '@/types/auth';
import { User } from '@/types/users';
import {
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { UserAccessHistoryDialog } from './UserAccessHistoryDialog';
import { UserHistoryDialog } from './UserHistoryDialog';
import { UserStatusDialog } from './UserStatusDialog';

interface UserTableProps {
  users: User[];
  currentPage: number;
  pageSize: number;
  totalUsers: number;
  totalPages: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  selectedUsers: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (column: string) => void;
  onSelectionChange: (userIds: number[]) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: number) => void;
  onRoleChange: (userId: number, role: UserRole) => void;
  onStatusChange: (userId: number, status: 'active' | 'inactive') => void;
  currentUserId?: string;
}

export function UserTable({
  users,
  currentPage,
  pageSize,
  totalUsers,
  sortBy,
  sortOrder,
  selectedUsers,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onSelectionChange,
  onEditUser,
  onDeleteUser,
  onRoleChange,
  onStatusChange,
  currentUserId,
}: UserTableProps) {
  const [anchorEl, setAnchorEl] = React.useState<{ [key: number]: HTMLElement | null }>({});
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    user: User | null;
    action: 'activate' | 'deactivate' | 'change-role' | null;
    newRole?: UserRole;
    loading: boolean;
  }>({
    open: false,
    user: null,
    action: null,
    loading: false
  });

  const [historyDialog, setHistoryDialog] = useState<{
    open: boolean;
    userId: number | null;
    userName: string;
  }>({
    open: false,
    userId: null,
    userName: '',
  });

  const [accessHistoryDialog, setAccessHistoryDialog] = useState<{
    open: boolean;
    userId: number | null;
    userName: string;
  }>({
    open: false,
    userId: null,
    userName: '',
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, userId: number) => {
    setAnchorEl(prev => ({ ...prev, [userId]: event.currentTarget }));
  };

  const handleMenuClose = (userId: number) => {
    setAnchorEl(prev => ({ ...prev, [userId]: null }));
  };

  const openStatusDialog = (user: User, action: 'activate' | 'deactivate' | 'change-role', newRole?: UserRole) => {
    setDialogState({
      open: true,
      user,
      action,
      newRole,
      loading: false
    });
  };

  const closeStatusDialog = () => {
    setDialogState({
      open: false,
      user: null,
      action: null,
      loading: false
    });
  };

  const handleConfirmAction = async () => {
    if (!dialogState.user || !dialogState.action) return;

    setDialogState(prev => ({ ...prev, loading: true }));

    try {
      switch (dialogState.action) {
        case 'activate':
        case 'deactivate':
          await onStatusChange(dialogState.user.id, dialogState.action === 'activate' ? 'active' : 'inactive');
          break;
        case 'change-role':
          if (dialogState.newRole) {
            await onRoleChange(dialogState.user.id, dialogState.newRole);
          }
          break;
      }
      closeStatusDialog();
    } catch {
      setDialogState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelectionChange(users.map(user => user.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectUser = (userId: number) => {
    const isSelected = selectedUsers.includes(userId);
    if (isSelected) {
      onSelectionChange(selectedUsers.filter(id => id !== userId));
    } else {
      onSelectionChange([...selectedUsers, userId]);
    }
  };

  const isAllSelected = users.length > 0 && selectedUsers.length === users.length;
  const isIndeterminate = selectedUsers.length > 0 && selectedUsers.length < users.length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getRoleColor = (role: UserRole): 'primary' | 'secondary' | 'default' => {
    switch (role) {
      case 'HR': return 'primary';
      case 'PC': return 'secondary';
      case 'RM': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string): 'success' | 'default' => {
    return status === 'active' ? 'success' : 'default';
  };

  const canModifyUser = (user: User): boolean => {
    // Users cannot modify themselves
    return user.id.toString() !== currentUserId;
  };

  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <TableCell>
      <Button
        variant="text"
        onClick={() => onSortChange(column)}
        sx={{ 
          fontWeight: 'bold',
          color: 'text.primary',
          textTransform: 'none',
          justifyContent: 'flex-start',
          minWidth: 'auto',
          p: 0,
        }}
        endIcon={
          sortBy === column ? (
            sortOrder === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />
          ) : null
        }
      >
        {children}
      </Button>
    </TableCell>
  );

  if (users.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="textSecondary">
          No users found
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Try adjusting your search filters
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ width: '100%' }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <SortableHeader column="full_name">Name</SortableHeader>
              <SortableHeader column="email">Email</SortableHeader>
              <SortableHeader column="role">Role</SortableHeader>
              <TableCell>Status</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Phone</TableCell>
              <SortableHeader column="created_at">Created</SortableHeader>
              <SortableHeader column="last_login">Last Login</SortableHeader>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => {
              const isSelected = selectedUsers.includes(user.id);
              const menuAnchor = anchorEl[user.id];
              
              return (
                <TableRow
                  key={user.id}
                  selected={isSelected}
                  hover
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleSelectUser(user.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {user.full_name}
                      </Typography>
                      {user.id.toString() === currentUserId && (
                        <Chip 
                          label="You" 
                          size="small" 
                          variant="outlined" 
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role} 
                      color={getRoleColor(user.role)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.status} 
                      color={getStatusColor(user.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{user.department || '-'}</TableCell>
                  <TableCell>{user.phone || '-'}</TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell>
                    {user.last_login ? formatDate(user.last_login) : 'Never'}
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" gap={1}>
                      <Tooltip title="Edit User">
                        <IconButton
                          size="small"
                          onClick={() => onEditUser(user)}
                          disabled={!canModifyUser(user)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="More Actions">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, user.id)}
                          disabled={!canModifyUser(user)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Tooltip>
                      <Menu
                        anchorEl={menuAnchor}
                        open={Boolean(menuAnchor)}
                        onClose={() => handleMenuClose(user.id)}
                      >
                        <MenuItem onClick={() => {
                          setHistoryDialog({
                            open: true,
                            userId: user.id,
                            userName: user.full_name,
                          });
                          handleMenuClose(user.id);
                        }}>
                          View History
                        </MenuItem>
                        <MenuItem onClick={() => {
                          setAccessHistoryDialog({
                            open: true,
                            userId: user.id,
                            userName: user.full_name,
                          });
                          handleMenuClose(user.id);
                        }}>
                          View Access History
                        </MenuItem>
                        <MenuItem onClick={() => {
                          const newRole: UserRole = user.role === 'HR' ? 'PC' : user.role === 'PC' ? 'RM' : 'HR';
                          openStatusDialog(user, 'change-role', newRole);
                          handleMenuClose(user.id);
                        }}>
                          Change Role
                        </MenuItem>
                        <MenuItem onClick={() => {
                          const action = user.status === 'active' ? 'deactivate' : 'activate';
                          openStatusDialog(user, action);
                          handleMenuClose(user.id);
                        }}>
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </MenuItem>
                        <MenuItem 
                          onClick={() => {
                            onDeleteUser(user.id);
                            handleMenuClose(user.id);
                          }}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon sx={{ mr: 1 }} />
                          Delete User
                        </MenuItem>
                      </Menu>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        component="div"
        count={totalUsers}
        page={currentPage - 1}
        onPageChange={(_, newPage) => onPageChange(newPage + 1)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(event) => onPageSizeChange(parseInt(event.target.value, 10))}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />

      <UserStatusDialog
        open={dialogState.open}
        user={dialogState.user}
        action={dialogState.action}
        newRole={dialogState.newRole}
        onConfirm={handleConfirmAction}
        onCancel={closeStatusDialog}
        loading={dialogState.loading}
      />

      <UserHistoryDialog
        open={historyDialog.open}
        userId={historyDialog.userId}
        userName={historyDialog.userName}
        onClose={() => setHistoryDialog({ open: false, userId: null, userName: '' })}
      />

      <UserAccessHistoryDialog
        open={accessHistoryDialog.open}
        userId={accessHistoryDialog.userId}
        userName={accessHistoryDialog.userName}
        onClose={() => setAccessHistoryDialog({ open: false, userId: null, userName: '' })}
      />
    </Paper>
  );
}