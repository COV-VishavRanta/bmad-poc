import { UserRole } from '@/types/auth';

// Route configuration for role-based access
export const ROUTE_PERMISSIONS = {
  '/dashboard': ['HR', 'PC', 'RM'],
  '/users': ['HR'],
  '/clients': ['HR', 'PC'],
  '/projects': ['HR', 'PC'],
  '/sows': ['HR', 'PC'],
  '/assignments': ['HR', 'RM'],
  '/timelines': ['HR', 'RM'],
  '/teams': ['HR', 'RM'],
  '/reports': ['HR', 'PC', 'RM'],
  '/profile': ['HR', 'PC', 'RM'],
  '/settings': ['HR'],
} as const;

export function getRoutePermissions(path: string): UserRole[] {
  // Find the most specific route match
  const routeKey = Object.keys(ROUTE_PERMISSIONS).find(route => 
    path === route || path.startsWith(`${route}/`)
  ) as keyof typeof ROUTE_PERMISSIONS;
  
  return routeKey ? [...ROUTE_PERMISSIONS[routeKey]] : [];
}

export function hasRoutePermission(path: string, userRole: UserRole): boolean {
  const allowedRoles = getRoutePermissions(path);
  return allowedRoles.length === 0 || allowedRoles.includes(userRole);
}

// Permission utility functions
export function isHR(role: UserRole): boolean {
  return role === 'HR';
}

export function isPC(role: UserRole): boolean {
  return role === 'PC';
}

export function isRM(role: UserRole): boolean {
  return role === 'RM';
}

export function hasManagerAccess(role: UserRole): boolean {
  return role === 'HR' || role === 'RM';
}

export function hasClientAccess(role: UserRole): boolean {
  return role === 'HR' || role === 'PC';
}

export function hasFullAccess(role: UserRole): boolean {
  return role === 'HR';
}

// Role display utilities
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'HR':
      return 'HR Administrator';
    case 'PC':
      return 'Project Coordinator';
    case 'RM':
      return 'Resource Manager';
    default:
      return 'Unknown Role';
  }
}

export function getRoleDescription(role: UserRole): string {
  switch (role) {
    case 'HR':
      return 'Full system access including user management, clients, projects, SOWs, assignments, and reports.';
    case 'PC':
      return 'Access to client management, projects, SOWs, and reports. Cannot manage users or team assignments.';
    case 'RM':
      return 'Access to team assignments, project timelines, team data, and reports. Cannot manage clients or SOWs.';
    default:
      return 'No role assigned.';
  }
}

// Session management utilities
export function getSessionExpiry(): Date | null {
  try {
    const expiry = localStorage.getItem('session_expiry');
    return expiry ? new Date(expiry) : null;
  } catch {
    return null;
  }
}

export function setSessionExpiry(expiry: Date): void {
  try {
    localStorage.setItem('session_expiry', expiry.toISOString());
  } catch {
    // Ignore localStorage errors
  }
}

export function clearSessionExpiry(): void {
  try {
    localStorage.removeItem('session_expiry');
  } catch {
    // Ignore localStorage errors
  }
}

export function isSessionExpired(): boolean {
  const expiry = getSessionExpiry();
  if (!expiry) return true;
  
  return new Date() >= expiry;
}

export function getSessionTimeRemaining(): number {
  const expiry = getSessionExpiry();
  if (!expiry) return 0;
  
  const remaining = expiry.getTime() - new Date().getTime();
  return Math.max(0, remaining);
}

// Navigation utilities
export function getDefaultRoute(): string {
  // All roles can access dashboard
  return '/dashboard';
}

export function getAccessibleRoutes(role: UserRole): string[] {
  return Object.entries(ROUTE_PERMISSIONS)
    .filter(([, allowedRoles]) => allowedRoles.some(r => r === role))
    .map(([route]) => route);
}

// Error handling utilities
export function isAuthError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const authError = error as { status?: number; code?: string };
    return authError.status === 401 || authError.status === 403 || authError.code === 'AUTH_ERROR';
  }
  return false;
}

export function getAuthErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const authError = error as { message?: string; status?: number };
    
    if (authError.status === 401) {
      return 'Your session has expired. Please log in again.';
    }
    
    if (authError.status === 403) {
      return 'You do not have permission to access this resource.';
    }
    
    if (authError.message) {
      return authError.message;
    }
  }
  
  return 'An authentication error occurred. Please try again.';
}