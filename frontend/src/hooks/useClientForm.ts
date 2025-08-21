import { Client, CreateClientData, UpdateClientData } from '@/types/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useClient } from './useClients';

// Form validation schema
const clientFormSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(255, 'Name must be less than 255 characters'),
  status: z.enum(['active', 'inactive'], {
    message: 'Status is required',
  }),
  relationType: z.enum(['Customer', 'Partner', 'Internal'], {
    message: 'Relation type is required',
  }),
  projectManagementTool: z.string().max(255, 'Tool name must be less than 255 characters').optional(),
  comments: z.string().max(1000, 'Comments must be less than 1000 characters').optional(),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

interface UseClientFormOptions {
  mode: 'create' | 'edit';
  clientData?: Client;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * Custom hook for managing client form state and validation
 */
export const useClientForm = ({
  mode,
  clientData,
  onSuccess,
  onError,
}: UseClientFormOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { createClient, updateClient } = useClient();

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: clientData?.name || '',
      status: clientData?.status || 'active',
      relationType: clientData?.relationType || 'Customer',
      projectManagementTool: clientData?.projectManagementTool || '',
      comments: clientData?.comments || '',
    },
    mode: 'onChange', // Enable real-time validation
  });

  const onSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (mode === 'create') {
        await createClient(data as CreateClientData);
      } else if (mode === 'edit' && clientData) {
        await updateClient(clientData.id, data as UpdateClientData);
      }

      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setSubmitError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearSubmitError = () => {
    setSubmitError(null);
  };

  const resetForm = () => {
    form.reset();
    setSubmitError(null);
  };

  // Check if form has unsaved changes
  const hasUnsavedChanges = form.formState.isDirty;

  return {
    form,
    isSubmitting,
    submitError,
    hasUnsavedChanges,
    onSubmit: form.handleSubmit(onSubmit),
    clearSubmitError,
    resetForm,
    // Expose form validation state
    isValid: form.formState.isValid,
    errors: form.formState.errors,
  };
};

/**
 * Custom hook for client name uniqueness validation
 */
export const useClientNameValidation = (excludeClientId?: number) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateClientName = async (name: string): Promise<boolean> => {
    if (!name.trim()) {
      setValidationError(null);
      return true;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const response = await fetch(`/api/clients/validate-name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          excludeId: excludeClientId,
        }),
      });

      const result = await response.json();

      if (!result.isUnique) {
        setValidationError('A client with this name already exists');
        return false;
      }

      return true;
    } catch {
      setValidationError('Failed to validate client name');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  return {
    validateClientName,
    isValidating,
    validationError,
    clearValidationError: () => setValidationError(null),
  };
};