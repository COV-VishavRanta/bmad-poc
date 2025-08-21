'use client';

import RoleGuard from '@/components/auth/RoleGuard';
import { useAuth } from '@/lib/auth';
import { NavigationItem } from '@/types/auth';
import {
  AccountCircle,
  Assessment,
  Assignment,
  Business,
  Dashboard,
  Group,
  Logout,
  Menu as MenuIcon,
  People,
  Schedule,
  Settings,
  Work,
} from '@mui/icons-material';
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'Dashboard',
    roles: ['HR', 'PC', 'RM'],
  },
  {
    label: 'Users',
    href: '/users',
    icon: 'People',
    roles: ['HR'],
  },
  {
    label: 'Clients',
    href: '/clients',
    icon: 'Business',
    roles: ['HR', 'PC'],
  },
  {
    label: 'Projects',
    href: '/projects',
    icon: 'Work',
    roles: ['HR', 'PC'],
  },
  {
    label: 'SOWs',
    href: '/sows',
    icon: 'Assignment',
    roles: ['HR', 'PC'],
  },
  {
    label: 'Assignments',
    href: '/assignments',
    icon: 'Schedule',
    roles: ['HR', 'RM'],
  },
  {
    label: 'Timelines',
    href: '/timelines',
    icon: 'Schedule',
    roles: ['HR', 'RM'],
  },
  {
    label: 'Teams',
    href: '/teams',
    icon: 'Group',
    roles: ['HR', 'RM'],
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: 'Assessment',
    roles: ['HR', 'PC', 'RM'],
  },
];

const ICON_MAP = {
  Dashboard,
  People,
  Business,
  Work,
  Assignment,
  Schedule,
  Group,
  Assessment,
  Settings,
};

interface MainNavigationProps {
  children: React.ReactNode;
}

export default function MainNavigation({ children }: MainNavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    await logout();
    router.push('/login');
  };

  const handleNavigate = (href: string) => {
    router.push(href);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = ICON_MAP[iconName as keyof typeof ICON_MAP];
    return IconComponent ? <IconComponent /> : <Dashboard />;
  };

  const getUserDisplayName = () => {
    if (!user) return 'User';
    return user.full_name || user.email || 'User';
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    if (user.full_name && user.full_name.trim()) {
      const names = user.full_name.trim().split(' ').filter(name => name.length > 0);
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
      }
      if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
      }
    }
    return user.email?.charAt(0).toUpperCase() || 'U';
  };

  const drawerContent = (
    <Box sx={{ width: 250 }}>
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6" component="h1">
          ClientOps
        </Typography>
        {user && (
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {user.role} - {getUserDisplayName()}
          </Typography>
        )}
      </Box>
      
      <List>
        {NAVIGATION_ITEMS.map((item) => (
          <RoleGuard key={item.href} allowedRoles={item.roles}>
            <ListItem disablePadding>
              <ListItemButton
                selected={pathname === item.href}
                onClick={() => handleNavigate(item.href)}
              >
                <ListItemIcon>
                  {getIcon(item.icon || '')}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          </RoleGuard>
        ))}
      </List>
      
      <Divider />
      
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavigate('/settings')}>
            <ListItemIcon>
              <Settings />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ClientOps
          </Typography>

          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                {getUserDisplayName()}
              </Typography>
              
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="user-menu"
                aria-haspopup="true"
                onClick={handleUserMenuOpen}
                color="inherit"
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                  {getUserInitials()}
                </Avatar>
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 250,
            mt: '64px', // Height of AppBar
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>

      {/* User Menu */}
      <Menu
        id="user-menu"
        anchorEl={userMenuAnchor}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
      >
        <MenuItem onClick={() => { handleUserMenuClose(); handleNavigate('/profile'); }}>
          <AccountCircle sx={{ mr: 1 }} />
          Profile
        </MenuItem>
        <MenuItem onClick={() => { handleUserMenuClose(); handleNavigate('/settings'); }}>
          <Settings sx={{ mr: 1 }} />
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1 }} />
          Sign Out
        </MenuItem>
      </Menu>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: '64px', // Height of AppBar
          ml: { md: '250px' }, // Width of drawer on desktop
          width: { md: 'calc(100% - 250px)' },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}