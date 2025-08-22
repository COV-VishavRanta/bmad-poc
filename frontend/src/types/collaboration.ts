/**
 * Collaboration types and interfaces for project communication.
 * 
 * This module defines TypeScript types for comments, activities,
 * documents, and notification functionality.
 */

export enum ActivityType {
  COMMENT = 'comment',
  MILESTONE_CREATED = 'milestone_created',
  MILESTONE_UPDATED = 'milestone_updated',
  MILESTONE_COMPLETED = 'milestone_completed',
  ASSIGNMENT_ADDED = 'assignment_added',
  ASSIGNMENT_REMOVED = 'assignment_removed',
  STATUS_CHANGED = 'status_changed',
  DOCUMENT_UPLOADED = 'document_uploaded',
  DOCUMENT_UPDATED = 'document_updated',
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  READ = 'read',
  DISMISSED = 'dismissed'
}

export enum NotificationType {
  MENTION = 'mention',
  MILESTONE = 'milestone',
  ASSIGNMENT = 'assignment',
  COMMENT = 'comment',
  DEADLINE = 'deadline',
  STATUS_CHANGE = 'status_change'
}

export enum DocumentAccess {
  PUBLIC = 'public',
  PROJECT_TEAM = 'project_team',
  RESTRICTED = 'restricted'
}

export interface CommentUser {
  id: number;
  full_name: string;
  email: string;
  role: string;
}

export interface ProjectComment {
  id: number;
  project_id: number;
  user: CommentUser;
  parent_comment_id?: number;
  content: string;
  content_type: 'text' | 'markdown' | 'html';
  mentions: number[];
  tags: string[];
  is_edited: boolean;
  edited_at?: string;
  is_visible: boolean;
  is_pinned: boolean;
  replies_count: number;
  replies?: ProjectComment[];
  created_at: string;
  updated_at: string;
}

export interface ActivityUser {
  id: number;
  full_name: string;
  email: string;
}

export interface ProjectActivity {
  id: number;
  project_id: number;
  user?: ActivityUser;
  activity_type: ActivityType;
  title: string;
  description?: string;
  entity_type?: string;
  entity_id?: number;
  activity_metadata: Record<string, unknown>;
  is_visible: boolean;
  is_system_generated: boolean;
  created_at: string;
}

export interface ProjectDocument {
  id: number;
  project_id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  version: number;
  uploaded_by: number;
  uploaded_by_name: string;
  folder_id?: number;
  folder_name?: string;
  title?: string;
  description?: string;
  tags: string[];
  access_level: DocumentAccess;
  is_public: boolean;
  is_active: boolean;
  is_archived: boolean;
  file_size_formatted: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentFolder {
  id: number;
  project_id: number;
  parent_folder_id?: number;
  created_by: number;
  created_by_name: string;
  name: string;
  description?: string;
  access_level: DocumentAccess;
  sort_order: number;
  is_active: boolean;
  subfolders_count: number;
  documents_count: number;
  subfolders?: DocumentFolder[];
  created_at: string;
  updated_at: string;
}

export interface NotificationUser {
  id: number;
  full_name: string;
  email: string;
}

export interface ProjectNotification {
  id: number;
  project_id: number;
  project_name: string;
  user: NotificationUser;
  triggered_by_user?: NotificationUser;
  title: string;
  message: string;
  notification_type: NotificationType;
  status: NotificationStatus;
  read_at?: string;
  sent_at?: string;
  entity_type?: string;
  entity_id?: number;
  notification_metadata: Record<string, unknown>;
  send_email: boolean;
  send_push: boolean;
  created_at: string;
  updated_at: string;
}

// Create/Update types
export interface CreateCommentRequest {
  project_id: number;
  parent_comment_id?: number;
  content: string;
  content_type?: 'text' | 'markdown' | 'html';
  mentions?: number[];
  tags?: string[];
}

export interface UpdateCommentRequest {
  content?: string;
  content_type?: 'text' | 'markdown' | 'html';
  mentions?: number[];
  tags?: string[];
  is_pinned?: boolean;
}

export interface CreateActivityRequest {
  project_id: number;
  user_id?: number;
  activity_type: ActivityType;
  title: string;
  description?: string;
  entity_type?: string;
  entity_id?: number;
  activity_metadata?: Record<string, unknown>;
  is_system_generated?: boolean;
}

export interface DocumentUploadRequest {
  project_id: number;
  folder_id?: number;
  title?: string;
  description?: string;
  tags?: string[];
  access_level?: DocumentAccess;
}

export interface UpdateDocumentRequest {
  title?: string;
  description?: string;
  tags?: string[];
  access_level?: DocumentAccess;
  folder_id?: number;
  is_archived?: boolean;
}

export interface CreateFolderRequest {
  project_id: number;
  parent_folder_id?: number;
  name: string;
  description?: string;
  access_level?: DocumentAccess;
}

export interface UpdateFolderRequest {
  name?: string;
  description?: string;
  access_level?: DocumentAccess;
  sort_order?: number;
}

export interface CreateNotificationRequest {
  project_id: number;
  user_id: number;
  triggered_by?: number;
  title: string;
  message: string;
  notification_type: NotificationType;
  entity_type?: string;
  entity_id?: number;
  notification_metadata?: Record<string, unknown>;
  send_email?: boolean;
  send_push?: boolean;
}

export interface UpdateNotificationRequest {
  status?: NotificationStatus;
  send_email?: boolean;
  send_push?: boolean;
}

// Search and filter types
export interface CommentSearchFilters {
  project_id?: number;
  user_id?: number;
  search_text?: string;
  tags?: string[];
  date_from?: string;
  date_to?: string;
  include_replies?: boolean;
  only_pinned?: boolean;
  limit?: number;
  offset?: number;
}

export interface ActivitySearchFilters {
  project_id?: number;
  user_id?: number;
  activity_types?: ActivityType[];
  entity_type?: string;
  date_from?: string;
  date_to?: string;
  include_system?: boolean;
  limit?: number;
  offset?: number;
}

export interface DocumentSearchFilters {
  project_id?: number;
  folder_id?: number;
  search_text?: string;
  file_types?: string[];
  tags?: string[];
  uploaded_by?: number;
  date_from?: string;
  date_to?: string;
  include_archived?: boolean;
  access_levels?: DocumentAccess[];
  limit?: number;
  offset?: number;
}

export interface NotificationSearchFilters {
  user_id?: number;
  project_id?: number;
  notification_types?: NotificationType[];
  status?: NotificationStatus[];
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

// Batch operations
export interface BatchCommentAction {
  comment_ids: number[];
  action: 'delete' | 'pin' | 'unpin' | 'hide' | 'show';
}

export interface BatchNotificationAction {
  notification_ids: number[];
  action: 'mark_read' | 'mark_unread' | 'dismiss' | 'delete';
}

// File upload types
export interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  document?: ProjectDocument;
}

export interface FileUploadOptions {
  project_id: number;
  folder_id?: number;
  title?: string;
  description?: string;
  tags?: string[];
  access_level?: DocumentAccess;
}

// Feed and timeline types
export interface ActivityFeedItem {
  id: number;
  type: 'activity' | 'comment';
  data: ProjectActivity | ProjectComment;
  timestamp: string;
}

export interface ProjectFeed {
  items: ActivityFeedItem[];
  has_more: boolean;
  next_cursor?: string;
}

export interface CommentThread {
  parent_comment: ProjectComment;
  replies: ProjectComment[];
  total_replies: number;
  has_more_replies: boolean;
}

// Real-time update types
export interface RealTimeUpdate {
  type: 'comment_added' | 'comment_updated' | 'comment_deleted' |
        'activity_added' | 'document_uploaded' | 'notification_sent';
  project_id: number;
  data: unknown;
  timestamp: string;
  user_id?: number;
}

export interface WebSocketMessage {
  event: string;
  data: RealTimeUpdate;
}

// Collaboration statistics
export interface CollaborationStats {
  project_id: number;
  total_comments: number;
  total_activities: number;
  total_documents: number;
  active_participants: number;
  recent_activity_count: number;
  last_activity: string;
  engagement_score: number;
}

export interface UserEngagement {
  user_id: number;
  full_name: string;
  comments_count: number;
  documents_uploaded: number;
  activities_count: number;
  last_activity: string;
  engagement_score: number;
}

// API Request/Response types
export interface ProjectCommentCreate {
  content: string;
  parent_id?: number;
}

export interface ProjectCommentUpdate {
  content: string;
}

// Extended types for API responses
export interface ProjectActivityExtended extends ProjectActivity {
  user_id: number;
  user_name?: string;
}

export interface ProjectDocumentExtended extends ProjectDocument {
  name: string;
  description?: string;
}