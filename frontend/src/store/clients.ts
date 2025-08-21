import {
    Client,
    ClientDependency,
    ClientHistory,
    ClientListResponse,
    ClientSearchParams,
    CreateClientData,
    UpdateClientData,
} from '@/types/client';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ClientStore {
  // State
  clients: Client[];
  currentClient: Client | null;
  isLoading: boolean;
  error: string | null;
  searchParams: ClientSearchParams;
  totalPages: number;
  totalCount: number;
  
  // Client history and dependencies
  clientHistory: ClientHistory[];
  clientDependencies: ClientDependency[];
  isLoadingHistory: boolean;
  isLoadingDependencies: boolean;

  // Actions
  fetchClients: () => Promise<void>;
  createClient: (data: CreateClientData) => Promise<void>;
  updateClient: (id: number, data: UpdateClientData) => Promise<void>;
  updateClientOptimistic: (id: number, data: UpdateClientData) => Promise<void>;
  rollbackClientUpdate: (id: number, originalData: Client) => void;
  deactivateClient: (id: number, reason?: string) => Promise<void>;
  reactivateClient: (id: number) => Promise<void>;
  fetchClientById: (id: number) => Promise<void>;
  fetchClientHistory: (id: number) => Promise<void>;
  fetchClientDependencies: (id: number) => Promise<void>;
  
  // Search and filtering
  setSearchParams: (params: Partial<ClientSearchParams>) => void;
  resetSearchParams: () => void;
  
  // UI state management
  setCurrentClient: (client: Client | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const initialSearchParams: ClientSearchParams = {
  search: '',
  status: 'all',
  relationType: 'all',
  page: 1,
  pageSize: 10,
  sortBy: 'name',
  sortOrder: 'asc',
};

export const useClientStore = create<ClientStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      clients: [],
      currentClient: null,
      isLoading: false,
      error: null,
      searchParams: initialSearchParams,
      totalPages: 0,
      totalCount: 0,
      clientHistory: [],
      clientDependencies: [],
      isLoadingHistory: false,
      isLoadingDependencies: false,

      // Actions
      fetchClients: async () => {
        set({ isLoading: true, error: null });
        try {
          const params = get().searchParams;
          const queryParams = new URLSearchParams();
          
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== '' && value !== 'all') {
              queryParams.append(key, value.toString());
            }
          });

          const response = await fetch(`/api/clients?${queryParams.toString()}`);
          if (!response.ok) {
            throw new Error('Failed to fetch clients');
          }

          const data: ClientListResponse = await response.json();
          set({
            clients: data.clients,
            totalPages: data.totalPages,
            totalCount: data.total,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      createClient: async (data: CreateClientData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/clients', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to create client');
          }

          // Refresh the client list
          await get().fetchClients();
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
          throw error;
        }
      },

      updateClient: async (id: number, data: UpdateClientData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/clients/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to update client');
          }

          // Update the current client if it's the one being edited
          const currentClient = get().currentClient;
          if (currentClient && currentClient.id === id) {
            const updatedClient = await response.json();
            set({ currentClient: updatedClient });
          }

          // Refresh the client list
          await get().fetchClients();
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
          throw error;
        }
      },

      updateClientOptimistic: async (id: number, data: UpdateClientData) => {
        const { clients, currentClient } = get();
        
        // Store original data for rollback
        const originalClient = clients.find(c => c.id === id);
        if (!originalClient) return;

        // Apply optimistic update
        const optimisticClient: Client = {
          ...originalClient,
          ...data,
          updatedAt: new Date().toISOString(),
        };

        // Update UI immediately
        set({
          clients: clients.map(c => c.id === id ? optimisticClient : c),
          currentClient: currentClient?.id === id ? optimisticClient : currentClient,
        });

        try {
          const response = await fetch(`/api/clients/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            // Rollback on error
            get().rollbackClientUpdate(id, originalClient);
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to update client');
          }

          // Confirm update with server response
          const updatedClient = await response.json();
          set({
            clients: clients.map(c => c.id === id ? updatedClient : c),
            currentClient: currentClient?.id === id ? updatedClient : currentClient,
          });

        } catch (error) {
          // Rollback already handled above for HTTP errors
          // This catch is for network errors
          if (error instanceof Error && !error.message.includes('Failed to update client')) {
            get().rollbackClientUpdate(id, originalClient);
          }
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        }
      },

      rollbackClientUpdate: (id: number, originalData: Client) => {
        const { clients, currentClient } = get();
        set({
          clients: clients.map(c => c.id === id ? originalData : c),
          currentClient: currentClient?.id === id ? originalData : currentClient,
        });
      },

      deactivateClient: async (id: number, reason?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/clients/${id}/deactivate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reason }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to deactivate client');
          }

          // Refresh the client list
          await get().fetchClients();
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
          throw error;
        }
      },

      reactivateClient: async (id: number) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/clients/${id}/reactivate`, {
            method: 'POST',
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to reactivate client');
          }

          // Refresh the client list
          await get().fetchClients();
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
          throw error;
        }
      },

      fetchClientById: async (id: number) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/clients/${id}`);
          if (!response.ok) {
            throw new Error('Failed to fetch client');
          }

          const client: Client = await response.json();
          set({ currentClient: client, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      fetchClientHistory: async (id: number) => {
        set({ isLoadingHistory: true, error: null });
        try {
          const response = await fetch(`/api/clients/${id}/history`);
          if (!response.ok) {
            throw new Error('Failed to fetch client history');
          }

          const history: ClientHistory[] = await response.json();
          set({ clientHistory: history, isLoadingHistory: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoadingHistory: false,
          });
        }
      },

      fetchClientDependencies: async (id: number) => {
        set({ isLoadingDependencies: true, error: null });
        try {
          const response = await fetch(`/api/clients/${id}/dependencies`);
          if (!response.ok) {
            throw new Error('Failed to fetch client dependencies');
          }

          const dependencies: ClientDependency[] = await response.json();
          set({ clientDependencies: dependencies, isLoadingDependencies: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoadingDependencies: false,
          });
        }
      },

      setSearchParams: (params: Partial<ClientSearchParams>) => {
        const currentParams = get().searchParams;
        const newParams = { ...currentParams, ...params };
        
        // Reset to page 1 when search criteria change (except for page changes)
        if (!params.page) {
          newParams.page = 1;
        }
        
        set({ searchParams: newParams });
      },

      resetSearchParams: () => {
        set({ searchParams: initialSearchParams });
      },

      setCurrentClient: (client: Client | null) => {
        set({ currentClient: client });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'client-store',
    }
  )
);