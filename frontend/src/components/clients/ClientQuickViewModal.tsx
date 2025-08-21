import RoleGuard from '@/components/auth/RoleGuard';
import { Client } from '@/types/client';
import {
    Business as BusinessIcon,
    Close as CloseIcon,
    Edit as EditIcon,
    Work as ProjectIcon,
    Schedule as ScheduleIcon,
} from '@mui/icons-material';
import {
    Avatar,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    List,
    ListItem,
    ListItemText,
    Stack,
    Typography,
} from '@mui/material';
import React from 'react';

interface ClientQuickViewModalProps {
  open: boolean;
  client: Client | null;
  onClose: () => void;
  onEdit?: (client: Client) => void;
}

const ClientQuickViewModal: React.FC<ClientQuickViewModalProps> = ({
  open,
  client,
  onClose,
  onEdit,
}) => {
  if (!client) return null;

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'success' : 'error';
  };

  const getRelationTypeColor = (relationType: string) => {
    switch (relationType) {
      case 'Customer': return 'primary';
      case 'Partner': return 'secondary';
      case 'Internal': return 'info';
      default: return 'default';
    }
  };

  const getRelationTypeIcon = (relationType: string) => {
    switch (relationType) {
      case 'Customer': return <BusinessIcon />;
      case 'Partner': return <BusinessIcon />;
      case 'Internal': return <BusinessIcon />;
      default: return <BusinessIcon />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar 
              sx={{ 
                bgcolor: getRelationTypeColor(client.relationType) + '.main',
                width: 48,
                height: 48 
              }}
            >
              {getRelationTypeIcon(client.relationType)}
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {client.name}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                <Chip 
                  label={client.status} 
                  color={getStatusColor(client.status)}
                  size="small"
                  variant="filled"
                />
                <Chip 
                  label={client.relationType} 
                  color={getRelationTypeColor(client.relationType)}
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </Box>
          </Box>
          <RoleGuard allowedRoles={['HR', 'PC']}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => onEdit?.(client)}
              size="small"
            >
              Edit
            </Button>
          </RoleGuard>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            {/* Basic Information */}
            <Box>
              <Typography variant="h6" gutterBottom color="primary">
                Basic Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Client ID"
                    secondary={`#${client.id.toString().padStart(4, '0')}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Status"
                    secondary={
                      <Chip 
                        label={client.status} 
                        color={getStatusColor(client.status)}
                        size="small"
                      />
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Relation Type"
                    secondary={
                      <Chip 
                        label={client.relationType} 
                        color={getRelationTypeColor(client.relationType)}
                        size="small"
                        variant="outlined"
                      />
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Project Management Tool"
                    secondary={client.projectManagementTool || 'Not specified'}
                  />
                </ListItem>
              </List>
            </Box>

            {/* Project Information */}
            <Box>
              <Typography variant="h6" gutterBottom color="primary">
                Project Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <ProjectIcon fontSize="small" />
                        <Typography variant="body2">Active Projects</Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="h6" color="primary">
                        {client.projectCount}
                      </Typography>
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Last Activity"
                    secondary={formatDate(client.lastActivity)}
                  />
                </ListItem>
              </List>
            </Box>
          </Box>

          {/* Comments Section */}
          {client.comments && (
            <Box>
              <Typography variant="h6" gutterBottom color="primary">
                Comments
              </Typography>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'grey.200'
                }}
              >
                <Typography variant="body2">
                  {client.comments}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Timeline Information */}
          <Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom color="primary">
              Timeline
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <ScheduleIcon fontSize="small" color="action" />
                  <Typography variant="body2" fontWeight="medium">
                    Created
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(client.createdAt)}
                </Typography>
              </Box>
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <ScheduleIcon fontSize="small" color="action" />
                  <Typography variant="body2" fontWeight="medium">
                    Last Updated
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(client.updatedAt)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} startIcon={<CloseIcon />}>
          Close
        </Button>
        <RoleGuard allowedRoles={['HR', 'PC']}>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => onEdit?.(client)}
          >
            Edit Client
          </Button>
        </RoleGuard>
      </DialogActions>
    </Dialog>
  );
};

export default ClientQuickViewModal;