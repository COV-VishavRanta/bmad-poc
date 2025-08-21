'use client'

import { useAuthStore } from '@/store/auth';
import { AuthStore } from '@/types/auth';
import { createContext, ReactNode, useContext, useEffect, useRef } from 'react';

const AuthContext = createContext<AuthStore | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const authStore = useAuthStore();
  const { user, isLoading, isAuthenticated } = authStore;
  const isInitialized = useRef(false);

  // Initialize authentication state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      // Prevent multiple initializations
      if (isInitialized.current) {
        return;
      }
      
      isInitialized.current = true;
      
      // Only try to restore session if:
      // 1. We have a session cookie
      // 2. We're not already authenticated
      // 3. We're not currently loading
      // 4. We don't already have user data
      const hasCookie = document.cookie.includes('clientops_session=');
      
      if (hasCookie && !isAuthenticated && !isLoading && !user) {
        try {
          // Try to restore session from server
          await authStore.refreshSession();
        } catch {
          // If refresh fails, silently fail (don't logout as user might be on login page)
          console.debug('Session restoration failed - user needs to login');
        }
      }
    };

    // Only run after a short delay to ensure DOM is ready and avoid race conditions
    const timeoutId = setTimeout(initializeAuth, 100);
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - only run once on mount

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