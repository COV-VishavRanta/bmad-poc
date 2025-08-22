/**
 * Milestone types and interfaces for project timeline management.
 * 
 * This module defines TypeScript types for milestones, dependencies,
 * and timeline functionality for advanced project features.
 */

export enum MilestoneStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress', 
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export enum DependencyType {
  FINISH_TO_START = 'finish_to_start',
  START_TO_START = 'start_to_start', 
  FINISH_TO_FINISH = 'finish_to_finish',
  START_TO_FINISH = 'start_to_finish'
}

export enum MetricType {
  DURATION = 'duration',
  BUDGET = 'budget',
  TEAM_SIZE = 'team_size',
  COMPLETION_RATE = 'completion_rate',
  QUALITY_SCORE = 'quality_score',
  CLIENT_SATISFACTION = 'client_satisfaction',
  RESOURCE_UTILIZATION = 'resource_utilization'
}

export interface MilestoneAssignee {
  user_id: number;
  full_name: string;
  email: string;
  role?: string;
  assigned_date: string;
}

export interface Milestone {
  id: number;
  name: string;
  description?: string;
  project_id: number;
  due_date: string;
  completion_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  status: MilestoneStatus;
  progress_percentage: number;
  priority: number;
  is_critical_path: boolean;
  deliverables?: string[];
  acceptance_criteria?: string;
  notes?: string;
  assignees: MilestoneAssignee[];
  created_at: string;
  updated_at: string;
}

export interface MilestoneDependency {
  id: number;
  predecessor_id: number;
  successor_id: number;
  predecessor_name: string;
  successor_name: string;
  dependency_type: DependencyType;
  lag_days: number;
  description?: string;
  is_external: boolean;
  created_at: string;
}

export interface ProjectTimeline {
  project_id: number;
  project_name: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  milestones: Milestone[];
  dependencies: MilestoneDependency[];
  critical_path: number[];
  completion_percentage: number;
}

export interface ProjectTemplate {
  id: number;
  name: string;
  description?: string;
  category: string;
  estimated_duration_days: number;
  complexity: 'simple' | 'medium' | 'complex';
  milestone_templates: TemplateMilestone[];
  role_templates: TemplateRole[];
  default_settings: Record<string, unknown>;
  tags: string[];
  usage_count: number;
  is_public: boolean;
  is_active: boolean;
  created_by: number;
  created_by_name: string;
  approved_by?: number;
  approved_by_name?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateMilestone {
  name: string;
  description?: string;
  duration_offset: number; // Days from project start
  estimated_hours?: number;
  priority: number;
  dependencies: string[]; // Milestone names
}

export interface TemplateRole {
  role_name: string;
  fte_allocation: number;
  start_offset: number; // Days from project start
  duration: number; // Days
}

export interface ProjectMetric {
  id: number;
  project_id: number;
  metric_type: MetricType;
  metric_value: number;
  metric_unit?: string;
  measurement_date: string;
  measurement_period?: string;
  category?: string;
  subcategory?: string;
  notes?: string;
  metric_metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ProjectAnalytics {
  project_id: number;
  project_name: string;
  total_milestones: number;
  completed_milestones: number;
  overdue_milestones: number;
  completion_percentage: number;
  total_estimated_hours: number;
  total_actual_hours: number;
  efficiency_ratio?: number;
  days_remaining: number;
  is_on_track: boolean;
  risk_level: 'low' | 'medium' | 'high';
  latest_metrics: ProjectMetric[];
}

export interface ResourceAllocation {
  project_id: number;
  project_name: string;
  total_fte_allocated: number;
  team_members: TeamMemberAllocation[];
  allocation_by_role: Record<string, number>;
  utilization_percentage: number;
  conflicts: ResourceConflict[];
}

export interface TeamMemberAllocation {
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  fte_allocation: number;
  start_date?: string;
  end_date?: string;
}

export interface ResourceConflict {
  user_id: number;
  user_name: string;
  total_fte: number;
  conflict_projects: ConflictProject[];
}

export interface ConflictProject {
  project_id: number;
  project_name: string;
  fte_allocation: number;
}

// Create/Update types
export interface CreateMilestoneRequest {
  name: string;
  description?: string;
  project_id: number;
  due_date: string;
  estimated_hours?: number;
  priority: number;
  deliverables?: string[];
  acceptance_criteria?: string;
  notes?: string;
  assignee_ids?: number[];
}

export interface UpdateMilestoneRequest {
  name?: string;
  description?: string;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  status?: MilestoneStatus;
  progress_percentage?: number;
  priority?: number;
  deliverables?: string[];
  acceptance_criteria?: string;
  notes?: string;
  assignee_ids?: number[];
}

export interface CreateDependencyRequest {
  predecessor_id: number;
  successor_id: number;
  dependency_type?: DependencyType;
  lag_days?: number;
  description?: string;
}

export interface CreateProjectMetricRequest {
  project_id: number;
  metric_type: MetricType;
  metric_value: number;
  metric_unit?: string;
  measurement_date: string;
  measurement_period?: string;
  category?: string;
  subcategory?: string;
  notes?: string;
}

export interface CreateProjectFromTemplateRequest {
  template_id: number;
  project_name: string;
  project_description?: string;
  client_id: number;
  group_id?: number;
  sow_id: number;
  start_date: string;
  customizations?: Record<string, unknown>;
}

// Search and filter types
export interface MilestoneSearchFilters {
  project_id?: number;
  status?: MilestoneStatus[];
  assignee_id?: number;
  due_date_from?: string;
  due_date_to?: string;
  priority_min?: number;
  priority_max?: number;
  include_completed?: boolean;
}

export interface TimelineViewOptions {
  show_dependencies: boolean;
  show_critical_path: boolean;
  show_completed: boolean;
  group_by: 'none' | 'assignee' | 'priority' | 'status';
  date_range?: {
    start: string;
    end: string;
  };
}

export interface AnalyticsDateRange {
  start_date: string;
  end_date: string;
}

export interface TeamWorkloadAnalysis {
  user_id: number;
  full_name: string;
  email: string;
  total_fte: number;
  project_count: number;
  projects: WorkloadProject[];
  is_overallocated: boolean;
}

export interface WorkloadProject {
  project_id: number;
  project_name: string;
  role: string;
  fte_allocation: number;
  start_date?: string;
  end_date?: string;
}

export interface PortfolioAnalytics {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  portfolio_completion_percentage: number;
  total_fte_allocated: number;
  projects_by_status: Record<string, number>;
  resource_utilization_trend: UtilizationTrendPoint[];
  milestone_completion_trend: CompletionTrendPoint[];
}

export interface UtilizationTrendPoint {
  month: string;
  total_fte: number;
}

export interface CompletionTrendPoint {
  month: string;
  completed_milestones: number;
}

// Additional template types for the service
export interface ProjectTemplateCreate {
  name: string;
  description?: string;
  category: string;
  estimated_duration: number;
  complexity: 'simple' | 'medium' | 'complex';
  tags?: string[];
  is_public?: boolean;
  milestones: TemplateMilestoneCreate[];
  roles: TemplateRoleCreate[];
}

export interface ProjectTemplateUpdate {
  name?: string;
  description?: string;
  category?: string;
  estimated_duration?: number;
  complexity?: 'simple' | 'medium' | 'complex';
  tags?: string[];
  is_public?: boolean;
  milestones?: TemplateMilestoneCreate[];
  roles?: TemplateRoleCreate[];
}

export interface ProjectTemplateList {
  id: number;
  name: string;
  description?: string;
  category: string;
  estimated_duration: number;
  complexity: 'simple' | 'medium' | 'complex';
  tags?: string[];
  usage_count: number;
  is_public: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateMilestoneCreate {
  name: string;
  description?: string;
  duration_offset: number;
  dependencies?: string[];
}

export interface TemplateRoleCreate {
  role_name: string;
  fte_allocation: number;
  start_offset: number;
  duration: number;
}

export interface ProjectTemplatePreview {
  template_name: string;
  estimated_duration: number;
  complexity: 'simple' | 'medium' | 'complex';
  start_date: string;
  end_date: string;
  milestones: {
    name: string;
    description?: string;
    due_date: string;
    duration_offset: number;
    dependencies?: string[];
  }[];
  roles_required: {
    role_name: string;
    fte_allocation: number;
    start_offset: number;
    duration: number;
  }[];
}