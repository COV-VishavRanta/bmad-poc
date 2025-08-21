import { useClientStore } from '@/store/clients';
import { ClientSearchParams } from '@/types/client';
import { useEffect } from 'react';

/**
 * Custom hook for managing client list with search and filtering
 */
export const useClients = () => {
  const {
    clients,
    isLoading,
    error,
    searchParams,
    totalPages,
    totalCount,
    fetchClients,
    setSearchParams,
    resetSearchParams,
    clearError,
  } = useClientStore();

  // Fetch clients when search parameters change
  useEffect(() => {
    fetchClients();
  }, [searchParams, fetchClients]);

  const updateSearchParams = (params: Partial<ClientSearchParams>) => {
    setSearchParams(params);
  };

  const resetFilters = () => {
    resetSearchParams();
  };

  const refetch = () => {
    fetchClients();
  };

  return {
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
  };
};

/**
 * Custom hook for managing individual client operations
 */
export const useClient = (clientId?: number) => {
  const {
    currentClient,
    isLoading,
    error,
    clientHistory,
    clientDependencies,
    isLoadingHistory,
    isLoadingDependencies,
    fetchClientById,
    fetchClientHistory,
    fetchClientDependencies,
    createClient,
    updateClient,
    deactivateClient,
    reactivateClient,
    setCurrentClient,
    clearError,
  } = useClientStore();

  // Fetch client data when clientId changes
  useEffect(() => {
    if (clientId) {
      fetchClientById(clientId);
    } else {
      setCurrentClient(null);
    }
  }, [clientId, fetchClientById, setCurrentClient]);

  const loadHistory = () => {
    if (clientId) {
      fetchClientHistory(clientId);
    }
  };

  const loadDependencies = () => {
    if (clientId) {
      fetchClientDependencies(clientId);
    }
  };

  return {
    client: currentClient,
    isLoading,
    error,
    clientHistory,
    clientDependencies,
    isLoadingHistory,
    isLoadingDependencies,
    createClient,
    updateClient,
    deactivateClient,
    reactivateClient,
    loadHistory,
    loadDependencies,
    clearError,
  };
};