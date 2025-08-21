'use client';

import { userApi } from '@/lib/api/users';
import { UserHistoryEntry } from '@/types/users';
import {
    Add as AddIcon,
    Close as CloseIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import {
    Timeline,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
    TimelineItem,
    TimelineOppositeContent,
    TimelineSeparator,
} from '@mui/lab';
import {
    Alert,
    Box,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Skeleton,
    Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

interface UserHistoryDialogProps {
  open: boolean;
  userId: number | null;
  userName: string;
  onClose: () => void;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'created':
      return <AddIcon />;
    case 'updated':
    case 'role_changed':
    case 'status_changed':
      return <EditIcon />;
    case 'deleted':
    case 'deactivated':
      return <DeleteIcon />;
    default:
      return <PersonIcon />;
  }
};

const getActionColor = (action: string): 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
  switch (action) {
    case 'created':
      return 'success';
    case 'role_changed':
      return 'warning';
    case 'status_changed':
      return 'info';
    case 'deleted':
    case 'deactivated':
      return 'error';
    default:
      return 'primary';
  }
};

const formatActionDescription = (entry: UserHistoryEntry): string => {
  const changedBy = `User ID ${entry.changed_by}`;
  
  switch (entry.action) {
    case 'created':
      return `User account created by ${changedBy}`;
    case 'updated':
      return `Profile updated by ${changedBy}`;
    case 'role_changed':
      if (entry.old_values?.role && entry.new_values?.role) {
        return `Role changed from ${entry.old_values.role} to ${entry.new_values.role} by ${changedBy}`;
      }
      return `Role changed by ${changedBy}`;
    case 'status_changed':
      if (entry.old_values?.status && entry.new_values?.status) {
        return `Status changed from ${entry.old_values.status} to ${entry.new_values.status} by ${changedBy}`;
      }
      return `Status changed by ${changedBy}`;
    case 'password_changed':
      return `Password changed by ${changedBy}`;
    case 'deactivated':
      return `Account deactivated by ${changedBy}`;
    default:
      return `${entry.action} by ${changedBy}`;
  }
};

const formatFieldChanges = (entry: UserHistoryEntry) => {
  if (!entry.changed_fields || entry.changed_fields.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Changed fields:
      </Typography>
      {entry.changed_fields.map((field, index) => {
        const oldValue = entry.old_values?.[field];
        const newValue = entry.new_values?.[field];
        
        return (
          <Box key={`${field}-${index}`} sx={{ mb: 0.5 }}>
            <Typography variant="caption" component="span" sx={{ fontWeight: 'medium' }}>
              {field}:
            </Typography>
            {oldValue !== undefined && (
              <Chip 
                label={String(oldValue)} 
                size="small" 
                variant="outlined" 
                sx={{ mx: 0.5, fontSize: '0.7rem', height: '20px' }}
              />
            )}
            →
            {newValue !== undefined && (
              <Chip 
                label={String(newValue)} 
                size="small" 
                color="primary"
                sx={{ mx: 0.5, fontSize: '0.7rem', height: '20px' }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export function UserHistoryDialog({ open, userId, userName, onClose }: UserHistoryDialogProps) {
  const [history, setHistory] = useState<UserHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUserHistory = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await userApi.getUserHistory(userId);
      setHistory(response.history);
    } catch (err) {
      setError('Failed to load user history');
      console.error('Error loading user history:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId) {
      loadUserHistory();
    }
  }, [open, userId, loadUserHistory]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            User History - {userName}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading ? (
          <Box>
            {[...Array(5)].map((_, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Skeleton variant="circular" width={24} height={24} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="60%" />
              </Box>
            ))}
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : history.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No history records found for this user.
          </Alert>
        ) : (
          <Timeline>
            {history.map((entry, index) => (
              <TimelineItem key={index}>
                <TimelineOppositeContent color="text.secondary" sx={{ maxWidth: '120px', px: 1 }}>
                  <Typography variant="caption">
                    {formatDate(entry.changed_at)}
                  </Typography>
                  {entry.ip_address && (
                    <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                      {entry.ip_address}
                    </Typography>
                  )}
                </TimelineOppositeContent>
                
                <TimelineSeparator>
                  <TimelineDot color={getActionColor(entry.action)}>
                    {getActionIcon(entry.action)}
                  </TimelineDot>
                  {index < history.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                
                <TimelineContent>
                  <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                      {formatActionDescription(entry)}
                    </Typography>
                    
                    {formatFieldChanges(entry)}
                    
                    {entry.user_agent && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        User Agent: {entry.user_agent.length > 50 
                          ? `${entry.user_agent.substring(0, 50)}...` 
                          : entry.user_agent}
                      </Typography>
                    )}
                  </Paper>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </DialogContent>
    </Dialog>
  );
}