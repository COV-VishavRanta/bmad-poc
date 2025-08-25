/**
 * Client listing page component.
 * 
 * Displays a paginated, searchable list of clients with filtering options
 * and role-based action buttons.
 */

'use client';

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useClients } from '../hooks/useClients';
import { Client, ClientStatus, ClientType } from '../types/client';

interface ClientListProps {
  onClientSelect?: (client: Client) => void;
  onClientEdit?: (client: Client) => void;
  onClientCreate?: () => void;
}

const ClientList: React.FC<ClientListProps> = ({
  onClientSelect,
  onClientEdit,
  onClientCreate
}) => {
  const { user } = useAuth();
  const {
    clients,
    totalClients,
    currentPage,
    hasNext,
    hasPrev,
    loading,
    error,
    searchParams,
    setSearchParams,
    deleteClient,
    deactivateClient
  } = useClients();

  const [searchTerm, setSearchTerm] = useState(searchParams.search || '');
  const [selectedType, setSelectedType] = useState<ClientType | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<ClientStatus | ''>('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({
      ...searchParams,
      search: searchTerm || undefined,
      client_type: selectedType || undefined,
      status: selectedStatus || undefined,
      page: 1
    });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams({ ...searchParams, page: newPage });
  };

  const handleDeleteClient = async (clientId: number) => {
    try {
      await deleteClient(clientId);
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete client:', err);
    }
  };

  const handleDeactivateClient = async (clientId: number) => {
    try {
      await deactivateClient(clientId);
    } catch (err) {
      console.error('Failed to deactivate client:', err);
    }
  };

  const canCreateClients = user?.role === 'HR';
  const canDeleteClients = user?.role === 'HR';
  const canEditClients = user?.role === 'HR' || user?.role === 'PC';

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
        {canCreateClients && onClientCreate && (
          <button
            onClick={onClientCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add New Client
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search clients..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Client Type
              </label>
              <select
                id="type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as ClientType | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value={ClientType.CUSTOMER}>Customer</option>
                <option value={ClientType.PARTNER}>Partner</option>
                <option value={ClientType.INTERNAL}>Internal</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as ClientStatus | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value={ClientStatus.ACTIVE}>Active</option>
                <option value={ClientStatus.INACTIVE}>Inactive</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Search
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Showing {clients.length} of {totalClients} clients
      </div>

      {/* Client List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {clients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No clients found</p>
            {canCreateClients && onClientCreate && (
              <button
                onClick={onClientCreate}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Your First Client
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {clients.map((client) => (
              <li key={client.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {client.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          client.status === ClientStatus.ACTIVE
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {client.status}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {client.client_type}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <p><strong>Relation:</strong> {client.relation_type}</p>
                      {client.project_mgmt_tool && (
                        <p><strong>PM Tool:</strong> {client.project_mgmt_tool}</p>
                      )}
                      {client.comments && (
                        <p className="mt-1"><strong>Comments:</strong> {client.comments}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {onClientSelect && (
                      <button
                        onClick={() => onClientSelect(client)}
                        className="text-blue-600 hover:text-blue-800 px-3 py-1 text-sm"
                      >
                        View
                      </button>
                    )}
                    
                    {canEditClients && onClientEdit && (
                      <button
                        onClick={() => onClientEdit(client)}
                        className="text-indigo-600 hover:text-indigo-800 px-3 py-1 text-sm"
                      >
                        Edit
                      </button>
                    )}

                    {canDeleteClients && client.status === ClientStatus.ACTIVE && (
                      <button
                        onClick={() => handleDeactivateClient(client.id)}
                        className="text-yellow-600 hover:text-yellow-800 px-3 py-1 text-sm"
                      >
                        Deactivate
                      </button>
                    )}

                    {canDeleteClients && (
                      <button
                        onClick={() => setConfirmDelete(client.id)}
                        className="text-red-600 hover:text-red-800 px-3 py-1 text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalClients > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {Math.ceil(totalClients / (searchParams.limit || 20))}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!hasPrev}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!hasNext}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Deletion
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this client? This action cannot be undone and will fail if the client has active projects.
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteClient(confirmDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientList;