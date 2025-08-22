import { usePermissions } from '@/hooks/usePermissions';
import { useProjectStore } from '@/store/projects';
import { Project, PROJECT_STATUS_CONFIG, PROJECT_TYPE_CONFIG } from '@/types/project';
import {
    Assignment as AssignmentIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Group as GroupIcon,
    MoreVert as MoreIcon,
    Person as PersonIcon,
    ChangeCircle as StatusIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Checkbox,
    Chip,
    IconButton,
    Link,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import React from 'react';
import { ProjectStatusModal } from './ProjectStatusModal';

interface ProjectTableProps {
  projects: Project[];
  onEdit?: (project: Project) => void;
}

export const ProjectTable: React.FC<ProjectTableProps> = ({ projects, onEdit }) => {
  const { canEditProjects, canDeleteProjects, isReadOnlyAccess } = usePermissions();
  const {
    searchParams,
    setSearchParams,
    selectedProjects,
    toggleProjectSelection,
    selectAllProjects,
    clearProjectSelection,
    totalCount,
  } = useProjectStore();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [menuProject, setMenuProject] = React.useState<Project | null>(null);
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);
  const [statusChangeSuccess, setStatusChangeSuccess] = React.useState<string | null>(null);

  const canEdit = canEditProjects;
  const canDelete = canDeleteProjects;
  const canViewAll = true; // All roles can view project details

  const handleChangePage = (_: unknown, newPage: number) => {
    setSearchParams({ page: newPage + 1 });
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams({ 
      pageSize: parseInt(event.target.value, 10),
      page: 1 
    });
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      selectAllProjects();
    } else {
      clearProjectSelection();
    }
  };

  const handleSelectProject = (projectId: number) => {
    toggleProjectSelection(projectId);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, project: Project) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuProject(project);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuProject(null);
  };

  const handleOpenStatusModal = () => {
    setStatusModalOpen(true);
    handleMenuClose();
  };

  const handleStatusChangeSuccess = () => {
    setStatusChangeSuccess('Project status updated successfully');
    setTimeout(() => setStatusChangeSuccess(null), 5000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusChip = (status: Project['status']) => {
    const config = PROJECT_STATUS_CONFIG[status];
    return (
      <Chip
        label={config.label}
        size="small"
        sx={{
          bgcolor: config.badge.includes('blue') ? 'info.light' :
                   config.badge.includes('green') ? 'success.light' :
                   config.badge.includes('orange') ? 'warning.light' :
                   config.badge.includes('gray') ? 'grey.light' :
                   'error.light',
          color: config.badge.includes('blue') ? 'info.dark' :
                 config.badge.includes('green') ? 'success.dark' :
                 config.badge.includes('orange') ? 'warning.dark' :
                 config.badge.includes('gray') ? 'grey.dark' :
                 'error.dark',
        }}
      />
    );
  };

  const getTypeIcon = (type: Project['projectType']) => {
    const config = PROJECT_TYPE_CONFIG[type];
    return (
      <Tooltip title={config.description}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span>{config.icon}</span>
          <Typography variant="body2">{config.label}</Typography>
        </Box>
      </Tooltip>
    );
  };

  const getCategoryDisplay = (project: Project) => {
    return project.groupId ? (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <GroupIcon fontSize="small" />
        <Typography variant="body2">Group</Typography>
      </Box>
    ) : (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <PersonIcon fontSize="small" />
        <Typography variant="body2">Individual</Typography>
      </Box>
    );
  };

  const isSelected = (projectId: number) => selectedProjects.includes(projectId);
  const isIndeterminate = selectedProjects.length > 0 && selectedProjects.length < projects.length;
  const isAllSelected = projects.length > 0 && selectedProjects.length === projects.length;

  return (
    <Box>
      {/* Read-only Access Alert */}
      {isReadOnlyAccess() && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
        >
          You have read-only access to project information. Contact your administrator to request edit permissions.
        </Alert>
      )}

      {/* Success Alert */}
      {statusChangeSuccess && (
        <Alert 
          severity="success" 
          onClose={() => setStatusChangeSuccess(null)}
          sx={{ mb: 2 }}
        >
          {statusChangeSuccess}
        </Alert>
      )}

      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={isIndeterminate}
                  checked={isAllSelected}
                  onChange={handleSelectAllClick}
                  inputProps={{ 'aria-label': 'select all projects' }}
                />
              </TableCell>
              <TableCell>Project Name</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>SOW</TableCell>
              <TableCell align="right">Total FTE</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {projects.map((project) => (
              <TableRow
                key={project.id}
                hover
                selected={isSelected(project.id)}
                sx={{ cursor: 'pointer' }}
                onClick={() => handleSelectProject(project.id)}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isSelected(project.id)}
                    onChange={() => handleSelectProject(project.id)}
                    inputProps={{ 'aria-labelledby': `project-${project.id}` }}
                  />
                </TableCell>
                
                <TableCell>
                  <Link
                    href={`/projects/${project.id}`}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ textDecoration: 'none', fontWeight: 'medium' }}
                  >
                    {project.name}
                  </Link>
                  {project.description && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {project.description}
                    </Typography>
                  )}
                </TableCell>
                
                <TableCell>
                  <Link
                    href={`/clients/${project.clientId}`}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ textDecoration: 'none' }}
                  >
                    {project.clientName}
                  </Link>
                </TableCell>
                
                <TableCell>
                  {getCategoryDisplay(project)}
                </TableCell>
                
                <TableCell>
                  {getStatusChip(project.status)}
                </TableCell>
                
                <TableCell>
                  {getTypeIcon(project.projectType)}
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(project.startDate)}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(project.endDate)}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Link
                    href={`/sows/${project.sowId}`}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ textDecoration: 'none' }}
                  >
                    {project.sowName}
                  </Link>
                </TableCell>
                
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="medium">
                    {project.totalFteAssigned?.toFixed(1) || '0.0'}
                  </Typography>
                </TableCell>
                
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={(event) => handleMenuOpen(event, project)}
                  >
                    <MoreIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            
            {projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No projects found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalCount}
        rowsPerPage={searchParams.pageSize || 10}
        page={(searchParams.page || 1) - 1}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {canViewAll && (
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <ViewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Details</ListItemText>
          </MenuItem>
        )}

        {canViewAll && (
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <AssignmentIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Assignments</ListItemText>
          </MenuItem>
        )}

        {canEdit && (
          <MenuItem onClick={() => {
            handleMenuClose();
            if (onEdit && menuProject) {
              onEdit(menuProject);
            }
          }}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Project</ListItemText>
          </MenuItem>
        )}

        {canEdit && (
          <MenuItem onClick={handleOpenStatusModal}>
            <ListItemIcon>
              <StatusIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Change Status</ListItemText>
          </MenuItem>
        )}

        {canDelete && (
          <MenuItem 
            onClick={handleMenuClose}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete Project</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Status Modal */}
      {menuProject && (
        <ProjectStatusModal
          open={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          project={menuProject}
          onSuccess={handleStatusChangeSuccess}
        />
      )}
    </Box>
  );
};