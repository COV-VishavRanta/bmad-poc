import { useAuthStore } from '@/store/auth';

export const useAuth = () => {
  const {
    user,
    isLoading,
    isAuthenticated,
    error,
    login,
    logout,
    refreshSession,
    clearError,
    hasPermission,
    hasRole,
  } = useAuthStore();

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    login,
    logout,
    refreshSession,
    clearError,
    hasPermission,
    hasRole,
  };
};