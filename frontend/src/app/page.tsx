'use client'

import { useEffect } from 'react';
import { HealthDisplay } from '../components/HealthDisplay';
import { LoginForm } from '../components/LoginForm';
import { Navigation } from '../components/Navigation';
import { SystemComponents } from '../components/SystemComponents';
import { useAuth } from '../hooks/useAuth';
import { useHealthCheck } from '../hooks/useHealthCheck';

/**
 * Home page component for the B-MAD Client Ops system
 * Displays system status and provides API connectivity testing
 */
export default function HomePage() {
  const { healthData, error, checkHealth, isLoading } = useHealthCheck();
  const { isAuthenticated, user } = useAuth();

  // Check health status on component mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Show navigation when authenticated */}
      {isAuthenticated && <Navigation />}
      
      <div className="container mx-auto py-6 px-4">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">B-MAD Client Ops System</h1>
          <p className="text-xl text-gray-600">Resource and Project Management Platform</p>
        </header>
        
        {/* Authentication Section */}
        {!isAuthenticated ? (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 text-center">Please Login to Continue</h2>
            <LoginForm />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Welcome back, {user?.first_name}!</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800">Clients</h3>
                  <p className="text-blue-600">Manage client relationships</p>
                  <a href="/clients" className="inline-block mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    View Clients
                  </a>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800">Projects</h3>
                  <p className="text-green-600">Track project progress</p>
                  <a href="/projects" className="inline-block mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                    View Projects
                  </a>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-800">Resources</h3>
                  <p className="text-purple-600">Manage team resources</p>
                  <a href="/resources" className="inline-block mt-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
                    View Resources
                  </a>
                </div>
              </div>
            </div>
            
            {/* System Health */}
            <HealthDisplay
              healthData={healthData}
              error={error}
              onRefresh={checkHealth}
              isLoading={isLoading}
            />
            
            {/* System Components */}
            <SystemComponents />
          </div>
        )}
      </div>
    </div>
  );
}