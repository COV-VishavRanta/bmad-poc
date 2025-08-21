import { useClientStore } from '@/store/clients';
import { Client, ClientHistory } from '@/types/client';
import {
    CheckCircle as ActivateIcon,
    Close,
    CompareArrows as CompareIcon,
    Add as CreateIcon,
    Block as DeactivateIcon,
    Edit as EditIcon,
    Download as ExportIcon,
    FilterList as FilterIcon,
    History as HistoryIcon,
    Person as PersonIcon,
    Search as SearchIcon,
    Visibility as ViewIcon
} from '@mui/icons-material';
import {
    Alert,
    Badge,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Pagination,
    Paper,
    Select,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';

// Helper function to format dates
const formatDate = (dateString: string, format: 'date' | 'time' | 'full' = 'full') => {
  const date = new Date(dateString);
  
  switch (format) {
    case 'date':
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    case 'time':
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    case 'full':
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    default:
      return date.toLocaleString();
  }
};

interface ClientAuditTrailModalProps {
  open: boolean;
  client: Client;
  onClose: () => void;
}

type HistoryAction = 'all' | 'create' | 'update' | 'deactivate' | 'reactivate';
type TimeFilter = 'all' | 'today' | 'week' | 'month' | 'year';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  'create': <CreateIcon />,
  'update': <EditIcon />,
  'deactivate': <DeactivateIcon />,
  'reactivate': <ActivateIcon />,
  'default': <HistoryIcon />
};

const ACTION_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  'create': 'success',
  'update': 'primary',
  'deactivate': 'error',
  'reactivate': 'success',
  'default': 'info'
};

export const ClientAuditTrailModal: React.FC<ClientAuditTrailModalProps> = ({
  open,
  client,
  onClose
}) => {
  const { clientHistory, isLoadingHistory, fetchClientHistory } = useClientStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<HistoryAction>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [userFilter, setUserFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedComparison, setSelectedComparison] = useState<ClientHistory | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch history when modal opens
  useEffect(() => {
    if (open && client) {
      fetchClientHistory(client.id);
      setPage(1);
      setSearchTerm('');
      setActionFilter('all');
      setTimeFilter('all');
      setUserFilter('all');
    }
  }, [open, client, fetchClientHistory]);

  // Filter history based on criteria
  const filteredHistory = clientHistory.filter(item => {
    // Search filter
    if (searchTerm && !item.action.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !item.field?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !item.userName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !item.reason?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Action filter
    if (actionFilter !== 'all' && item.action !== actionFilter) {
      return false;
    }

    // User filter
    if (userFilter !== 'all' && item.userName !== userFilter) {
      return false;
    }

    // Time filter
    if (timeFilter !== 'all') {
      const itemDate = new Date(item.timestamp);
      const now = new Date();
      
      switch (timeFilter) {
        case 'today':
          return itemDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return itemDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return itemDate >= monthAgo;
        case 'year':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          return itemDate >= yearAgo;
      }
    }

    return true;
  });

  // Paginate filtered results
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Get unique users for filter
  const uniqueUsers = Array.from(new Set(clientHistory.map(item => item.userName)));

  // Handle export functionality
  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Field', 'Old Value', 'New Value', 'User', 'Reason'].join(','),
      ...filteredHistory.map(item => [
        item.timestamp,
        item.action,
        item.field || '',
        `"${item.oldValue || ''}"`,
        `"${item.newValue || ''}"`,
        item.userName,
        `"${item.reason || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${client.name}_audit_trail_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Render change comparison
  const renderChangeComparison = (item: ClientHistory) => {
    if (!item.field || (!item.oldValue && !item.newValue)) {
      return null;
    }

    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Field Change: {item.field}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box flex={1}>
            <Typography variant="body2" color="text.secondary">
              Before:
            </Typography>
            <Typography variant="body2" sx={{ 
              bgcolor: 'error.light', 
              color: 'error.contrastText',
              p: 1, 
              borderRadius: 0.5,
              fontFamily: 'monospace'
            }}>
              {item.oldValue || '(empty)'}
            </Typography>
          </Box>
          <CompareIcon color="action" />
          <Box flex={1}>
            <Typography variant="body2" color="text.secondary">
              After:
            </Typography>
            <Typography variant="body2" sx={{ 
              bgcolor: 'success.light', 
              color: 'success.contrastText',
              p: 1, 
              borderRadius: 0.5,
              fontFamily: 'monospace'
            }}>
              {item.newValue || '(empty)'}
            </Typography>
          </Box>
        </Stack>
      </Box>
    );
  };

  // Render history item card
  const renderHistoryCard = (item: ClientHistory) => {
    const actionIcon = ACTION_ICONS[item.action] || ACTION_ICONS.default;
    const actionColor = ACTION_COLORS[item.action] || ACTION_COLORS.default;

    return (
      <Card key={item.id} elevation={2} sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: `${actionColor}.light`,
                  color: `${actionColor}.contrastText`
                }}
              >
                {actionIcon}
              </Box>
              <Box>
                <Typography variant="h6" component="div">
                  {item.action.charAt(0).toUpperCase() + item.action.slice(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(item.timestamp, 'date')} at {formatDate(item.timestamp, 'time')}
                </Typography>
              </Box>
            </Box>
            <Chip
              size="small"
              icon={<PersonIcon />}
              label={item.userName}
              variant="outlined"
              color="primary"
            />
          </Box>
          
          {item.field && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Field:</strong> {item.field}
            </Typography>
          )}
          
          {item.reason && (
            <Typography variant="body2" gutterBottom>
              <strong>Reason:</strong> {item.reason}
            </Typography>
          )}

          {/* Change comparison */}
          {renderChangeComparison(item)}

          {/* View details button */}
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button
              size="small"
              startIcon={<ViewIcon />}
              onClick={() => setSelectedComparison(item)}
            >
              View Details
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh', maxHeight: '90vh' }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={1}>
              <HistoryIcon color="primary" />
              <Typography variant="h6">
                Audit Trail: {client.name}
              </Typography>
              <Badge badgeContent={filteredHistory.length} color="primary">
                <Chip label="Changes" size="small" />
              </Badge>
            </Box>
            <Box display="flex" gap={1}>
              <Button
                size="small"
                startIcon={<FilterIcon />}
                onClick={() => setShowFilters(!showFilters)}
                variant={showFilters ? 'contained' : 'outlined'}
              >
                Filters
              </Button>
              <Button
                size="small"
                startIcon={<ExportIcon />}
                onClick={handleExport}
                disabled={filteredHistory.length === 0}
              >
                Export
              </Button>
              <IconButton onClick={onClose} size="small">
                <Close />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3}>
            {/* Filters Section */}
            {showFilters && (
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Filter Options
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  <TextField
                    label="Search"
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                    }}
                    sx={{ minWidth: 200 }}
                  />
                  
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Action</InputLabel>
                    <Select
                      value={actionFilter}
                      onChange={(e) => setActionFilter(e.target.value as HistoryAction)}
                      label="Action"
                    >
                      <MenuItem value="all">All Actions</MenuItem>
                      <MenuItem value="create">Create</MenuItem>
                      <MenuItem value="update">Update</MenuItem>
                      <MenuItem value="deactivate">Deactivate</MenuItem>
                      <MenuItem value="reactivate">Reactivate</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Time Period</InputLabel>
                    <Select
                      value={timeFilter}
                      onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                      label="Time Period"
                    >
                      <MenuItem value="all">All Time</MenuItem>
                      <MenuItem value="today">Today</MenuItem>
                      <MenuItem value="week">Last 7 Days</MenuItem>
                      <MenuItem value="month">Last 30 Days</MenuItem>
                      <MenuItem value="year">Last Year</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>User</InputLabel>
                    <Select
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      label="User"
                    >
                      <MenuItem value="all">All Users</MenuItem>
                      {uniqueUsers.map(user => (
                        <MenuItem key={user} value={user}>{user}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Paper>
            )}

            {/* Loading State */}
            {isLoadingHistory && (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            )}

            {/* Empty State */}
            {!isLoadingHistory && filteredHistory.length === 0 && (
              <Alert severity="info">
                No audit trail entries found for the selected criteria.
              </Alert>
            )}

            {/* History Cards */}
            {!isLoadingHistory && filteredHistory.length > 0 && (
              <Box>
                <Stack spacing={2}>
                  {paginatedHistory.map((item) => renderHistoryCard(item))}
                </Stack>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Box display="flex" justifyContent="center" mt={3}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(_, newPage) => setPage(newPage)}
                      color="primary"
                    />
                  </Box>
                )}
              </Box>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
            Showing {filteredHistory.length} of {clientHistory.length} entries
          </Typography>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Change Comparison Detail Modal */}
      {selectedComparison && (
        <Dialog
          open={!!selectedComparison}
          onClose={() => setSelectedComparison(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" justifyContent="between" alignItems="center">
              <Typography variant="h6">
                Change Details: {selectedComparison.action}
              </Typography>
              <IconButton onClick={() => setSelectedComparison(null)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2">Timestamp</Typography>
                <Typography variant="body2">
                  {formatDate(selectedComparison.timestamp, 'full')}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2">User</Typography>
                <Typography variant="body2">{selectedComparison.userName}</Typography>
              </Box>

              {selectedComparison.field && (
                <Box>
                  <Typography variant="subtitle2">Field Changed</Typography>
                  <Typography variant="body2">{selectedComparison.field}</Typography>
                </Box>
              )}

              {selectedComparison.reason && (
                <Box>
                  <Typography variant="subtitle2">Reason</Typography>
                  <Typography variant="body2">{selectedComparison.reason}</Typography>
                </Box>
              )}

              {renderChangeComparison(selectedComparison)}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedComparison(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default ClientAuditTrailModal;