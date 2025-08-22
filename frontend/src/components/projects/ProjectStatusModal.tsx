import { useProjectStore } from '@/store/projects';
import { Project, PROJECT_STATUS_CONFIG, ProjectStatus } from '@/types/project';
import {
    Check as CheckIcon,
    Info as InfoIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    InputLabel,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    MenuItem,
    Select,
    SelectChangeEvent,
    TextField,
    Typography,
} from '@mui/material';
import React from 'react';

interface ProjectStatusModalProps {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onSuccess?: () => void;
}

// Status transition rules
const STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  planned: ['active', 'cancelled'],
  active: ['on_hold', 'completed', 'cancelled'],
  on_hold: ['active', 'cancelled'],
  completed: [], // Cannot transition from completed
  cancelled: [], // Cannot transition from cancelled
};

const STATUS_DESCRIPTIONS: Record<ProjectStatus, { description: string; icon: React.ReactNode; severity: 'info' | 'warning' | 'error' | 'success' }> = {
  planned: {
    description: 'Project is in planning phase and not yet started',
    icon: <InfoIcon color="info" />,
    severity: 'info'
  },
  active: {
    description: 'Project is currently active and in progress',
    icon: <CheckIcon color="success" />,
    severity: 'success'
  },
  on_hold: {
    description: 'Project is temporarily paused',
    icon: <WarningIcon color="warning" />,
    severity: 'warning'
  },
  completed: {
    description: 'Project has been successfully completed',
    icon: <CheckIcon color="success" />,
    severity: 'success'
  },
  cancelled: {
    description: 'Project has been cancelled and will not continue',
    icon: <WarningIcon color="error" />,
    severity: 'error'
  }
};

export const ProjectStatusModal: React.FC<ProjectStatusModalProps> = ({
  open,
  project,
  onClose,
  onSuccess,
}) => {
  const { changeProjectStatus, isLoading } = useProjectStore();
  
  const [selectedStatus, setSelectedStatus] = React.useState<ProjectStatus | ''>('');
  const [reason, setReason] = React.useState('');
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (project) {
      setSelectedStatus('');
      setReason('');
      setSubmitError(null);
    }
  }, [project]);

  const availableStatuses = React.useMemo(() => {
    if (!project) return [];
    return STATUS_TRANSITIONS[project.status] || [];
  }, [project]);

  const canChangeStatus = availableStatuses.length > 0;

  const handleStatusChange = (event: SelectChangeEvent<ProjectStatus>) => {
    setSelectedStatus(event.target.value as ProjectStatus);
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (!project || !selectedStatus) return;

    try {
      await changeProjectStatus(project.id, selectedStatus, reason.trim() || undefined);
      
      setSelectedStatus('');
      setReason('');
      setSubmitError(null);
      onSuccess?.();
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to change project status');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSelectedStatus('');
      setReason('');
      setSubmitError(null);
      onClose();
    }
  };

  if (!project) {
    return null;
  }

  const currentStatusInfo = STATUS_DESCRIPTIONS[project.status];
  const selectedStatusInfo = selectedStatus ? STATUS_DESCRIPTIONS[selectedStatus] : null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={isLoading}
    >
      <DialogTitle>
        Change Project Status
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {submitError && (
            <Alert severity="error">
              {submitError}
            </Alert>
          )}

          {/* Current Status */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Current Status: {project.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              {currentStatusInfo.icon}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Chip 
                    label={PROJECT_STATUS_CONFIG[project.status].label}
                    color="primary"
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {currentStatusInfo.description}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Status Change Selection */}
          {canChangeStatus ? (
            <Box>
              <FormControl fullWidth>
                <InputLabel>New Status</InputLabel>
                <Select
                  value={selectedStatus}
                  label="New Status"
                  onChange={handleStatusChange}
                >
                  {availableStatuses.map((status) => (
                    <MenuItem key={status} value={status}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {STATUS_DESCRIPTIONS[status].icon}
                        <Box>
                          <Typography>{PROJECT_STATUS_CONFIG[status].label}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {STATUS_DESCRIPTIONS[status].description}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedStatusInfo && (
                <Alert severity={selectedStatusInfo.severity} sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Status Change Preview
                  </Typography>
                  <Typography variant="body2">
                    {selectedStatusInfo.description}
                  </Typography>
                </Alert>
              )}

              {/* Reason for Status Change */}
              {selectedStatus && (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Reason for Status Change (Optional)"
                  placeholder="Provide a reason for this status change..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  sx={{ mt: 2 }}
                  helperText="This will be recorded in the project history."
                />
              )}
            </Box>
          ) : (
            <Alert severity="info">
              <Typography variant="subtitle2" gutterBottom>
                No Status Changes Available
              </Typography>
              <Typography variant="body2">
                The current status &quot;{PROJECT_STATUS_CONFIG[project.status].label}&quot; cannot be changed to any other status.
              </Typography>
            </Alert>
          )}

          {/* Status Workflow Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Status Workflow
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <InfoIcon color="info" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Planned"
                  secondary="Initial project state, can move to Active or Cancelled"
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Active"
                  secondary="Project in progress, can move to On Hold, Completed, or Cancelled"
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <WarningIcon color="warning" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="On Hold"
                  secondary="Temporarily paused, can move back to Active or be Cancelled"
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Completed"
                  secondary="Final successful state, no further changes allowed"
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <WarningIcon color="error" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Cancelled"
                  secondary="Final cancelled state, no further changes allowed"
                />
              </ListItem>
            </List>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        
        {canChangeStatus && (
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={isLoading || !selectedStatus}
          >
            {isLoading ? 'Changing Status...' : 'Change Status'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};