import {
    BulkOperationResult,
    BulkProjectOperation,
    CreateAssignmentData,
    CreateProjectData,
    Project,
    ProjectAssignment,
    ProjectHistory,
    ProjectListResponse,
    ProjectSearchParams,
    ProjectStatus,
    ProjectWithDetails,
    UpdateAssignmentData,
    UpdateProjectData,
} from '@/types/project';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ProjectStore {
  // State
  projects: Project[];
  currentProject: ProjectWithDetails | null;
  isLoading: boolean;
  error: string | null;
  searchParams: ProjectSearchParams;
  totalPages: number;
  totalCount: number;
  
  // Project history and assignments
  projectHistory: ProjectHistory[];
  projectAssignments: ProjectAssignment[];
  isLoadingHistory: boolean;
  isLoadingAssignments: boolean;

  // Bulk operations
  selectedProjects: number[];
  isBulkOperationInProgress: boolean;

  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (data: CreateProjectData) => Promise<void>;
  updateProject: (id: number, data: UpdateProjectData) => Promise<void>;
  updateProjectOptimistic: (id: number, data: UpdateProjectData) => Promise<void>;
  rollbackProjectUpdate: (id: number, originalData: Project) => void;
  changeProjectStatus: (id: number, status: ProjectStatus, reason?: string) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  fetchProjectById: (id: number) => Promise<void>;
  fetchProjectHistory: (id: number) => Promise<void>;
  fetchProjectAssignments: (id: number) => Promise<void>;
  
  // Assignment management
  addAssignment: (projectId: number, data: CreateAssignmentData) => Promise<void>;
  updateAssignment: (id: number, data: UpdateAssignmentData) => Promise<void>;
  removeAssignment: (id: number) => Promise<void>;
  
  // Search and filtering
  setSearchParams: (params: Partial<ProjectSearchParams>) => void;
  resetSearchParams: () => void;
  
  // Bulk operations
  setSelectedProjects: (projectIds: number[]) => void;
  toggleProjectSelection: (projectId: number) => void;
  selectAllProjects: () => void;
  clearProjectSelection: () => void;
  performBulkOperation: (operation: BulkProjectOperation) => Promise<BulkOperationResult>;
  
  // UI state management
  setCurrentProject: (project: ProjectWithDetails | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const initialSearchParams: ProjectSearchParams = {
  search: '',
  status: 'all',
  projectType: 'all',
  page: 1,
  pageSize: 10,
  sortBy: 'name',
  sortOrder: 'asc',
};

export const useProjectStore = create<ProjectStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      projects: [],
      currentProject: null,
      isLoading: false,
      error: null,
      searchParams: initialSearchParams,
      totalPages: 0,
      totalCount: 0,
      projectHistory: [],
      projectAssignments: [],
      isLoadingHistory: false,
      isLoadingAssignments: false,
      selectedProjects: [],
      isBulkOperationInProgress: false,

      // Actions
      fetchProjects: async () => {
        set({ isLoading: true, error: null });
        try {
          const params = get().searchParams;
          const queryParams = new URLSearchParams();
          
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== '' && value !== 'all') {
              queryParams.append(key, value.toString());
            }
          });

          const response = await fetch(`/api/projects?${queryParams.toString()}`);
          if (!response.ok) {
            throw new Error('Failed to fetch projects');
          }

          const data: ProjectListResponse = await response.json();
          set({
            projects: data.projects,
            totalPages: data.totalPages,
            totalCount: data.total,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      createProject: async (data: CreateProjectData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to create project');
          }

          // Refresh the project list
          await get().fetchProjects();
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
          throw error;
        }
      },

      updateProject: async (id: number, data: UpdateProjectData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/projects/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to update project');
          }

          // Update the current project if it's the one being edited
          const currentProject = get().currentProject;
          if (currentProject && currentProject.id === id) {
            const updatedProject = await response.json();
            set({ currentProject: updatedProject });
          }

          // Refresh the project list
          await get().fetchProjects();
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
          throw error;
        }
      },

      updateProjectOptimistic: async (id: number, data: UpdateProjectData) => {
        const { projects, currentProject } = get();
        
        // Store original data for rollback
        const originalProject = projects.find(p => p.id === id);
        if (!originalProject) return;

        // Apply optimistic update
        const optimisticProject: Project = {
          ...originalProject,
          ...data,
          updatedAt: new Date().toISOString(),
        };

        // Update UI immediately
        set({
          projects: projects.map(p => p.id === id ? optimisticProject : p),
          currentProject: currentProject?.id === id ? { ...currentProject, ...optimisticProject } : currentProject,
        });

        try {
          const response = await fetch(`/api/projects/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            // Rollback on error
            get().rollbackProjectUpdate(id, originalProject);
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to update project');
          }

          // Confirm update with server response
          const updatedProject = await response.json();
          set({
            projects: projects.map(p => p.id === id ? updatedProject : p),
            currentProject: currentProject?.id === id ? { ...currentProject, ...updatedProject } : currentProject,
          });

        } catch (error) {
          // Rollback already handled above for HTTP errors
          // This catch is for network errors
          if (error instanceof Error && !error.message.includes('Failed to update project')) {
            get().rollbackProjectUpdate(id, originalProject);
          }
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        }
      },

      rollbackProjectUpdate: (id: number, originalData: Project) => {
        const { projects, currentProject } = get();
        set({
          projects: projects.map(p => p.id === id ? originalData : p),
          currentProject: currentProject?.id === id ? { ...currentProject, ...originalData } : currentProject,
        });
      },

      changeProjectStatus: async (id: number, status: ProjectStatus, reason?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/projects/${id}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status, reason }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to change project status');
          }

          // Refresh the project list
          await get().fetchProjects();
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
          throw error;
        }
      },

      deleteProject: async (id: number) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/projects/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to delete project');
          }

          // Remove from selected projects if it was selected
          const selectedProjects = get().selectedProjects.filter(pid => pid !== id);
          set({ selectedProjects });

          // Refresh the project list
          await get().fetchProjects();
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
          throw error;
        }
      },

      fetchProjectById: async (id: number) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/projects/${id}`);
          if (!response.ok) {
            throw new Error('Failed to fetch project');
          }

          const project: ProjectWithDetails = await response.json();
          set({ currentProject: project, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      fetchProjectHistory: async (id: number) => {
        set({ isLoadingHistory: true, error: null });
        try {
          const response = await fetch(`/api/projects/${id}/history`);
          if (!response.ok) {
            throw new Error('Failed to fetch project history');
          }

          const history: ProjectHistory[] = await response.json();
          set({ projectHistory: history, isLoadingHistory: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoadingHistory: false,
          });
        }
      },

      fetchProjectAssignments: async (id: number) => {
        set({ isLoadingAssignments: true, error: null });
        try {
          const response = await fetch(`/api/projects/${id}/assignments`);
          if (!response.ok) {
            throw new Error('Failed to fetch project assignments');
          }

          const assignments: ProjectAssignment[] = await response.json();
          set({ projectAssignments: assignments, isLoadingAssignments: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoadingAssignments: false,
          });
        }
      },

      addAssignment: async (projectId: number, data: CreateAssignmentData) => {
        set({ isLoadingAssignments: true, error: null });
        try {
          const response = await fetch(`/api/projects/${projectId}/assignments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to add assignment');
          }

          // Refresh assignments
          await get().fetchProjectAssignments(projectId);
          // Refresh project to update FTE totals
          await get().fetchProjectById(projectId);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoadingAssignments: false,
          });
          throw error;
        }
      },

      updateAssignment: async (id: number, data: UpdateAssignmentData) => {
        set({ isLoadingAssignments: true, error: null });
        try {
          const response = await fetch(`/api/assignments/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to update assignment');
          }

          // Find the assignment to get project ID
          const assignment = get().projectAssignments.find(a => a.id === id);
          if (assignment) {
            await get().fetchProjectAssignments(assignment.projectId);
            await get().fetchProjectById(assignment.projectId);
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoadingAssignments: false,
          });
          throw error;
        }
      },

      removeAssignment: async (id: number) => {
        set({ isLoadingAssignments: true, error: null });
        try {
          const response = await fetch(`/api/assignments/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to remove assignment');
          }

          // Find the assignment to get project ID
          const assignment = get().projectAssignments.find(a => a.id === id);
          if (assignment) {
            await get().fetchProjectAssignments(assignment.projectId);
            await get().fetchProjectById(assignment.projectId);
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoadingAssignments: false,
          });
          throw error;
        }
      },

      setSearchParams: (params: Partial<ProjectSearchParams>) => {
        const currentParams = get().searchParams;
        const newParams = { ...currentParams, ...params };
        
        // Reset to page 1 when search criteria change (except for page changes)
        if (!params.page) {
          newParams.page = 1;
        }
        
        set({ searchParams: newParams });
      },

      resetSearchParams: () => {
        set({ searchParams: initialSearchParams });
      },

      setSelectedProjects: (projectIds: number[]) => {
        set({ selectedProjects: projectIds });
      },

      toggleProjectSelection: (projectId: number) => {
        const { selectedProjects } = get();
        const newSelection = selectedProjects.includes(projectId)
          ? selectedProjects.filter(id => id !== projectId)
          : [...selectedProjects, projectId];
        set({ selectedProjects: newSelection });
      },

      selectAllProjects: () => {
        const projectIds = get().projects.map(p => p.id);
        set({ selectedProjects: projectIds });
      },

      clearProjectSelection: () => {
        set({ selectedProjects: [] });
      },

      performBulkOperation: async (operation: BulkProjectOperation): Promise<BulkOperationResult> => {
        set({ isBulkOperationInProgress: true, error: null });
        try {
          const response = await fetch('/api/projects/bulk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(operation),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Bulk operation failed');
          }

          const result: BulkOperationResult = await response.json();
          
          // Refresh project list after bulk operation
          await get().fetchProjects();
          
          // Clear selection after operation
          set({ selectedProjects: [], isBulkOperationInProgress: false });
          
          return result;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isBulkOperationInProgress: false,
          });
          throw error;
        }
      },

      setCurrentProject: (project: ProjectWithDetails | null) => {
        set({ currentProject: project });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'project-store',
    }
  )
);