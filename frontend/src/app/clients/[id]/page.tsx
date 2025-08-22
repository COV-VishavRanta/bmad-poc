'use client';

import { usePermissions } from '@/components/auth/WithPermissions';
import ClientDashboard from '@/components/clients/ClientDashboard';
import ActivityTimeline from '@/components/common/ActivityTimeline';
import ClientContactsSection from '@/components/contacts/ClientContactsSection';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useClientDetails } from '@/hooks/useContacts';
import {
    ArrowBack as ArrowBackIcon,
    Assignment as AssignmentIcon,
    Business as BusinessIcon,
    Edit as EditIcon,
    Person as PersonIcon,
    Timeline as TimelineIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Breadcrumbs,
    Button,
    Card,
    CardContent,
    Chip,
    IconButton,
    Link,
    Typography,
} from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = parseInt(params.id as string);
  const { canAccess } = usePermissions();

  const {
    clientDetails,
    isLoading,
    error,
    refetch,
    clearError,
  } = useClientDetails(clientId);

  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'projects' | 'timeline'>('overview');

  useEffect(() => {
    if (clientId) {
      refetch();
    }
  }, [clientId, refetch]);

  if (isLoading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" onClose={clearError}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!clientDetails) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">
          Client not found
        </Alert>
      </Box>
    );
  }

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'success' : 'error';
  };

  const getRelationTypeColor = (relationType: string) => {
    switch (relationType) {
      case 'Customer':
        return 'primary';
      case 'Partner':
        return 'secondary';
      case 'Internal':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          color="inherit"
          href="/clients"
          onClick={(e) => {
            e.preventDefault();
            router.push('/clients');
          }}
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <BusinessIcon sx={{ mr: 0.5, fontSize: 16 }} />
          Clients
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
          <PersonIcon sx={{ mr: 0.5, fontSize: 16 }} />
          {clientDetails.name}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => router.push('/clients')}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {clientDetails.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={clientDetails.status}
                color={getStatusColor(clientDetails.status)}
                size="small"
              />
              <Chip
                label={clientDetails.relationType}
                color={getRelationTypeColor(clientDetails.relationType)}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`${clientDetails.contacts?.length || 0} Contact${clientDetails.contacts?.length === 1 ? '' : 's'}`}
                icon={<PersonIcon />}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`${clientDetails.projectCount || 0} Project${clientDetails.projectCount === 1 ? '' : 's'}`}
                icon={<AssignmentIcon />}
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>
        </Box>
        
        {canAccess({
          roles: ['HR', 'PC'],
          permissions: ['update:clients'],
          requireAll: false
        }) && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => {
              // TODO: Open edit client modal
              console.log('Edit client');
            }}
          >
            Edit Client
          </Button>
        )}
      </Box>

      {/* Client Overview Card */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Client Overview
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Status
              </Typography>
              <Chip
                label={clientDetails.status}
                color={getStatusColor(clientDetails.status)}
                size="small"
              />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Relation Type
              </Typography>
              <Chip
                label={clientDetails.relationType}
                color={getRelationTypeColor(clientDetails.relationType)}
                size="small"
              />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Created Date
              </Typography>
              <Typography variant="body1">
                {formatDate(clientDetails.createdAt)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Last Updated
              </Typography>
              <Typography variant="body1">
                {formatDate(clientDetails.updatedAt)}
              </Typography>
            </Box>
            {clientDetails.projectManagementTool && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Project Management Tool
                </Typography>
                <Typography variant="body1">
                  {clientDetails.projectManagementTool}
                </Typography>
              </Box>
            )}
            {clientDetails.comments && (
              <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Comments
                </Typography>
                <Typography variant="body1">
                  {clientDetails.comments}
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant={activeTab === 'overview' ? 'contained' : 'outlined'}
            startIcon={<BusinessIcon />}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </Button>
          <Button
            variant={activeTab === 'contacts' ? 'contained' : 'outlined'}
            startIcon={<PersonIcon />}
            onClick={() => setActiveTab('contacts')}
          >
            Contacts ({clientDetails.contacts?.length || 0})
          </Button>
          <Button
            variant={activeTab === 'projects' ? 'contained' : 'outlined'}
            startIcon={<AssignmentIcon />}
            onClick={() => setActiveTab('projects')}
          >
            Projects ({clientDetails.projectCount || 0})
          </Button>
          <Button
            variant={activeTab === 'timeline' ? 'contained' : 'outlined'}
            startIcon={<TimelineIcon />}
            onClick={() => setActiveTab('timeline')}
          >
            Activity Timeline
          </Button>
        </Box>
      </Box>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <ClientDashboard
          client={clientDetails}
          onRefresh={refetch}
        />
      )}
      {activeTab === 'contacts' && (
        <ClientContactsSection
          clientId={clientId}
          onContactChange={refetch}
        />
      )}

      {activeTab === 'projects' && (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Projects Section
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Project management integration will be implemented in future stories.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {activeTab === 'timeline' && (
        <Card>
          <CardContent>
            <ActivityTimeline
              activities={clientDetails.activities || []}
              isLoading={false}
              onRefresh={refetch}
            />
          </CardContent>
        </Card>
      )}
    </Box>
  );
}