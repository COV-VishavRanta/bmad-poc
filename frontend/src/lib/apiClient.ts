/**
 * Base API client for making HTTP requests to the backend.
 * 
 * This module provides a centralized API client with authentication,
 * error handling, and request/response intercepting.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class BaseApiClient {
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
        throw new ApiError(
          errorData.detail?.message || errorData.message || 'An error occurred',
          response.status,
          errorData.detail?.code || errorData.code,
          errorData.detail?.field || errorData.field
        );
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return undefined as T;
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error occurred');
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = params 
      ? `${endpoint}?${new URLSearchParams(params).toString()}`
      : endpoint;
    return this.request<T>(url);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH', 
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  async uploadFile<T>(
    endpoint: string, 
    file: File, 
    additionalFields?: Record<string, string>
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalFields) {
      Object.entries(additionalFields).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const url = `${API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.detail?.message || errorData.message || 'Upload failed',
        response.status,
        errorData.detail?.code || errorData.code
      );
    }

    return response.json();
  }

  async downloadFile(endpoint: string, filename?: string): Promise<Blob> {
    const url = `${API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new ApiError('Download failed', response.status);
    }

    const blob = await response.blob();
    
    // If filename is provided and browser supports it, trigger download
    if (filename && typeof window !== 'undefined') {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }

    return blob;
  }
}

export const apiClient = new BaseApiClient();