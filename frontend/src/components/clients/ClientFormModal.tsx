import { useAuthStore } from '@/store/auth';
import { useClientStore } from '@/store/clients';
import { Client, ClientRelationType, ClientStatus, CreateClientData, UpdateClientData } from '@/types/client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    CloudOff as AutoSaveOffIcon,
    CloudDone as AutoSaveOnIcon,
    CheckCircle as CheckIcon,
    Close,
    History as HistoryIcon,
    Save
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormHelperText,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import ClientHistoryModal from './ClientHistoryModal';

// Types for change tracking
interface FieldChange {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: Date;
}

interface ClientFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  clientData?: Client;
  onClose: () => void;
  onSuccess: () => void;
  onAutoSave?: (data: Partial<Client>) => void;
  autoSaveEnabled?: boolean;
}

// Enhanced comprehensive validation schema with detailed error messages
const clientFormSchema = z.object({
  name: z.string()
    .min(1, 'Client name is required')
    .min(2, 'Client name must be at least 2 characters')
    .max(100, 'Client name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-._&]+$/, 'Client name contains invalid characters. Use letters, numbers, spaces, hyphens, periods, underscores, and ampersands only')
    .transform(val => val.trim()),
  status: z.enum(['active', 'inactive'], {
    message: 'Please select a valid status'
  }),
  relationType: z.enum(['Customer', 'Partner', 'Internal'], {
    message: 'Please select a valid relationship type'
  }),
  projectManagementTool: z.string()
    .max(50, 'Project management tool name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-._]*$/, 'Project management tool contains invalid characters')
    .optional()
    .or(z.literal('')),
  comments: z.string()
    .max(1000, 'Comments must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
}).superRefine((data, ctx) => {
  // Custom validation: If status is active, ensure all required fields are properly set
  if (data.status === 'active' && data.name.length < 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Active clients must have a name with at least 3 characters',
      path: ['name']
    });
  }
  
  // Custom validation: Partner clients should ideally have project management tool specified
  if (data.relationType === 'Partner' && !data.projectManagementTool?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Partner clients typically require a project management tool specification',
      path: ['projectManagementTool']
    });
  }
});

type ClientFormData = z.infer<typeof clientFormSchema>;

const CLIENT_STATUSES: { value: ClientStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

const RELATION_TYPES: { value: ClientRelationType; label: string }[] = [
  { value: 'Customer', label: 'Customer' },
  { value: 'Partner', label: 'Partner' },
  { value: 'Internal', label: 'Internal' }
];

// Field labels for change tracking
const FIELD_LABELS: Record<keyof ClientFormData, string> = {
  name: 'Client Name',
  status: 'Status',
  relationType: 'Relation Type',
  projectManagementTool: 'Project Management Tool',
  comments: 'Comments'
};

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  open,
  mode,
  clientData,
  onClose,
  onSuccess,
  onAutoSave,
  autoSaveEnabled = true
}) => {
  const { createClient, updateClientOptimistic } = useClientStore();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [networkError, setNetworkError] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [autoSaveToggle, setAutoSaveToggle] = useState(autoSaveEnabled);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showChangeConfirmation, setShowChangeConfirmation] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<FieldChange[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Permission checking
  const canEdit = user?.role === 'HR' || user?.role === 'PC';
  const canViewHistory = user?.role === 'HR' || user?.role === 'PC' || user?.role === 'RM';

  // Form setup with default values based on mode
  const defaultValues: ClientFormData = useMemo(() => ({
    name: clientData?.name || '',
    status: clientData?.status || 'active',
    relationType: clientData?.relationType || 'Customer',
    projectManagementTool: clientData?.projectManagementTool || '',
    comments: clientData?.comments || '',
  }), [clientData]);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues,
    mode: 'onChange'
  });

  const { control, handleSubmit, watch, formState: { errors, isValid, isDirty }, reset, getValues } = form;

  // Watch for changes to track modifications
  const watchedValues = watch();

  // Change tracking for edit mode
  useEffect(() => {
    if (mode === 'edit' && clientData) {
      const changes: FieldChange[] = [];
      
      Object.keys(watchedValues).forEach((key) => {
        const fieldKey = key as keyof ClientFormData;
        const newValue = watchedValues[fieldKey];
        const oldValue = clientData[fieldKey];
        
        // Compare values
        const hasChanged = JSON.stringify(newValue) !== JSON.stringify(oldValue);
        
        if (hasChanged) {
          changes.push({
            field: fieldKey,
            label: FIELD_LABELS[fieldKey],
            oldValue,
            newValue,
            timestamp: new Date()
          });
        }
      });

      if (changes.length > 0) {
        setHasUnsavedChanges(true);
        setPendingChanges(changes);
      } else {
        setHasUnsavedChanges(false);
        setPendingChanges([]);
      }
    }
  }, [watchedValues, mode, clientData]);

  // Auto-save functionality (debounced)
  useEffect(() => {
    if (!autoSaveToggle || !isDirty || !isValid || mode === 'create') return;

    const timeoutId = setTimeout(async () => {
      setAutoSaveStatus('saving');
      try {
        if (onAutoSave) {
          await onAutoSave(watchedValues);
        }
        setAutoSaveStatus('saved');
        setLastAutoSave(new Date());
        
        // Clear after 3 seconds
        setTimeout(() => {
          setAutoSaveStatus('idle');
        }, 3000);
      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveStatus('error');
        setTimeout(() => {
          setAutoSaveStatus('idle');
        }, 5000);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [watchedValues, autoSaveToggle, isDirty, isValid, onAutoSave, mode]);

  // Critical change confirmation for edit mode
  const handleCriticalChanges = () => {
    const criticalFields = ['name', 'relationType', 'status'];
    const criticalChanges = pendingChanges.filter(change => 
      criticalFields.includes(change.field)
    );
    
    if (criticalChanges.length > 0 && mode === 'edit') {
      setShowChangeConfirmation(true);
      return false;
    }
    return true;
  };

  // Handle form submission
  const onSubmit = async (data: ClientFormData) => {
    // Clear previous errors
    setSubmitError(null);
    setServerErrors({});
    setNetworkError(false);
    
    // Check for critical changes in edit mode
    if (!handleCriticalChanges()) {
      return;
    }

    await handleSave(data);
  };

  const handleSave = async (data: ClientFormData) => {
    setIsSubmitting(true);
    
    try {
      if (mode === 'create') {
        const createData: CreateClientData = {
          name: data.name,
          status: data.status,
          relationType: data.relationType,
          projectManagementTool: data.projectManagementTool,
          comments: data.comments,
        };
        await createClient(createData);
      } else {
        const updateData: UpdateClientData = {
          name: data.name,
          status: data.status,
          relationType: data.relationType,
          projectManagementTool: data.projectManagementTool,
          comments: data.comments,
        };
        await updateClientOptimistic(clientData!.id, updateData);
        
        // Clear pending changes
        setPendingChanges([]);
        setHasUnsavedChanges(false);
      }
      
      // Reset error states on success
      setRetryAttempts(0);
      setNetworkError(false);
      setSubmitError(null);
      setServerErrors({});
      
      onSuccess();
      handleClose();
    } catch (error: unknown) {
      console.error('Error saving client:', error);
      
      // Handle different types of errors with proper type checking
      const isErrorWithResponse = (err: unknown): err is { response: { status: number; data?: { errors?: Record<string, string> } } } => {
        return typeof err === 'object' && err !== null && 'response' in err;
      };
      
      const isErrorWithCode = (err: unknown): err is { code: string } => {
        return typeof err === 'object' && err !== null && 'code' in err;
      };
      
      const isErrorWithMessage = (err: unknown): err is { message: string } => {
        return typeof err === 'object' && err !== null && 'message' in err;
      };
      
      if (isErrorWithResponse(error) && error.response.status === 422) {
        // Validation errors from server
        const validationErrors = error.response.data?.errors || {};
        setServerErrors(validationErrors);
        setSubmitError('Please fix the validation errors below');
      } else if (isErrorWithResponse(error) && error.response.status === 409) {
        // Conflict error (e.g., duplicate name)
        setSubmitError('A client with this name already exists. Please choose a different name.');
        setServerErrors({ name: 'Client name must be unique' });
      } else if (isErrorWithResponse(error) && error.response.status >= 500) {
        // Server error
        setSubmitError('Server error occurred. Please try again later.');
        setNetworkError(true);
      } else if (isErrorWithCode(error) && error.code === 'NETWORK_ERROR' || !isErrorWithResponse(error)) {
        // Network error
        setSubmitError('Network error. Please check your connection and try again.');
        setNetworkError(true);
        setRetryAttempts(prev => prev + 1);
      } else {
        // Generic error
        const message = isErrorWithMessage(error) ? error.message : 'An unexpected error occurred. Please try again.';
        setSubmitError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Retry function for network errors
  const handleRetry = async () => {
    if (retryAttempts < 3) {
      const formData = form.getValues();
      await handleSave(formData);
    } else {
      setSubmitError('Maximum retry attempts reached. Please try again later.');
    }
  };

  // Helper function to get field error (client-side or server-side)
  const getFieldError = (fieldName: keyof ClientFormData) => {
    return errors[fieldName]?.message || serverErrors[fieldName] || '';
  };

  // Helper function to check if field has error
  const hasFieldError = (fieldName: keyof ClientFormData) => {
    return !!(errors[fieldName] || serverErrors[fieldName]);
  };

  // Handle modal close with unsaved changes warning
  const handleClose = () => {
    if (hasUnsavedChanges && mode === 'edit') {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }
    
    reset();
    setHasUnsavedChanges(false);
    setPendingChanges([]);
    setShowChangeConfirmation(false);
    onClose();
  };

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setHasUnsavedChanges(false);
      setPendingChanges([]);
    }
  }, [open, reset, defaultValues]);

  // Auto-save status indicator
  const renderAutoSaveStatus = () => {
    if (!autoSaveToggle || mode === 'create') return null;

    const getStatusIcon = () => {
      switch (autoSaveStatus) {
        case 'saving':
          return <CircularProgress size={16} />;
        case 'saved':
          return <AutoSaveOnIcon color="success" />;
        case 'error':
          return <AutoSaveOffIcon color="error" />;
        default:
          return <AutoSaveOffIcon color="disabled" />;
      }
    };

    const getStatusText = () => {
      switch (autoSaveStatus) {
        case 'saving':
          return 'Saving...';
        case 'saved':
          return `Saved ${lastAutoSave?.toLocaleTimeString()}`;
        case 'error':
          return 'Save failed';
        default:
          return 'Auto-save enabled';
      }
    };

    return (
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        {getStatusIcon()}
        <Typography variant="caption" color="textSecondary">
          {getStatusText()}
        </Typography>
      </Box>
    );
  };

  // Render change confirmation dialog
  const renderChangeConfirmation = () => (
    <Dialog
      open={showChangeConfirmation}
      onClose={() => setShowChangeConfirmation(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Confirm Critical Changes</DialogTitle>
      <DialogContent>
        <Typography variant="body2" gutterBottom>
          You are about to make the following critical changes:
        </Typography>
        <Stack spacing={1} mt={2}>
          {pendingChanges
            .filter(change => ['name', 'relationType', 'status'].includes(change.field))
            .map((change, index) => (
              <Box key={index} p={2} bgcolor="grey.50" borderRadius={1}>
                <Typography variant="body2" fontWeight="bold">
                  {change.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  From: {JSON.stringify(change.oldValue)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  To: {JSON.stringify(change.newValue)}
                </Typography>
              </Box>
            ))}
        </Stack>
        <Typography variant="body2" color="warning.main" mt={2}>
          These changes may affect existing projects and assignments.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowChangeConfirmation(false)}>
          Cancel
        </Button>
        <Button 
          onClick={() => {
            setShowChangeConfirmation(false);
            handleSave(getValues());
          }}
          variant="contained"
          color="warning"
        >
          Confirm Changes
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { minHeight: '500px' }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {mode === 'create' ? 'Add New Client' : `Edit Client: ${clientData?.name}`}
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {mode === 'edit' && canViewHistory && (
                <IconButton 
                  onClick={() => setShowHistory(true)} 
                  size="small"
                  title="View Change History"
                >
                  <HistoryIcon />
                </IconButton>
              )}
              {mode === 'edit' && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoSaveToggle}
                      onChange={(e) => setAutoSaveToggle(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Auto-save"
                />
              )}
              <IconButton onClick={handleClose} size="small">
                <Close />
              </IconButton>
            </Box>
          </Box>
          {mode === 'edit' && hasUnsavedChanges && (
            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2">
                You have {pendingChanges.length} unsaved change{pendingChanges.length !== 1 ? 's' : ''}
              </Typography>
            </Alert>
          )}
          {mode === 'edit' && !canEdit && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              <Typography variant="body2">
                You have read-only access to this client.
              </Typography>
            </Alert>
          )}
          
          {/* Enhanced Error Display */}
          {submitError && (
            <Alert 
              severity="error" 
              sx={{ mt: 1 }}
              action={
                networkError && retryAttempts < 3 ? (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={handleRetry}
                    disabled={isSubmitting}
                  >
                    Retry ({3 - retryAttempts} left)
                  </Button>
                ) : null
              }
            >
              <Typography variant="body2">
                {submitError}
              </Typography>
              {networkError && (
                <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.8 }}>
                  Check your internet connection and try again.
                </Typography>
              )}
            </Alert>
          )}
        </DialogTitle>

        <DialogContent>
          {renderAutoSaveStatus()}
          
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={3}>
              {/* Client Name */}
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Client Name"
                    fullWidth
                    required
                    disabled={mode === 'edit' && !canEdit}
                    error={hasFieldError('name')}
                    helperText={getFieldError('name') || (
                      field.value && !hasFieldError('name') ? 'Client name looks good!' : ''
                    )}
                    InputProps={{
                      endAdornment: watchedValues.name && !hasFieldError('name') ? (
                        <CheckIcon color="success" />
                      ) : null
                    }}
                  />
                )}
              />

              {/* Status and Relation Type */}
              <Box display="flex" gap={2}>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth required error={hasFieldError('status')}>
                      <InputLabel>Status</InputLabel>
                      <Select {...field} label="Status" disabled={mode === 'edit' && !canEdit}>
                        {CLIENT_STATUSES.map((status) => (
                          <MenuItem key={status.value} value={status.value}>
                            {status.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {getFieldError('status') && (
                        <FormHelperText>{getFieldError('status')}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />

                <Controller
                  name="relationType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth required error={hasFieldError('relationType')}>
                      <InputLabel>Relation Type</InputLabel>
                      <Select {...field} label="Relation Type" disabled={mode === 'edit' && !canEdit}>
                        {RELATION_TYPES.map((type) => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {getFieldError('relationType') && (
                        <FormHelperText>{getFieldError('relationType')}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Box>

              {/* Project Management Tool */}
              <Controller
                name="projectManagementTool"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Project Management Tool"
                    fullWidth
                    disabled={mode === 'edit' && !canEdit}
                    error={hasFieldError('projectManagementTool')}
                    helperText={getFieldError('projectManagementTool') || 'Optional: e.g., Jira, Asana, Trello'}
                  />
                )}
              />

              {/* Comments */}
              <Controller
                name="comments"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Comments"
                    fullWidth
                    multiline
                    rows={3}
                    disabled={mode === 'edit' && !canEdit}
                    error={hasFieldError('comments')}
                    helperText={getFieldError('comments') || 'Additional notes about the client (max 1000 characters)'}
                  />
                )}
              />
            </Stack>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            variant="contained"
            disabled={isSubmitting || !isValid || (mode === 'edit' && !canEdit) || (networkError && retryAttempts >= 3)}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : <Save />}
            color={submitError && !isSubmitting ? 'error' : 'primary'}
          >
            {isSubmitting 
              ? (mode === 'create' ? 'Creating client...' : 'Updating client...') 
              : networkError && retryAttempts >= 3
              ? 'Service unavailable'
              : (mode === 'create' ? 'Create Client' : 'Update Client')
            }
          </Button>
        </DialogActions>
      </Dialog>

      {renderChangeConfirmation()}
      
      {/* Client History Modal */}
      {showHistory && clientData && (
        <ClientHistoryModal
          open={showHistory}
          clientId={clientData.id}
          clientName={clientData.name}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
};

export default ClientFormModal;