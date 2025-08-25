/**
 * Client management TypeScript type definitions.
 * 
 * Defines interfaces and types for client-related data structures,
 * API requests, and responses.
 */

export enum ClientType {
  CUSTOMER = 'Customer',
  PARTNER = 'Partner',
  INTERNAL = 'Internal'
}

export enum ClientStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive'
}

export enum HistoryAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  DEACTIVATE = 'DEACTIVATE'
}

export interface ClientBase {
  name: string;
  client_type: ClientType;
  status: ClientStatus;
  relation_type: string;
  project_mgmt_tool?: string;
  comments?: string;
}

export interface Client extends ClientBase {
  id: number;
  created_at: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface ClientCreate extends ClientBase {}

export interface ClientUpdate {
  name?: string;
  client_type?: ClientType;
  status?: ClientStatus;
  relation_type?: string;
  project_mgmt_tool?: string;
  comments?: string;
}

export interface ClientHistoryEntry {
  id: number;
  action: HistoryAction;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changed_by: number;
  changed_at: string;
}

export interface ClientWithHistory extends Client {
  history: ClientHistoryEntry[];
}

export interface ClientListResponse {
  clients: Client[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ClientSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  client_type?: ClientType;
  status?: ClientStatus;
}

export interface ClientFormData {
  name: string;
  client_type: ClientType;
  status: ClientStatus;
  relation_type: string;
  project_mgmt_tool: string;
  comments: string;
}

export interface ClientPermissions {
  can_create: boolean;
  can_read_all: boolean;
  can_update_all: boolean;
  can_delete: boolean;
  can_view_audit: boolean;
}