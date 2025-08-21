'use client';

import { BulkOperationsPanel } from '@/components/users/BulkOperationsPanel';
import { UserForm } from '@/components/users/UserForm';
import { UserSearchFilters } from '@/components/users/UserSearchFilters';
import { UserTable } from '@/components/users/UserTable';
import { userApi, UserApiError } from '@/lib/api/users';
import { useAuthStore } from '@/store/auth';
import {
    User,
    UserCreateRequest,
    UserFilterState,
    UserSearchParams,
    UserUpdateRequest,
} from '@/types/users';
import {
    Add as AddIcon,
    FileDownload as ExportIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Container,
    Dialog,
    DialogContent,
    DialogTitle,
    Paper,
    Snackbar,
    Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

export default function UsersPage() {
  const { user: currentUser, hasRole } = useAuthStore();
  
  // Check if user has HR role
  const hasHRAccess = hasRole('HR');
  
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Filter and search state
  const [filters, setFilters] = useState<UserFilterState>({
    search: '',
    role: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
  });
  
  // Sorting state
  const [sortBy, setSortBy] = useState<'full_name' | 'email' | 'role' | 'created_at' | 'last_login'>('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Selection state for bulk operations
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  
  // UI state
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Load users data
  const loadUsers = useCallback(async (searchParams?: Partial<UserSearchParams>) => {
    try {
      setLoading(true);
      
      const params: UserSearchParams = {
        page: currentPage,
        pageSize,
        sortBy,
        sortOrder,
        ...filters,
        ...searchParams,
      };

      // Clean up empty filter values
      Object.keys(params).forEach(key => {
        const value = params[key as keyof UserSearchParams];
        if (value === '' || value === 'all') {
          delete params[key as keyof UserSearchParams];
        }
      });

      const response = await userApi.getUsers(params);
      
      setUsers(response.users);
      setTotalUsers(response.total);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Failed to load users:', error);
      showNotification('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, sortBy, sortOrder, filters]);

  // Initial load
  useEffect(() => {
    if (hasHRAccess) {
      loadUsers();
    }
  }, [hasHRAccess, loadUsers]);

  // Reload when filters change (with debounce)
  useEffect(() => {
    if (!hasHRAccess) return;
    
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        loadUsers();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters, hasHRAccess, currentPage, loadUsers]);

  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const handleCreateUser = async (userData: UserCreateRequest) => {
    try {
      await userApi.createUser(userData);
      showNotification('User created successfully');
      setCreateDialogOpen(false);
      loadUsers();
    } catch (error) {
      const message = error instanceof UserApiError ? error.message : 'Failed to create user';
      showNotification(message, 'error');
      throw error;
    }
  };

  const handleUpdateUser = async (userData: UserUpdateRequest) => {
    if (!editingUser) return;
    
    try {
      await userApi.updateUser(editingUser.id, userData);
      showNotification('User updated successfully');
      setEditDialogOpen(false);
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      const message = error instanceof UserApiError ? error.message : 'Failed to update user';
      showNotification(message, 'error');
      throw error;
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await userApi.deleteUser(userId);
      showNotification('User deactivated successfully');
      loadUsers();
    } catch (error) {
      const message = error instanceof UserApiError ? error.message : 'Failed to deactivate user';
      showNotification(message, 'error');
    }
  };

  const handleRoleChange = async (userId: number, role: 'HR' | 'PC' | 'RM') => {
    try {
      await userApi.changeUserRole(userId, { role });
      showNotification('User role updated successfully');
      loadUsers();
    } catch (error) {
      const message = error instanceof UserApiError ? error.message : 'Failed to update user role';
      showNotification(message, 'error');
    }
  };

  const handleStatusChange = async (userId: number, status: 'active' | 'inactive') => {
    try {
      await userApi.changeUserStatus(userId, { status });
      showNotification(`User ${status === 'active' ? 'activated' : 'deactivated'} successfully`);
      loadUsers();
    } catch (error) {
      const message = error instanceof UserApiError ? error.message : 'Failed to update user status';
      showNotification(message, 'error');
    }
  };

  const handleExport = async () => {
    try {
      const params: UserSearchParams = {
        ...filters,
        sortBy,
        sortOrder,
      };

      // Clean up empty filter values
      Object.keys(params).forEach(key => {
        const value = params[key as keyof UserSearchParams];
        if (value === '' || value === 'all') {
          delete params[key as keyof UserSearchParams];
        }
      });

      const blob = await userApi.exportUsers(params);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showNotification('Users exported successfully');
    } catch (error) {
      const message = error instanceof UserApiError ? error.message : 'Failed to export users';
      showNotification(message, 'error');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleSortChange = (column: string) => {
    if (column === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column as typeof sortBy);
      setSortOrder('asc');
    }
  };

  const handleFilterChange = (newFilters: Partial<UserFilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleSelectionChange = (userIds: number[]) => {
    setSelectedUsers(userIds);
  };

  const handleBulkOperation = async () => {
    // This will be handled by the BulkOperationsPanel component
    showNotification('Bulk operation completed successfully');
    setSelectedUsers([]);
    loadUsers();
  };

  // Check access permission
  if (!hasHRAccess) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          Access Denied. Only HR users can access user management.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadUsers()}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
            disabled={loading}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {/* Dashboard Cards */}
      <Box display="flex" gap={3} sx={{ mb: 4, flexWrap: 'wrap' }}>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Users
            </Typography>
            <Typography variant="h4">
              {totalUsers}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Active Users
            </Typography>
            <Typography variant="h4">
              {users.filter(user => user.status === 'active').length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              HR Users
            </Typography>
            <Typography variant="h4">
              {users.filter(user => user.role === 'HR').length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Selected
            </Typography>
            <Typography variant="h4">
              {selectedUsers.length}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <UserSearchFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          loading={loading}
        />
      </Paper>

      {/* Bulk Operations Panel */}
      {selectedUsers.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <BulkOperationsPanel
            selectedUsers={selectedUsers}
            users={users}
            onBulkOperation={handleBulkOperation}
            onCancel={() => setSelectedUsers([])}
          />
        </Paper>
      )}

      {/* User Table */}
      <Paper sx={{ overflow: 'hidden' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <UserTable
            users={users}
            currentPage={currentPage}
            pageSize={pageSize}
            totalUsers={totalUsers}
            totalPages={totalPages}
            sortBy={sortBy}
            sortOrder={sortOrder}
            selectedUsers={selectedUsers}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSortChange={handleSortChange}
            onSelectionChange={handleSelectionChange}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            onRoleChange={handleRoleChange}
            onStatusChange={handleStatusChange}
            currentUserId={currentUser?.id}
          />
        )}
      </Paper>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <UserForm
            onSubmit={handleCreateUser}
            onCancel={() => setCreateDialogOpen(false)}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {editingUser && (
            <UserForm
              initialData={editingUser}
              onSubmit={handleUpdateUser}
              onCancel={() => {
                setEditDialogOpen(false);
                setEditingUser(null);
              }}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}