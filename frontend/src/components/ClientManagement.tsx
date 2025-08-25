/**
 * Main client management page.
 * 
 * Integrates all client management components and handles navigation
 * between different views (list, create, edit, detail).
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useClients } from '../hooks/useClients';
import { Client, ClientCreate, ClientUpdate } from '../types/client';
import ClientDetail from './ClientDetail';
import ClientForm from './ClientForm';
import ClientList from './ClientList';

type ViewMode = 'list' | 'create' | 'edit' | 'detail';

const ClientManagement: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { createClient, updateClient } = useClients();
  
  const [currentView, setCurrentView] = useState<ViewMode>('list');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clear messages after a delay
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
    return () => {}; // Return empty cleanup function when no timer is set
  }, [error, successMessage]);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setCurrentView('detail');
  };

  const handleClientEdit = (client: Client) => {
    setSelectedClient(client);
    setCurrentView('edit');
  };

  const handleClientCreate = () => {
    setSelectedClient(null);
    setCurrentView('create');
  };

  const handleFormSubmit = async (data: ClientCreate | ClientUpdate) => {
    try {
      setError(null);
      
      if (currentView === 'create') {
        await createClient(data as ClientCreate);
        setSuccessMessage('Client created successfully!');
      } else if (currentView === 'edit' && selectedClient) {
        await updateClient(selectedClient.id, data as ClientUpdate);
        setSuccessMessage('Client updated successfully!');
      }
      
      setCurrentView('list');
      setSelectedClient(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleFormCancel = () => {
    setCurrentView('list');
    setSelectedClient(null);
    setError(null);
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedClient(null);
  };

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please log in to access client management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Content based on current view */}
        {currentView === 'list' && (
          <ClientList
            onClientSelect={handleClientSelect}
            onClientEdit={handleClientEdit}
            onClientCreate={handleClientCreate}
          />
        )}

        {currentView === 'create' && (
          <ClientForm
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            isEditing={false}
          />
        )}

        {currentView === 'edit' && selectedClient && (
          <ClientForm
            client={selectedClient}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            isEditing={true}
          />
        )}

        {currentView === 'detail' && selectedClient && (
          <ClientDetail
            clientId={selectedClient.id}
            onEdit={handleClientEdit}
            onClose={handleBackToList}
          />
        )}
      </div>
    </div>
  );
};

export default ClientManagement;