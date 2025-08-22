import {
    BulkGroupOperation,
    BulkGroupOperationResult,
    BulkProjectAssignmentRequest,
    BulkProjectAssignmentResponse,
    CreateGroupData,
    Group,
    GroupAnalytics,
    GroupHistory,
    GroupHistoryListResponse,
    GroupListResponse,
    GroupProject,
    GroupSearchParams,
    GroupStatus,
    GroupTimeline,
    GroupWithDetails,
    UpdateGroupData,
} from '@/types/group';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface GroupStore {
  // State
  groups: Group[];
  currentGroup: GroupWithDetails | null;
  isLoading: boolean;
  error: string | null;
  searchParams: GroupSearchParams;
  totalPages: number;
  totalCount: number;
  
  // Group history and projects
  groupHistory: GroupHistory[];
  groupProjects: GroupProject[];
  groupAnalytics: GroupAnalytics | null;
  groupTimeline: GroupTimeline | null;
  isLoadingHistory: boolean;
  isLoadingProjects: boolean;
  isLoadingAnalytics: boolean;
  isLoadingTimeline: boolean;

  // Bulk operations
  selectedGroups: number[];
  isBulkOperationInProgress: boolean;

  // Actions
  fetchGroups: () => Promise<void>;
  createGroup: (data: CreateGroupData) => Promise<void>;
  updateGroup: (id: number, data: UpdateGroupData) => Promise<void>;
  updateGroupOptimistic: (id: number, data: UpdateGroupData) => Promise<void>;
  rollbackGroupUpdate: (id: number, originalData: Group) => void;
  changeGroupStatus: (id: number, status: GroupStatus, reason?: string) => Promise<void>;
  deleteGroup: (id: number) => Promise<void>;
  fetchGroupById: (id: number, includeProjects?: boolean) => Promise<void>;
  fetchGroupHistory: (id: number, page?: number, pageSize?: number) => Promise<void>;
  fetchGroupProjects: (id: number) => Promise<void>;
  fetchGroupAnalytics: (id: number) => Promise<void>;
  fetchGroupTimeline: (id: number) => Promise<void>;
  
  // Project assignment management
  addProjectToGroup: (groupId: number, projectId: number) => Promise<void>;
  removeProjectFromGroup: (groupId: number, projectId: number) => Promise<void>;
  bulkAssignProjects: (groupId: number, data: BulkProjectAssignmentRequest) => Promise<BulkProjectAssignmentResponse>;
  
  // Search and filtering
  setSearchParams: (params: Partial<GroupSearchParams>) => void;
  resetSearchParams: () => void;
  
  // Bulk operations
  setSelectedGroups: (groupIds: number[]) => void;
  toggleGroupSelection: (groupId: number) => void;
  selectAllGroups: () => void;
  clearGroupSelection: () => void;
  performBulkOperation: (operation: BulkGroupOperation) => Promise<BulkGroupOperationResult>;
  
  // UI state management
  setCurrentGroup: (group: GroupWithDetails | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const initialSearchParams: GroupSearchParams = {
  search: '',
  status: 'all',
  page: 1,
  pageSize: 10,
  sortBy: 'name',
  sortOrder: 'asc',
};

export const useGroupStore = create<GroupStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      groups: [],
      currentGroup: null,
      isLoading: false,
      error: null,
      searchParams: initialSearchParams,
      totalPages: 0,
      totalCount: 0,
      groupHistory: [],
      groupProjects: [],
      groupAnalytics: null,
      groupTimeline: null,
      isLoadingHistory: false,
      isLoadingProjects: false,
      isLoadingAnalytics: false,
      isLoadingTimeline: false,
      selectedGroups: [],
      isBulkOperationInProgress: false,

      // Actions
      fetchGroups: async () => {
        set({ isLoading: true, error: null });
        try {
          const { searchParams } = get();
          const queryParams = new URLSearchParams();

          Object.entries(searchParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '' && value !== 'all') {
              queryParams.append(key, String(value));
            }
          });

          const response = await fetch(`/api/groups?${queryParams.toString()}`, {
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch groups: ${response.statusText}`);
          }

          const data: GroupListResponse = await response.json();
          
          set({
            groups: data.groups,
            totalPages: data.totalPages,
            totalCount: data.total,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch groups',
            isLoading: false,
          });
        }
      },

      createGroup: async (data: CreateGroupData) => {
        set({ error: null });
        try {
          const response = await fetch('/api/groups', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to create group: ${response.statusText}`);
          }

          // Refresh groups list
          await get().fetchGroups();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create group',
          });
          throw error;
        }
      },

      updateGroup: async (id: number, data: UpdateGroupData) => {
        set({ error: null });
        try {
          const response = await fetch(`/api/groups/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to update group: ${response.statusText}`);
          }

          // Refresh groups list and current group if it's the one being updated
          await get().fetchGroups();
          const { currentGroup } = get();
          if (currentGroup && currentGroup.id === id) {
            await get().fetchGroupById(id, true);
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update group',
          });
          throw error;
        }
      },

      updateGroupOptimistic: async (id: number, data: UpdateGroupData) => {
        const { groups, currentGroup } = get();
        
        // Store original data for rollback
        const originalGroup = groups.find(g => g.id === id);
        if (!originalGroup) return;

        // Apply optimistic update
        const updatedGroups = groups.map(group =>
          group.id === id ? { ...group, ...data } : group
        );
        
        const updatedCurrentGroup = currentGroup && currentGroup.id === id
          ? { ...currentGroup, ...data }
          : currentGroup;

        set({
          groups: updatedGroups,
          currentGroup: updatedCurrentGroup,
        });

        try {
          await get().updateGroup(id, data);
        } catch (error) {
          // Rollback on error
          get().rollbackGroupUpdate(id, originalGroup);
          throw error;
        }
      },

      rollbackGroupUpdate: (id: number, originalData: Group) => {
        const { groups, currentGroup } = get();
        
        const rolledBackGroups = groups.map(group =>
          group.id === id ? originalData : group
        );
        
        const rolledBackCurrentGroup = currentGroup && currentGroup.id === id
          ? { ...currentGroup, ...originalData }
          : currentGroup;

        set({
          groups: rolledBackGroups,
          currentGroup: rolledBackCurrentGroup,
        });
      },

      changeGroupStatus: async (id: number, status: GroupStatus, reason?: string) => {
        set({ error: null });
        try {
          const response = await fetch(`/api/groups/${id}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ status, reason }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to update group status: ${response.statusText}`);
          }

          // Refresh groups list
          await get().fetchGroups();
          const { currentGroup } = get();
          if (currentGroup && currentGroup.id === id) {
            await get().fetchGroupById(id, true);
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update group status',
          });
          throw error;
        }
      },

      deleteGroup: async (id: number) => {
        set({ error: null });
        try {
          const response = await fetch(`/api/groups/${id}`, {
            method: 'DELETE',
            credentials: 'include',
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to delete group: ${response.statusText}`);
          }

          // Refresh groups list
          await get().fetchGroups();
          
          // Clear current group if it was the deleted one
          const { currentGroup } = get();
          if (currentGroup && currentGroup.id === id) {
            set({ currentGroup: null });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete group',
          });
          throw error;
        }
      },

      fetchGroupById: async (id: number, includeProjects = false) => {
        set({ isLoading: true, error: null });
        try {
          const queryParams = includeProjects ? '?include_projects=true' : '';
          const response = await fetch(`/api/groups/${id}${queryParams}`, {
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch group: ${response.statusText}`);
          }

          const groupData: GroupWithDetails = await response.json();
          
          set({
            currentGroup: groupData,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch group',
            isLoading: false,
          });
        }
      },

      fetchGroupHistory: async (id: number, page = 1, pageSize = 20) => {
        set({ isLoadingHistory: true, error: null });
        try {
          const response = await fetch(`/api/groups/${id}/history?page=${page}&page_size=${pageSize}`, {
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch group history: ${response.statusText}`);
          }

          const data: GroupHistoryListResponse = await response.json();
          
          set({
            groupHistory: data.history,
            isLoadingHistory: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch group history',
            isLoadingHistory: false,
          });
        }
      },

      fetchGroupProjects: async (id: number) => {
        set({ isLoadingProjects: true, error: null });
        try {
          const response = await fetch(`/api/groups/${id}/projects`, {
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch group projects: ${response.statusText}`);
          }

          const projects: GroupProject[] = await response.json();
          
          set({
            groupProjects: projects,
            isLoadingProjects: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch group projects',
            isLoadingProjects: false,
          });
        }
      },

      fetchGroupAnalytics: async (id: number) => {
        set({ isLoadingAnalytics: true, error: null });
        try {
          const response = await fetch(`/api/groups/${id}/analytics`, {
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch group analytics: ${response.statusText}`);
          }

          const analytics: GroupAnalytics = await response.json();
          
          set({
            groupAnalytics: analytics,
            isLoadingAnalytics: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch group analytics',
            isLoadingAnalytics: false,
          });
        }
      },

      fetchGroupTimeline: async (id: number) => {
        set({ isLoadingTimeline: true, error: null });
        try {
          // Note: This would be implemented when timeline API is available
          // For now, we'll simulate the structure
          const timeline: GroupTimeline = {
            groupId: id,
            groupDateRange: ['2024-01-01', '2024-12-31'],
            projects: [],
            milestones: [],
            dependencies: [],
            conflictAreas: [],
          };
          
          set({
            groupTimeline: timeline,
            isLoadingTimeline: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch group timeline',
            isLoadingTimeline: false,
          });
        }
      },

      addProjectToGroup: async (groupId: number, projectId: number) => {
        set({ error: null });
        try {
          const response = await fetch(`/api/groups/${groupId}/projects/${projectId}`, {
            method: 'POST',
            credentials: 'include',
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to add project to group: ${response.statusText}`);
          }

          // Refresh group projects
          await get().fetchGroupProjects(groupId);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add project to group',
          });
          throw error;
        }
      },

      removeProjectFromGroup: async (groupId: number, projectId: number) => {
        set({ error: null });
        try {
          const response = await fetch(`/api/groups/${groupId}/projects/${projectId}`, {
            method: 'DELETE',
            credentials: 'include',
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to remove project from group: ${response.statusText}`);
          }

          // Refresh group projects
          await get().fetchGroupProjects(groupId);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to remove project from group',
          });
          throw error;
        }
      },

      bulkAssignProjects: async (groupId: number, data: BulkProjectAssignmentRequest) => {
        set({ error: null });
        try {
          const response = await fetch(`/api/groups/${groupId}/projects/bulk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to bulk assign projects: ${response.statusText}`);
          }

          const result: BulkProjectAssignmentResponse = await response.json();
          
          // Refresh group projects
          await get().fetchGroupProjects(groupId);
          
          return result;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to bulk assign projects',
          });
          throw error;
        }
      },

      setSearchParams: (params: Partial<GroupSearchParams>) => {
        set(state => ({
          searchParams: { ...state.searchParams, ...params, page: 1 },
        }));
      },

      resetSearchParams: () => {
        set({ searchParams: initialSearchParams });
      },

      setSelectedGroups: (groupIds: number[]) => {
        set({ selectedGroups: groupIds });
      },

      toggleGroupSelection: (groupId: number) => {
        set(state => ({
          selectedGroups: state.selectedGroups.includes(groupId)
            ? state.selectedGroups.filter(id => id !== groupId)
            : [...state.selectedGroups, groupId],
        }));
      },

      selectAllGroups: () => {
        const { groups } = get();
        set({ selectedGroups: groups.map(g => g.id) });
      },

      clearGroupSelection: () => {
        set({ selectedGroups: [] });
      },

      performBulkOperation: async (operation: BulkGroupOperation) => {
        set({ isBulkOperationInProgress: true, error: null });
        try {
          const response = await fetch('/api/groups/bulk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(operation),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to perform bulk operation: ${response.statusText}`);
          }

          const result: BulkGroupOperationResult = await response.json();
          
          // Refresh groups list after bulk operation
          await get().fetchGroups();
          
          // Clear selection
          set({ selectedGroups: [] });
          
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to perform bulk operation';
          set({ error: errorMessage });
          throw error;
        } finally {
          set({ isBulkOperationInProgress: false });
        }
      },

      setCurrentGroup: (group: GroupWithDetails | null) => {
        set({ currentGroup: group });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'group-store',
    }
  )
);