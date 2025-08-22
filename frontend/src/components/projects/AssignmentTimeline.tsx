import { ProjectAssignment } from '@/types/project';
import {
    Group as GroupIcon,
    Person as PersonIcon,
    Warning as WarningIcon,
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
    Card,
    CardContent,
    Chip,
    Typography,
} from '@mui/material';
import React from 'react';

interface AssignmentTimelineProps {
  assignments: ProjectAssignment[];
  projectStartDate: string;
  projectEndDate: string;
}

interface TimelineEvent {
  date: string;
  type: 'assignment_start' | 'assignment_end' | 'overlap_warning';
  assignment: ProjectAssignment;
  description: string;
}

export const AssignmentTimeline: React.FC<AssignmentTimelineProps> = ({
  assignments,
  projectStartDate,
  projectEndDate,
}) => {
  const timelineEvents = React.useMemo(() => {
    const events: TimelineEvent[] = [];

    assignments.forEach((assignment) => {
      // Add start event
      events.push({
        date: assignment.startDate,
        type: 'assignment_start',
        assignment,
        description: `${assignment.userName} starts as ${assignment.role}`,
      });

      // Add end event
      events.push({
        date: assignment.endDate,
        type: 'assignment_end',
        assignment,
        description: `${assignment.userName} ends assignment`,
      });
    });

    // Sort events by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return events;
  }, [assignments]);

  const getConflictingAssignments = (date: string) => {
    return assignments.filter(assignment => {
      const assignmentStart = new Date(assignment.startDate);
      const assignmentEnd = new Date(assignment.endDate);
      const checkDate = new Date(date);
      return checkDate >= assignmentStart && checkDate <= assignmentEnd;
    });
  };

  const getTotalFTEForDate = (date: string) => {
    const activeAssignments = getConflictingAssignments(date);
    return activeAssignments.reduce((total, assignment) => total + (assignment.fteAllocation || 0), 0);
  };

  const getEventIcon = (event: TimelineEvent) => {
    switch (event.type) {
      case 'assignment_start':
        return <PersonIcon fontSize="small" />;
      case 'assignment_end':
        return <PersonIcon fontSize="small" />;
      default:
        return <WarningIcon fontSize="small" />;
    }
  };

  const getEventColor = (event: TimelineEvent) => {
    const totalFTE = getTotalFTEForDate(event.date);
    
    if (totalFTE > 3) return 'error';
    if (totalFTE > 2) return 'warning';
    if (event.type === 'assignment_start') return 'success';
    return 'grey';
  };

  if (assignments.length === 0) {
    return (
      <Alert severity="info">
        No team assignments to display in timeline.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Assignment Timeline
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Timeline view of team member assignments showing start and end dates
        </Typography>
        
        {/* Project Duration */}
        <Card variant="outlined" sx={{ mt: 2, mb: 2 }}>
          <CardContent sx={{ py: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip 
                icon={<GroupIcon />}
                label="Project Duration" 
                variant="outlined" 
                size="small"
              />
              <Typography variant="body2">
                {new Date(projectStartDate).toLocaleDateString()} - {new Date(projectEndDate).toLocaleDateString()}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Timeline position="right">
        {timelineEvents.map((event, index) => {
          const activeAssignments = getConflictingAssignments(event.date);
          const totalFTE = getTotalFTEForDate(event.date);
          const hasHighUtilization = totalFTE > 2;

          return (
            <TimelineItem key={`${event.assignment.id}-${event.type}-${index}`}>
              <TimelineOppositeContent sx={{ py: 2, px: 2, flex: 0.3 }}>
                <Typography variant="body2" color="text.secondary">
                  {new Date(event.date).toLocaleDateString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </Typography>
              </TimelineOppositeContent>

              <TimelineSeparator>
                <TimelineDot color={getEventColor(event)}>
                  {getEventIcon(event)}
                </TimelineDot>
                {index < timelineEvents.length - 1 && <TimelineConnector />}
              </TimelineSeparator>

              <TimelineContent sx={{ py: 2, px: 2 }}>
                <Card variant="outlined" sx={{ mb: 1 }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="subtitle2">
                        {event.description}
                      </Typography>
                      <Chip
                        label={`${(event.assignment.fteAllocation || 0).toFixed(1)} FTE`}
                        size="small"
                        variant="outlined"
                        color={event.type === 'assignment_start' ? 'success' : 'default'}
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {event.assignment.userEmail}
                    </Typography>

                    {hasHighUtilization && (
                      <Alert severity="warning" sx={{ mt: 1, py: 0.5 }}>
                        <Typography variant="caption">
                          High team utilization on this date: {totalFTE.toFixed(1)} FTE total
                          <br />
                          Active assignments: {activeAssignments.map(a => a.userName).join(', ')}
                        </Typography>
                      </Alert>
                    )}

                    {activeAssignments.length > 1 && !hasHighUtilization && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Concurrent assignments: {activeAssignments.length} ({totalFTE.toFixed(1)} FTE total)
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>

      {/* Summary Statistics */}
      <Card variant="outlined" sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Assignment Summary
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Total Assignments
              </Typography>
              <Typography variant="h4" color="primary">
                {assignments.length}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Active Assignments
              </Typography>
              <Typography variant="h4" color="success.main">
                {assignments.filter(a => a.status === 'active').length}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Peak FTE Utilization
              </Typography>
              <Typography variant="h4" color="warning.main">
                {Math.max(...timelineEvents.map(e => getTotalFTEForDate(e.date)), 0).toFixed(1)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};