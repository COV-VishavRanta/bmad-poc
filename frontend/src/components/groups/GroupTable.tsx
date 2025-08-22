import { usePermissions } from '@/hooks/usePermissions';
import { useGroupStore } from '@/store/groups';
import { Group, GROUP_STATUS_CONFIG } from '@/types/group';
import {
    Business as ClientIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    MoreVert as MoreIcon,
    People as PeopleIcon,
    Assignment as ProjectIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';
import {
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
    Typography,
} from '@mui/material';
import React from 'react';

interface GroupTableProps {
  groups: (Group & { activeProjectCount?: number; teamMembersCount?: number })[];
  onEdit?: (group: Group) => void;
}

export const GroupTable: React.FC<GroupTableProps> = ({ groups, onEdit }) => {
  const { canEditGroups, canDeleteGroups } = usePermissions();
  const {
    searchParams,
    setSearchParams,
    selectedGroups,
    toggleGroupSelection,
    selectAllGroups,
    clearGroupSelection,
    totalCount,
  } = useGroupStore();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [menuGroup, setMenuGroup] = React.useState<Group | null>(null);

  const canEdit = canEditGroups;
  const canDelete = canDeleteGroups;
  const canViewAll = true; // All roles can view group details

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
      selectAllGroups();
    } else {
      clearGroupSelection();
    }
  };

  const handleSelectGroup = (groupId: number) => {
    toggleGroupSelection(groupId);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, group: Group) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuGroup(group);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuGroup(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusChip = (status: Group['status']) => {
    const config = GROUP_STATUS_CONFIG[status];
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

  const isSelected = (groupId: number) => selectedGroups.includes(groupId);
  const isIndeterminate = selectedGroups.length > 0 && selectedGroups.length < groups.length;
  const isAllSelected = groups.length > 0 && selectedGroups.length === groups.length;

  return (
    <Box>
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={isIndeterminate}
                  checked={isAllSelected}
                  onChange={handleSelectAllClick}
                  inputProps={{ 'aria-label': 'select all groups' }}
                />
              </TableCell>
              <TableCell>Group Name</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Active Projects</TableCell>
              <TableCell>Team Members</TableCell>
              <TableCell>Created Date</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((group) => (
              <TableRow
                key={group.id}
                hover
                selected={isSelected(group.id)}
                sx={{ cursor: 'pointer' }}
                onClick={() => handleSelectGroup(group.id)}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isSelected(group.id)}
                    onChange={() => handleSelectGroup(group.id)}
                    inputProps={{ 'aria-labelledby': `group-${group.id}` }}
                  />
                </TableCell>
                
                <TableCell>
                  <Link
                    href={`/groups/${group.id}`}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ textDecoration: 'none', fontWeight: 'medium' }}
                  >
                    {group.name}
                  </Link>
                  {group.description && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {group.description}
                    </Typography>
                  )}
                </TableCell>
                
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ClientIcon fontSize="small" color="action" />
                    <Link
                      href={`/clients/${group.clientId}`}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ textDecoration: 'none' }}
                    >
                      {group.clientName}
                    </Link>
                  </Box>
                </TableCell>
                
                <TableCell>
                  {getStatusChip(group.status)}
                </TableCell>
                
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ProjectIcon fontSize="small" color="action" />
                    <Typography variant="body2" fontWeight="medium">
                      {group.activeProjectCount || 0}
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PeopleIcon fontSize="small" color="action" />
                    <Typography variant="body2" fontWeight="medium">
                      {group.teamMembersCount || 0}
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(group.createdAt)}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {group.creatorName || 'System'}
                  </Typography>
                </TableCell>
                
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={(event) => handleMenuOpen(event, group)}
                  >
                    <MoreIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            
            {groups.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No groups found
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
              <ProjectIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Projects</ListItemText>
          </MenuItem>
        )}

        {canViewAll && (
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <PeopleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Team Members</ListItemText>
          </MenuItem>
        )}

        {canEdit && (
          <MenuItem onClick={() => {
            handleMenuClose();
            if (onEdit && menuGroup) {
              onEdit(menuGroup);
            }
          }}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Group</ListItemText>
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
            <ListItemText>Delete Group</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};