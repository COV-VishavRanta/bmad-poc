import { AuthResponse, LoginCredentials, User } from '@/types/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class AuthApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public field?: string
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

class AuthApiClient {
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
        throw new AuthApiError(
          errorData.message || 'An error occurred',
          response.status,
          errorData.code,
          errorData.field
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof AuthApiError) {
        throw error;
      }
      throw new AuthApiError('Network error occurred');
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(): Promise<void> {
    return this.request<void>('/api/auth/logout', {
      method: 'POST',
    });
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<{ user: User }>('/api/auth/me');
    return response.user;
  }

  async refreshSession(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
    });
  }

  async checkHealth(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/api/health');
  }
}

export const authApi = new AuthApiClient();
export { AuthApiError };
