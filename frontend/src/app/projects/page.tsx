'use client';

import { UnauthorizedAccess } from '@/components/common/UnauthorizedAccess';
import { ProjectActions } from '@/components/projects/ProjectActions';
import { ProjectEditModal } from '@/components/projects/ProjectEditModal';
import { ProjectFilters } from '@/components/projects/ProjectFilters';
import { ProjectFormModal } from '@/components/projects/ProjectFormModal';
import { ProjectStats } from '@/components/projects/ProjectStats';
import { ProjectTable } from '@/components/projects/ProjectTable';
import { usePermissions } from '@/hooks/usePermissions';
import { useProjectStore } from '@/store/projects';
import { Project } from '@/types/project';
import { Add as AddIcon, Download as DownloadIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import React, { useEffect } from 'react';

export default function ProjectsPage() {
  const {
    projects,
    isLoading,
    error,
    totalCount,
    selectedProjects,
    fetchProjects,
    clearError,
  } = useProjectStore();

  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (error) {
      // Auto-clear error after 5 seconds
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const { canViewProjects, canCreateProjects } = usePermissions();

  // Check if user has permission to view projects
  if (!canViewProjects) {
    return (
      <UnauthorizedAccess 
        message="You don't have permission to view projects. Please contact your administrator for access."
      />
    );
  }

  const handleCreateProject = () => {
    setCreateModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setEditModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchProjects(); // Refresh the project list
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Project Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and track project information across all clients
          </Typography>
        </Box>
        
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {canViewProjects && (
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              disabled={selectedProjects.length === 0}
            >
              Export Selected ({selectedProjects.length})
            </Button>
          )}
          
          {canCreateProjects && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateProject}
            >
              Create Project
            </Button>
          )}
        </Stack>
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

      <Stack spacing={3}>
        {/* Project Statistics */}
        <ProjectStats />

        {/* Filters and Actions */}
        <Paper sx={{ p: 3 }}>
          <ProjectFilters />
        </Paper>

        {/* Project Actions */}
        <ProjectActions />

        {/* Project Table */}
        <Paper sx={{ p: 0, overflow: 'hidden' }}>
          {isLoading && projects.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Loading projects...
              </Typography>
            </Box>
          ) : (
            <>
              <ProjectTable projects={projects} onEdit={handleEditProject} />
              
              {/* Results Summary */}
              {!isLoading && (
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Showing {projects.length} of {totalCount} projects
                    </Typography>
                    {selectedProjects.length > 0 && (
                      <Typography variant="body2" fontWeight="medium">
                        {selectedProjects.length} selected
                      </Typography>
                    )}
                  </Stack>
                </Box>
              )}
            </>
          )}
        </Paper>
      </Stack>

      {/* Modals */}
      <ProjectFormModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      <ProjectEditModal
        open={editModalOpen}
        project={editingProject}
        onClose={() => {
          setEditModalOpen(false);
          setEditingProject(null);
        }}
        onSuccess={handleModalSuccess}
      />
    </Box>
  );
}