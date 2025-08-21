'use client';

import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types/auth';
import { ReactNode } from 'react';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requiredPermissions?: string[];
  fallback?: ReactNode;
  requireAll?: boolean; // If true, user must have ALL permissions/roles, if false, ANY
}

export default function RoleGuard({
  children,
  allowedRoles = [],
  requiredPermissions = [],
  fallback = null,
  requireAll = false,
}: RoleGuardProps) {
  const { user, hasRole, hasPermission, isAuthenticated } = useAuth();

  // Not authenticated or no user
  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  // Check role requirements
  if (allowedRoles.length > 0) {
    const roleCheck = requireAll
      ? allowedRoles.every(role => hasRole(role))
      : allowedRoles.some(role => hasRole(role));
    
    if (!roleCheck) {
      return <>{fallback}</>;
    }
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const permissionCheck = requireAll
      ? requiredPermissions.every(permission => hasPermission(permission))
      : requiredPermissions.some(permission => hasPermission(permission));
    
    if (!permissionCheck) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

// Convenience components for common role checks
export function HROnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['HR']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function PCOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['PC']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function RMOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['RM']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function StaffAndAbove({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['PC', 'HR']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function ManagerAndAbove({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allowedRoles={['RM', 'HR']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}