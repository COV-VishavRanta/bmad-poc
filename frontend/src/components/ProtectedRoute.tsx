/**
 * Protected route component
 * 
 * Provides route protection based on authentication status and user roles.
 * Redirects unauthenticated users to login and unauthorized users to access denied.
 */

'use client'

import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from './LoginForm';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  fallback?: ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  fallback 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return fallback || <LoginForm />;
  }

  // Check role-based access if roles are specified
  if (requiredRoles.length > 0 && user) {
    if (!requiredRoles.includes(user.role)) {
      return (
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You do not have permission to access this page.</p>
          <p>Required roles: {requiredRoles.join(', ')}</p>
          <p>Your role: {user.role}</p>
        </div>
      );
    }
  }

  // Render protected content
  return <>{children}</>;
}

/**
 * Role-based component wrapper
 * 
 * Conditionally renders content based on user roles.
 */
interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
  fallback?: ReactNode;
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallback = null 
}: RoleGuardProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  if (!allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}