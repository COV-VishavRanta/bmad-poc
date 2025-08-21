import { usePermissions } from '@/components/auth/WithPermissions';
import { Client, ClientRelationType, ClientSearchParams, ClientSortBy, ClientStatus, SortOrder } from '@/types/client';
import {
    CheckCircle as ActivateIcon,
    Block as DeactivateIcon,
    Edit as EditIcon,
    History as HistoryIcon,
    MoreVert as MoreVertIcon,
    Refresh as RefreshIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    Pagination,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Tooltip,
    Typography,
} from '@mui/material';
import React, { useState } from 'react';
import ClientBulkActions from './ClientBulkActions';
import ClientQuickViewModal from './ClientQuickViewModal';

interface ClientTableProps {
  clients: Client[];
  searchParams: ClientSearchParams;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: ClientSortBy, sortOrder: SortOrder) => void;
  onRefresh: () => void;
  onEditClient?: (client: Client) => void;
  onDeactivateClient?: (client: Client) => void;
  onActivateClient?: (client: Client) => void;
  onViewAuditTrail?: (client: Client) => void;
  onBulkDeactivate?: (clientIds: number[]) => void;
  onBulkExport?: (clientIds: number[]) => void;
}

const ClientTable: React.FC<ClientTableProps> = ({
  clients,
  searchParams,
  totalPages,
  onPageChange,
  onSortChange,
  onRefresh,
  onEditClient,
  onDeactivateClient,
  onActivateClient,
  onViewAuditTrail,
  onBulkDeactivate,
  onBulkExport,
}) => {
  const { canAccess } = usePermissions();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClients, setSelectedClients] = useState<Client[]>([]);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickViewClient, setQuickViewClient] = useState<Client | null>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, client: Client) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedClient(client);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedClient(null);
  };

  const handleSort = (sortBy: ClientSortBy) => {
    const newOrder = searchParams.sortBy === sortBy && searchParams.sortOrder === 'asc' ? 'desc' : 'asc';
    onSortChange(sortBy, newOrder);
  };

  const handleSelectClient = (client: Client, checked: boolean) => {
    if (checked) {
      setSelectedClients(prev => [...prev, client]);
    } else {
      setSelectedClients(prev => prev.filter(c => c.id !== client.id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients([...clients]);
    } else {
      setSelectedClients([]);
    }
  };

  const handleQuickView = (client: Client) => {
    setQuickViewClient(client);
    setQuickViewOpen(true);
    handleMenuClose();
  };

  const handleRowClick = (client: Client) => {
    handleQuickView(client);
  };

  const handleClearSelection = () => {
    setSelectedClients([]);
  };

  const getStatusColor = (status: ClientStatus) => {
    return status === 'active' ? 'success' : 'error';
  };

  const getRelationTypeColor = (relationType: ClientRelationType) => {
    switch (relationType) {
      case 'Customer': return 'primary';
      case 'Partner': return 'secondary';
      case 'Internal': return 'info';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getSortDirection = (sortBy: ClientSortBy) => {
    if (searchParams.sortBy !== sortBy) return undefined;
    return searchParams.sortOrder === 'asc' ? 'asc' : 'desc';
  };

  const isSelected = (client: Client) => selectedClients.some(c => c.id === client.id);
  const isAllSelected = clients.length > 0 && selectedClients.length === clients.length;
  const isIndeterminate = selectedClients.length > 0 && selectedClients.length < clients.length;

  return (
    <Box>
      {/* Bulk Actions */}
      <ClientBulkActions
        selectedClients={selectedClients}
        onClearSelection={handleClearSelection}
        onBulkDeactivate={onBulkDeactivate || (() => {})}
        onBulkExport={onBulkExport || (() => {})}
        onRefresh={onRefresh}
      />

      {/* Table */}
      <TableContainer component={Box} sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={isIndeterminate}
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={searchParams.sortBy === 'name'}
                  direction={getSortDirection('name')}
                  onClick={() => handleSort('name')}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    Client Name
                  </Typography>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight="bold">
                  Status
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight="bold">
                  Relation Type
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2" fontWeight="bold">
                  Projects
                </Typography>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={searchParams.sortBy === 'updated_at'}
                  direction={getSortDirection('updated_at')}
                  onClick={() => handleSort('updated_at')}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    Last Activity
                  </Typography>
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2" fontWeight="bold">
                  Actions
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No clients found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow
                  key={client.id}
                  hover
                  selected={isSelected(client)}
                  onClick={() => handleRowClick(client)}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected(client)}
                      onChange={(e) => handleSelectClient(client, e.target.checked)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {client.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: #{client.id.toString().padStart(4, '0')}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={client.status} 
                      color={getStatusColor(client.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={client.relationType} 
                      color={getRelationTypeColor(client.relationType)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {client.projectCount}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(client.lastActivity)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="More actions">
                      <IconButton 
                        size="small"
                        onClick={(e) => handleMenuClick(e, client)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {clients.length} of {clients.length} clients
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            variant="outlined"
            size="small"
          >
            Refresh
          </Button>
          <Pagination
            count={totalPages}
            page={searchParams.page}
            onChange={(_, page) => onPageChange(page)}
            size="small"
            color="primary"
          />
        </Box>
      </Stack>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => {
          if (selectedClient) {
            handleQuickView(selectedClient);
          }
        }}>
          <ViewIcon fontSize="small" sx={{ mr: 1 }} />
          Quick View
        </MenuItem>

        <MenuItem onClick={() => {
          if (selectedClient) {
            onViewAuditTrail?.(selectedClient);
            handleMenuClose();
          }
        }}>
          <HistoryIcon fontSize="small" sx={{ mr: 1 }} />
          Audit Trail
        </MenuItem>
        
        {canAccess({
          roles: ['HR', 'PC'],
          permissions: ['update:clients'],
          requireAll: false
        }) && (
          <MenuItem onClick={() => {
            if (selectedClient) {
              onEditClient?.(selectedClient);
              handleMenuClose();
            }
          }}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Edit Client
          </MenuItem>
        )}

        {selectedClient?.status === 'active' ? (
          canAccess({
            roles: ['HR', 'PC'],
            permissions: ['delete:clients'],
            requireAll: false
          }) && (
            <MenuItem 
              onClick={() => {
                if (selectedClient) {
                  onDeactivateClient?.(selectedClient);
                  handleMenuClose();
                }
              }}
              sx={{ color: 'error.main' }}
            >
              <DeactivateIcon fontSize="small" sx={{ mr: 1 }} />
              Deactivate
            </MenuItem>
          )
        ) : (
          canAccess({
            roles: ['HR', 'PC'],
            permissions: ['update:clients'],
            requireAll: false
          }) && (
            <MenuItem 
              onClick={() => {
                if (selectedClient) {
                  onActivateClient?.(selectedClient);
                  handleMenuClose();
                }
              }}
              sx={{ color: 'success.main' }}
            >
              <ActivateIcon fontSize="small" sx={{ mr: 1 }} />
              Activate
            </MenuItem>
          )
        )}
      </Menu>

      {/* Quick View Modal */}
      <ClientQuickViewModal
        open={quickViewOpen}
        client={quickViewClient}
        onClose={() => {
          setQuickViewOpen(false);
          setQuickViewClient(null);
        }}
        onEdit={(client) => {
          setQuickViewOpen(false);
          setQuickViewClient(null);
          onEditClient?.(client);
        }}
      />
    </Box>
  );
};

export default ClientTable;