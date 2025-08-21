import { UserRole } from './auth';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  status: 'active' | 'inactive';
  phone?: string;
  department?: string;
  hire_date?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface UserCreateRequest {
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  department?: string;
  hire_date?: string;
}

export interface UserUpdateRequest {
  full_name?: string;
  phone?: string;
  department?: string;
  hire_date?: string;
}

export interface UserRoleChangeRequest {
  role: UserRole;
}

export interface UserStatusChangeRequest {
  status: 'active' | 'inactive';
}

export interface UserSearchParams {
  search?: string;
  role?: UserRole | 'all';
  status?: 'active' | 'inactive' | 'all';
  page?: number;
  pageSize?: number;
  sortBy?: 'full_name' | 'email' | 'role' | 'created_at' | 'last_login';
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserHistoryEntry {
  id: number;
  action: string;
  changed_fields: string[];
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  changed_by: number;
  changed_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface UserHistoryResponse {
  history: UserHistoryEntry[];
  total: number;
}

export interface BulkOperation {
  operation: 'activate' | 'deactivate' | 'change_role' | 'delete';
  user_ids: number[];
  role?: UserRole;
}

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{ user_id: number; error: string }>;
}

export interface UserInvitation {
  email: string;
  full_name: string;
  role: UserRole;
  department?: string;
}

export interface UserFormData {
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  department?: string;
  hire_date?: string;
}

export interface UserFilterState {
  search: string;
  role: UserRole | 'all';
  status: 'active' | 'inactive' | 'all';
  dateFrom: string;
  dateTo: string;
}

export interface UserTableColumn {
  key: keyof User | 'actions';
  label: string;
  sortable: boolean;
  width?: string;
}

export interface AccessEvent {
  type: 'session' | 'audit';
  timestamp: string;
  event: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  expires_at?: string;
  is_active?: boolean;
  changed_fields?: string[];
  changed_by?: number;
}

export interface UserAccessHistoryResponse {
  user_id: number;
  user_name: string;
  date_range: {
    start: string;
    end: string;
    days: number;
  };
  events: AccessEvent[];
  pagination: {
    page: number;
    page_size: number;
    total_events: number;
    total_sessions: number;
    total_audit_records: number;
  };
}