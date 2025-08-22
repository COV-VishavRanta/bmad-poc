import { useAuthStore } from '@/store/auth';

export const usePermissions = () => {
  const { hasPermission, hasRole, user } = useAuthStore();

  return {
    // Permission checks
    hasPermission,
    hasRole,
    
    // Project permissions
    canViewProjects: hasPermission('projects.view'),
    canCreateProjects: hasPermission('projects.create'),
    canEditProjects: hasPermission('projects.edit'),
    canDeleteProjects: hasPermission('projects.delete'),
    
    // Client permissions
    canViewClients: hasPermission('clients.view'),
    canCreateClients: hasPermission('clients.create'),
    canEditClients: hasPermission('clients.edit'),
    canDeleteClients: hasPermission('clients.delete'),
    
    // Assignment permissions
    canViewAssignments: hasPermission('assignments.view'),
    canCreateAssignments: hasPermission('assignments.create'),
    canEditAssignments: hasPermission('assignments.edit'),
    canDeleteAssignments: hasPermission('assignments.delete'),
    
    // SOW permissions
    canViewSOWs: hasPermission('sows.view'),
    canCreateSOWs: hasPermission('sows.create'),
    canEditSOWs: hasPermission('sows.edit'),
    canDeleteSOWs: hasPermission('sows.delete'),
    
    // Group permissions
    canViewGroups: hasPermission('groups.view'),
    canCreateGroups: hasPermission('groups.create'),
    canEditGroups: hasPermission('groups.edit'),
    canDeleteGroups: hasPermission('groups.delete'),
    
    // User permissions
    canViewUsers: hasPermission('users.view'),
    canCreateUsers: hasPermission('users.create'),
    canEditUsers: hasPermission('users.edit'),
    canDeleteUsers: hasPermission('users.delete'),
    
    // Admin permissions
    canAccessAdmin: hasPermission('admin.access'),
    canViewReports: hasPermission('reports.view'),
    
    // Role checks
    isHR: hasRole('HR'),
    isPC: hasRole('PC'),
    isRM: hasRole('RM'),
    
    // Current user
    currentUser: user,
    
    // Helper functions
    isReadOnlyAccess: () => {
      return hasPermission('projects.view') && !hasPermission('projects.edit');
    },
    
    hasFullProjectAccess: () => {
      return hasPermission('projects.edit') && hasPermission('projects.create');
    },
    
    canPerformBulkOperations: () => {
      return hasPermission('projects.edit');
    },
    
    // Filter projects based on role
    filterProjectsByPermission: <T extends { id: number }>(projects: T[]): T[] => {
      // All roles can view projects they have access to
      // In the future, this could filter based on user assignments, client access, etc.
      return projects;
    }
  };
};