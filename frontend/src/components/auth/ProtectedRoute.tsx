'use client';

import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types/auth';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
  requiredPermissions?: string[];
  fallbackUrl?: string;
  unauthorizedUrl?: string;
}

export default function ProtectedRoute({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  fallbackUrl = '/login',
  unauthorizedUrl = '/unauthorized',
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, hasRole, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Not authenticated - redirect to login
    if (!isAuthenticated || !user) {
      router.replace(fallbackUrl);
      return;
    }

    // Check role requirements
    if (requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some(role => hasRole(role));
      if (!hasRequiredRole) {
        router.replace(unauthorizedUrl);
        return;
      }
    }

    // Check permission requirements
    if (requiredPermissions.length > 0) {
      const hasRequiredPermission = requiredPermissions.some(permission => 
        hasPermission(permission)
      );
      if (!hasRequiredPermission) {
        router.replace(unauthorizedUrl);
        return;
      }
    }
  }, [
    isLoading,
    isAuthenticated,
    user,
    requiredRoles,
    requiredPermissions,
    hasRole,
    hasPermission,
    router,
    fallbackUrl,
    unauthorizedUrl,
  ]);

  // Show loading while checking authentication
  if (isLoading || !isAuthenticated || !user) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  // Check if user has required access after authentication is confirmed
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
    if (!hasRequiredRole) {
      return null; // Will redirect via useEffect
    }
  }

  if (requiredPermissions.length > 0) {
    const hasRequiredPermission = requiredPermissions.some(permission => 
      hasPermission(permission)
    );
    if (!hasRequiredPermission) {
      return null; // Will redirect via useEffect
    }
  }

  return <>{children}</>;
}