/**
 * Clients page - Main client management interface
 * 
 * This page provides the complete client management functionality
 * including listing, creating, editing, and viewing client details.
 */

'use client'

import ClientManagement from '../../components/ClientManagement';
import { Navigation } from '../../components/Navigation';
import { useAuth } from '../../hooks/useAuth';

export default function ClientsPage() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">Please log in to access client management.</p>
            <a href="/" className="text-blue-600 hover:text-blue-800">Return to Login</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
          <p className="text-gray-600 mt-2">
            Manage your organization&apos;s client relationships and track engagement history.
          </p>
        </div>
        
        <ClientManagement />
      </main>
    </div>
  );
}