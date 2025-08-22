'use client';

import { ClientContact, ClientWithDetails } from '@/types/client';
import {
    Assignment as AssignmentIcon,
    Email as EmailIcon,
    Person as PersonIcon,
    Phone as PhoneIcon,
    Star as StarIcon,
    Timeline as TimelineIcon,
    TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    LinearProgress,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Typography,
} from '@mui/material';

interface ClientDashboardProps {
  client: ClientWithDetails;
  onRefresh: () => void;
}

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

function MetricCard({ title, value, subtitle, icon, color = 'primary', trend }: MetricCardProps) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, mr: 2 }}>
            {icon}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h5" color={`${color}.main`} fontWeight="bold">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon 
              sx={{ 
                fontSize: 16, 
                color: trend.direction === 'up' ? 'success.main' : 'error.main',
                transform: trend.direction === 'down' ? 'rotate(180deg)' : 'none'
              }} 
            />
            <Typography variant="caption" color={trend.direction === 'up' ? 'success.main' : 'error.main'}>
              {Math.abs(trend.value)}% from last month
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

interface ContactHealthProps {
  contacts: ClientContact[];
}

function ContactHealth({ contacts }: ContactHealthProps) {
  const activeContacts = contacts.filter(c => c.status === 'active');
  const contactsWithEmail = contacts.filter(c => c.email);
  const contactsWithPhone = contacts.filter(c => c.phone);
  const primaryContact = contacts.find(c => c.isPrimary);
  
  const healthScore = contacts.length > 0 
    ? Math.round(((contactsWithEmail.length + contactsWithPhone.length + (primaryContact ? 1 : 0)) / (contacts.length * 2 + 1)) * 100)
    : 0;

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Contact Health
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Overall Health Score</Typography>
            <Typography variant="body2" color={`${getHealthColor(healthScore)}.main`}>
              {healthScore}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={healthScore} 
            color={getHealthColor(healthScore)}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Active Contacts
            </Typography>
            <Typography variant="h6">
              {activeContacts.length} / {contacts.length}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Primary Contact
            </Typography>
            <Typography variant="h6">
              {primaryContact ? '✓' : '✗'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              With Email
            </Typography>
            <Typography variant="h6">
              {contactsWithEmail.length}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              With Phone
            </Typography>
            <Typography variant="h6">
              {contactsWithPhone.length}
            </Typography>
          </Box>
        </Box>

        {primaryContact && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Primary Contact
            </Typography>
            <List dense>
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    <StarIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={primaryContact.name}
                  secondary={
                    <Box component="span">
                      {primaryContact.email && (
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <EmailIcon sx={{ fontSize: 12 }} />
                          {primaryContact.email}
                        </Box>
                      )}
                      {primaryContact.phone && (
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PhoneIcon sx={{ fontSize: 12 }} />
                          {primaryContact.phone}
                        </Box>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            </List>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClientDashboard({ client, onRefresh }: ClientDashboardProps) {
  const recentActivities = client.activities?.slice(0, 5) || [];
  const activeContacts = client.contacts?.filter(c => c.status === 'active') || [];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Client Overview
      </Typography>

      {/* Key Metrics */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: 3, 
        mb: 4 
      }}>
        <MetricCard
          title="Total Contacts"
          value={client.contacts?.length || 0}
          subtitle="All contacts"
          icon={<PersonIcon />}
          color="primary"
          trend={{ value: 12, direction: 'up' }}
        />
        
        <MetricCard
          title="Active Contacts"
          value={activeContacts.length}
          subtitle="Currently active"
          icon={<PersonIcon />}
          color="success"
        />
        
        <MetricCard
          title="Total Projects"
          value={client.projectCount || 0}
          subtitle="All projects"
          icon={<AssignmentIcon />}
          color="info"
          trend={{ value: 8, direction: 'up' }}
        />
        
        <MetricCard
          title="Recent Activities"
          value={recentActivities.length}
          subtitle="Last 30 days"
          icon={<TimelineIcon />}
          color="warning"
        />
      </Box>

      {/* Detailed Sections */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
        gap: 3 
      }}>
        <ContactHealth contacts={client.contacts || []} />
        
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            
            {recentActivities.length > 0 ? (
              <List>
                {recentActivities.map((activity) => (
                  <ListItem key={activity.id} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light' }}>
                        <TimelineIcon sx={{ fontSize: 16 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={activity.description}
                      secondary={`by ${activity.userName} • ${new Date(activity.timestamp).toLocaleDateString()}`}
                    />
                    <Chip
                      label={activity.impact}
                      size="small"
                      color={activity.impact === 'high' ? 'error' : activity.impact === 'medium' ? 'warning' : 'info'}
                      variant="outlined"
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <TimelineIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No recent activity
                </Typography>
              </Box>
            )}
            
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Button size="small" onClick={onRefresh}>
                View All Activity
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}