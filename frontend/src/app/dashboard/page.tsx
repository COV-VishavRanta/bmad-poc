'use client';

import RoleGuard from '@/components/auth/RoleGuard';
import { useAuth } from '@/lib/auth';
import {
    Business,
    Dashboard as DashboardIcon,
    People,
    TrendingUp,
    Work,
} from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    Chip,
    Paper,
    Stack,
    Typography,
} from '@mui/material';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

function StatCard({ title, value, icon, color = 'primary' }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              p: 1,
              borderRadius: 1,
              bgcolor: `${color}.main`,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const getRoleChipColor = (role: string) => {
    switch (role) {
      case 'HR': return 'error';
      case 'PC': return 'primary';
      case 'RM': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.firstName || 'User'}!
        </Typography>
        {user && (
          <Chip
            label={`Role: ${user.role}`}
            color={getRoleChipColor(user.role)}
            variant="outlined"
            sx={{ mt: 1 }}
          />
        )}
      </Box>

      <Stack spacing={3}>
        {/* HR Dashboard Stats */}
        <RoleGuard allowedRoles={['HR']}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              HR Overview
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <StatCard
                title="Total Users"
                value="24"
                icon={<People />}
                color="primary"
              />
              <StatCard
                title="Active Clients"
                value="8"
                icon={<Business />}
                color="success"
              />
              <StatCard
                title="Active Projects"
                value="15"
                icon={<Work />}
                color="warning"
              />
              <StatCard
                title="Total Revenue"
                value="$2.4M"
                icon={<TrendingUp />}
                color="error"
              />
            </Stack>
          </Paper>
        </RoleGuard>

        {/* PC Dashboard Stats */}
        <RoleGuard allowedRoles={['PC']} fallback={null}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Project Coordinator Overview
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <StatCard
                title="My Clients"
                value="5"
                icon={<Business />}
                color="primary"
              />
              <StatCard
                title="Active Projects"
                value="8"
                icon={<Work />}
                color="success"
              />
              <StatCard
                title="SOWs in Review"
                value="3"
                icon={<DashboardIcon />}
                color="warning"
              />
            </Stack>
          </Paper>
        </RoleGuard>

        {/* RM Dashboard Stats */}
        <RoleGuard allowedRoles={['RM']} fallback={null}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Resource Manager Overview
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <StatCard
                title="Team Members"
                value="12"
                icon={<People />}
                color="primary"
              />
              <StatCard
                title="Active Assignments"
                value="18"
                icon={<Work />}
                color="success"
              />
              <StatCard
                title="Pending Reviews"
                value="5"
                icon={<DashboardIcon />}
                color="warning"
              />
            </Stack>
          </Paper>
        </RoleGuard>

        {/* Quick Actions */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <RoleGuard allowedRoles={['HR']}>
              <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <People sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
                  <Typography variant="subtitle2">
                    Manage Users
                  </Typography>
                </CardContent>
              </Card>
            </RoleGuard>

            <RoleGuard allowedRoles={['HR', 'PC']}>
              <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Business sx={{ fontSize: 40, mb: 1, color: 'success.main' }} />
                  <Typography variant="subtitle2">
                    Add Client
                  </Typography>
                </CardContent>
              </Card>
            </RoleGuard>

            <RoleGuard allowedRoles={['HR', 'PC']}>
              <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Work sx={{ fontSize: 40, mb: 1, color: 'warning.main' }} />
                  <Typography variant="subtitle2">
                    Create Project
                  </Typography>
                </CardContent>
              </Card>
            </RoleGuard>

            <RoleGuard allowedRoles={['HR', 'RM']}>
              <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <People sx={{ fontSize: 40, mb: 1, color: 'error.main' }} />
                  <Typography variant="subtitle2">
                    Assign Team
                  </Typography>
                </CardContent>
              </Card>
            </RoleGuard>
          </Stack>
        </Paper>

        {/* Role-specific information */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Role Information
          </Typography>
          
          <RoleGuard allowedRoles={['HR']}>
            <Typography variant="body1" color="text.secondary">
              As an <strong>HR Administrator</strong>, you have full access to all system features including user management, 
              client data, projects, SOWs, assignments, and reports.
            </Typography>
          </RoleGuard>

          <RoleGuard allowedRoles={['PC']}>
            <Typography variant="body1" color="text.secondary">
              As a <strong>Project Coordinator</strong>, you can manage clients, projects, and SOWs. 
              You have access to reports but cannot manage users or team assignments.
            </Typography>
          </RoleGuard>

          <RoleGuard allowedRoles={['RM']}>
            <Typography variant="body1" color="text.secondary">
              As a <strong>Resource Manager</strong>, you can manage team assignments, project timelines, 
              and team data. You have access to reports but cannot manage clients or SOWs.
            </Typography>
          </RoleGuard>
        </Paper>
      </Stack>
    </Box>
  );
}