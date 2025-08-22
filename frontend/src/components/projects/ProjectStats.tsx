import { useProjectStore } from '@/store/projects';
import { PROJECT_TYPE_CONFIG } from '@/types/project';
import {
    PlayArrow as ActiveIcon,
    CheckCircle as CompletedIcon,
    Pause as OnHoldIcon,
    FolderOpen as ProjectIcon,
} from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    Chip,
    Skeleton,
    Typography,
} from '@mui/material';
import React from 'react';

export const ProjectStats: React.FC = () => {
  const { projects, isLoading, totalCount } = useProjectStore();

  const stats = React.useMemo(() => {
    if (!projects.length) {
      return {
        total: 0,
        active: 0,
        planned: 0,
        onHold: 0,
        completed: 0,
        cancelled: 0,
        totalFte: 0,
        avgFtePerProject: 0,
      };
    }

    const statusCounts = projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      acc.totalFte += project.totalFteAssigned || 0;
      return acc;
    }, {} as Record<string, number> & { totalFte: number });

    return {
      total: totalCount,
      active: statusCounts.active || 0,
      planned: statusCounts.planned || 0,
      onHold: statusCounts.on_hold || 0,
      completed: statusCounts.completed || 0,
      cancelled: statusCounts.cancelled || 0,
      totalFte: statusCounts.totalFte,
      avgFtePerProject: projects.length > 0 ? statusCounts.totalFte / projects.length : 0,
    };
  }, [projects, totalCount]);

  const statCards = [
    {
      title: 'Total Projects',
      value: stats.total,
      icon: <ProjectIcon />,
      color: 'primary',
      description: 'All projects across clients',
    },
    {
      title: 'Active Projects',
      value: stats.active,
      icon: <ActiveIcon />,
      color: 'success',
      description: 'Currently in progress',
    },
    {
      title: 'On Hold',
      value: stats.onHold,
      icon: <OnHoldIcon />,
      color: 'warning',
      description: 'Temporarily paused',
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: <CompletedIcon />,
      color: 'info',
      description: 'Successfully finished',
    },
  ];

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent>
              <Skeleton variant="rectangular" width="100%" height={60} />
              <Skeleton variant="text" sx={{ mt: 1 }} />
              <Skeleton variant="text" width="60%" />
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Main Stats Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3 }}>
        {statCards.map((stat, index) => (
          <Card 
            key={index}
            sx={{ 
              height: '100%',
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4,
              },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: `${stat.color}.light`,
                    color: `${stat.color}.main`,
                    mr: 2,
                  }}
                >
                  {stat.icon}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4" component="div" color={`${stat.color}.main`}>
                    {stat.value}
                  </Typography>
                  <Typography variant="h6" color="text.primary">
                    {stat.title}
                  </Typography>
                </Box>
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                {stat.description}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Additional FTE Statistics */}
      {!isLoading && projects.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.primary" gutterBottom>
                Total FTE Allocated
              </Typography>
              <Typography variant="h4" component="div" color="primary.main">
                {stats.totalFte.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Across all active projects
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" color="text.primary" gutterBottom>
                Avg FTE per Project
              </Typography>
              <Typography variant="h4" component="div" color="secondary.main">
                {stats.avgFtePerProject.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Resource allocation average
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Project Type Distribution */}
      {!isLoading && projects.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Project Type Distribution
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
              {Object.entries(PROJECT_TYPE_CONFIG).map(([type, config]) => {
                const count = projects.filter(p => p.projectType === type).length;
                if (count === 0) return null;
                
                return (
                  <Chip
                    key={type}
                    label={`${config.icon} ${config.label}: ${count}`}
                    variant="outlined"
                    color="primary"
                  />
                );
              })}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};