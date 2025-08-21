import { useClientStore } from '@/store/clients';
import { Client, ClientDependency } from '@/types/client';
import {
    Block as BlockIcon,
    Business as ClientIcon,
    Close,
    Error as ErrorIcon,
    ExpandMore as ExpandMoreIcon,
    Assignment as ProjectIcon,
    CheckCircle as SuccessIcon,
    Group as TeamIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormLabel,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';

interface ClientDeactivationModalProps {
  open: boolean;
  client: Client;
  onClose: () => void;
  onSuccess: () => void;
}

type DeactivationAction = 'deactivate' | 'reassign';

const DEPENDENCY_ICONS: Record<string, React.ReactNode> = {
  'project': <ProjectIcon />,
  'assignment': <TeamIcon />,
  'sow': <ClientIcon />
};

const DEPENDENCY_COLORS: Record<string, 'error' | 'warning' | 'info'> = {
  'project': 'error',
  'assignment': 'warning',
  'sow': 'info'
};

export const ClientDeactivationModal: React.FC<ClientDeactivationModalProps> = ({
  open,
  client,
  onClose,
  onSuccess
}) => {
  const { deactivateClient, fetchClientDependencies, clientDependencies, isLoadingDependencies } = useClientStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAction, setSelectedAction] = useState<DeactivationAction>('deactivate');
  const [reason, setReason] = useState('');
  const [reassignmentPlan, setReassignmentPlan] = useState('');
  const [dependencyResolution, setDependencyResolution] = useState('');
  const [hasCriticalDependencies, setHasCriticalDependencies] = useState(false);
  const [dependenciesLoaded, setDependenciesLoaded] = useState(false);

  // Fetch dependencies when modal opens
  useEffect(() => {
    if (open && client) {
      fetchClientDependencies(client.id);
      setDependenciesLoaded(false);
    }
  }, [open, client, fetchClientDependencies]);

  // Check for critical dependencies
  useEffect(() => {
    if (!isLoadingDependencies && dependenciesLoaded) {
      const criticalDeps = clientDependencies.filter(dep => 
        dep.status === 'active' || dep.status === 'in_progress'
      );
      setHasCriticalDependencies(criticalDeps.length > 0);
    }
  }, [clientDependencies, isLoadingDependencies, dependenciesLoaded]);

  // Update dependencies loaded state
  useEffect(() => {
    if (!isLoadingDependencies) {
      setDependenciesLoaded(true);
    }
  }, [isLoadingDependencies]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for deactivation');
      return;
    }

    if (hasCriticalDependencies && selectedAction === 'deactivate' && !dependencyResolution.trim()) {
      alert('Please describe how critical dependencies will be handled');
      return;
    }

    if (selectedAction === 'reassign' && !reassignmentPlan.trim()) {
      alert('Please provide a reassignment plan');
      return;
    }

    setIsSubmitting(true);
    try {
      const deactivationData = {
        reason: reason.trim(),
        action: selectedAction,
        dependencyResolution: dependencyResolution.trim(),
        reassignmentPlan: reassignmentPlan.trim()
      };

      await deactivateClient(client.id, JSON.stringify(deactivationData));
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error deactivating client:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    setReason('');
    setReassignmentPlan('');
    setDependencyResolution('');
    setSelectedAction('deactivate');
    setHasCriticalDependencies(false);
    setDependenciesLoaded(false);
    onClose();
  };

  // Group dependencies by type
  const groupedDependencies = clientDependencies.reduce((acc, dep) => {
    if (!acc[dep.type]) {
      acc[dep.type] = [];
    }
    acc[dep.type].push(dep);
    return acc;
  }, {} as Record<string, ClientDependency[]>);

  // Get dependency summary
  const getDependencySummary = () => {
    const total = clientDependencies.length;
    const active = clientDependencies.filter(dep => dep.status === 'active' || dep.status === 'in_progress').length;
    return { total, active };
  };

  const summary = getDependencySummary();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px', maxHeight: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <BlockIcon color="error" />
            <Typography variant="h6">
              Deactivate Client: {client.name}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Warning Alert */}
          <Alert severity="warning" icon={<WarningIcon />}>
            <Typography variant="body2">
              <strong>Warning:</strong> Deactivating this client will affect all associated projects, 
              assignments, and statements of work. This action should be carefully considered.
            </Typography>
          </Alert>

          {/* Dependencies Section */}
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Dependency Analysis
            </Typography>
            
            {isLoadingDependencies ? (
              <Box display="flex" alignItems="center" gap={2} p={2}>
                <CircularProgress size={20} />
                <Typography>Checking dependencies...</Typography>
              </Box>
            ) : (
              <>
                <Box display="flex" gap={2} mb={2}>
                  <Chip
                    label={`${summary.total} Total Dependencies`}
                    color="info"
                    variant="outlined"
                  />
                  <Chip
                    label={`${summary.active} Active Dependencies`}
                    color={summary.active > 0 ? 'error' : 'success'}
                    variant={summary.active > 0 ? 'filled' : 'outlined'}
                    icon={summary.active > 0 ? <ErrorIcon /> : <SuccessIcon />}
                  />
                </Box>

                {Object.keys(groupedDependencies).length === 0 ? (
                  <Alert severity="success">
                    No dependencies found. Client can be safely deactivated.
                  </Alert>
                ) : (
                  <Stack spacing={2}>
                    {Object.entries(groupedDependencies).map(([type, deps]) => (
                      <Accordion key={type} defaultExpanded={deps.some(d => d.status === 'active' || d.status === 'in_progress')}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {DEPENDENCY_ICONS[type]}
                            <Typography variant="subtitle1">
                              {type.toUpperCase()}s ({deps.length})
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <List dense>
                            {deps.map((dep) => (
                              <ListItem key={dep.id}>
                                <ListItemIcon>
                                  {DEPENDENCY_ICONS[dep.type]}
                                </ListItemIcon>
                                <ListItemText
                                  primary={dep.name}
                                  secondary={`Status: ${dep.status}`}
                                />
                                <Chip
                                  label={dep.status}
                                  color={DEPENDENCY_COLORS[dep.type]}
                                  size="small"
                                  variant={dep.status === 'active' || dep.status === 'in_progress' ? 'filled' : 'outlined'}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Stack>
                )}
              </>
            )}
          </Paper>

          {/* Action Selection */}
          <Paper elevation={1} sx={{ p: 2 }}>
            <FormControl component="fieldset">
              <FormLabel component="legend">
                <Typography variant="h6">Deactivation Action</Typography>
              </FormLabel>
              <RadioGroup
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value as DeactivationAction)}
              >
                <FormControlLabel
                  value="deactivate"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1">
                        Deactivate Immediately
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Client will be marked as inactive. Dependencies must be handled manually.
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="reassign"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1">
                        Deactivate with Reassignment Plan
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create a plan to reassign projects and responsibilities before deactivation.
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>
          </Paper>

          {/* Reason Input */}
          <TextField
            label="Reason for Deactivation"
            multiline
            rows={3}
            fullWidth
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            helperText="Provide a clear explanation for why this client is being deactivated"
          />

          {/* Conditional Fields Based on Action */}
          {selectedAction === 'reassign' && (
            <TextField
              label="Reassignment Plan"
              multiline
              rows={4}
              fullWidth
              required
              value={reassignmentPlan}
              onChange={(e) => setReassignmentPlan(e.target.value)}
              helperText="Describe how projects, assignments, and responsibilities will be reassigned"
            />
          )}

          {hasCriticalDependencies && selectedAction === 'deactivate' && (
            <TextField
              label="Dependency Resolution Plan"
              multiline
              rows={4}
              fullWidth
              required
              value={dependencyResolution}
              onChange={(e) => setDependencyResolution(e.target.value)}
              helperText="Explain how active dependencies will be handled after deactivation"
            />
          )}

          {/* Critical Dependencies Warning */}
          {hasCriticalDependencies && (
            <Alert severity="error">
              <Typography variant="body2">
                <strong>Critical Dependencies Detected!</strong><br />
                This client has {summary.active} active dependencies that require attention before deactivation.
                Please ensure all active projects and assignments are properly handled.
              </Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="error"
          disabled={
            isSubmitting || 
            !reason.trim() || 
            (selectedAction === 'reassign' && !reassignmentPlan.trim()) ||
            (hasCriticalDependencies && selectedAction === 'deactivate' && !dependencyResolution.trim())
          }
          startIcon={isSubmitting ? <CircularProgress size={20} /> : <BlockIcon />}
        >
          {isSubmitting 
            ? 'Deactivating...' 
            : `Deactivate Client`
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientDeactivationModal;