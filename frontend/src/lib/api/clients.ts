import {
    ClientActivity,
    ClientContact,
    ClientWithContacts,
    ClientWithDetails,
    CreateContactData,
    UpdateContactData,
} from '@/types/client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ClientApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ClientApiError';
  }
}

class ClientApiClient {
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
        throw new ClientApiError(
          errorData.detail?.message || errorData.message || 'An error occurred',
          response.status,
          errorData.detail?.code || errorData.code,
          errorData.detail?.field || errorData.field
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ClientApiError) {
        throw error;
      }
      throw new ClientApiError('Network error occurred');
    }
  }

  // Client Details
  async getClientDetails(clientId: number): Promise<ClientWithDetails> {
    const client = await this.request<ClientWithContacts>(`/api/clients/${clientId}`);
    const activities = await this.getClientActivities(clientId);
    
    return {
      ...client,
      activities,
    };
  }

  // Contact Management
  async getClientContacts(clientId: number): Promise<ClientContact[]> {
    return this.request<ClientContact[]>(`/api/clients/${clientId}/contacts`);
  }

  async createContact(clientId: number, contactData: CreateContactData): Promise<ClientContact> {
    return this.request<ClientContact>(`/api/clients/${clientId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
  }

  async updateContact(clientId: number, contactId: number, contactData: UpdateContactData): Promise<ClientContact> {
    return this.request<ClientContact>(`/api/clients/${clientId}/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(contactData),
    });
  }

  async deleteContact(clientId: number, contactId: number): Promise<void> {
    await this.request<void>(`/api/clients/${clientId}/contacts/${contactId}`, {
      method: 'DELETE',
    });
  }

  async setPrimaryContact(clientId: number, contactId: number): Promise<ClientContact> {
    return this.request<ClientContact>(`/api/clients/${clientId}/contacts/${contactId}/primary`, {
      method: 'PUT',
    });
  }

  // Client Activities (placeholder - would need backend implementation)
  async getClientActivities(clientId: number): Promise<ClientActivity[]> {
    try {
      return await this.request<ClientActivity[]>(`/api/clients/${clientId}/activities`);
    } catch (error) {
      // If activities endpoint doesn't exist yet, return empty array
      console.warn('Client activities endpoint not available:', error);
      return [];
    }
  }

  // Contact Search
  async searchContacts(clientId: number, query?: string): Promise<ClientContact[]> {
    const params = new URLSearchParams();
    if (query) {
      params.append('search', query);
    }
    
    const endpoint = `/api/clients/${clientId}/contacts${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<ClientContact[]>(endpoint);
  }

  // Bulk Contact Operations
  async bulkUpdateContacts(clientId: number, contactIds: number[], updateData: Partial<UpdateContactData>): Promise<ClientContact[]> {
    return this.request<ClientContact[]>(`/api/clients/${clientId}/contacts/bulk`, {
      method: 'PUT',
      body: JSON.stringify({
        contact_ids: contactIds,
        update_data: updateData,
      }),
    });
  }

  async bulkDeleteContacts(clientId: number, contactIds: number[]): Promise<void> {
    await this.request<void>(`/api/clients/${clientId}/contacts/bulk`, {
      method: 'DELETE',
      body: JSON.stringify({
        contact_ids: contactIds,
      }),
    });
  }

  // Contact Import/Export
  async importContacts(clientId: number, file: File): Promise<{ imported: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${API_BASE}/api/clients/${clientId}/contacts/import`;
    
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ClientApiError(
        errorData.detail?.message || errorData.message || 'Import failed',
        response.status,
        errorData.detail?.code || errorData.code
      );
    }

    return response.json();
  }

  async exportContacts(clientId: number, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const url = `${API_BASE}/api/clients/${clientId}/contacts/export?format=${format}`;
    
    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new ClientApiError('Export failed', response.status);
    }

    return response.blob();
  }

  // Contact Validation
  async validateContact(clientId: number, contactData: CreateContactData): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      await this.request<void>(`/api/clients/${clientId}/contacts/validate`, {
        method: 'POST',
        body: JSON.stringify(contactData),
      });
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof ClientApiError) {
        return { isValid: false, errors: [error.message] };
      }
      return { isValid: false, errors: ['Validation failed'] };
    }
  }

  // Check for duplicate contacts
  async checkDuplicateContact(clientId: number, email?: string, phone?: string): Promise<ClientContact[]> {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (phone) params.append('phone', phone);
    
    return this.request<ClientContact[]>(`/api/clients/${clientId}/contacts/duplicates?${params.toString()}`);
  }
}

export const clientApi = new ClientApiClient();
export { ClientApiError };
