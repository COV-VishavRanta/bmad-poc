/**
 * Milestone API service for project timeline management.
 * 
 * This module provides API methods for milestone creation,
 * dependency management, and timeline functionality.
 */

import { apiClient } from '@/lib/apiClient';
import {
    AnalyticsDateRange,
    CreateDependencyRequest,
    CreateMilestoneRequest,
    CreateProjectFromTemplateRequest,
    CreateProjectMetricRequest,
    Milestone,
    MilestoneDependency,
    MilestoneSearchFilters,
    PortfolioAnalytics,
    ProjectAnalytics,
    ProjectMetric,
    ProjectTemplate,
    ProjectTimeline,
    ResourceAllocation,
    TeamWorkloadAnalysis,
    UpdateMilestoneRequest
} from '@/types/milestone';

export class MilestoneService {
  /**
   * Create a new milestone
   */
  static async createMilestone(data: CreateMilestoneRequest): Promise<Milestone> {
    return apiClient.post('/api/milestones/', data);
  }

  /**
   * Get a milestone by ID
   */
  static async getMilestone(milestoneId: number): Promise<Milestone> {
    return apiClient.get(`/api/milestones/${milestoneId}`);
  }

  /**
   * Update an existing milestone
   */
  static async updateMilestone(
    milestoneId: number, 
    data: UpdateMilestoneRequest
  ): Promise<Milestone> {
    return apiClient.put(`/api/milestones/${milestoneId}`, data);
  }

  /**
   * Delete a milestone
   */
  static async deleteMilestone(milestoneId: number): Promise<void> {
    return apiClient.delete(`/api/milestones/${milestoneId}`);
  }

  /**
   * Update milestone progress percentage
   */
  static async updateMilestoneProgress(
    milestoneId: number, 
    progressPercentage: number
  ): Promise<Milestone> {
    return apiClient.patch(
      `/api/milestones/${milestoneId}/progress?progress_percentage=${progressPercentage}`
    );
  }

  /**
   * Get all milestones for a project
   */
  static async getProjectMilestones(projectId: number): Promise<Milestone[]> {
    return apiClient.get(`/api/milestones/project/${projectId}`);
  }

  /**
   * Get overdue milestones
   */
  static async getOverdueMilestones(projectId?: number): Promise<Milestone[]> {
    const params = projectId ? { project_id: projectId.toString() } : undefined;
    return apiClient.get('/api/milestones/overdue/list', params);
  }

  /**
   * Get upcoming milestones
   */
  static async getUpcomingMilestones(
    daysAhead: number = 7, 
    projectId?: number
  ): Promise<Milestone[]> {
    const params: Record<string, string> = { days_ahead: daysAhead.toString() };
    if (projectId) {
      params.project_id = projectId.toString();
    }
    return apiClient.get('/api/milestones/upcoming/list', params);
  }

  /**
   * Create a dependency between milestones
   */
  static async createDependency(data: CreateDependencyRequest): Promise<MilestoneDependency> {
    return apiClient.post('/api/milestones/dependencies', data);
  }

  /**
   * Get all dependencies for a project
   */
  static async getProjectDependencies(projectId: number): Promise<MilestoneDependency[]> {
    return apiClient.get(`/api/milestones/dependencies/project/${projectId}`);
  }

  /**
   * Delete a milestone dependency
   */
  static async deleteDependency(dependencyId: number): Promise<void> {
    return apiClient.delete(`/api/milestones/dependencies/${dependencyId}`);
  }

  /**
   * Get complete project timeline
   */
  static async getProjectTimeline(projectId: number): Promise<ProjectTimeline> {
    return apiClient.get(`/api/milestones/timeline/project/${projectId}`);
  }

  /**
   * Search milestones with filters
   */
  static async searchMilestones(filters: MilestoneSearchFilters): Promise<Milestone[]> {
    const params: Record<string, string> = {};
    
    if (filters.project_id) params.project_id = filters.project_id.toString();
    if (filters.status) params.status = filters.status.join(',');
    if (filters.assignee_id) params.assignee_id = filters.assignee_id.toString();
    if (filters.due_date_from) params.due_date_from = filters.due_date_from;
    if (filters.due_date_to) params.due_date_to = filters.due_date_to;
    if (filters.priority_min) params.priority_min = filters.priority_min.toString();
    if (filters.priority_max) params.priority_max = filters.priority_max.toString();
    if (filters.include_completed !== undefined) {
      params.include_completed = filters.include_completed.toString();
    }

    return apiClient.get('/api/milestones/search', params);
  }
}

export class ProjectAnalyticsService {
  /**
   * Get comprehensive analytics for a project
   */
  static async getProjectAnalytics(projectId: number): Promise<ProjectAnalytics> {
    return apiClient.get(`/api/projects/${projectId}/analytics`);
  }

  /**
   * Get resource allocation analytics for a project
   */
  static async getResourceAllocation(projectId: number): Promise<ResourceAllocation> {
    return apiClient.get(`/api/projects/${projectId}/resource-allocation`);
  }

  /**
   * Create a new project metric
   */
  static async createProjectMetric(
    projectId: number, 
    data: CreateProjectMetricRequest
  ): Promise<ProjectMetric> {
    return apiClient.post(`/api/projects/${projectId}/metrics`, data);
  }

  /**
   * Get portfolio-level analytics
   */
  static async getPortfolioAnalytics(clientId?: number): Promise<PortfolioAnalytics> {
    const params = clientId ? { client_id: clientId.toString() } : undefined;
    return apiClient.get('/api/projects/portfolio/analytics', params);
  }

  /**
   * Get team workload analysis
   */
  static async getTeamWorkloadAnalysis(
    dateRange: AnalyticsDateRange
  ): Promise<TeamWorkloadAnalysis[]> {
    const params = {
      start_date: dateRange.start_date,
      end_date: dateRange.end_date
    };
    return apiClient.get('/api/projects/team/workload', params);
  }

  /**
   * Get project metrics history
   */
  static async getProjectMetricsHistory(
    projectId: number,
    metricType?: string,
    dateRange?: AnalyticsDateRange
  ): Promise<ProjectMetric[]> {
    const params: Record<string, string> = {};
    if (metricType) params.metric_type = metricType;
    if (dateRange) {
      params.start_date = dateRange.start_date;
      params.end_date = dateRange.end_date;
    }

    return apiClient.get(`/api/projects/${projectId}/metrics/history`, params);
  }

  /**
   * Get resource utilization trends
   */
  static async getResourceUtilizationTrend(
    projectId?: number,
    dateRange?: AnalyticsDateRange
  ): Promise<Array<{ date: string; utilization: number }>> {
    const params: Record<string, string> = {};
    if (projectId) params.project_id = projectId.toString();
    if (dateRange) {
      params.start_date = dateRange.start_date;
      params.end_date = dateRange.end_date;
    }

    return apiClient.get('/api/projects/analytics/utilization-trend', params);
  }

  /**
   * Get milestone completion trends
   */
  static async getMilestoneCompletionTrend(
    projectId?: number,
    dateRange?: AnalyticsDateRange
  ): Promise<Array<{ date: string; completed: number; planned: number }>> {
    const params: Record<string, string> = {};
    if (projectId) params.project_id = projectId.toString();
    if (dateRange) {
      params.start_date = dateRange.start_date;
      params.end_date = dateRange.end_date;
    }

    return apiClient.get('/api/projects/analytics/completion-trend', params);
  }

  /**
   * Get project risk assessment
   */
  static async getProjectRiskAssessment(projectId: number): Promise<{
    risk_level: 'low' | 'medium' | 'high';
    risk_factors: Array<{
      factor: string;
      severity: number;
      description: string;
    }>;
    recommendations: string[];
  }> {
    return apiClient.get(`/api/projects/${projectId}/risk-assessment`);
  }

  /**
   * Get performance benchmarks
   */
  static async getPerformanceBenchmarks(
    projectId: number,
    compareWith?: 'similar_projects' | 'client_average' | 'industry_standard'
  ): Promise<{
    current_project: ProjectAnalytics;
    benchmark: ProjectAnalytics;
    comparison: Record<string, { current: number; benchmark: number; variance: number }>;
  }> {
    const params = compareWith ? { compare_with: compareWith } : undefined;
    return apiClient.get(`/api/projects/${projectId}/benchmarks`, params);
  }
}

export class ProjectTemplateService {
  /**
   * Get all project templates
   */
  static async getProjectTemplates(
    category?: string,
    isPublic?: boolean
  ): Promise<ProjectTemplate[]> {
    const params: Record<string, string> = {};
    if (category) params.category = category;
    if (isPublic !== undefined) params.is_public = isPublic.toString();

    return apiClient.get('/api/templates/projects', params);
  }

  /**
   * Get a project template by ID
   */
  static async getProjectTemplate(templateId: number): Promise<ProjectTemplate> {
    return apiClient.get(`/api/templates/projects/${templateId}`);
  }

  /**
   * Create a project from template
   */
  static async createProjectFromTemplate(
    data: CreateProjectFromTemplateRequest
  ): Promise<{ project_id: number; milestones_created: number; assignments_created: number }> {
    return apiClient.post('/api/templates/create-project', data);
  }

  /**
   * Get template categories
   */
  static async getTemplateCategories(): Promise<Array<{
    category: string;
    count: number;
    description?: string;
  }>> {
    return apiClient.get('/api/templates/categories');
  }

  /**
   * Get template usage statistics
   */
  static async getTemplateUsageStats(templateId: number): Promise<{
    usage_count: number;
    recent_usage: Array<{
      project_id: number;
      project_name: string;
      created_by: string;
      created_at: string;
    }>;
    success_rate: number;
    average_completion_time: number;
  }> {
    return apiClient.get(`/api/templates/projects/${templateId}/usage-stats`);
  }

  /**
   * Preview template application
   */
  static async previewTemplateApplication(
    templateId: number,
    projectData: Omit<CreateProjectFromTemplateRequest, 'template_id'>
  ): Promise<{
    estimated_milestones: Array<{
      name: string;
      due_date: string;
      estimated_hours: number;
    }>;
    estimated_roles: Array<{
      role_name: string;
      fte_allocation: number;
      duration_days: number;
    }>;
    estimated_duration: number;
    estimated_cost?: number;
  }> {
    return apiClient.post(`/api/templates/projects/${templateId}/preview`, projectData);
  }
}