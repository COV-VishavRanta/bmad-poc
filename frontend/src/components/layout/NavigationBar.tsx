import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import {
    AccountCircle as AccountIcon,
    Business as ClientsIcon,
    Dashboard as DashboardIcon,
    Group as GroupsIcon,
    Folder as ProjectsIcon,
    Settings as SettingsIcon,
    Assignment as SOWIcon,
    People as UsersIcon,
} from '@mui/icons-material';
import {
    AppBar,
    Box,
    Button,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    Toolbar,
    Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import React from 'react';

interface NavigationBarProps {
  currentPath?: string;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({ currentPath }) => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const {
    canViewProjects,
    canViewClients,
    canViewUsers,
    canViewSOWs,
    canViewAssignments,
    canAccessAdmin,
    isRM,
  } = usePermissions();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    handleMenuClose();
    router.push('/login');
  };

  const navigationItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: <DashboardIcon />,
      visible: true, // Everyone can see dashboard
    },
    {
      label: 'Projects',
      path: '/projects',
      icon: <ProjectsIcon />,
      visible: canViewProjects,
    },
    {
      label: 'Clients',
      path: '/clients',
      icon: <ClientsIcon />,
      visible: canViewClients,
    },
    {
      label: 'SOWs',
      path: '/sows',
      icon: <SOWIcon />,
      visible: canViewSOWs,
    },
    {
      label: 'Team Management',
      path: '/assignments',
      icon: <GroupsIcon />,
      visible: canViewAssignments || isRM, // RM should definitely see this
    },
    {
      label: 'Users',
      path: '/users',
      icon: <UsersIcon />,
      visible: canViewUsers,
    },
    {
      label: 'Admin',
      path: '/admin',
      icon: <SettingsIcon />,
      visible: canAccessAdmin,
    },
  ];

  const visibleItems = navigationItems.filter(item => item.visible);

  const getRoleColor = (role: string): 'primary' | 'secondary' | 'info' | 'default' => {
    switch (role) {
      case 'HR': return 'primary';
      case 'PC': return 'secondary';
      case 'RM': return 'info';
      default: return 'default';
    }
  };

  const isCurrentPath = (path: string) => {
    return currentPath === path || currentPath?.startsWith(path + '/');
  };

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        {/* Logo/Brand */}
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ flexGrow: 1, cursor: 'pointer' }}
          onClick={() => router.push('/dashboard')}
        >
          ClientOps
        </Typography>

        {/* Navigation Items */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, mr: 2 }}>
          {visibleItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              startIcon={item.icon}
              onClick={() => router.push(item.path)}
              variant={isCurrentPath(item.path) ? 'outlined' : 'text'}
              sx={{
                ...(isCurrentPath(item.path) && {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                }),
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* User Info */}
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={user.role}
              size="small"
              color={getRoleColor(user.role)}
              variant="outlined"
            />
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              color="inherit"
            >
              <AccountIcon />
            </IconButton>
          </Box>
        )}

        {/* User Menu */}
        <Menu
          id="menu-appbar"
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          {user && (
            <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2">{user.full_name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
          )}
          
          <MenuItem onClick={() => { router.push('/profile'); handleMenuClose(); }}>
            Profile
          </MenuItem>
          <MenuItem onClick={() => { router.push('/settings'); handleMenuClose(); }}>
            Settings
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};