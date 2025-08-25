/**
 * Client detail view component.
 * 
 * Displays comprehensive client information including audit history
 * for users with appropriate permissions.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useClients } from '../hooks/useClients';
import { Client, ClientStatus, ClientWithHistory, HistoryAction } from '../types/client';

interface ClientDetailProps {
  clientId: number;
  onEdit?: (client: Client) => void;
  onClose?: () => void;
}

const ClientDetail: React.FC<ClientDetailProps> = ({
  clientId,
  onEdit,
  onClose
}) => {
  const { user } = useAuth();
  const { getClientWithHistory, getClient } = useClients();
  const [clientData, setClientData] = useState<ClientWithHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check if user can view audit history
        const canViewAudit = user?.role === 'HR';
        
        if (canViewAudit) {
          const data = await getClientWithHistory(clientId);
          setClientData(data);
        } else {
          // For non-HR users, fetch basic client data without history
          const basicClient = await getClient(clientId);
          setClientData({ ...basicClient, history: [] });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load client data');
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [clientId, user?.role, getClientWithHistory, getClient]);

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getActionColor = (action: HistoryAction): string => {
    switch (action) {
      case HistoryAction.CREATE:
        return 'bg-green-100 text-green-800';
      case HistoryAction.UPDATE:
        return 'bg-blue-100 text-blue-800';
      case HistoryAction.DELETE:
        return 'bg-red-100 text-red-800';
      case HistoryAction.DEACTIVATE:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canEdit = user?.role === 'HR' || user?.role === 'PC';
  const canViewAudit = user?.role === 'HR';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg">Loading client details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p>{error}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-2 text-sm underline"
          >
            Go back
          </button>
        )}
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Client not found</p>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 text-blue-600 underline"
          >
            Go back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{clientData.name}</h1>
            <div className="mt-2 flex items-center space-x-3">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                  clientData.status === ClientStatus.ACTIVE
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {clientData.status}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {clientData.client_type}
              </span>
            </div>
          </div>
          <div className="flex space-x-3">
            {canEdit && onEdit && (
              <button
                onClick={() => onEdit(clientData)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Edit Client
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Back to List
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Client Information */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Client Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Relation Type</h3>
            <p className="mt-1 text-lg text-gray-900">{clientData.relation_type}</p>
          </div>
          
          {clientData.project_mgmt_tool && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Project Management Tool</h3>
              <p className="mt-1 text-lg text-gray-900">{clientData.project_mgmt_tool}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Created</h3>
            <p className="mt-1 text-lg text-gray-900">{formatDateTime(clientData.created_at)}</p>
          </div>

          {clientData.updated_at && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Last Updated</h3>
              <p className="mt-1 text-lg text-gray-900">{formatDateTime(clientData.updated_at)}</p>
            </div>
          )}
        </div>

        {clientData.comments && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Comments</h3>
            <p className="mt-1 text-gray-900 whitespace-pre-wrap">{clientData.comments}</p>
          </div>
        )}
      </div>

      {/* Audit History */}
      {canViewAudit && clientData.history && clientData.history.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Audit History</h2>
          <div className="space-y-4">
            {clientData.history.map((entry) => (
              <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(
                      entry.action
                    )}`}
                  >
                    {entry.action}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDateTime(entry.changed_at)}
                  </span>
                </div>
                
                {entry.old_values && Object.keys(entry.old_values).length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Previous Values:</h4>
                    <div className="bg-red-50 p-2 rounded text-sm">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(entry.old_values, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                {entry.new_values && Object.keys(entry.new_values).length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">New Values:</h4>
                    <div className="bg-green-50 p-2 rounded text-sm">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(entry.new_values, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Access Notice for Non-HR Users */}
      {!canViewAudit && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          <p className="text-sm">
            Audit history is only available to HR users.
          </p>
        </div>
      )}
    </div>
  );
};

export default ClientDetail;