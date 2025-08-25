'use client'

import { useEffect } from 'react';
import { HealthDisplay } from '../components/HealthDisplay';
import { LoginForm, UserProfile } from '../components/LoginForm';
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
    <div className="container">
      <header className="header">
        <h1>B-MAD Client Ops System</h1>
        <p>Resource and Project Management Platform</p>
        
        {/* Authentication Status */}
        <div className="auth-section">
          {isAuthenticated ? (
            <UserProfile />
          ) : (
            <div className="login-section">
              <h2>Please Login to Continue</h2>
              <LoginForm />
            </div>
          )}
        </div>
      </header>
      
      {/* Show system components only when authenticated */}
      {isAuthenticated && (
        <>
          <HealthDisplay
            healthData={healthData}
            error={error}
            onRefresh={checkHealth}
            isLoading={isLoading}
          />
          
          <SystemComponents />
        </>
      )}
    </div>
  );
}