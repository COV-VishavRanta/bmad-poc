'use client';

import { UnauthorizedAccess } from '@/components/common/UnauthorizedAccess';
import { AssignmentHistory } from '@/components/projects/AssignmentHistory';
import { AssignmentTimeline } from '@/components/projects/AssignmentTimeline';
import { ProjectEditModal } from '@/components/projects/ProjectEditModal';
import { ProjectStatusModal } from '@/components/projects/ProjectStatusModal';
import { TeamAssignmentModal } from '@/components/projects/TeamAssignmentModal';
import { TeamCapacity } from '@/components/projects/TeamCapacity';
import { usePermissions } from '@/hooks/usePermissions';
import { useProjectStore } from '@/store/projects';
import {
    Analytics as AnalyticsIcon,
    ArrowBack as ArrowBackIcon,
    Assignment as AssignmentIcon,
    AttachFile as AttachFileIcon,
    Business as BusinessIcon,
    Edit as EditIcon,
    Folder as FolderIcon,
    History as HistoryIcon,
    Home as HomeIcon,
    Person as PersonIcon,
    ChangeCircle as StatusIcon,
    Timeline as TimelineIcon,
} from '@mui/icons-material';
import {
    Alert,
    Avatar,
    Box,
    Breadcrumbs,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    Link,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Paper,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`project-tabpanel-${index}`}
      aria-labelledby={`project-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `project-tab-${index}`,
    'aria-controls': `project-tabpanel-${index}`,
  };
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { canViewProjects, canEditProjects, isReadOnlyAccess } = usePermissions();
  const projectId = parseInt(params.id as string);
  
  const {
    currentProject,
    isLoading,
    error,
    fetchProjectById,
    clearError,
  } = useProjectStore();

  const [tabValue, setTabValue] = React.useState(0);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);
  const [statusChangeSuccess, setStatusChangeSuccess] = React.useState<string | null>(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = React.useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProjectById(projectId);
    }
  }, [projectId, fetchProjectById]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEditProject = () => {
    setEditModalOpen(true);
  };

  const handleChangeStatus = () => {
    setStatusModalOpen(true);
  };

  const handleStatusChangeSuccess = () => {
    setStatusChangeSuccess('Project status updated successfully');
    setTimeout(() => setStatusChangeSuccess(null), 5000);
    if (projectId) {
      fetchProjectById(projectId);
    }
  };

  const handleAssignmentSuccess = () => {
    if (projectId) {
      fetchProjectById(projectId);
    }
  };

  const handleModalSuccess = () => {
    if (projectId) {
      fetchProjectById(projectId);
    }
  };

  const canEdit = canEditProjects;

  // Check if user has permission to view projects
  if (!canViewProjects) {
    return (
      <UnauthorizedAccess 
        message="You don't have permission to view project details. Please contact your administrator for access."
      />
    );
  }

  if (isLoading && !currentProject) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentProject) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Project not found or you don&apos;t have permission to view it.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Read-only Access Alert */}
      {isReadOnlyAccess() && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
        >
          You have read-only access to this project. Contact your administrator to request edit permissions.
        </Alert>
      )}

      {/* Breadcrumbs */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link
            color="inherit"
            href="/dashboard"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Dashboard
          </Link>
          <Link
            color="inherit"
            href="/projects"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <FolderIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Projects
          </Link>
          <Link
            color="inherit"
            href={`/clients/${currentProject.clientId}`}
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <BusinessIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            {currentProject.clientName}
          </Link>
          <Typography color="text.primary">{currentProject.name}</Typography>
        </Breadcrumbs>
      </Box>

      {/* Page Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => router.back()}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {currentProject.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={currentProject.status}
                color="primary"
                size="small"
              />
              <Chip
                label={currentProject.projectType}
                variant="outlined"
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                {new Date(currentProject.startDate).toLocaleDateString()} - {new Date(currentProject.endDate).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
        </Box>
        
        {canEdit && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<StatusIcon />}
              onClick={handleChangeStatus}
            >
              Change Status
            </Button>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEditProject}
            >
              Edit Project
            </Button>
          </Box>
        )}
      </Box>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          onClose={clearError}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* Success Display */}
      {statusChangeSuccess && (
        <Alert 
          severity="success" 
          onClose={() => setStatusChangeSuccess(null)}
          sx={{ mb: 3 }}
        >
          {statusChangeSuccess}
        </Alert>
      )}

      {/* Project Overview Card */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="project details tabs">
            <Tab label="Overview" icon={<AnalyticsIcon />} {...a11yProps(0)} />
            <Tab label="Team Assignments" icon={<AssignmentIcon />} {...a11yProps(1)} />
            <Tab label="Timeline" icon={<TimelineIcon />} {...a11yProps(2)} />
            <Tab label="History" icon={<HistoryIcon />} {...a11yProps(3)} />
            <Tab label="Documents" icon={<AttachFileIcon />} {...a11yProps(4)} />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        <CustomTabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
            {/* Project Information */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Project Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Project Name
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {currentProject.name}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Client
                    </Typography>
                    <Link
                      href={`/clients/${currentProject.clientId}`}
                      sx={{ display: 'block', mb: 2 }}
                    >
                      {currentProject.clientName}
                    </Link>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Project Type
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {currentProject.projectType}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      label={currentProject.status}
                      color="primary"
                      size="small"
                      sx={{ mb: 2 }}
                    />
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Start Date
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {new Date(currentProject.startDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      End Date
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {new Date(currentProject.endDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body1">
                      {currentProject.description || 'No description provided.'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Project Statistics */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Project Statistics
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total FTE Assigned
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {currentProject.totalFteAssigned?.toFixed(1) || '0.0'}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Team Members
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {currentProject.assignments?.length || 0}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Days Remaining
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {Math.max(0, Math.ceil((new Date(currentProject.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* SOW Information */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Statement of Work
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    SOW Name
                  </Typography>
                  <Link
                    href={`/sows/${currentProject.sowId}`}
                    sx={{ display: 'block', mb: 2 }}
                  >
                    {currentProject.sowName}
                  </Link>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    SOW Status
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    Active
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </CustomTabPanel>

        {/* Team Assignments Tab */}
        <CustomTabPanel value={tabValue} index={1}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Team Assignments
                </Typography>
                {canEdit && (
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => setAssignmentModalOpen(true)}
                  >
                    Manage Assignments
                  </Button>
                )}
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {currentProject.assignments && currentProject.assignments.length > 0 ? (
                <List>
                  {currentProject.assignments.map((assignment, index) => (
                    <ListItem key={index} divider>
                      <ListItemAvatar>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={assignment.userName}
                        secondary={
                          <Box>
                            <Typography variant="body2" component="span">
                              {assignment.userEmail} • {assignment.role}
                            </Typography>
                            <br />
                            <Typography variant="body2" component="span" color="primary">
                              FTE: {assignment.fteAllocation?.toFixed(1) || '0.0'}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No team members assigned to this project yet.
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Assignment Timeline */}
          {currentProject.assignments && currentProject.assignments.length > 0 && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <AssignmentTimeline
                  assignments={currentProject.assignments}
                  projectStartDate={currentProject.startDate}
                  projectEndDate={currentProject.endDate}
                />
              </CardContent>
            </Card>
          )}

          {/* Assignment History */}
          {currentProject.assignments && currentProject.assignments.length > 0 && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <AssignmentHistory
                  assignments={currentProject.assignments}
                />
              </CardContent>
            </Card>
          )}

          {/* Team Capacity */}
          {currentProject.assignments && currentProject.assignments.length > 0 && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <TeamCapacity
                  assignments={currentProject.assignments}
                />
              </CardContent>
            </Card>
          )}
        </CustomTabPanel>

        {/* Timeline Tab */}
        <CustomTabPanel value={tabValue} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Project Timeline
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Timeline visualization will be implemented in a future release.
              </Typography>
            </CardContent>
          </Card>
        </CustomTabPanel>

        {/* History Tab */}
        <CustomTabPanel value={tabValue} index={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Project History
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Project activity history will be implemented in a future release.
              </Typography>
            </CardContent>
          </Card>
        </CustomTabPanel>

        {/* Documents Tab */}
        <CustomTabPanel value={tabValue} index={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Project Documents
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Document management will be implemented in a future release.
              </Typography>
            </CardContent>
          </Card>
        </CustomTabPanel>
      </Paper>

      {/* Edit Modal */}
      <ProjectEditModal
        open={editModalOpen}
        project={currentProject}
        onClose={() => setEditModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      {/* Status Modal */}
      <ProjectStatusModal
        open={statusModalOpen}
        project={currentProject}
        onClose={() => setStatusModalOpen(false)}
        onSuccess={handleStatusChangeSuccess}
      />

      {/* Team Assignment Modal */}
      <TeamAssignmentModal
        open={assignmentModalOpen}
        project={currentProject}
        onClose={() => setAssignmentModalOpen(false)}
        onSuccess={handleAssignmentSuccess}
      />
    </Box>
  );
}