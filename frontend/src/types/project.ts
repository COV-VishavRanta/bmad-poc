// Project management types and interfaces

export type ProjectStatus = 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectType = 'Development' | 'Maintenance' | 'Consulting' | 'Support';
export type ProjectSortBy = 'name' | 'start_date' | 'end_date' | 'status' | 'client_name';
export type SortOrder = 'asc' | 'desc';

export interface Project {
  id: number;
  name: string;
  clientId: number;
  clientName: string;
  sowId: number;
  sowName: string;
  projectType: ProjectType;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  groupId?: number;
  groupName?: string;
  description?: string;
  totalFteAssigned: number;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy: number;
}

export interface ProjectTableRow extends Project {
  // Display-specific computed properties
  formattedStartDate?: string;
  formattedEndDate?: string;
  statusDisplay?: {
    label: string;
    color: string;
    badge: string;
  };
  categoryDisplay?: string; // Individual/Group indicator
}

export interface ProjectSearchParams {
  search?: string;
  clientId?: number;
  status?: ProjectStatus | 'all';
  projectType?: ProjectType | 'all';
  groupId?: number;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: ProjectSortBy;
  sortOrder?: SortOrder;
}

export interface CreateProjectData {
  name: string;
  clientId: number;
  sowId: number;
  projectType: ProjectType;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  groupId?: number;
  description?: string;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  // Update-specific metadata
  reason?: string; // Reason for the update
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProjectSearchResponse extends ProjectListResponse {
  // Search-specific metadata
  searchTerm?: string;
  searchTime?: number; // Time taken for search in milliseconds
}

// Team Assignment types within project context
export interface ProjectAssignment {
  id: number;
  projectId: number;
  userId: number;
  userName: string;
  userEmail: string;
  role: string;
  fteAllocation: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'inactive' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssignmentData {
  userId: number;
  role: string;
  fteAllocation: number;
  startDate: string;
  endDate: string;
}

export interface UpdateAssignmentData extends Partial<CreateAssignmentData> {
  status?: 'active' | 'inactive' | 'completed';
}

// Project details and extended information
export interface ProjectHistory {
  id: number;
  projectId: number;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  userId: number;
  userName: string;
  timestamp: string;
  reason?: string;
}

export interface ProjectActivity {
  id: number;
  type: 'project_created' | 'project_updated' | 'status_changed' | 'assignment_added' | 'assignment_updated' | 'assignment_removed';
  description: string;
  timestamp: string;
  userId: number;
  userName: string;
  details: Record<string, unknown>;
  impact: 'low' | 'medium' | 'high';
}

export interface ProjectWithDetails extends Project {
  assignments: ProjectAssignment[];
  history: ProjectHistory[];
  activities: ProjectActivity[];
  documents?: ProjectDocument[];
  statistics?: ProjectStatistics;
}

export interface ProjectDocument {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: number;
  uploadedByName: string;
  uploadedAt: string;
}

export interface ProjectStatistics {
  totalAssignments: number;
  activeAssignments: number;
  totalFteAllocated: number;
  averageFtePerAssignment: number;
  projectDurationDays: number;
  completionPercentage: number;
  milestoneCount: number;
  completedMilestones: number;
}

// Project status configuration for UI
export type ProjectStatusConfig = {
  [key in ProjectStatus]: {
    color: string;
    label: string;
    badge: string;
    nextStates: ProjectStatus[];
    description: string;
  };
}

export const PROJECT_STATUS_CONFIG: ProjectStatusConfig = {
  planned: {
    color: 'blue',
    label: 'Planned',
    badge: 'bg-blue-100 text-blue-800',
    nextStates: ['active', 'cancelled'],
    description: 'Project is planned but not yet started'
  },
  active: {
    color: 'green',
    label: 'Active',
    badge: 'bg-green-100 text-green-800',
    nextStates: ['on_hold', 'completed', 'cancelled'],
    description: 'Project is currently active and in progress'
  },
  on_hold: {
    color: 'orange',
    label: 'On Hold',
    badge: 'bg-orange-100 text-orange-800',
    nextStates: ['active', 'cancelled'],
    description: 'Project is temporarily paused'
  },
  completed: {
    color: 'gray',
    label: 'Completed',
    badge: 'bg-gray-100 text-gray-800',
    nextStates: [],
    description: 'Project has been completed successfully'
  },
  cancelled: {
    color: 'red',
    label: 'Cancelled',
    badge: 'bg-red-100 text-red-800',
    nextStates: [],
    description: 'Project has been cancelled'
  }
};

// Project type configuration
export type ProjectTypeConfig = {
  [key in ProjectType]: {
    label: string;
    description: string;
    color: string;
    icon: string;
  };
}

export const PROJECT_TYPE_CONFIG: ProjectTypeConfig = {
  Development: {
    label: 'Development',
    description: 'Software development and implementation projects',
    color: 'blue',
    icon: '🚀'
  },
  Maintenance: {
    label: 'Maintenance',
    description: 'Ongoing maintenance and support activities',
    color: 'green',
    icon: '🔧'
  },
  Consulting: {
    label: 'Consulting',
    description: 'Advisory and consulting services',
    color: 'purple',
    icon: '💡'
  },
  Support: {
    label: 'Support',
    description: 'Technical support and troubleshooting',
    color: 'orange',
    icon: '🛠️'
  }
};

// Form validation interfaces for project creation/editing
export interface ProjectFormData {
  name: string;
  clientId: number | '';
  sowId: number | '';
  projectType: ProjectType | '';
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  groupId?: number | '';
  description?: string;
}

export interface ProjectFormErrors {
  name?: string;
  clientId?: string;
  sowId?: string;
  projectType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  groupId?: string;
  description?: string;
  general?: string;
}

// Filter and search utility types
export interface ProjectFilterOptions {
  clients: Array<{ id: number; name: string }>;
  sows: Array<{ id: number; name: string; clientId: number }>;
  groups: Array<{ id: number; name: string }>;
  statuses: Array<{ value: ProjectStatus; label: string }>;
  types: Array<{ value: ProjectType; label: string }>;
}

export interface ProjectQuickAction {
  id: string;
  label: string;
  icon: string;
  action: (projectId: number) => void;
  requiresPermission?: string;
  confirmationRequired?: boolean;
  confirmationMessage?: string;
}

// Bulk operations
export interface BulkProjectOperation {
  type: 'status_change' | 'delete' | 'export';
  projectIds: number[];
  data?: {
    newStatus?: ProjectStatus;
    reason?: string;
  };
}

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{
    projectId: number;
    projectName: string;
    error: string;
  }>;
}