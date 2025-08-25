/**
 * Client management custom hook.
 * 
 * Provides client CRUD operations, state management, and API integration
 * for the client management system.
 */

import { useCallback, useEffect, useState } from 'react';
import {
    Client,
    ClientCreate,
    ClientListResponse,
    ClientSearchParams,
    ClientUpdate,
    ClientWithHistory
} from '../types/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface UseClientsResult {
  clients: Client[];
  totalClients: number;
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
  loading: boolean;
  error: string | null;
  searchParams: ClientSearchParams;
  setSearchParams: (params: ClientSearchParams) => void;
  createClient: (clientData: ClientCreate) => Promise<Client>;
  updateClient: (id: number, clientData: ClientUpdate) => Promise<Client>;
  deleteClient: (id: number) => Promise<void>;
  deactivateClient: (id: number) => Promise<Client>;
  getClient: (id: number) => Promise<Client>;
  getClientWithHistory: (id: number) => Promise<ClientWithHistory>;
  refreshClients: () => Promise<void>;
}

export const useClients = (): UseClientsResult => {
  const [clients, setClients] = useState<Client[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<ClientSearchParams>({
    page: 1,
    limit: 20
  });

  const fetchClients = useCallback(async (params: ClientSearchParams = searchParams) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.client_type) queryParams.append('client_type', params.client_type);
      if (params.status) queryParams.append('status', params.status);

      const response = await fetch(`${API_BASE_URL}/api/clients/?${queryParams}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch clients: ${response.statusText}`);
      }

      const data: ClientListResponse = await response.json();
      
      setClients(data.clients);
      setTotalClients(data.total);
      setCurrentPage(data.page);
      setHasNext(data.has_next);
      setHasPrev(data.has_prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  const createClient = useCallback(async (clientData: ClientCreate): Promise<Client> => {
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to create client: ${response.statusText}`);
      }

      const newClient: Client = await response.json();
      
      // Refresh the client list
      await fetchClients();
      
      return newClient;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create client';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchClients]);

  const updateClient = useCallback(async (id: number, clientData: ClientUpdate): Promise<Client> => {
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to update client: ${response.statusText}`);
      }

      const updatedClient: Client = await response.json();
      
      // Update the client in the local state
      setClients(prev => prev.map(client => 
        client.id === id ? updatedClient : client
      ));
      
      return updatedClient;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update client';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteClient = useCallback(async (id: number): Promise<void> => {
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to delete client: ${response.statusText}`);
      }

      // Remove the client from local state
      setClients(prev => prev.filter(client => client.id !== id));
      setTotalClients(prev => prev - 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete client';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deactivateClient = useCallback(async (id: number): Promise<Client> => {
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${id}/deactivate`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to deactivate client: ${response.statusText}`);
      }

      const deactivatedClient: Client = await response.json();
      
      // Update the client in the local state
      setClients(prev => prev.map(client => 
        client.id === id ? deactivatedClient : client
      ));
      
      return deactivatedClient;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate client';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getClient = useCallback(async (id: number): Promise<Client> => {
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to fetch client: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch client';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getClientWithHistory = useCallback(async (id: number): Promise<ClientWithHistory> => {
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${id}/history`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to fetch client history: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch client history';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const refreshClients = useCallback(async () => {
    await fetchClients();
  }, [fetchClients]);

  const updateSearchParams = useCallback((params: ClientSearchParams) => {
    setSearchParams(prev => ({ ...prev, ...params }));
  }, []);

  // Load clients when search parameters change
  useEffect(() => {
    fetchClients(searchParams);
  }, [searchParams, fetchClients]);

  return {
    clients,
    totalClients,
    currentPage,
    hasNext,
    hasPrev,
    loading,
    error,
    searchParams,
    setSearchParams: updateSearchParams,
    createClient,
    updateClient,
    deleteClient,
    deactivateClient,
    getClient,
    getClientWithHistory,
    refreshClients
  };
};

export default useClients;