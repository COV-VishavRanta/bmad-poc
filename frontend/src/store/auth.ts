import { authApi, AuthApiError } from '@/lib/api/auth';
import { AuthStore, LoginCredentials, UserRole } from '@/types/auth';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Permission mappings for each role
const ROLE_PERMISSIONS = {
  HR: [
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
    'sows.view', 'sows.create', 'sows.edit', 'sows.delete',
    'assignments.view', 'assignments.create', 'assignments.edit', 'assignments.delete',
    'reports.view', 'admin.access'
  ],
  PC: [
    'clients.view', 'clients.create', 'clients.edit',
    'projects.view', 'projects.create', 'projects.edit',
    'sows.view', 'sows.create', 'sows.edit',
    'reports.view'
  ],
  RM: [
    'assignments.view', 'assignments.create', 'assignments.edit',
    'projects.view',
    'timelines.view', 'timelines.edit',
    'teams.view', 'teams.edit',
    'reports.view'
  ]
} as const;

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      // State
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,

      // Actions
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authApi.login(credentials);
          set({ 
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
        } catch (error) {
          const authError = error instanceof AuthApiError 
            ? { message: error.message, code: error.code, field: error.field }
            : { message: 'Login failed. Please try again.' };
          
          set({ 
            isLoading: false, 
            error: authError,
            isAuthenticated: false,
            user: null
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        
        try {
          await authApi.logout();
        } catch {
          console.warn('Logout API call failed, clearing local state anyway');
        } finally {
          set({ 
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      },

      refreshSession: async () => {
        set({ isLoading: true });
        
        try {
          const response = await authApi.refreshSession();
          set({ 
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
        } catch (error) {
          set({ 
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: { message: 'Session expired. Please log in again.' }
          });
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      hasPermission: (permission: string) => {
        const { user } = get();
        if (!user || !user.isActive) return false;
        
        const userPermissions = ROLE_PERMISSIONS[user.role] || [];
        return userPermissions.some(p => p === permission);
      },

      hasRole: (role: UserRole) => {
        const { user } = get();
        return user?.role === role;
      }
    }),
    {
      name: 'auth-store',
      partialize: (state: AuthStore) => ({ 
        // Don't persist sensitive data, only basic auth state
        isAuthenticated: state.isAuthenticated,
        user: state.user ? {
          id: state.user.id,
          email: state.user.email,
          firstName: state.user.firstName,
          lastName: state.user.lastName,
          role: state.user.role
        } : null
      })
    }
  )
);