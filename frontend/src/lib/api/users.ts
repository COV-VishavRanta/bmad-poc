import {
    BulkOperation,
    BulkOperationResult,
    User,
    UserAccessHistoryResponse,
    UserCreateRequest,
    UserHistoryResponse,
    UserInvitation,
    UserListResponse,
    UserRoleChangeRequest,
    UserSearchParams,
    UserStatusChangeRequest,
    UserUpdateRequest,
} from '@/types/users';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class UserApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public field?: string
  ) {
    super(message);
    this.name = 'UserApiError';
  }
}

class UserApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    
    const config: RequestInit = {
      credentials: 'include', // Include cookies for session-based auth
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new UserApiError(
          errorData.message || errorData.detail || 'An error occurred',
          response.status,
          errorData.code,
          errorData.field
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof UserApiError) {
        throw error;
      }
      throw new UserApiError('Network error occurred');
    }
  }

  private buildQueryString(params: Record<string, unknown>): string {
    const filteredParams = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, String(value)]);
    
    return new URLSearchParams(filteredParams).toString();
  }

  async getUsers(params: UserSearchParams = {}): Promise<UserListResponse> {
    const queryString = this.buildQueryString(params as Record<string, unknown>);
    const endpoint = queryString ? `/api/users?${queryString}` : '/api/users';
    return this.request<UserListResponse>(endpoint);
  }

  async getUserById(id: number): Promise<User> {
    return this.request<User>(`/api/users/${id}`);
  }

  async createUser(userData: UserCreateRequest): Promise<User> {
    return this.request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: number, userData: UserUpdateRequest): Promise<User> {
    return this.request<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: number): Promise<void> {
    return this.request<void>(`/api/users/${id}`, {
      method: 'DELETE',
    });
  }

  async changeUserRole(id: number, roleData: UserRoleChangeRequest): Promise<User> {
    return this.request<User>(`/api/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    });
  }

  async changeUserStatus(id: number, statusData: UserStatusChangeRequest): Promise<User> {
    return this.request<User>(`/api/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    });
  }

  async getUserHistory(id: number): Promise<UserHistoryResponse> {
    return this.request<UserHistoryResponse>(`/api/users/${id}/history`);
  }

  async getUserAccessHistory(
    id: number, 
    params: { days?: number; page?: number; pageSize?: number } = {}
  ): Promise<UserAccessHistoryResponse> {
    const queryString = this.buildQueryString(params as Record<string, unknown>);
    const endpoint = queryString ? `/api/users/${id}/access-history?${queryString}` : `/api/users/${id}/access-history`;
    return this.request<UserAccessHistoryResponse>(endpoint);
  }

  async bulkOperations(operation: BulkOperation): Promise<BulkOperationResult> {
    return this.request<BulkOperationResult>('/api/users/bulk', {
      method: 'POST',
      body: JSON.stringify(operation),
    });
  }

  async inviteUser(invitation: UserInvitation): Promise<User> {
    return this.request<User>('/api/users/invite', {
      method: 'POST',
      body: JSON.stringify(invitation),
    });
  }

  async resendInvitation(userId: number): Promise<void> {
    return this.request<void>(`/api/users/${userId}/resend-invitation`, {
      method: 'POST',
    });
  }

  async resetPassword(userId: number): Promise<{ temporary_password: string }> {
    return this.request<{ temporary_password: string }>(`/api/users/${userId}/reset-password`, {
      method: 'POST',
    });
  }

  async exportUsers(params: UserSearchParams = {}): Promise<Blob> {
    const queryString = this.buildQueryString(params as Record<string, unknown>);
    const endpoint = queryString ? `/api/users/export?${queryString}` : '/api/users/export';
    
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Accept': 'text/csv',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new UserApiError(
        errorData.message || errorData.detail || 'Export failed',
        response.status
      );
    }

    return response.blob();
  }
}

export const userApi = new UserApiClient();
export { UserApiError };
