import { clientApi, ClientApiError } from '@/lib/api/clients';
import {
    ClientContact,
    ClientWithDetails,
    CreateContactData,
    UpdateContactData,
} from '@/types/client';
import { useCallback, useState } from 'react';

interface UseContactsProps {
  clientId: number;
  searchQuery?: string;
}

interface UseContactsReturn {
  contacts: ClientContact[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearError: () => void;
  
  // Contact operations
  createContact: (contactData: CreateContactData) => Promise<ClientContact>;
  updateContact: (contactId: number, contactData: UpdateContactData) => Promise<ClientContact>;
  deleteContact: (contactId: number) => Promise<void>;
  setPrimaryContact: (contactId: number) => Promise<ClientContact>;
  
  // Bulk operations
  bulkUpdateContacts: (contactIds: number[], updateData: Partial<UpdateContactData>) => Promise<ClientContact[]>;
  bulkDeleteContacts: (contactIds: number[]) => Promise<void>;
  
  // Import/Export
  importContacts: (file: File) => Promise<{ imported: number; errors: string[] }>;
  exportContacts: (format?: 'csv' | 'excel') => Promise<void>;
  
  // Validation
  validateContact: (contactData: CreateContactData) => Promise<{ isValid: boolean; errors: string[] }>;
  checkDuplicates: (email?: string, phone?: string) => Promise<ClientContact[]>;
  
  // Loading states
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isImporting: boolean;
  isExporting: boolean;
}

export function useContacts({ clientId, searchQuery }: UseContactsProps): UseContactsReturn {
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const fetchedContacts = searchQuery 
        ? await clientApi.searchContacts(clientId, searchQuery)
        : await clientApi.getClientContacts(clientId);
      
      setContacts(fetchedContacts);
    } catch (err) {
      const errorMessage = err instanceof ClientApiError ? err.message : 'Failed to load contacts';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, searchQuery]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Create contact
  const createContact = useCallback(async (contactData: CreateContactData): Promise<ClientContact> => {
    try {
      setIsCreating(true);
      setError(null);
      
      const newContact = await clientApi.createContact(clientId, contactData);
      
      // Update local state
      setContacts(prev => [newContact, ...prev]);
      
      return newContact;
    } catch (err) {
      const errorMessage = err instanceof ClientApiError ? err.message : 'Failed to create contact';
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [clientId]);

  // Update contact
  const updateContact = useCallback(async (contactId: number, contactData: UpdateContactData): Promise<ClientContact> => {
    try {
      setIsUpdating(true);
      setError(null);
      
      const updatedContact = await clientApi.updateContact(clientId, contactId, contactData);
      
      // Update local state
      setContacts(prev => prev.map(contact => 
        contact.id === contactId ? updatedContact : contact
      ));
      
      return updatedContact;
    } catch (err) {
      const errorMessage = err instanceof ClientApiError ? err.message : 'Failed to update contact';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [clientId]);

  // Delete contact
  const deleteContact = useCallback(async (contactId: number): Promise<void> => {
    try {
      setIsDeleting(true);
      setError(null);
      
      await clientApi.deleteContact(clientId, contactId);
      
      // Update local state
      setContacts(prev => prev.filter(contact => contact.id !== contactId));
    } catch (err) {
      const errorMessage = err instanceof ClientApiError ? err.message : 'Failed to delete contact';
      setError(errorMessage);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, [clientId]);

  // Set primary contact
  const setPrimaryContact = useCallback(async (contactId: number): Promise<ClientContact> => {
    try {
      setIsUpdating(true);
      setError(null);
      
      const updatedContact = await clientApi.setPrimaryContact(clientId, contactId);
      
      // Update local state - unset other primary contacts and set new one
      setContacts(prev => prev.map(contact => ({
        ...contact,
        isPrimary: contact.id === contactId
      })));
      
      return updatedContact;
    } catch (err) {
      const errorMessage = err instanceof ClientApiError ? err.message : 'Failed to set primary contact';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [clientId]);

  // Bulk update contacts
  const bulkUpdateContacts = useCallback(async (contactIds: number[], updateData: Partial<UpdateContactData>): Promise<ClientContact[]> => {
    try {
      setIsUpdating(true);
      setError(null);
      
      const updatedContacts = await clientApi.bulkUpdateContacts(clientId, contactIds, updateData);
      
      // Update local state
      setContacts(prev => prev.map(contact => {
        const updated = updatedContacts.find(uc => uc.id === contact.id);
        return updated || contact;
      }));
      
      return updatedContacts;
    } catch (err) {
      const errorMessage = err instanceof ClientApiError ? err.message : 'Failed to update contacts';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [clientId]);

  // Bulk delete contacts
  const bulkDeleteContacts = useCallback(async (contactIds: number[]): Promise<void> => {
    try {
      setIsDeleting(true);
      setError(null);
      
      await clientApi.bulkDeleteContacts(clientId, contactIds);
      
      // Update local state
      setContacts(prev => prev.filter(contact => !contactIds.includes(contact.id)));
    } catch (err) {
      const errorMessage = err instanceof ClientApiError ? err.message : 'Failed to delete contacts';
      setError(errorMessage);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, [clientId]);

  // Import contacts
  const importContacts = useCallback(async (file: File): Promise<{ imported: number; errors: string[] }> => {
    try {
      setIsImporting(true);
      setError(null);
      
      const result = await clientApi.importContacts(clientId, file);
      
      // Refresh contacts after import
      await refetch();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof ClientApiError ? err.message : 'Failed to import contacts';
      setError(errorMessage);
      throw err;
    } finally {
      setIsImporting(false);
    }
  }, [clientId, refetch]);

  // Export contacts
  const exportContacts = useCallback(async (format: 'csv' | 'excel' = 'csv'): Promise<void> => {
    try {
      setIsExporting(true);
      setError(null);
      
      const blob = await clientApi.exportContacts(clientId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `client_${clientId}_contacts.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err instanceof ClientApiError ? err.message : 'Failed to export contacts';
      setError(errorMessage);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, [clientId]);

  // Validate contact
  const validateContact = useCallback(async (contactData: CreateContactData): Promise<{ isValid: boolean; errors: string[] }> => {
    try {
      return await clientApi.validateContact(clientId, contactData);
    } catch (err) {
      return { 
        isValid: false, 
        errors: [err instanceof ClientApiError ? err.message : 'Validation failed'] 
      };
    }
  }, [clientId]);

  // Check duplicates
  const checkDuplicates = useCallback(async (email?: string, phone?: string): Promise<ClientContact[]> => {
    try {
      return await clientApi.checkDuplicateContact(clientId, email, phone);
    } catch (err) {
      const errorMessage = err instanceof ClientApiError ? err.message : 'Failed to check duplicates';
      setError(errorMessage);
      return [];
    }
  }, [clientId]);

  return {
    contacts,
    isLoading,
    error,
    refetch,
    clearError,
    
    // Contact operations
    createContact,
    updateContact,
    deleteContact,
    setPrimaryContact,
    
    // Bulk operations
    bulkUpdateContacts,
    bulkDeleteContacts,
    
    // Import/Export
    importContacts,
    exportContacts,
    
    // Validation
    validateContact,
    checkDuplicates,
    
    // Loading states
    isCreating,
    isUpdating,
    isDeleting,
    isImporting,
    isExporting,
  };
}

// Hook for client details with contacts
export function useClientDetails(clientId: number) {
  const [clientDetails, setClientDetails] = useState<ClientWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const details = await clientApi.getClientDetails(clientId);
      setClientDetails(details);
    } catch (err) {
      const errorMessage = err instanceof ClientApiError ? err.message : 'Failed to load client details';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    clientDetails,
    isLoading,
    error,
    refetch,
    clearError,
  };
}