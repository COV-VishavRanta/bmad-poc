'use client'

import { useAuthStore } from '@/store/auth';
import { AuthStore } from '@/types/auth';
import { createContext, ReactNode, useContext, useEffect } from 'react';

const AuthContext = createContext<AuthStore | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const authStore = useAuthStore();

  // Initialize authentication state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      if (authStore.isAuthenticated && !authStore.user) {
        try {
          await authStore.refreshSession();
        } catch {
          // If refresh fails, user needs to log in again
          await authStore.logout();
        }
      }
    };

    initializeAuth();
  }, [authStore]);

  // Auto-refresh session before expiry
  useEffect(() => {
    if (!authStore.isAuthenticated) return;

    const refreshInterval = setInterval(async () => {
      try {
        await authStore.refreshSession();
      } catch {
        // If refresh fails, log out user
        await authStore.logout();
      }
    }, 20 * 60 * 1000); // Refresh every 20 minutes

    return () => clearInterval(refreshInterval);
  }, [authStore.isAuthenticated, authStore]);

  return (
    <AuthContext.Provider value={authStore}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Convenience hooks
export function useUser() {
  const { user } = useAuth();
  return user;
}

export function useIsAuthenticated() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

export function useAuthLoading() {
  const { isLoading } = useAuth();
  return isLoading;
}

export function useAuthError() {
  const { error, clearError } = useAuth();
  return { error, clearError };
}