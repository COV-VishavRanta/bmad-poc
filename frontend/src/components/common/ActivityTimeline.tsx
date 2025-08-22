'use client';

import { ClientActivity } from '@/types/client';
import {
    Assignment as AssignmentIcon,
    Business as BusinessIcon,
    Edit as EditIcon,
    Person as PersonIcon,
    Refresh as RefreshIcon,
    Timeline as TimelineIcon,
} from '@mui/icons-material';
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    List,
    ListItem,
    Typography,
} from '@mui/material';

interface ActivityTimelineProps {
  activities: ClientActivity[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

interface ActivityItemProps {
  activity: ClientActivity;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'client_updated':
        return <BusinessIcon />;
      case 'contact_added':
      case 'contact_updated':
      case 'contact_deleted':
        return <PersonIcon />;
      case 'project_created':
        return <AssignmentIcon />;
      case 'status_changed':
        return <EditIcon />;
      default:
        return <TimelineIcon />;
    }
  };

  const getActivityColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  return (
    <ListItem sx={{ px: 0, py: 2, alignItems: 'flex-start' }}>
      <Avatar
        sx={{
          width: 40,
          height: 40,
          mr: 2,
          bgcolor: `${getActivityColor(activity.impact)}.light`,
          color: `${getActivityColor(activity.impact)}.main`,
        }}
      >
        {getActivityIcon(activity.type)}
      </Avatar>
      
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
            {activity.description}
          </Typography>
          <Chip
            label={activity.impact}
            size="small"
            color={getActivityColor(activity.impact)}
            variant="outlined"
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          by {activity.userName} • {formatTimestamp(activity.timestamp)}
        </Typography>
        
        {activity.details && Object.keys(activity.details).length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Details: {JSON.stringify(activity.details, null, 2)}
            </Typography>
          </Box>
        )}
      </Box>
    </ListItem>
  );
}

export default function ActivityTimeline({
  activities,
  isLoading = false,
  onRefresh,
}: ActivityTimelineProps) {
  const groupActivitiesByDate = (activities: ClientActivity[]) => {
    const groups: Record<string, ClientActivity[]> = {};
    
    activities.forEach((activity) => {
      const date = new Date(activity.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });
    
    return groups;
  };

  const formatDateGroup = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    if (dateString === today) {
      return 'Today';
    } else if (dateString === yesterday) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (activities.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <TimelineIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Activity Yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Client activity will appear here as interactions are made
        </Typography>
        {onRefresh && (
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
          >
            Refresh
          </Button>
        )}
      </Box>
    );
  }

  const groupedActivities = groupActivitiesByDate(activities);
  const sortedDates = Object.keys(groupedActivities).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Activity Timeline ({activities.length})
        </Typography>
        {onRefresh && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
          >
            Refresh
          </Button>
        )}
      </Box>

      {/* Timeline */}
      <Box>
        {sortedDates.map((date) => (
          <Box key={date} sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
              {formatDateGroup(date)}
            </Typography>
            
            <Card variant="outlined">
              <CardContent sx={{ p: 0 }}>
                <List>
                  {groupedActivities[date]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((activity) => (
                      <ActivityItem key={activity.id} activity={activity} />
                    ))}
                </List>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Load More (placeholder for pagination) */}
      {activities.length >= 20 && (
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button variant="outlined">
            Load More Activities
          </Button>
        </Box>
      )}
    </Box>
  );
}