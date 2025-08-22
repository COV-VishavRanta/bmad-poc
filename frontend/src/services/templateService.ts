/**
 * Project template management service
 * Handles CRUD operations for project templates, template usage, and project creation from templates
 */

import { apiClient } from '@/lib/apiClient';
import {
    ProjectTemplate,
    ProjectTemplateCreate,
    ProjectTemplateList,
    ProjectTemplatePreview,
    ProjectTemplateUpdate
} from '@/types/milestone';

export class TemplateService {
  private static instance: TemplateService;

  public static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  /**
   * Get list of project templates with filtering options
   */
  async getTemplates(params?: {
    category?: string;
    isPublic?: boolean;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<ProjectTemplateList[]> {
    const searchParams = new URLSearchParams();
    
    if (params?.category) searchParams.append('category', params.category);
    if (params?.isPublic !== undefined) searchParams.append('is_public', params.isPublic.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());

    return await apiClient.get<ProjectTemplateList[]>(`/api/templates?${searchParams.toString()}`);
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: number): Promise<ProjectTemplate> {
    return await apiClient.get<ProjectTemplate>(`/api/templates/${templateId}`);
  }

  /**
   * Create a new project template
   */
  async createTemplate(templateData: ProjectTemplateCreate): Promise<ProjectTemplate> {
    return await apiClient.post<ProjectTemplate>('/api/templates', templateData);
  }

  /**
   * Update an existing project template
   */
  async updateTemplate(templateId: number, templateData: ProjectTemplateUpdate): Promise<ProjectTemplate> {
    return await apiClient.put<ProjectTemplate>(`/api/templates/${templateId}`, templateData);
  }

  /**
   * Delete a project template
   */
  async deleteTemplate(templateId: number): Promise<void> {
    return await apiClient.delete(`/api/templates/${templateId}`);
  }

  /**
   * Create a new project from a template
   */
  async useTemplate(templateId: number, projectData: {
    name: string;
    description?: string;
    client_id: number;
    start_date?: string;
    end_date?: string;
  }): Promise<{ message: string; project_id: number; template_id: number }> {
    return await apiClient.post<{ message: string; project_id: number; template_id: number }>(
      `/api/templates/${templateId}/use`,
      projectData
    );
  }

  /**
   * Preview what a project would look like from a template
   */
  async previewTemplate(templateId: number): Promise<ProjectTemplatePreview> {
    return await apiClient.get<ProjectTemplatePreview>(`/api/templates/${templateId}/preview`);
  }

  /**
   * Get list of available template categories
   */
  async getTemplateCategories(): Promise<string[]> {
    return await apiClient.get<string[]>('/api/templates/categories/list');
  }

  /**
   * Clone an existing template
   */
  async cloneTemplate(templateId: number, cloneData: {
    name?: string;
    is_public?: boolean;
  }): Promise<ProjectTemplate> {
    return await apiClient.post<ProjectTemplate>(`/api/templates/${templateId}/clone`, cloneData);
  }

  /**
   * Get popular templates (most used)
   */
  async getPopularTemplates(limit: number = 10): Promise<ProjectTemplateList[]> {
    const templates = await this.getTemplates({ limit: 100 });
    return templates
      .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
      .slice(0, limit);
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<ProjectTemplateList[]> {
    return await this.getTemplates({ category });
  }

  /**
   * Get user's private templates
   */
  async getMyTemplates(): Promise<ProjectTemplateList[]> {
    return await this.getTemplates({ isPublic: false });
  }

  /**
   * Get public templates
   */
  async getPublicTemplates(): Promise<ProjectTemplateList[]> {
    return await this.getTemplates({ isPublic: true });
  }

  /**
   * Search templates by name or description
   */
  async searchTemplates(query: string): Promise<ProjectTemplateList[]> {
    return await this.getTemplates({ search: query });
  }

  /**
   * Validate template data before creation/update
   */
  validateTemplate(templateData: ProjectTemplateCreate | ProjectTemplateUpdate): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required field validation
    if ('name' in templateData && !templateData.name?.trim()) {
      errors.push('Template name is required');
    }

    if ('category' in templateData && !templateData.category) {
      errors.push('Template category is required');
    }

    if ('estimated_duration' in templateData && templateData.estimated_duration !== undefined) {
      if (templateData.estimated_duration <= 0) {
        errors.push('Estimated duration must be greater than 0');
      }
    }

    // Milestone validation
    if ('milestones' in templateData && templateData.milestones) {
      templateData.milestones.forEach((milestone: unknown, index: number) => {
        const m = milestone as { name?: string; duration_offset?: number };
        if (!m.name?.trim()) {
          errors.push(`Milestone ${index + 1}: Name is required`);
        }
        if ((m.duration_offset ?? 0) < 0) {
          errors.push(`Milestone ${index + 1}: Duration offset cannot be negative`);
        }
      });

      // Check for circular dependencies
      const milestoneNames = templateData.milestones.map((m: unknown) => (m as { name: string }).name);
      templateData.milestones.forEach((milestone: unknown, index: number) => {
        const m = milestone as { name: string; dependencies?: string[] };
        if (m.dependencies) {
          m.dependencies.forEach((dep: string) => {
            if (!milestoneNames.includes(dep)) {
              errors.push(`Milestone ${index + 1}: Dependency "${dep}" not found`);
            }
            if (dep === m.name) {
              errors.push(`Milestone ${index + 1}: Cannot depend on itself`);
            }
          });
        }
      });
    }

    // Role validation
    if ('roles' in templateData && templateData.roles) {
      templateData.roles.forEach((role: unknown, index: number) => {
        const r = role as { 
          role_name?: string; 
          fte_allocation?: number; 
          start_offset?: number; 
          duration?: number; 
        };
        if (!r.role_name?.trim()) {
          errors.push(`Role ${index + 1}: Role name is required`);
        }
        if ((r.fte_allocation ?? 0) <= 0 || (r.fte_allocation ?? 0) > 1) {
          errors.push(`Role ${index + 1}: FTE allocation must be between 0 and 1`);
        }
        if ((r.start_offset ?? 0) < 0) {
          errors.push(`Role ${index + 1}: Start offset cannot be negative`);
        }
        if ((r.duration ?? 0) <= 0) {
          errors.push(`Role ${index + 1}: Duration must be greater than 0`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(): Promise<{
    usage_count: number;
    recent_usage: Date[];
    success_rate: number;
    average_duration: number;
  }> {
    // This would typically be a separate API endpoint
    // For now, return mock data
    return {
      usage_count: 0,
      recent_usage: [],
      success_rate: 0,
      average_duration: 0
    };
  }

  /**
   * Export template to JSON
   */
  async exportTemplate(templateId: number): Promise<Blob> {
    const template = await this.getTemplate(templateId);
    const exportData = {
      ...template,
      exported_at: new Date().toISOString(),
      version: '1.0'
    };

    return new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
  }

  /**
   * Import template from JSON
   */
  async importTemplate(file: File): Promise<ProjectTemplate> {
    const text = await file.text();
    const templateData = JSON.parse(text);

    // Create clean data for template creation
    const createData: ProjectTemplateCreate = {
      name: templateData.name,
      description: templateData.description,
      category: templateData.category,
      estimated_duration: templateData.estimated_duration,
      complexity: templateData.complexity,
      tags: templateData.tags,
      is_public: templateData.is_public,
      milestones: templateData.milestones || [],
      roles: templateData.roles || []
    };

    return await this.createTemplate(createData);
  }
}

// Export singleton instance
export const templateService = TemplateService.getInstance();