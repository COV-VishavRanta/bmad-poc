/**
 * Collaboration service for project comments, activities, and documents
 * Handles real-time collaboration features including comments, activity feeds, and document management
 */

import { apiClient } from '@/lib/apiClient';
import {
    DocumentFolder,
    ProjectActivityExtended,
    ProjectComment,
    ProjectCommentCreate,
    ProjectCommentUpdate,
    ProjectDocumentExtended,
    ProjectNotification
} from '@/types/collaboration';

export class CollaborationService {
  private static instance: CollaborationService;

  public static getInstance(): CollaborationService {
    if (!CollaborationService.instance) {
      CollaborationService.instance = new CollaborationService();
    }
    return CollaborationService.instance;
  }

  // Comments API
  /**
   * Get comments for a project
   */
  async getProjectComments(
    projectId: number,
    params?: {
      parentId?: number;
      skip?: number;
      limit?: number;
    }
  ): Promise<ProjectComment[]> {
    const searchParams = new URLSearchParams();
    if (params?.parentId !== undefined) searchParams.append('parent_id', params.parentId.toString());
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());

    return await apiClient.get<ProjectComment[]>(
      `/api/collaboration/projects/${projectId}/comments?${searchParams.toString()}`
    );
  }

  /**
   * Create a new comment
   */
  async createComment(projectId: number, commentData: ProjectCommentCreate): Promise<ProjectComment> {
    return await apiClient.post<ProjectComment>(
      `/api/collaboration/projects/${projectId}/comments`,
      commentData
    );
  }

  /**
   * Update an existing comment
   */
  async updateComment(commentId: number, commentData: ProjectCommentUpdate): Promise<ProjectComment> {
    return await apiClient.put<ProjectComment>(
      `/api/collaboration/comments/${commentId}`,
      commentData
    );
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: number): Promise<void> {
    return await apiClient.delete(`/api/collaboration/comments/${commentId}`);
  }

  /**
   * Get comment thread (parent comment with replies)
   */
  async getCommentThread(projectId: number, parentId: number): Promise<ProjectComment[]> {
    return await this.getProjectComments(projectId, { parentId });
  }

  // Activity API
  /**
   * Get project activity feed
   */
  async getProjectActivity(
    projectId: number,
    params?: {
      skip?: number;
      limit?: number;
    }
  ): Promise<ProjectActivityExtended[]> {
    const searchParams = new URLSearchParams();
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());

    return await apiClient.get<ProjectActivityExtended[]>(
      `/api/collaboration/projects/${projectId}/activity?${searchParams.toString()}`
    );
  }

  /**
   * Get live activity updates (for real-time features)
   */
  async getLiveActivity(
    projectId: number,
    since?: Date
  ): Promise<ProjectActivityExtended[]> {
    const searchParams = new URLSearchParams();
    if (since) searchParams.append('since', since.toISOString());

    return await apiClient.get<ProjectActivityExtended[]>(
      `/api/collaboration/projects/${projectId}/live-activity?${searchParams.toString()}`
    );
  }

  // Documents API
  /**
   * Get project documents
   */
  async getProjectDocuments(
    projectId: number,
    params?: {
      folderId?: number;
      skip?: number;
      limit?: number;
    }
  ): Promise<ProjectDocumentExtended[]> {
    const searchParams = new URLSearchParams();
    if (params?.folderId !== undefined) searchParams.append('folder_id', params.folderId.toString());
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());

    return await apiClient.get<ProjectDocumentExtended[]>(
      `/api/collaboration/projects/${projectId}/documents?${searchParams.toString()}`
    );
  }

  /**
   * Upload a document to a project
   */
  async uploadDocument(
    projectId: number,
    file: File,
    options?: {
      folderId?: number;
      description?: string;
    }
  ): Promise<{ message: string; document_id: number; file_path: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options?.folderId !== undefined) {
      formData.append('folder_id', options.folderId.toString());
    }
    if (options?.description) {
      formData.append('description', options.description);
    }

    // Use native fetch for file upload since apiClient might not handle FormData correctly
    const response = await fetch(`/api/collaboration/projects/${projectId}/documents/upload`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header, let browser set it with boundary
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: number): Promise<void> {
    return await apiClient.delete(`/api/collaboration/documents/${documentId}`);
  }

  // Folders API
  /**
   * Get project folders
   */
  async getProjectFolders(projectId: number): Promise<DocumentFolder[]> {
    return await apiClient.get<DocumentFolder[]>(
      `/api/collaboration/projects/${projectId}/folders`
    );
  }

  /**
   * Create a new folder
   */
  async createFolder(
    projectId: number,
    folderData: { name: string; description?: string }
  ): Promise<DocumentFolder> {
    return await apiClient.post<DocumentFolder>(
      `/api/collaboration/projects/${projectId}/folders`,
      folderData
    );
  }

  // Notifications API
  /**
   * Get user notifications
   */
  async getNotifications(params?: {
    unreadOnly?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<ProjectNotification[]> {
    const searchParams = new URLSearchParams();
    if (params?.unreadOnly !== undefined) searchParams.append('unread_only', params.unreadOnly.toString());
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());

    return await apiClient.get<ProjectNotification[]>(
      `/api/collaboration/notifications?${searchParams.toString()}`
    );
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: number): Promise<void> {
    return await apiClient.put(`/api/collaboration/notifications/${notificationId}/read`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(): Promise<void> {
    return await apiClient.put('/api/collaboration/notifications/read-all');
  }

  // Utility methods
  /**
   * Get collaboration summary for a project
   */
  async getCollaborationSummary(projectId: number): Promise<{
    total_comments: number;
    total_activities: number;
    total_documents: number;
    recent_activities: ProjectActivityExtended[];
    active_collaborators: Array<{ id: number; name: string; last_active: string }>;
  }> {
    // This would typically be a dedicated endpoint
    const [comments, activities, documents] = await Promise.all([
      this.getProjectComments(projectId, { limit: 1000 }),
      this.getProjectActivity(projectId, { limit: 10 }),
      this.getProjectDocuments(projectId, { limit: 1000 })
    ]);

    // Calculate active collaborators from recent activities
    const activeUsers = new Map();
    activities.forEach(activity => {
      if (activity.user_name) {
        activeUsers.set(activity.user_id, {
          id: activity.user_id,
          name: activity.user_name,
          last_active: activity.created_at
        });
      }
    });

    return {
      total_comments: comments.length,
      total_activities: activities.length,
      total_documents: documents.length,
      recent_activities: activities.slice(0, 5),
      active_collaborators: Array.from(activeUsers.values())
    };
  }

  /**
   * Search across comments and documents
   */
  async searchCollaboration(
    projectId: number,
    query: string
  ): Promise<{
    comments: ProjectComment[];
    documents: ProjectDocumentExtended[];
  }> {
    // This would typically be a dedicated search endpoint
    const [comments, documents] = await Promise.all([
      this.getProjectComments(projectId, { limit: 1000 }),
      this.getProjectDocuments(projectId, { limit: 1000 })
    ]);

    const queryLower = query.toLowerCase();

    return {
      comments: comments.filter(comment =>
        comment.content.toLowerCase().includes(queryLower)
      ),
      documents: documents.filter(doc =>
        doc.name.toLowerCase().includes(queryLower) ||
        (doc.description && doc.description.toLowerCase().includes(queryLower))
      )
    };
  }

  /**
   * Get document download URL
   */
  getDocumentDownloadUrl(documentId: number): string {
    return `/api/collaboration/documents/${documentId}/download`;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file type icon based on MIME type
   */
  getFileTypeIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📈';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
    if (mimeType.includes('text/')) return '📄';
    return '📎';
  }

  /**
   * Format activity description for display
   */
  formatActivityDescription(activity: ProjectActivityExtended): string {
    const timeAgo = this.getTimeAgo(new Date(activity.created_at));
    return `${activity.user_name || 'User'} ${activity.description} ${timeAgo}`;
  }

  /**
   * Get time ago string
   */
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }
}

// Export singleton instance
export const collaborationService = CollaborationService.getInstance();