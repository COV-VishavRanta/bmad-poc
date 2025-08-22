import { useProjectStore } from '@/store/projects';
import { Project, PROJECT_STATUS_CONFIG, PROJECT_TYPE_CONFIG, ProjectFormData, ProjectFormErrors, ProjectStatus, ProjectType, UpdateProjectData } from '@/types/project';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormHelperText,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import {
    DatePicker,
    LocalizationProvider,
} from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import React from 'react';

interface ProjectEditModalProps {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onSuccess?: () => void;
}

// Mock data - in real app this would come from API
const mockClients = [
  { id: 1, name: 'Acme Corp' },
  { id: 2, name: 'TechStart Inc' },
  { id: 3, name: 'Global Solutions' },
];

const mockSOWs = [
  { id: 1, name: 'Development Services Q1 2025', clientId: 1 },
  { id: 2, name: 'Support & Maintenance', clientId: 1 },
  { id: 3, name: 'Digital Transformation', clientId: 2 },
  { id: 4, name: 'Infrastructure Upgrade', clientId: 2 },
  { id: 5, name: 'Consulting Services', clientId: 3 },
];

const mockGroups = [
  { id: 1, name: 'Development Team A' },
  { id: 2, name: 'Development Team B' },
  { id: 3, name: 'Support Team' },
  { id: 4, name: 'Consulting Team' },
];

export const ProjectEditModal: React.FC<ProjectEditModalProps> = ({
  open,
  project,
  onClose,
  onSuccess,
}) => {
  const { updateProject, isLoading } = useProjectStore();
  
  const [formData, setFormData] = React.useState<ProjectFormData>({
    name: '',
    clientId: '',
    sowId: '',
    projectType: '',
    status: 'planned',
    startDate: '',
    endDate: '',
    groupId: '',
    description: '',
  });
  
  const [errors, setErrors] = React.useState<ProjectFormErrors>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [hasChanges, setHasChanges] = React.useState(false);

  // Initialize form data when project changes
  React.useEffect(() => {
    if (project) {
      const initialData: ProjectFormData = {
        name: project.name,
        clientId: project.clientId,
        sowId: project.sowId,
        projectType: project.projectType,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        groupId: project.groupId || '',
        description: project.description || '',
      };
      setFormData(initialData);
      setHasChanges(false);
      setErrors({});
      setSubmitError(null);
    }
  }, [project]);

  const filteredSOWs = React.useMemo(() => {
    if (!formData.clientId) return [];
    return mockSOWs.filter(sow => sow.clientId === formData.clientId);
  }, [formData.clientId]);

  const validateForm = (): boolean => {
    const newErrors: ProjectFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Project name must be less than 255 characters';
    }

    if (!formData.clientId) {
      newErrors.clientId = 'Client selection is required';
    }

    if (!formData.sowId) {
      newErrors.sowId = 'SOW selection is required';
    }

    if (!formData.projectType) {
      newErrors.projectType = 'Project type is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (startDate >= endDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: keyof ProjectFormData, value: string | number | undefined) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // Clear SOW selection when client changes
      if (field === 'clientId' && value !== prev.clientId) {
        newData.sowId = '';
      }

      return newData;
    });

    // Track changes
    if (project) {
      const originalValue = project[field as keyof Project];
      setHasChanges(value !== originalValue);
    }

    // Clear field-specific error
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleSubmit = async () => {
    if (!project || !validateForm()) return;

    try {
      const updateData: UpdateProjectData = {
        name: formData.name,
        clientId: formData.clientId as number,
        sowId: formData.sowId as number,
        projectType: formData.projectType as ProjectType,
        status: formData.status as ProjectStatus,
        startDate: formData.startDate,
        endDate: formData.endDate,
        groupId: formData.groupId ? formData.groupId as number : undefined,
        description: formData.description || undefined,
      };

      await updateProject(project.id, updateData);
      
      setHasChanges(false);
      setErrors({});
      setSubmitError(null);

      onSuccess?.();
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to update project');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!project) {
    return null;
  }

  const canChangeClient = project.status === 'planned';
  const canChangeSOW = project.status === 'planned';

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={isLoading}
      >
        <DialogTitle>
          Edit Project: {project.name}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {submitError && (
              <Alert severity="error">
                {submitError}
              </Alert>
            )}

            {/* Basic Information */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Basic Information</Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Project Name *"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  error={!!errors.name}
                  helperText={errors.name}
                />

                <Autocomplete
                  options={mockClients}
                  getOptionLabel={(option) => option.name}
                  value={mockClients.find(c => c.id === formData.clientId) || null}
                  onChange={(_, newValue) => handleFieldChange('clientId', newValue?.id || '')}
                  disabled={!canChangeClient}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Client *"
                      error={!!errors.clientId}
                      helperText={errors.clientId || (canChangeClient ? 'Select the client for this project' : 'Cannot change client after project starts')}
                    />
                  )}
                />

                <Autocomplete
                  options={filteredSOWs}
                  getOptionLabel={(option) => option.name}
                  value={filteredSOWs.find(s => s.id === formData.sowId) || null}
                  onChange={(_, newValue) => handleFieldChange('sowId', newValue?.id || '')}
                  disabled={!canChangeSOW || !formData.clientId}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Statement of Work *"
                      error={!!errors.sowId}
                      helperText={errors.sowId || (canChangeSOW ? 'Select the SOW that covers this project' : 'Cannot change SOW after project starts')}
                    />
                  )}
                />

                <FormControl fullWidth error={!!errors.projectType}>
                  <InputLabel>Project Type *</InputLabel>
                  <Select
                    value={formData.projectType}
                    label="Project Type *"
                    onChange={(e) => handleFieldChange('projectType', e.target.value)}
                  >
                    {Object.entries(PROJECT_TYPE_CONFIG).map(([type, config]) => (
                      <MenuItem key={type} value={type}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{config.icon}</span>
                          <Typography>{config.label}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.projectType && (
                    <FormHelperText>{errors.projectType}</FormHelperText>
                  )}
                </FormControl>
              </Box>
            </Box>

            {/* Timeline & Status */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Timeline & Status</Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                <DatePicker
                  label="Start Date *"
                  value={formData.startDate ? new Date(formData.startDate) : null}
                  onChange={(date) => handleFieldChange('startDate', date ? date.toISOString().split('T')[0] : '')}
                  slots={{
                    textField: (params) => (
                      <TextField
                        {...params}
                        error={!!errors.startDate}
                        helperText={errors.startDate}
                      />
                    ),
                  }}
                />

                <DatePicker
                  label="End Date *"
                  value={formData.endDate ? new Date(formData.endDate) : null}
                  onChange={(date) => handleFieldChange('endDate', date ? date.toISOString().split('T')[0] : '')}
                  minDate={formData.startDate ? new Date(formData.startDate) : undefined}
                  slots={{
                    textField: (params) => (
                      <TextField
                        {...params}
                        error={!!errors.endDate}
                        helperText={errors.endDate}
                      />
                    ),
                  }}
                />
              </Box>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                >
                  {Object.entries(PROJECT_STATUS_CONFIG).map(([status, config]) => (
                    <MenuItem key={status} value={status}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={config.label}
                          size="small"
                          color="primary"
                        />
                        <Typography variant="body2" color="text.secondary">
                          {config.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Autocomplete
                options={mockGroups}
                getOptionLabel={(option) => option.name}
                value={mockGroups.find(g => g.id === formData.groupId) || null}
                onChange={(_, newValue) => handleFieldChange('groupId', newValue?.id || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Assigned Group (Optional)"
                    helperText="Leave empty for individual assignments"
                  />
                )}
              />
            </Box>

            {/* Description */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Description</Typography>
              
              <TextField
                fullWidth
                label="Description (Optional)"
                multiline
                rows={4}
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                error={!!errors.description}
                helperText={errors.description || 'Provide additional project details and context'}
                placeholder="Describe the project objectives, deliverables, and any special requirements..."
              />
            </Box>

            {/* Change Summary */}
            {hasChanges && (
              <Alert severity="info">
                <Typography variant="subtitle2">Unsaved Changes</Typography>
                <Typography variant="body2">
                  You have made changes to this project. Click &quot;Save Changes&quot; to update.
                </Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={isLoading || !hasChanges}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};