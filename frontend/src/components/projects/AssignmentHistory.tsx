import { ProjectAssignment } from '@/types/project';
import {
    Add as AddIcon,
    Edit as EditIcon,
    History as HistoryIcon,
    Person as PersonIcon,
    Remove as RemoveIcon,
} from '@mui/icons-material';
import {
    Alert,
    Avatar,
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Typography,
} from '@mui/material';
import React from 'react';

interface AssignmentHistoryProps {
  assignments: ProjectAssignment[];
}

interface HistoryEvent {
  id: string;
  date: string;
  type: 'added' | 'modified' | 'removed' | 'status_changed';
  assignment: ProjectAssignment;
  description: string;
  details?: string;
}

export const AssignmentHistory: React.FC<AssignmentHistoryProps> = ({
  assignments,
}) => {
  // Mock history events based on assignment data
  const historyEvents = React.useMemo(() => {
    const events: HistoryEvent[] = [];

    assignments.forEach((assignment) => {
      // Add creation event
      events.push({
        id: `${assignment.id}-created`,
        date: assignment.createdAt,
        type: 'added',
        assignment,
        description: `${assignment.userName} was assigned to the project`,
        details: `Role: ${assignment.role}, FTE: ${assignment.fteAllocation?.toFixed(1)}`,
      });

      // Add modification event if updated date is different from created date
      if (assignment.updatedAt !== assignment.createdAt) {
        events.push({
          id: `${assignment.id}-modified`,
          date: assignment.updatedAt,
          type: 'modified',
          assignment,
          description: `Assignment for ${assignment.userName} was updated`,
          details: `Current role: ${assignment.role}, FTE: ${assignment.fteAllocation?.toFixed(1)}`,
        });
      }

      // Add status change events
      if (assignment.status === 'completed') {
        events.push({
          id: `${assignment.id}-completed`,
          date: assignment.endDate,
          type: 'status_changed',
          assignment,
          description: `${assignment.userName}'s assignment was completed`,
          details: `Assignment ended as scheduled`,
        });
      } else if (assignment.status === 'inactive') {
        events.push({
          id: `${assignment.id}-inactive`,
          date: assignment.updatedAt,
          type: 'status_changed',
          assignment,
          description: `${assignment.userName}'s assignment was set to inactive`,
          details: `Assignment temporarily paused`,
        });
      }
    });

    // Sort events by date (newest first)
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return events;
  }, [assignments]);

  const getEventIcon = (type: HistoryEvent['type']) => {
    switch (type) {
      case 'added':
        return <AddIcon fontSize="small" color="success" />;
      case 'modified':
        return <EditIcon fontSize="small" color="info" />;
      case 'removed':
        return <RemoveIcon fontSize="small" color="error" />;
      case 'status_changed':
        return <HistoryIcon fontSize="small" color="warning" />;
      default:
        return <PersonIcon fontSize="small" />;
    }
  };

  const getEventColor = (type: HistoryEvent['type']) => {
    switch (type) {
      case 'added':
        return 'success';
      case 'modified':
        return 'info';
      case 'removed':
        return 'error';
      case 'status_changed':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusChip = (assignment: ProjectAssignment) => {
    const statusColors = {
      active: 'success' as const,
      inactive: 'warning' as const,
      completed: 'default' as const,
    };

    return (
      <Chip
        label={assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
        size="small"
        color={statusColors[assignment.status]}
        variant="outlined"
      />
    );
  };

  if (historyEvents.length === 0) {
    return (
      <Alert severity="info">
        No assignment history available.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Assignment History
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Chronological record of team assignment changes and updates
        </Typography>
      </Box>

      <List>
        {historyEvents.map((event, index) => (
          <React.Fragment key={event.id}>
            <ListItem alignItems="flex-start" sx={{ px: 0 }}>
              <ListItemIcon sx={{ mt: 1 }}>
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    bgcolor: `${getEventColor(event.type)}.light` 
                  }}
                >
                  {getEventIcon(event.type)}
                </Avatar>
              </ListItemIcon>

              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="body1" component="span">
                      {event.description}
                    </Typography>
                    {getStatusChip(event.assignment)}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {event.details}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(event.date).toLocaleDateString()} at {new Date(event.date).toLocaleTimeString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {event.assignment.userEmail}
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            </ListItem>
            {index < historyEvents.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>

      {/* Summary Card */}
      <Card variant="outlined" sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            History Summary
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Total Events
              </Typography>
              <Typography variant="h4" color="primary">
                {historyEvents.length}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Team Additions
              </Typography>
              <Typography variant="h4" color="success.main">
                {historyEvents.filter(e => e.type === 'added').length}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Modifications
              </Typography>
              <Typography variant="h4" color="info.main">
                {historyEvents.filter(e => e.type === 'modified').length}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};