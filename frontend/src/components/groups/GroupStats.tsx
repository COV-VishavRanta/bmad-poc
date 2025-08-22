import { useGroupStore } from '@/store/groups';
import {
    People as ActiveIcon,
    Archive as ArchivedIcon,
    Cancel as CancelledIcon,
    CheckCircle as CompletedIcon,
    FolderOpen as GroupIcon,
} from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    Skeleton,
    Typography,
} from '@mui/material';
import React from 'react';

export const GroupStats: React.FC = () => {
  const { groups, isLoading, totalCount } = useGroupStore();

  const stats = React.useMemo(() => {
    if (!groups.length) {
      return {
        total: 0,
        active: 0,
        completed: 0,
        cancelled: 0,
        archived: 0,
        totalProjects: 0,
        avgProjectsPerGroup: 0,
      };
    }

    const statusCounts = groups.reduce((acc, group) => {
      acc[group.status] = (acc[group.status] || 0) + 1;
      acc.totalProjects += (group as { activeProjectCount?: number }).activeProjectCount || 0;
      return acc;
    }, {} as Record<string, number> & { totalProjects: number });

    return {
      total: totalCount,
      active: statusCounts.active || 0,
      completed: statusCounts.completed || 0,
      cancelled: statusCounts.cancelled || 0,
      archived: statusCounts.archived || 0,
      totalProjects: statusCounts.totalProjects,
      avgProjectsPerGroup: groups.length > 0 ? statusCounts.totalProjects / groups.length : 0,
    };
  }, [groups, totalCount]);

  const statCards = [
    {
      title: 'Total Groups',
      value: stats.total,
      icon: <GroupIcon />,
      color: 'primary',
      description: 'All groups across clients',
    },
    {
      title: 'Active Groups',
      value: stats.active,
      icon: <ActiveIcon />,
      color: 'success',
      description: 'Currently active groups',
    },
    {
      title: 'Completed Groups',
      value: stats.completed,
      icon: <CompletedIcon />,
      color: 'info',
      description: 'Successfully completed groups',
    },
    {
      title: 'Cancelled Groups',
      value: stats.cancelled,
      icon: <CancelledIcon />,
      color: 'error',
      description: 'Cancelled or terminated groups',
    },
    {
      title: 'Archived Groups',
      value: stats.archived,
      icon: <ArchivedIcon />,
      color: 'default',
      description: 'Archived groups',
    },
    {
      title: 'Total Projects',
      value: stats.totalProjects,
      icon: <GroupIcon />,
      color: 'secondary',
      description: 'Projects across all groups',
    },
  ];

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index}>
            <CardContent>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" height={32} />
              <Skeleton variant="text" width="80%" />
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
      {statCards.map((stat) => (
        <Card key={stat.title} sx={{ position: 'relative', overflow: 'visible' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  {stat.title}
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {stat.value.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.description}
                </Typography>
              </Box>
              <Box sx={{ 
                color: stat.color === 'primary' ? 'primary.main' :
                       stat.color === 'success' ? 'success.main' :
                       stat.color === 'info' ? 'info.main' :
                       stat.color === 'error' ? 'error.main' :
                       stat.color === 'secondary' ? 'secondary.main' :
                       'text.secondary',
                mt: 0.5 
              }}>
                {stat.icon}
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};