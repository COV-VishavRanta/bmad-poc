'use client';

import { usePermissions } from '@/components/auth/WithPermissions';
import ClientAuditTrailModal from '@/components/clients/ClientAuditTrailModal';
import ClientDeactivationModal from '@/components/clients/ClientDeactivationModal';
import ClientFormModal from '@/components/clients/ClientFormModal';
import ClientReactivationModal from '@/components/clients/ClientReactivationModal';
import ClientSearchFilters from '@/components/clients/ClientSearchFilters';
import ClientTable from '@/components/clients/ClientTable';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useClients } from '@/hooks/useClients';
import { Client, ClientSearchParams, ClientSortBy, SortOrder } from '@/types/client';
import { Add as AddIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import { useState } from 'react';

export default function ClientsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeactivationModalOpen, setIsDeactivationModalOpen] = useState(false);
  const [isReactivationModalOpen, setIsReactivationModalOpen] = useState(false);
  const [isAuditTrailModalOpen, setIsAuditTrailModalOpen] = useState(false);
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<Client | undefined>(undefined);
  const [selectedClientForDeactivation, setSelectedClientForDeactivation] = useState<Client | undefined>(undefined);
  const [selectedClientForReactivation, setSelectedClientForReactivation] = useState<Client | undefined>(undefined);
  const [selectedClientForAuditTrail, setSelectedClientForAuditTrail] = useState<Client | undefined>(undefined);
  
  const { canAccess } = usePermissions();
  
  const {
    clients,
    isLoading,
    error,
    searchParams,
    totalPages,
    totalCount,
    updateSearchParams,
    resetFilters,
    refetch,
    clearError,
  } = useClients();

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    refetch();
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedClientForEdit(undefined);
    refetch();
  };

  const handleEditClient = (client: Client) => {
    setSelectedClientForEdit(client);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedClientForEdit(undefined);
  };

  const handleDeactivateClient = (client: Client) => {
    setSelectedClientForDeactivation(client);
    setIsDeactivationModalOpen(true);
  };

  const handleCloseDeactivationModal = () => {
    setIsDeactivationModalOpen(false);
    setSelectedClientForDeactivation(undefined);
  };

  const handleDeactivationSuccess = () => {
    setIsDeactivationModalOpen(false);
    setSelectedClientForDeactivation(undefined);
    refetch();
  };

  const handleReactivateClient = (client: Client) => {
    setSelectedClientForReactivation(client);
    setIsReactivationModalOpen(true);
  };

  const handleCloseReactivationModal = () => {
    setIsReactivationModalOpen(false);
    setSelectedClientForReactivation(undefined);
  };

  const handleReactivationSuccess = () => {
    setIsReactivationModalOpen(false);
    setSelectedClientForReactivation(undefined);
    refetch();
  };

  const handleViewAuditTrail = (client: Client) => {
    setSelectedClientForAuditTrail(client);
    setIsAuditTrailModalOpen(true);
  };

  const handleCloseAuditTrailModal = () => {
    setIsAuditTrailModalOpen(false);
    setSelectedClientForAuditTrail(undefined);
  };

  const handleSearchChange = (search: string) => {
    updateSearchParams({ search });
  };

  const handleFilterChange = (filters: Partial<ClientSearchParams>) => {
    updateSearchParams(filters);
  };

  const handlePageChange = (page: number) => {
    updateSearchParams({ page });
  };

  const handleSortChange = (sortBy: ClientSortBy, sortOrder: SortOrder) => {
    updateSearchParams({ sortBy, sortOrder });
  };

  const handleBulkDeactivate = async (clientIds: number[]) => {
    try {
      for (const id of clientIds) {
        // Since we don't have a direct deactivate method, we'll use update
        const client = clients.find(c => c.id === id);
        if (client && client.status === 'active') {
          // This would normally call a bulk deactivate API
          console.log(`Deactivating client ${id}`);
        }
      }
      // Refresh data
      refetch();
    } catch (error) {
      console.error('Failed to bulk deactivate clients:', error);
    }
  };

  const handleBulkExport = (clientIds: number[]) => {
    const selectedClients = clients.filter(client => 
      clientIds.includes(client.id)
    );
    
    // Simple CSV export
    const csvContent = [
      ['ID', 'Name', 'Status', 'Relation Type', 'Projects', 'Created', 'Updated'].join(','),
      ...selectedClients.map(client => [
        client.id,
        `"${client.name}"`,
        client.status,
        client.relationType,
        client.projectCount,
        client.createdAt,
        client.updatedAt
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Client Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your client relationships and track project associations
          </Typography>
        </Box>
        
        {canAccess({
          roles: ['HR', 'PC'],
          permissions: ['create:clients'],
          requireAll: false
        }) && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsCreateModalOpen(true)}
            sx={{ flexShrink: 0 }}
          >
            Add Client
          </Button>
        )}
      </Box>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          onClose={clearError}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Search and Filters */}
        <Paper sx={{ p: 3 }}>
          <ClientSearchFilters
            searchParams={searchParams}
            onSearchChange={handleSearchChange}
            onFilterChange={handleFilterChange}
            onResetFilters={resetFilters}
            totalCount={totalCount}
          />
        </Paper>

        {/* Client Table */}
        <Paper sx={{ p: 0, overflow: 'hidden' }}>
          {isLoading ? (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
              <LoadingSpinner />
            </Box>
          ) : (
            <ClientTable
              clients={clients}
              searchParams={searchParams}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onSortChange={handleSortChange}
              onRefresh={refetch}
              onEditClient={handleEditClient}
              onDeactivateClient={handleDeactivateClient}
              onActivateClient={handleReactivateClient}
              onViewAuditTrail={handleViewAuditTrail}
              onBulkDeactivate={handleBulkDeactivate}
              onBulkExport={handleBulkExport}
            />
          )}
        </Paper>

        {/* Summary Statistics */}
        {!isLoading && clients.length > 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Clients
                </Typography>
                <Typography variant="h5" color="primary">
                  {totalCount}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Active Clients
                </Typography>
                <Typography variant="h5" color="success.main">
                  {clients.filter(c => c.status === 'active').length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Inactive Clients
                </Typography>
                <Typography variant="h5" color="error.main">
                  {clients.filter(c => c.status === 'inactive').length}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        )}

        {/* Empty State */}
        {!isLoading && clients.length === 0 && !error && (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No clients found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchParams.search || searchParams.status !== 'all' || searchParams.relationType !== 'all'
                ? 'Try adjusting your search criteria or filters'
                : 'Get started by adding your first client'
              }
            </Typography>
            {canAccess({
              roles: ['HR', 'PC'],
              permissions: ['create:clients'],
              requireAll: false
            }) && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Add Your First Client
              </Button>
            )}
          </Paper>
        )}
      </Stack>

      {/* Create Client Modal */}
      <ClientFormModal
        open={isCreateModalOpen}
        mode="create"
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Client Modal */}
      <ClientFormModal
        open={isEditModalOpen}
        mode="edit"
        clientData={selectedClientForEdit}
        onClose={handleCloseEditModal}
        onSuccess={handleEditSuccess}
      />

      {/* Deactivation Modal */}
      {selectedClientForDeactivation && (
        <ClientDeactivationModal
          open={isDeactivationModalOpen}
          client={selectedClientForDeactivation}
          onClose={handleCloseDeactivationModal}
          onSuccess={handleDeactivationSuccess}
        />
      )}

      {/* Reactivation Modal */}
      {selectedClientForReactivation && (
        <ClientReactivationModal
          open={isReactivationModalOpen}
          client={selectedClientForReactivation}
          onClose={handleCloseReactivationModal}
          onSuccess={handleReactivationSuccess}
        />
      )}

      {/* Audit Trail Modal */}
      {selectedClientForAuditTrail && (
        <ClientAuditTrailModal
          open={isAuditTrailModalOpen}
          client={selectedClientForAuditTrail}
          onClose={handleCloseAuditTrailModal}
        />
      )}
    </Box>
  );
}