'use client';

import { ClientContact, ClientWithDetails } from '@/types/client';
import {
    AccountTree as AccountTreeIcon,
    Email as EmailIcon,
    MoreVert as MoreVertIcon,
    Person as PersonIcon,
    Phone as PhoneIcon,
    Star as StarIcon,
    TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    IconButton,
    Tooltip,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

interface ClientRelationshipVisualizationProps {
  client: ClientWithDetails;
  onRefresh: () => void;
}

interface ContactHierarchyNode {
  contact: ClientContact;
  level: number;
  children: ContactHierarchyNode[];
  isDecisionMaker: boolean;
  relationshipStrength: 'strong' | 'medium' | 'weak';
}

interface RelationshipMetrics {
  totalContacts: number;
  activeContacts: number;
  decisionMakers: number;
  averageEngagement: number;
  lastInteraction: string;
  communicationChannels: string[];
}

function ContactNode({ node, onContactClick }: { 
  node: ContactHierarchyNode; 
  onContactClick: (contact: ClientContact) => void;
}) {
  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'success';
      case 'medium': return 'warning';
      case 'weak': return 'error';
      default: return 'default';
    }
  };

  const getInfluenceLevel = (isDecisionMaker: boolean, level: number) => {
    if (isDecisionMaker) return 'High';
    if (level <= 1) return 'Medium';
    return 'Low';
  };

  return (
    <Card 
      sx={{ 
        mb: 2, 
        cursor: 'pointer',
        '&:hover': { boxShadow: 3 },
        border: node.contact.isPrimary ? '2px solid' : '1px solid',
        borderColor: node.contact.isPrimary ? 'primary.main' : 'divider'
      }}
      onClick={() => onContactClick(node.contact)}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar 
            sx={{ 
              mr: 2,
              bgcolor: node.contact.isPrimary ? 'primary.main' : 'secondary.main'
            }}
          >
            <PersonIcon />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">
                {node.contact.name}
              </Typography>
              {node.contact.isPrimary && (
                <Tooltip title="Primary Contact">
                  <StarIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                </Tooltip>
              )}
              {node.isDecisionMaker && (
                <Chip 
                  label="Decision Maker" 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {node.contact.role} • {node.contact.department}
            </Typography>
          </Box>
          <IconButton size="small">
            <MoreVertIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          {node.contact.email && (
            <Chip
              icon={<EmailIcon />}
              label="Email"
              size="small"
              variant="outlined"
            />
          )}
          {node.contact.phone && (
            <Chip
              icon={<PhoneIcon />}
              label="Phone"
              size="small"
              variant="outlined"
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Chip
              label={`Influence: ${getInfluenceLevel(node.isDecisionMaker, node.level)}`}
              size="small"
              color={node.isDecisionMaker ? 'primary' : 'default'}
            />
            <Chip
              label={`Relationship: ${node.relationshipStrength}`}
              size="small"
              color={getStrengthColor(node.relationshipStrength)}
              variant="outlined"
            />
          </Box>
          <Chip
            label={node.contact.status}
            size="small"
            color={node.contact.status === 'active' ? 'success' : 'error'}
          />
        </Box>

        {node.children.length > 0 && (
          <Box sx={{ mt: 2, ml: 2, borderLeft: '2px solid', borderColor: 'divider', pl: 2 }}>
            {node.children.map((child) => (
              <ContactNode 
                key={child.contact.id} 
                node={child} 
                onContactClick={onContactClick}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function RelationshipMetricsCard({ metrics }: { metrics: RelationshipMetrics }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpIcon />
          Relationship Metrics
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: '1 1 50%', minWidth: '200px', textAlign: 'center', p: 2 }}>
            <Typography variant="h4" color="primary.main">
              {metrics.totalContacts}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Contacts
            </Typography>
          </Box>
          <Box sx={{ flex: '1 1 50%', minWidth: '200px', textAlign: 'center', p: 2 }}>
            <Typography variant="h4" color="success.main">
              {metrics.activeContacts}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Contacts
            </Typography>
          </Box>
          <Box sx={{ flex: '1 1 50%', minWidth: '200px', textAlign: 'center', p: 2 }}>
            <Typography variant="h4" color="warning.main">
              {metrics.decisionMakers}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Decision Makers
            </Typography>
          </Box>
          <Box sx={{ flex: '1 1 50%', minWidth: '200px', textAlign: 'center', p: 2 }}>
            <Typography variant="h4" color="info.main">
              {metrics.averageEngagement}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Engagement Score
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Communication Channels
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {metrics.communicationChannels.map((channel) => (
              <Chip key={channel} label={channel} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary">
          Last Interaction: {new Date(metrics.lastInteraction).toLocaleDateString()}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function ClientRelationshipVisualization({ 
  client, 
  onRefresh 
}: ClientRelationshipVisualizationProps) {
  const [contactHierarchy, setContactHierarchy] = useState<ContactHierarchyNode[]>([]);
  const [metrics, setMetrics] = useState<RelationshipMetrics | null>(null);

  useEffect(() => {
    const calculateRelationshipStrength = (contact: ClientContact): 'strong' | 'medium' | 'weak' => {
      let score = 0;
      
      if (contact.email) score += 1;
      if (contact.phone) score += 1;
      if (contact.role) score += 1;
      if (contact.department) score += 1;
      if (contact.isPrimary) score += 2;
      
      if (score >= 4) return 'strong';
      if (score >= 2) return 'medium';
      return 'weak';
    };

    const buildContactHierarchy = (contacts: ClientContact[]): ContactHierarchyNode[] => {
      // Simplified hierarchy building - in real app, this would use actual org data
      const primaryContact = contacts.find(c => c.isPrimary);
      const otherContacts = contacts.filter(c => !c.isPrimary);
      
      const nodes: ContactHierarchyNode[] = [];
      
      if (primaryContact) {
        nodes.push({
          contact: primaryContact,
          level: 0,
          children: otherContacts.slice(0, 3).map(contact => ({
            contact,
            level: 1,
            children: [],
            isDecisionMaker: contact.role?.toLowerCase().includes('manager') || contact.role?.toLowerCase().includes('director') || false,
            relationshipStrength: calculateRelationshipStrength(contact),
          })),
          isDecisionMaker: true,
          relationshipStrength: 'strong',
        });
      }
      
      // Add remaining contacts as top-level nodes
      const remainingContacts = otherContacts.slice(3);
      remainingContacts.forEach(contact => {
        nodes.push({
          contact,
          level: 0,
          children: [],
          isDecisionMaker: contact.role?.toLowerCase().includes('manager') || contact.role?.toLowerCase().includes('director') || false,
          relationshipStrength: calculateRelationshipStrength(contact),
        });
      });
      
      return nodes;
    };

    const calculateRelationshipMetrics = (clientData: ClientWithDetails): RelationshipMetrics => {
      const contacts = clientData.contacts || [];
      const activities = clientData.activities || [];
      
      const activeContacts = contacts.filter(c => c.status === 'active');
      const decisionMakers = contacts.filter(c => 
        c.role?.toLowerCase().includes('manager') || 
        c.role?.toLowerCase().includes('director') ||
        c.role?.toLowerCase().includes('ceo') ||
        c.role?.toLowerCase().includes('cto') ||
        c.isPrimary
      );
      
      const lastActivity = activities[0];
      const lastInteraction = lastActivity ? lastActivity.timestamp : clientData.updatedAt;
      
      const communicationChannels = [];
      if (contacts.some(c => c.email)) communicationChannels.push('Email');
      if (contacts.some(c => c.phone)) communicationChannels.push('Phone');
      communicationChannels.push('In-Person', 'Video Call');
      
      // Calculate engagement score (simplified)
      const completenessScore = contacts.reduce((acc, contact) => {
        let score = 0;
        if (contact.email) score += 1;
        if (contact.phone) score += 1;
        if (contact.role) score += 1;
        if (contact.department) score += 1;
        return acc + (score / 4);
      }, 0);
      
      const averageEngagement = contacts.length > 0 
        ? Math.round((completenessScore / contacts.length) * 100)
        : 0;
      
      return {
        totalContacts: contacts.length,
        activeContacts: activeContacts.length,
        decisionMakers: decisionMakers.length,
        averageEngagement,
        lastInteraction,
        communicationChannels,
      };
    };

    if (client.contacts) {
      // Build contact hierarchy (simplified algorithm)
      const hierarchy = buildContactHierarchy(client.contacts);
      setContactHierarchy(hierarchy);
      
      // Calculate relationship metrics
      const calculatedMetrics = calculateRelationshipMetrics(client);
      setMetrics(calculatedMetrics);
    }
  }, [client]);

  const handleContactClick = (contact: ClientContact) => {
    // Could open a detail modal or navigate to contact details
    console.log('Contact clicked:', contact);
  };

  if (!metrics) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>Loading relationship data...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountTreeIcon />
          Client Relationship Map
        </Typography>
        <Button onClick={onRefresh} variant="outlined" size="small">
          Refresh
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 400px', minWidth: '400px' }}>
          <RelationshipMetricsCard metrics={metrics} />
        </Box>
        
        <Box sx={{ flex: '2 1 600px', minWidth: '600px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Contact Hierarchy & Influence Map
              </Typography>
              
              {contactHierarchy.length > 0 ? (
                <Box>
                  {contactHierarchy.map((node) => (
                    <ContactNode 
                      key={node.contact.id} 
                      node={node} 
                      onContactClick={handleContactClick}
                    />
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <PersonIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No Contact Hierarchy Available
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add contacts to visualize the client relationship structure.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}