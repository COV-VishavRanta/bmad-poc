import { useGroupStore } from '@/store/groups';
import { Group, GroupFormData, GroupFormErrors, UpdateGroupData } from '@/types/group';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
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

interface GroupEditModalProps {
  open: boolean;
  group: Group | null;
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

export const GroupEditModal: React.FC<GroupEditModalProps> = ({
  open,
  group,
  onClose,
  onSuccess,
}) => {
  const { updateGroup, isLoading } = useGroupStore();
  
  const [formData, setFormData] = React.useState<GroupFormData>({
    name: '',
    clientId: '',
    sowId: '',
    startDate: '',
    endDate: '',
    description: '',
  });
  
  const [errors, setErrors] = React.useState<GroupFormErrors>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Initialize form data when group changes
  React.useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        clientId: group.clientId,
        sowId: group.sowId || '',
        startDate: group.startDate,
        endDate: group.endDate,
        description: group.description || '',
      });
      setErrors({});
      setSubmitError(null);
    }
  }, [group]);

  const availableSOWs = formData.clientId && typeof formData.clientId === 'number'
    ? mockSOWs.filter(sow => sow.clientId === formData.clientId)
    : [];

  const handleInputChange = (field: keyof GroupFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Clear SOW when client changes
      ...(field === 'clientId' ? { sowId: '' } : {}),
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
    setSubmitError(null);
  };

  const validateForm = (): boolean => {
    const newErrors: GroupFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Group name must be at least 3 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Group name must not exceed 100 characters';
    }

    if (!formData.clientId) {
      newErrors.clientId = 'Client is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must not exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!group || !validateForm()) {
      return;
    }

    try {
      const updateData: UpdateGroupData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        clientId: typeof formData.clientId === 'number' ? formData.clientId : parseInt(formData.clientId as string),
        sowId: formData.sowId ? (typeof formData.sowId === 'number' ? formData.sowId : parseInt(String(formData.sowId))) : undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
      };

      await updateGroup(group.id, updateData);
      
      onClose();
      onSuccess?.();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to update group');
    }
  };

  const handleClose = () => {
    setErrors({});
    setSubmitError(null);
    onClose();
  };

  const selectedClient = mockClients.find(c => 
    c.id === (typeof formData.clientId === 'number' ? formData.clientId : parseInt(formData.clientId as string))
  );

  if (!group) {
    return null;
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5" component="div">
          Edit Group: {group.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Update group information and settings
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {submitError && (
            <Alert severity="error" onClose={() => setSubmitError(null)}>
              {submitError}
            </Alert>
          )}

          {/* Basic Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <TextField
                label="Group Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                required
                placeholder="e.g., Development Team Alpha"
              />

              <Autocomplete
                options={mockClients}
                getOptionLabel={(option) => option.name}
                value={selectedClient || null}
                onChange={(_, value) => handleInputChange('clientId', value?.id || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Client"
                    required
                    error={!!errors.clientId}
                    helperText={errors.clientId}
                    placeholder="Select client..."
                  />
                )}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <FormControl error={!!errors.sowId}>
                <InputLabel>SOW (Optional)</InputLabel>
                <Select
                  value={formData.sowId ? String(formData.sowId) : ''}
                  onChange={(e) => handleInputChange('sowId', e.target.value ? parseInt(e.target.value) : '')}
                  label="SOW (Optional)"
                  disabled={!formData.clientId}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {availableSOWs.map((sow) => (
                    <MenuItem key={sow.id} value={sow.id.toString()}>
                      {sow.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.sowId && <FormHelperText>{errors.sowId}</FormHelperText>}
              </FormControl>
            </Box>

            <TextField
              label="Description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              error={!!errors.description}
              helperText={errors.description || `${(formData.description || '').length}/500 characters`}
              multiline
              rows={3}
              placeholder="Describe the group's purpose, objectives, or other relevant information..."
              fullWidth
            />
          </Box>

          {/* Timeline */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Timeline
            </Typography>
            
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <DatePicker
                  label="Start Date"
                  value={formData.startDate ? new Date(formData.startDate) : null}
                  onChange={(date) => handleInputChange('startDate', date ? date.toISOString().split('T')[0] : '')}
                  slotProps={{
                    textField: {
                      required: true,
                      error: !!errors.startDate,
                      helperText: errors.startDate,
                    },
                  }}
                />
                <DatePicker
                  label="End Date"
                  value={formData.endDate ? new Date(formData.endDate) : null}
                  onChange={(date) => handleInputChange('endDate', date ? date.toISOString().split('T')[0] : '')}
                  minDate={formData.startDate ? new Date(formData.startDate) : undefined}
                  slotProps={{
                    textField: {
                      required: true,
                      error: !!errors.endDate,
                      helperText: errors.endDate,
                    },
                  }}
                />
              </Box>
            </LocalizationProvider>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading}
        >
          {isLoading ? 'Updating...' : 'Update Group'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};