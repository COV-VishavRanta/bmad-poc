import { ProjectAssignment } from '@/types/project';
import {
    CheckCircle as CheckCircleIcon,
    Group as GroupIcon,
    Person as PersonIcon,
    TrendingUp as TrendingUpIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    LinearProgress,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Typography,
} from '@mui/material';
import React from 'react';

interface TeamCapacityProps {
  assignments: ProjectAssignment[];
}

interface TeamMember {
  userId: number;
  userName: string;
  userEmail: string;
  totalFTE: number;
  activeAssignments: number;
  roles: string[];
  status: 'optimal' | 'high' | 'overallocated';
}

interface CapacityMetrics {
  totalTeamSize: number;
  totalFTEAllocated: number;
  averageFTEPerMember: number;
  peakUtilization: number;
  utilizationTrend: 'increasing' | 'decreasing' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
}

export const TeamCapacity: React.FC<TeamCapacityProps> = ({
  assignments,
}) => {
  const teamMembers = React.useMemo(() => {
    const memberMap = new Map<number, TeamMember>();

    assignments.forEach((assignment) => {
      const existing = memberMap.get(assignment.userId);
      if (existing) {
        existing.totalFTE += assignment.fteAllocation || 0;
        existing.activeAssignments += assignment.status === 'active' ? 1 : 0;
        if (!existing.roles.includes(assignment.role)) {
          existing.roles.push(assignment.role);
        }
      } else {
        memberMap.set(assignment.userId, {
          userId: assignment.userId,
          userName: assignment.userName,
          userEmail: assignment.userEmail,
          totalFTE: assignment.fteAllocation || 0,
          activeAssignments: assignment.status === 'active' ? 1 : 0,
          roles: [assignment.role],
          status: 'optimal',
        });
      }
    });

    // Determine status for each member
    Array.from(memberMap.values()).forEach((member) => {
      if (member.totalFTE > 1.0) {
        member.status = 'overallocated';
      } else if (member.totalFTE > 0.8) {
        member.status = 'high';
      } else {
        member.status = 'optimal';
      }
    });

    return Array.from(memberMap.values()).sort((a, b) => b.totalFTE - a.totalFTE);
  }, [assignments]);

  const capacityMetrics = React.useMemo((): CapacityMetrics => {
    const totalFTE = teamMembers.reduce((sum, member) => sum + member.totalFTE, 0);
    const overallocatedMembers = teamMembers.filter(m => m.status === 'overallocated').length;
    const highUtilizationMembers = teamMembers.filter(m => m.status === 'high').length;
    
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (overallocatedMembers > 0 || totalFTE > teamMembers.length * 0.9) {
      riskLevel = 'high';
    } else if (highUtilizationMembers > teamMembers.length * 0.5) {
      riskLevel = 'medium';
    }

    return {
      totalTeamSize: teamMembers.length,
      totalFTEAllocated: totalFTE,
      averageFTEPerMember: teamMembers.length > 0 ? totalFTE / teamMembers.length : 0,
      peakUtilization: Math.max(...teamMembers.map(m => m.totalFTE), 0),
      utilizationTrend: 'stable', // Mock data
      riskLevel,
    };
  }, [teamMembers]);

  const getStatusColor = (status: TeamMember['status']): 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'optimal':
        return 'success';
      case 'high':
        return 'warning';
      case 'overallocated':
        return 'error';
      default:
        return 'success';
    }
  };

  const getStatusIcon = (status: TeamMember['status']) => {
    switch (status) {
      case 'optimal':
        return <CheckCircleIcon fontSize="small" />;
      case 'high':
      case 'overallocated':
        return <WarningIcon fontSize="small" />;
      default:
        return <PersonIcon fontSize="small" />;
    }
  };

  const getRiskLevelColor = (riskLevel: string): 'success' | 'warning' | 'error' => {
    switch (riskLevel) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'error';
      default:
        return 'success';
    }
  };

  if (teamMembers.length === 0) {
    return (
      <Alert severity="info">
        No team assignments to analyze for capacity metrics.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Team Capacity & Utilization
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Analysis of team member allocation and capacity utilization
        </Typography>
      </Box>

      {/* Risk Level Alert */}
      {capacityMetrics.riskLevel !== 'low' && (
        <Alert 
          severity={capacityMetrics.riskLevel === 'high' ? 'error' : 'warning'} 
          sx={{ mb: 3 }}
          icon={<WarningIcon />}
        >
          <Typography variant="subtitle2">
            {capacityMetrics.riskLevel === 'high' ? 'High Risk' : 'Medium Risk'} Team Utilization Detected
          </Typography>
          <Typography variant="body2">
            {capacityMetrics.riskLevel === 'high' 
              ? 'Multiple team members are overallocated or team utilization is very high.'
              : 'Some team members have high utilization levels that should be monitored.'}
          </Typography>
        </Alert>
      )}

      {/* Capacity Overview */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, 
          gap: 3, 
          mb: 3 
        }}
      >
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <GroupIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" color="primary">
              {capacityMetrics.totalTeamSize}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Team Members
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <TrendingUpIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" color="info.main">
              {capacityMetrics.totalFTEAllocated.toFixed(1)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total FTE Allocated
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <PersonIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" color="warning.main">
              {capacityMetrics.averageFTEPerMember.toFixed(1)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Average FTE/Member
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <WarningIcon 
              color={getRiskLevelColor(capacityMetrics.riskLevel)}
              sx={{ fontSize: 40, mb: 1 }} 
            />
            <Typography 
              variant="h4" 
              color={`${getRiskLevelColor(capacityMetrics.riskLevel)}.main`}
            >
              {capacityMetrics.riskLevel.toUpperCase()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Risk Level
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Team Member Details */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Individual Capacity Analysis
          </Typography>
          
          <List>
            {teamMembers.map((member, index) => (
              <ListItem key={member.userId} divider={index < teamMembers.length - 1}>
                <ListItemIcon>
                  {getStatusIcon(member.status)}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body1" component="span">
                        {member.userName}
                      </Typography>
                      <Chip
                        label={member.status.replace('_', ' ').toUpperCase()}
                        size="small"
                        color={getStatusColor(member.status)}
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {member.userEmail} • {member.roles.join(', ')}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Typography variant="body2" sx={{ minWidth: '60px' }}>
                          FTE: {member.totalFTE.toFixed(1)}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(member.totalFTE * 100, 100)}
                          color={getStatusColor(member.status)}
                          sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {(member.totalFTE * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary">
                        Active assignments: {member.activeAssignments}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Capacity Recommendations
          </Typography>
          
          <List dense>
            {capacityMetrics.riskLevel === 'high' && (
              <ListItem>
                <ListItemIcon>
                  <WarningIcon color="error" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Immediate Action Required"
                  secondary="Consider redistributing workload or adjusting project timeline to reduce overallocation."
                />
              </ListItem>
            )}
            
            {capacityMetrics.peakUtilization > 1.0 && (
              <ListItem>
                <ListItemIcon>
                  <WarningIcon color="warning" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Overallocation Detected"
                  secondary={`Peak utilization is ${(capacityMetrics.peakUtilization * 100).toFixed(0)}%. Review assignments for affected team members.`}
                />
              </ListItem>
            )}
            
            {capacityMetrics.averageFTEPerMember < 0.5 && (
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="info" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Potential for Additional Assignments"
                  secondary="Team has capacity for additional work. Consider expanding project scope or adding more features."
                />
              </ListItem>
            )}
            
            {capacityMetrics.riskLevel === 'low' && (
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Optimal Team Utilization"
                  secondary="Current allocation is within healthy limits. Monitor for any changes in project requirements."
                />
              </ListItem>
            )}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};