import { UserRole } from '@/types/auth';
import {
    Add as AddIcon,
    Analytics as AnalyticsIcon,
    People as ClientsIcon,
    Business as CompanyIcon,
    Dashboard as DashboardIcon,
    Edit as EditIcon,
    ExpandLess,
    ExpandMore,
    Assignment as ProjectsIcon,
    Security as SecurityIcon,
    Settings as SettingsIcon,
    Group as UsersIcon,
    Visibility as ViewIcon
} from '@mui/icons-material';
import {
    Badge,
    Box,
    Chip,
    Collapse,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import React from 'react';
import { usePermissions } from './WithPermissions';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  roles?: UserRole[];
  permissions?: string[];
  children?: NavigationItem[];
  badge?: {
    content: string | number;
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  };
  chip?: {
    label: string;
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
    variant?: 'filled' | 'outlined';
  };
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard'
  },
  {
    id: 'clients',
    label: 'Client Management',
    icon: <ClientsIcon />,
    roles: ['HR', 'PC', 'RM'],
    children: [
      {
        id: 'clients-list',
        label: 'View Clients',
        icon: <ViewIcon />,
        path: '/clients',
        roles: ['HR', 'PC', 'RM']
      },
      {
        id: 'clients-create',
        label: 'Add Client',
        icon: <AddIcon />,
        path: '/clients?action=create',
        roles: ['HR', 'PC']
      },
      {
        id: 'clients-reports',
        label: 'Client Reports',
        icon: <AnalyticsIcon />,
        path: '/clients/reports',
        roles: ['HR', 'PC'],
        chip: { label: 'New', color: 'primary' }
      }
    ]
  },
  {
    id: 'projects',
    label: 'Project Management',
    icon: <ProjectsIcon />,
    roles: ['HR', 'PC', 'RM'],
    children: [
      {
        id: 'projects-list',
        label: 'View Projects',
        icon: <ViewIcon />,
        path: '/projects',
        roles: ['HR', 'PC', 'RM']
      },
      {
        id: 'projects-create',
        label: 'Create Project',
        icon: <AddIcon />,
        path: '/projects/create',
        roles: ['HR', 'PC']
      }
    ]
  },
  {
    id: 'users',
    label: 'User Management',
    icon: <UsersIcon />,
    path: '/users',
    roles: ['HR'],
    badge: { content: 'Admin', color: 'error' }
  },
  {
    id: 'company',
    label: 'Company Settings',
    icon: <CompanyIcon />,
    roles: ['HR'],
    children: [
      {
        id: 'company-profile',
        label: 'Company Profile',
        icon: <EditIcon />,
        path: '/company/profile',
        roles: ['HR']
      },
      {
        id: 'company-security',
        label: 'Security Settings',
        icon: <SecurityIcon />,
        path: '/company/security',
        roles: ['HR']
      }
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics & Reports',
    icon: <AnalyticsIcon />,
    path: '/analytics',
    roles: ['HR', 'PC']
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <SettingsIcon />,
    path: '/settings'
  }
];

interface RoleBasedNavigationProps {
  dense?: boolean;
  showRoleBadges?: boolean;
}

const RoleBasedNavigation: React.FC<RoleBasedNavigationProps> = ({
  dense = false,
  showRoleBadges = false
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { canAccess, user } = usePermissions();
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

  const handleItemClick = (item: NavigationItem) => {
    if (item.children && item.children.length > 0) {
      // Toggle expansion for items with children
      const newExpanded = new Set(expandedItems);
      if (newExpanded.has(item.id)) {
        newExpanded.delete(item.id);
      } else {
        newExpanded.add(item.id);
      }
      setExpandedItems(newExpanded);
    } else if (item.path) {
      // Navigate to path
      router.push(item.path);
    }
  };

  const isItemActive = (item: NavigationItem): boolean => {
    if (item.path) {
      return pathname === item.path || pathname.startsWith(item.path + '/');
    }
    
    // Check if any children are active
    if (item.children) {
      return item.children.some(child => isItemActive(child));
    }
    
    return false;
  };

  const canUserAccessItem = (item: NavigationItem): boolean => {
    if (!item.roles && !item.permissions) {
      return true; // No restrictions
    }

    return canAccess({
      roles: item.roles,
      permissions: item.permissions,
      requireAll: false
    });
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0): React.ReactNode => {
    if (!canUserAccessItem(item)) {
      return null;
    }

    const isActive = isItemActive(item);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const accessibleChildren = hasChildren 
      ? item.children?.filter(child => canUserAccessItem(child)) || []
      : [];

    // Don't show parent items if no accessible children
    if (hasChildren && accessibleChildren.length === 0) {
      return null;
    }

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            onClick={() => handleItemClick(item)}
            selected={isActive && !hasChildren}
            sx={{
              minHeight: dense ? 32 : 48,
              pl: 2 + (level * 2),
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <ListItemIcon
                sx={{
                  minWidth: dense ? 40 : 56,
                  color: isActive ? 'primary.main' : 'inherit'
                }}
              >
                {item.icon}
              </ListItemIcon>
              
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: dense ? '0.875rem' : '1rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'primary.main' : 'inherit'
                }}
              />

              {/* Badges and Chips */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
                {item.badge && (
                  <Badge
                    badgeContent={item.badge.content}
                    color={item.badge.color || 'primary'}
                  />
                )}
                
                {item.chip && (
                  <Chip
                    label={item.chip.label}
                    color={item.chip.color || 'primary'}
                    variant={item.chip.variant || 'filled'}
                    size="small"
                  />
                )}

                {showRoleBadges && item.roles && (
                  <Chip
                    label={item.roles.join(', ')}
                    size="small"
                    variant="outlined"
                    color="secondary"
                    sx={{ fontSize: '0.75rem' }}
                  />
                )}
              </Box>
            </Box>

            {hasChildren && (
              isExpanded ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItemButton>
        </ListItem>

        {/* Render children */}
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {accessibleChildren.map(child => renderNavigationItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <List dense={dense}>
      {navigationItems
        .filter(item => canUserAccessItem(item))
        .map(item => renderNavigationItem(item))}
      
      {/* User Role Information */}
      {showRoleBadges && user && (
        <>
          <Divider sx={{ my: 2 }} />
          <ListItem>
            <ListItemText
              primary="Current Role"
              secondary={
                <Chip
                  label={user.role}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              }
              primaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
        </>
      )}
    </List>
  );
};

export default RoleBasedNavigation;