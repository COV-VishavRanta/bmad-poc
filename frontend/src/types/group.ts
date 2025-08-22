// Group management types and interfaces

export type GroupStatus = 'active' | 'completed' | 'cancelled' | 'archived';
export type GroupSortBy = 'name' | 'start_date' | 'end_date' | 'project_count' | 'client_name';
export type SortOrder = 'asc' | 'desc';

export interface Group {
  id: number;
  name: string;
  description?: string;
  clientId: number;
  clientName: string;
  sowId?: number;
  sowName?: string;
  startDate: string;
  endDate: string;
  status: GroupStatus;
  createdBy?: number;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupWithDetails extends Group {
  projectCount: number;
  activeProjectCount: number;
  totalFte: number;
  isActive: boolean;
  isCurrent: boolean;
  projects?: GroupProject[];
}

export interface GroupProject {
  id: number;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  projectType: string;
  fteAllocated: number;
}

export interface GroupSearchParams {
  search?: string;
  clientId?: number;
  sowId?: number;
  status?: GroupStatus | 'all';
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  projectCountMin?: number;
  projectCountMax?: number;
  page?: number;
  pageSize?: number;
  sortBy?: GroupSortBy;
  sortOrder?: SortOrder;
}

export interface CreateGroupData {
  name: string;
  description?: string;
  clientId: number;
  sowId?: number;
  startDate: string;
  endDate: string;
}

export interface UpdateGroupData extends Partial<CreateGroupData> {
  // Update-specific metadata
  reason?: string;
}

export interface GroupListResponse {
  groups: Group[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GroupAnalytics {
  groupId: number;
  projectCount: number;
  activeProjectCount: number;
  completedProjectCount: number;
  totalFteAllocated: number;
  completionPercentage: number;
  averageProjectDuration?: number;
  resourceUtilization: number;
  timelineHealth: string;
}

export interface GroupHistory {
  id: number;
  action: string;
  changedFields?: string[];
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changeMetadata?: Record<string, unknown>;
  changedBy?: number;
  changedByName?: string;
  changedAt: string;
}

export interface GroupHistoryListResponse {
  history: GroupHistory[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProjectAssignmentRequest {
  projectIds: number[];
}

export interface BulkProjectAssignmentRequest {
  addProjectIds?: number[];
  removeProjectIds?: number[];
}

export interface BulkProjectAssignmentResponse {
  addedProjects: number;
  removedProjects: number;
  failedAdditions: Array<{
    projectId: number;
    reason: string;
  }>;
  failedRemovals: Array<{
    projectId: number;
    reason: string;
  }>;
  warnings: string[];
}

export interface GroupTimeline {
  groupId: number;
  groupDateRange: [string, string];
  projects: ProjectTimelineItem[];
  milestones: GroupMilestone[];
  dependencies: TimelineDependency[];
  conflictAreas: ConflictArea[];
}

export interface ProjectTimelineItem {
  projectId: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  progress: number;
  assignedTeam: TeamMember[];
}

export interface GroupMilestone {
  id: number;
  name: string;
  date: string;
  type: 'group' | 'project';
  status: string;
  dependencies: number[];
}

export interface TimelineDependency {
  fromProjectId: number;
  toProjectId: number;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
}

export interface ConflictArea {
  type: 'date_overlap' | 'resource_conflict' | 'dependency_violation';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedProjects: number[];
  suggestion?: string;
}

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  fteAllocation: number;
}

// Group status configuration for UI
export type GroupStatusConfig = {
  [key in GroupStatus]: {
    color: string;
    label: string;
    badge: string;
    nextStates: GroupStatus[];
    description: string;
  };
}

export const GROUP_STATUS_CONFIG: GroupStatusConfig = {
  active: {
    color: 'green',
    label: 'Active',
    badge: 'bg-green-100 text-green-800',
    nextStates: ['completed', 'cancelled', 'archived'],
    description: 'Group is currently active and managing projects'
  },
  completed: {
    color: 'blue',
    label: 'Completed',
    badge: 'bg-blue-100 text-blue-800',
    nextStates: ['archived'],
    description: 'Group has completed all its projects'
  },
  cancelled: {
    color: 'red',
    label: 'Cancelled',
    badge: 'bg-red-100 text-red-800',
    nextStates: ['archived'],
    description: 'Group has been cancelled'
  },
  archived: {
    color: 'gray',
    label: 'Archived',
    badge: 'bg-gray-100 text-gray-800',
    nextStates: [],
    description: 'Group has been archived'
  }
};

// Form validation interfaces
export interface GroupFormData {
  name: string;
  description?: string;
  clientId: number | '';
  sowId?: number | '';
  startDate: string;
  endDate: string;
}

export interface GroupFormErrors {
  name?: string;
  description?: string;
  clientId?: string;
  sowId?: string;
  startDate?: string;
  endDate?: string;
  general?: string;
}

// Filter options
export interface GroupFilterOptions {
  clients: Array<{ id: number; name: string }>;
  sows: Array<{ id: number; name: string; clientId: number }>;
  statuses: Array<{ value: GroupStatus; label: string }>;
}

// Validation interfaces
export interface GroupValidation {
  isValid: boolean;
  conflicts: DateConflict[];
  warnings: string[];
  suggestions: string[];
}

export interface DateConflict {
  type: 'project_date_violation' | 'sow_date_mismatch';
  projectId?: number;
  projectName?: string;
  conflictDescription: string;
  suggestion: string;
}

export interface AssignmentError {
  projectId: number;
  projectName: string;
  errorType: 'date_conflict' | 'client_mismatch' | 'capacity_exceeded';
  message: string;
  suggestion?: string;
}

// Project assignment interface for groups
export interface GroupProjectAssignment {
  groupId: number;
  availableProjects: GroupProject[];
  assignedProjects: GroupProject[];
  validationErrors: AssignmentError[];
}

// Group visualization interfaces
export interface GroupVisualization {
  groupId: number;
  groupName: string;
  clientName: string;
  projectCount: number;
  status: GroupStatus;
  startDate: string;
  endDate: string;
  projects: ProjectSummary[];
  resourceUtilization: number;
  completionPercentage: number;
}

export interface ProjectSummary {
  id: number;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  fteAllocated: number;
}

// Bulk operations
export interface BulkGroupOperation {
  type: 'status_change' | 'delete' | 'export';
  groupIds: number[];
  data?: {
    newStatus?: GroupStatus;
    reason?: string;
  };
}

export interface BulkGroupOperationResult {
  success: number;
  failed: number;
  errors: Array<{
    groupId: number;
    groupName: string;
    error: string;
  }>;
}

// Group quick actions
export interface GroupQuickAction {
  id: string;
  label: string;
  icon: string;
  action: (groupId: number) => void;
  requiresPermission?: string;
  confirmationRequired?: boolean;
  confirmationMessage?: string;
}

// Group collaboration features
export interface GroupComment {
  id: number;
  groupId: number;
  userId: number;
  userName: string;
  content: string;
  mentions: number[];
  createdAt: string;
  attachments: Attachment[];
}

export interface GroupActivity {
  id: number;
  type: 'group_created' | 'group_updated' | 'status_changed' | 'project_added' | 'project_removed';
  description: string;
  timestamp: string;
  userId: number;
  userName: string;
  details: Record<string, unknown>;
  impact: 'low' | 'medium' | 'high';
}

export interface Attachment {
  id: number;
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

// Group template interfaces
export interface GroupTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  defaultProjects: TemplateProject[];
  estimatedDuration: number;
  recommendedTeamSize: number;
  tags: string[];
}

export interface TemplateProject {
  name: string;
  projectType: string;
  durationOffset: number;
  dependencies: string[];
  estimatedFTE: number;
}