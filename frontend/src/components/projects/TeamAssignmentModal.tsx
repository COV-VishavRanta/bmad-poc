import { useAuth } from '@/hooks/useAuth';
import { useProjectStore } from '@/store/projects';
import { ProjectAssignment, ProjectWithDetails } from '@/types/project';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Person as PersonIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
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
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import React from 'react';

interface TeamAssignmentModalProps {
  open: boolean;
  project: ProjectWithDetails;
  onClose: () => void;
  onSuccess?: () => void;
}

interface AssignmentForm {
  userId: number | null;
  userName: string;
  userEmail: string;
  role: string;
  fteAllocation: number;
  startDate: string;
  endDate: string;
}

const ROLE_OPTIONS = [
  'Software Engineer',
  'Senior Software Engineer',
  'Tech Lead',
  'Product Manager',
  'Designer',
  'QA Engineer',
  'DevOps Engineer',
  'Business Analyst',
  'Project Manager',
  'Consultant',
];

// Mock users data - in real app this would come from API
const MOCK_USERS = [
  { id: 1, name: 'John Doe', email: 'john.doe@company.com' },
  { id: 2, name: 'Jane Smith', email: 'jane.smith@company.com' },
  { id: 3, name: 'Bob Johnson', email: 'bob.johnson@company.com' },
  { id: 4, name: 'Alice Brown', email: 'alice.brown@company.com' },
  { id: 5, name: 'Charlie Wilson', email: 'charlie.wilson@company.com' },
];

export const TeamAssignmentModal: React.FC<TeamAssignmentModalProps> = ({
  open,
  project,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { isLoading } = useProjectStore();
  
  const [assignments, setAssignments] = React.useState<ProjectAssignment[]>([]);
  const [isAddingNew, setIsAddingNew] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [newAssignment, setNewAssignment] = React.useState<AssignmentForm>({
    userId: null,
    userName: '',
    userEmail: '',
    role: '',
    fteAllocation: 1.0,
    startDate: project.startDate || '',
    endDate: project.endDate || '',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (project.assignments) {
      setAssignments([...project.assignments]);
    } else {
      setAssignments([]);
    }
    setIsAddingNew(false);
    setEditingIndex(null);
    setErrors({});
    setSubmitError(null);
  }, [project]);

  const canEdit = user?.role === 'HR' || user?.role === 'PC';

  const validateAssignment = (assignment: AssignmentForm): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!assignment.userId) {
      newErrors.user = 'Please select a team member';
    }
    if (!assignment.role.trim()) {
      newErrors.role = 'Role is required';
    }
    if (assignment.fteAllocation <= 0 || assignment.fteAllocation > 1) {
      newErrors.fteAllocation = 'FTE allocation must be between 0.1 and 1.0';
    }
    if (!assignment.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (!assignment.endDate) {
      newErrors.endDate = 'End date is required';
    }
    if (assignment.startDate && assignment.endDate && assignment.startDate > assignment.endDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    return newErrors;
  };

  const handleUserSelect = (user: { id: number; name: string; email: string } | null) => {
    if (user) {
      setNewAssignment(prev => ({
        ...prev,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
      }));
      setErrors(prev => ({ ...prev, user: '' }));
    }
  };

  const handleAddAssignment = () => {
    const validationErrors = validateAssignment(newAssignment);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Check for duplicate user assignment
    const existingAssignment = assignments.find(a => a.userId === newAssignment.userId);
    if (existingAssignment) {
      setErrors({ user: 'This user is already assigned to the project' });
      return;
    }

    const assignment: ProjectAssignment = {
      id: Date.now(), // Mock ID
      projectId: project.id,
      userId: newAssignment.userId!,
      userName: newAssignment.userName,
      userEmail: newAssignment.userEmail,
      role: newAssignment.role,
      fteAllocation: newAssignment.fteAllocation,
      startDate: newAssignment.startDate,
      endDate: newAssignment.endDate,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setAssignments(prev => [...prev, assignment]);
    setNewAssignment({
      userId: null,
      userName: '',
      userEmail: '',
      role: '',
      fteAllocation: 1.0,
      startDate: project.startDate || '',
      endDate: project.endDate || '',
    });
    setIsAddingNew(false);
    setErrors({});
  };

  const handleEditAssignment = (index: number) => {
    const assignment = assignments[index];
    setNewAssignment({
      userId: assignment.userId,
      userName: assignment.userName,
      userEmail: assignment.userEmail,
      role: assignment.role,
      fteAllocation: assignment.fteAllocation || 1.0,
      startDate: assignment.startDate || project.startDate || '',
      endDate: assignment.endDate || project.endDate || '',
    });
    setEditingIndex(index);
    setIsAddingNew(true);
  };

  const handleUpdateAssignment = () => {
    const validationErrors = validateAssignment(newAssignment);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (editingIndex !== null) {
      const updatedAssignments = [...assignments];
      updatedAssignments[editingIndex] = {
        ...updatedAssignments[editingIndex],
        role: newAssignment.role,
        fteAllocation: newAssignment.fteAllocation,
        startDate: newAssignment.startDate,
        endDate: newAssignment.endDate,
        updatedAt: new Date().toISOString(),
      };

      setAssignments(updatedAssignments);
      setNewAssignment({
        userId: null,
        userName: '',
        userEmail: '',
        role: '',
        fteAllocation: 1.0,
        startDate: project.startDate || '',
        endDate: project.endDate || '',
      });
      setIsAddingNew(false);
      setEditingIndex(null);
      setErrors({});
    }
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      // In a real app, this would call an API to update assignments
      console.log('Updating project assignments:', assignments);
      
      // Mock success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSuccess?.();
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to update team assignments');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setIsAddingNew(false);
      setEditingIndex(null);
      setErrors({});
      setSubmitError(null);
      onClose();
    }
  };

  const totalFTE = assignments.reduce((sum, assignment) => sum + (assignment.fteAllocation || 0), 0);
  const hasConflicts = totalFTE > 5; // Arbitrary limit for demo

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon />
          <Typography variant="h6">
            Manage Team Assignments - {project.name}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        {/* FTE Summary */}
        <Alert 
          severity={hasConflicts ? 'warning' : 'info'} 
          sx={{ mb: 3 }}
          icon={hasConflicts ? <WarningIcon /> : undefined}
        >
          <Typography variant="subtitle2">
            Total FTE Allocation: {totalFTE.toFixed(1)}
            {hasConflicts && ' (Warning: High allocation detected)'}
          </Typography>
        </Alert>

        {/* Current Assignments */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Current Assignments ({assignments.length})
          </Typography>
          
          {assignments.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Team Member</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>FTE</TableCell>
                    <TableCell>Duration</TableCell>
                    {canEdit && <TableCell>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignments.map((assignment, index) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {assignment.userName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {assignment.userEmail}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={assignment.role} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {(assignment.fteAllocation || 0).toFixed(1)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {assignment.startDate ? new Date(assignment.startDate).toLocaleDateString() : 'N/A'} - {assignment.endDate ? new Date(assignment.endDate).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <Tooltip title="Edit Assignment">
                            <IconButton 
                              size="small" 
                              onClick={() => handleEditAssignment(index)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remove Assignment">
                            <IconButton 
                              size="small" 
                              onClick={() => handleRemoveAssignment(index)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              No team members assigned to this project yet.
            </Alert>
          )}
        </Box>

        {/* Add/Edit Assignment Form */}
        {canEdit && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {editingIndex !== null ? 'Edit Assignment' : 'Add New Assignment'}
              </Typography>
              {!isAddingNew && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setIsAddingNew(true)}
                >
                  Add Assignment
                </Button>
              )}
            </Box>

            {isAddingNew && (
              <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                  {/* User Selection */}
                  <Autocomplete
                    options={MOCK_USERS}
                    getOptionLabel={(option) => `${option.name} (${option.email})`}
                    value={MOCK_USERS.find(u => u.id === newAssignment.userId) || null}
                    onChange={(_, value) => handleUserSelect(value)}
                    disabled={editingIndex !== null}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Team Member"
                        error={!!errors.user}
                        helperText={errors.user}
                        required
                      />
                    )}
                  />

                  {/* Role Selection */}
                  <FormControl error={!!errors.role} required>
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={newAssignment.role}
                      label="Role"
                      onChange={(e) => {
                        setNewAssignment(prev => ({ ...prev, role: e.target.value }));
                        setErrors(prev => ({ ...prev, role: '' }));
                      }}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <MenuItem key={role} value={role}>
                          {role}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.role && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                        {errors.role}
                      </Typography>
                    )}
                  </FormControl>

                  {/* FTE Allocation */}
                  <TextField
                    label="FTE Allocation"
                    type="number"
                    value={newAssignment.fteAllocation}
                    onChange={(e) => {
                      setNewAssignment(prev => ({ ...prev, fteAllocation: parseFloat(e.target.value) || 0 }));
                      setErrors(prev => ({ ...prev, fteAllocation: '' }));
                    }}
                    inputProps={{ min: 0.1, max: 1.0, step: 0.1 }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">FTE</InputAdornment>,
                    }}
                    error={!!errors.fteAllocation}
                    helperText={errors.fteAllocation || 'Full-time equivalent (0.1 - 1.0)'}
                    required
                  />

                  {/* Empty cell for spacing */}
                  <Box />

                  {/* Start Date */}
                  <TextField
                    label="Assignment Start Date"
                    type="date"
                    value={newAssignment.startDate}
                    onChange={(e) => {
                      setNewAssignment(prev => ({ ...prev, startDate: e.target.value }));
                      setErrors(prev => ({ ...prev, startDate: '' }));
                    }}
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.startDate}
                    helperText={errors.startDate}
                    required
                  />

                  {/* End Date */}
                  <TextField
                    label="Assignment End Date"
                    type="date"
                    value={newAssignment.endDate}
                    onChange={(e) => {
                      setNewAssignment(prev => ({ ...prev, endDate: e.target.value }));
                      setErrors(prev => ({ ...prev, endDate: '' }));
                    }}
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.endDate}
                    helperText={errors.endDate}
                    required
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button 
                    onClick={() => {
                      setIsAddingNew(false);
                      setEditingIndex(null);
                      setErrors({});
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={editingIndex !== null ? handleUpdateAssignment : handleAddAssignment}
                  >
                    {editingIndex !== null ? 'Update' : 'Add'} Assignment
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={isLoading}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};