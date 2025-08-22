import { useProjectStore } from '@/store/projects';
import { CreateProjectData, PROJECT_TYPE_CONFIG, ProjectFormData, ProjectFormErrors, ProjectType } from '@/types/project';
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
    Step,
    StepLabel,
    Stepper,
    TextField,
    Typography,
} from '@mui/material';
import {
    DatePicker,
    LocalizationProvider,
} from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import React from 'react';

interface ProjectFormModalProps {
  open: boolean;
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

const steps = ['Basic Information', 'Timeline & Resources', 'Review & Create'];

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { createProject, isLoading } = useProjectStore();
  
  const [activeStep, setActiveStep] = React.useState(0);
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

  const filteredSOWs = React.useMemo(() => {
    if (!formData.clientId) return [];
    return mockSOWs.filter(sow => sow.clientId === formData.clientId);
  }, [formData.clientId]);

  const validateStep = (step: number): boolean => {
    const newErrors: ProjectFormErrors = {};

    switch (step) {
      case 0: // Basic Information
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
        break;

      case 1: // Timeline & Resources
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
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleFieldChange = (field: keyof ProjectFormData, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear SOW selection when client changes
    if (field === 'clientId') {
      setFormData(prev => ({
        ...prev,
        sowId: ''
      }));
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
    if (!validateStep(1)) return;

    try {
      const projectData: CreateProjectData = {
        name: formData.name,
        clientId: formData.clientId as number,
        sowId: formData.sowId as number,
        projectType: formData.projectType as ProjectType,
        status: formData.status,
        startDate: formData.startDate,
        endDate: formData.endDate,
        groupId: formData.groupId ? formData.groupId as number : undefined,
        description: formData.description || undefined,
      };

      await createProject(projectData);
      
      // Reset form
      setFormData({
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
      setActiveStep(0);
      setErrors({});
      setSubmitError(null);

      onSuccess?.();
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create project');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
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
      setActiveStep(0);
      setErrors({});
      setSubmitError(null);
      onClose();
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label="Project Name *"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              placeholder="Enter a descriptive project name"
            />

            <Autocomplete
              options={mockClients}
              getOptionLabel={(option) => option.name}
              value={mockClients.find(c => c.id === formData.clientId) || null}
              onChange={(_, newValue) => handleFieldChange('clientId', newValue?.id || '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Client *"
                  error={!!errors.clientId}
                  helperText={errors.clientId || 'Select the client for this project'}
                />
              )}
            />

            <Autocomplete
              options={filteredSOWs}
              getOptionLabel={(option) => option.name}
              value={filteredSOWs.find(s => s.id === formData.sowId) || null}
              onChange={(_, newValue) => handleFieldChange('sowId', newValue?.id || '')}
              disabled={!formData.clientId}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Statement of Work *"
                  error={!!errors.sowId}
                  helperText={errors.sowId || 'Select the SOW that covers this project'}
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
                      <Box>
                        <Typography>{config.label}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {config.description}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              {errors.projectType && (
                <FormHelperText>{errors.projectType}</FormHelperText>
              )}
            </FormControl>
          </Box>
        );

      case 1:
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
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

              <FormControl fullWidth>
                <InputLabel>Initial Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Initial Status"
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                >
                  <MenuItem value="planned">Planned</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                </Select>
                <FormHelperText>Projects typically start as Planned</FormHelperText>
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
          </LocalizationProvider>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6">Review Project Details</Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Project Name</Typography>
                <Typography>{formData.name}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Client</Typography>
                <Typography>{mockClients.find(c => c.id === formData.clientId)?.name}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">SOW</Typography>
                <Typography>{filteredSOWs.find(s => s.id === formData.sowId)?.name}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Project Type</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {formData.projectType && (
                    <>
                      <span>{PROJECT_TYPE_CONFIG[formData.projectType as keyof typeof PROJECT_TYPE_CONFIG].icon}</span>
                      <Typography>{PROJECT_TYPE_CONFIG[formData.projectType as keyof typeof PROJECT_TYPE_CONFIG].label}</Typography>
                    </>
                  )}
                </Box>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Start Date</Typography>
                <Typography>{formData.startDate ? new Date(formData.startDate).toLocaleDateString() : ''}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">End Date</Typography>
                <Typography>{formData.endDate ? new Date(formData.endDate).toLocaleDateString() : ''}</Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Initial Status</Typography>
                <Chip label={formData.status === 'planned' ? 'Planned' : 'Active'} size="small" color="primary" />
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Assigned Group</Typography>
                <Typography>{formData.groupId ? mockGroups.find(g => g.id === formData.groupId)?.name : 'Individual'}</Typography>
              </Box>
            </Box>
            
            {formData.description && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                <Typography>{formData.description}</Typography>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={isLoading}
    >
      <DialogTitle>
        Create New Project
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {submitError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {submitError}
            </Alert>
          )}

          {renderStepContent(activeStep)}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={isLoading}>
            Back
          </Button>
        )}
        
        {activeStep < steps.length - 1 ? (
          <Button onClick={handleNext} variant="contained">
            Next
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Project'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};