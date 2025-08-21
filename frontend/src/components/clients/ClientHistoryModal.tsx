import { useClientStore } from '@/store/clients';
import { ClientHistory } from '@/types/client';
import {
    Add as AddIcon,
    Close,
    Delete as DeleteIcon,
    Edit as EditIcon,
    ExpandLess as ExpandLessIcon,
    ExpandMore as ExpandMoreIcon,
    Download as ExportIcon,
    FilterList as FilterIcon,
    History as HistoryIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    MenuItem,
    Pagination,
    Paper,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';

interface ClientHistoryModalProps {
  open: boolean;
  clientId: number;
  clientName: string;
  onClose: () => void;
}

const ACTION_COLORS: Record<string, 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'> = {
  'created': 'success',
  'updated': 'primary',
  'deactivated': 'error',
  'reactivated': 'success',
  'status_changed': 'warning',
  'relation_changed': 'info',
  'name_changed': 'primary'
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  'created': <AddIcon />,
  'updated': <EditIcon />,
  'deactivated': <DeleteIcon />,
  'reactivated': <AddIcon />,
  'status_changed': <EditIcon />,
  'relation_changed': <EditIcon />,
  'name_changed': <EditIcon />
};

export const ClientHistoryModal: React.FC<ClientHistoryModalProps> = ({
  open,
  clientId,
  clientName,
  onClose
}) => {
  const { clientHistory, isLoadingHistory, fetchClientHistory } = useClientStore();
  const [filteredHistory, setFilteredHistory] = useState<ClientHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Fetch history when modal opens
  useEffect(() => {
    if (open && clientId) {
      fetchClientHistory(clientId);
    }
  }, [open, clientId, fetchClientHistory]);

  // Apply filters
  useEffect(() => {
    let filtered = [...clientHistory];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.field?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.oldValue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.newValue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reason?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(item => item.action === actionFilter);
    }

    // User filter
    if (userFilter !== 'all') {
      filtered = filtered.filter(item => item.userName === userFilter);
    }

    // Date filters
    if (dateFromFilter) {
      filtered = filtered.filter(item => new Date(item.timestamp) >= new Date(dateFromFilter));
    }
    if (dateToFilter) {
      filtered = filtered.filter(item => new Date(item.timestamp) <= new Date(dateToFilter));
    }

    setFilteredHistory(filtered);
    setPage(1); // Reset to first page when filters change
  }, [clientHistory, searchTerm, actionFilter, userFilter, dateFromFilter, dateToFilter]);

  // Get unique values for filters
  const uniqueActions = Array.from(new Set(clientHistory.map(item => item.action)));
  const uniqueUsers = Array.from(new Set(clientHistory.map(item => item.userName)));

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / pageSize);
  const paginatedHistory = filteredHistory.slice((page - 1) * pageSize, page * pageSize);

  // Toggle expanded item
  const toggleExpanded = (itemId: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Export history
  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Field', 'Old Value', 'New Value', 'User', 'Reason'].join(','),
      ...filteredHistory.map(item => [
        new Date(item.timestamp).toLocaleString(),
        item.action,
        item.field || '',
        item.oldValue || '',
        item.newValue || '',
        item.userName,
        item.reason || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `client-history-${clientName}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  // Get change summary
  const getChangeSummary = (item: ClientHistory) => {
    if (item.field && item.oldValue && item.newValue) {
      return `${item.field}: "${item.oldValue}" → "${item.newValue}"`;
    }
    return item.action.replace('_', ' ').toUpperCase();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px', maxHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <HistoryIcon />
            <Typography variant="h6">
              Change History: {clientName}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton onClick={() => setShowFilters(!showFilters)} size="small">
              <FilterIcon />
            </IconButton>
            <IconButton onClick={handleExport} size="small" title="Export CSV">
              <ExportIcon />
            </IconButton>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Filters Section */}
        <Collapse in={showFilters}>
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Filters
            </Typography>
            <Stack spacing={2}>
              <Box display="flex" gap={2}>
                <TextField
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  label="Search"
                  size="small"
                  fullWidth
                  InputProps={{
                    startAdornment: <SearchIcon color="action" />
                  }}
                />
                <TextField
                  select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  label="Action"
                  size="small"
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="all">All Actions</MenuItem>
                  {uniqueActions.map(action => (
                    <MenuItem key={action} value={action}>
                      {action.replace('_', ' ').toUpperCase()}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  label="User"
                  size="small"
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="all">All Users</MenuItem>
                  {uniqueUsers.map(user => (
                    <MenuItem key={user} value={user}>
                      {user}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box display="flex" gap={2}>
                <TextField
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  label="From Date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  label="To Date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setActionFilter('all');
                    setUserFilter('all');
                    setDateFromFilter('');
                    setDateToFilter('');
                  }}
                  variant="outlined"
                  size="small"
                >
                  Clear Filters
                </Button>
              </Box>
            </Stack>
          </Paper>
        </Collapse>

        {/* History List */}
        {isLoadingHistory ? (
          <Box display="flex" justifyContent="center" p={4}>
            <Typography>Loading history...</Typography>
          </Box>
        ) : filteredHistory.length === 0 ? (
          <Alert severity="info">
            No history entries found for this client.
          </Alert>
        ) : (
          <>
            <List>
              {paginatedHistory.map((item) => {
                const timestamp = formatTimestamp(item.timestamp);
                const isExpanded = expandedItems.has(item.id);
                
                return (
                  <React.Fragment key={item.id}>
                    <ListItem
                      component="div"
                      onClick={() => toggleExpanded(item.id)}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <ListItemIcon>
                        {ACTION_ICONS[item.action] || <HistoryIcon />}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body1">
                              {getChangeSummary(item)}
                            </Typography>
                            <Chip
                              label={item.action.replace('_', ' ')}
                              color={ACTION_COLORS[item.action] || 'default'}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              {item.userName} • {timestamp.date} at {timestamp.time}
                            </Typography>
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </Box>
                        }
                      />
                    </ListItem>
                    
                    <Collapse in={isExpanded}>
                      <Paper elevation={0} sx={{ p: 2, ml: 4, mr: 1, mb: 1, bgcolor: 'grey.50' }}>
                        <Stack spacing={1}>
                          {item.field && (
                            <Typography variant="body2">
                              <strong>Field:</strong> {item.field}
                            </Typography>
                          )}
                          {item.oldValue && (
                            <Typography variant="body2">
                              <strong>Previous Value:</strong> {item.oldValue}
                            </Typography>
                          )}
                          {item.newValue && (
                            <Typography variant="body2">
                              <strong>New Value:</strong> {item.newValue}
                            </Typography>
                          )}
                          {item.reason && (
                            <Typography variant="body2">
                              <strong>Reason:</strong> {item.reason}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            Full Timestamp: {new Date(item.timestamp).toLocaleString()}
                          </Typography>
                        </Stack>
                      </Paper>
                    </Collapse>
                  </React.Fragment>
                );
              })}
            </List>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}

            {/* Results Summary */}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Showing {paginatedHistory.length} of {filteredHistory.length} entries
              {filteredHistory.length !== clientHistory.length && ` (filtered from ${clientHistory.length} total)`}
            </Typography>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientHistoryModal;