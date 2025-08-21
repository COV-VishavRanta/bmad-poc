import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types/auth';
import { Home as HomeIcon, Lock as LockIcon } from '@mui/icons-material';
import { Alert, AlertTitle, Box, Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import React from 'react';

interface PermissionConfig {
  roles?: UserRole[];
  permissions?: string[];
  requireAll?: boolean;
  redirectTo?: string;
  showFallback?: boolean;
  fallbackMessage?: string;
}

interface WithPermissionsProps {
  permissionConfig: PermissionConfig;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const WithPermissions: React.FC<WithPermissionsProps> = ({
  permissionConfig,
  children,
  fallback
}) => {
  const { user, hasRole, hasPermission, isAuthenticated } = useAuth();
  const router = useRouter();

  const {
    roles = [],
    permissions = [],
    requireAll = false,
    redirectTo,
    showFallback = true,
    fallbackMessage
  } = permissionConfig;

  // Not authenticated
  if (!isAuthenticated || !user) {
    if (redirectTo) {
      router.push(redirectTo);
      return null;
    }
    
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showFallback) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="warning" icon={<LockIcon />}>
            <AlertTitle>Authentication Required</AlertTitle>
            Please sign in to access this content.
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => router.push('/login')}
                size="small"
              >
                Sign In
              </Button>
            </Box>
          </Alert>
        </Box>
      );
    }

    return null;
  }

  // Check role requirements
  if (roles.length > 0) {
    const roleCheck = requireAll
      ? roles.every(role => hasRole(role))
      : roles.some(role => hasRole(role));
    
    if (!roleCheck) {
      if (redirectTo) {
        router.push(redirectTo);
        return null;
      }
      
      if (fallback) {
        return <>{fallback}</>;
      }

      if (showFallback) {
        return (
          <Box sx={{ p: 3 }}>
            <Alert severity="error" icon={<LockIcon />}>
              <AlertTitle>Access Denied</AlertTitle>
              {fallbackMessage || `Your role (${user.role}) does not have permission to access this content.`}
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<HomeIcon />}
                  onClick={() => router.push('/dashboard')}
                  size="small"
                >
                  Return to Dashboard
                </Button>
              </Box>
            </Alert>
          </Box>
        );
      }

      return null;
    }
  }

  // Check permission requirements
  if (permissions.length > 0) {
    const permissionCheck = requireAll
      ? permissions.every(permission => hasPermission(permission))
      : permissions.some(permission => hasPermission(permission));
    
    if (!permissionCheck) {
      if (redirectTo) {
        router.push(redirectTo);
        return null;
      }
      
      if (fallback) {
        return <>{fallback}</>;
      }

      if (showFallback) {
        return (
          <Box sx={{ p: 3 }}>
            <Alert severity="error" icon={<LockIcon />}>
              <AlertTitle>Insufficient Permissions</AlertTitle>
              {fallbackMessage || 'You do not have the required permissions to access this content.'}
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<HomeIcon />}
                  onClick={() => router.push('/dashboard')}
                  size="small"
                >
                  Return to Dashboard
                </Button>
              </Box>
            </Alert>
          </Box>
        );
      }

      return null;
    }
  }

  return <>{children}</>;
};

// Hook for checking permissions in components
export const usePermissions = () => {
  const { user, hasRole, hasPermission, isAuthenticated } = useAuth();

  const checkAccess = (config: PermissionConfig): boolean => {
    if (!isAuthenticated || !user) {
      return false;
    }

    const { roles = [], permissions = [], requireAll = false } = config;

    // Check roles
    if (roles.length > 0) {
      const roleCheck = requireAll
        ? roles.every(role => hasRole(role))
        : roles.some(role => hasRole(role));
      if (!roleCheck) return false;
    }

    // Check permissions
    if (permissions.length > 0) {
      const permissionCheck = requireAll
        ? permissions.every(permission => hasPermission(permission))
        : permissions.some(permission => hasPermission(permission));
      if (!permissionCheck) return false;
    }

    return true;
  };

  const canAccess = (config: PermissionConfig): boolean => checkAccess(config);

  // Specific role checks
  const isHR = (): boolean => hasRole('HR');
  const isPC = (): boolean => hasRole('PC');
  const isRM = (): boolean => hasRole('RM');
  
  // Combined role checks
  const canManageClients = (): boolean => isHR() || isPC();
  const canViewClients = (): boolean => isHR() || isPC() || isRM();
  const canCreateClients = (): boolean => isHR() || isPC();
  const canEditClients = (): boolean => isHR() || isPC();
  const canDeactivateClients = (): boolean => isHR() || isPC();
  const canViewAuditTrail = (): boolean => isHR() || isPC() || isRM();
  const canExportData = (): boolean => isHR() || isPC();

  return {
    checkAccess,
    canAccess,
    isHR,
    isPC,
    isRM,
    canManageClients,
    canViewClients,
    canCreateClients,
    canEditClients,
    canDeactivateClients,
    canViewAuditTrail,
    canExportData,
    user,
    isAuthenticated
  };
};

// HOC for protecting entire pages
export const withPagePermissions = <P extends object>(
  Component: React.ComponentType<P>,
  permissionConfig: PermissionConfig
) => {
  const ProtectedComponent: React.FC<P> = (props) => (
    <WithPermissions permissionConfig={permissionConfig}>
      <Component {...props} />
    </WithPermissions>
  );

  ProtectedComponent.displayName = `withPagePermissions(${Component.displayName || Component.name})`;
  
  return ProtectedComponent;
};

// Client-specific permission configurations
export const ClientPermissions = {
  VIEW: {
    roles: ['HR', 'PC', 'RM'] as UserRole[],
    fallbackMessage: 'You need HR, PC, or RM role to view clients.'
  },
  CREATE: {
    roles: ['HR', 'PC'] as UserRole[],
    fallbackMessage: 'Only HR and PC users can create clients.'
  },
  EDIT: {
    roles: ['HR', 'PC'] as UserRole[],
    fallbackMessage: 'Only HR and PC users can edit clients.'
  },
  DEACTIVATE: {
    roles: ['HR', 'PC'] as UserRole[],
    fallbackMessage: 'Only HR and PC users can deactivate clients.'
  },
  AUDIT_TRAIL: {
    roles: ['HR', 'PC', 'RM'] as UserRole[],
    fallbackMessage: 'You need HR, PC, or RM role to view audit trails.'
  },
  EXPORT: {
    roles: ['HR', 'PC'] as UserRole[],
    fallbackMessage: 'Only HR and PC users can export client data.'
  }
};

export default WithPermissions;