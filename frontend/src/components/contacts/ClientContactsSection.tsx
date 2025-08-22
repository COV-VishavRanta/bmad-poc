'use client';

import { usePermissions } from '@/components/auth/WithPermissions';
import { useContacts } from '@/hooks/useContacts';
import { ClientContact } from '@/types/client';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Email as EmailIcon,
    MoreVert as MoreVertIcon,
    Person as PersonIcon,
    Phone as PhoneIcon,
    Star as StarIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    IconButton,
    Menu,
    MenuItem,
    Paper,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tooltip,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import ClientRelationshipVisualization from '../clients/ClientRelationshipVisualization';
import BulkContactOperations from './BulkContactOperations';

interface ClientContactsSectionProps {
  clientId: number;
  onContactChange: () => void;
}

interface ContactActionsMenuProps {
  contact: ClientContact;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onEdit: (contact: ClientContact) => void;
  onDelete: (contact: ClientContact) => void;
  onSetPrimary: (contact: ClientContact) => void;
}

function ContactActionsMenu({
  contact,
  anchorEl,
  onClose,
  onEdit,
  onDelete,
  onSetPrimary,
}: ContactActionsMenuProps) {
  const { canAccess } = usePermissions();

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
    >
      {canAccess({
        roles: ['HR', 'PC'],
        permissions: ['update:clients'],
        requireAll: false
      }) && (
        <>
          <MenuItem onClick={() => { onEdit(contact); onClose(); }}>
            <EditIcon sx={{ mr: 1 }} />
            Edit Contact
          </MenuItem>
          {!contact.isPrimary && (
            <MenuItem onClick={() => { onSetPrimary(contact); onClose(); }}>
              <StarIcon sx={{ mr: 1 }} />
              Set as Primary
            </MenuItem>
          )}
          <MenuItem onClick={() => { onDelete(contact); onClose(); }} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete Contact
          </MenuItem>
        </>
      )}
    </Menu>
  );
}

export default function ClientContactsSection({
  clientId,
  onContactChange,
}: ClientContactsSectionProps) {
  const { canAccess } = usePermissions();
  const [actionMenuAnchor, setActionMenuAnchor] = useState<HTMLElement | null>(null);
  const [actionMenuContact, setActionMenuContact] = useState<ClientContact | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<ClientContact | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const {
    contacts,
    isLoading,
    error,
    refetch,
    clearError,
    deleteContact,
    setPrimaryContact,
    isDeleting,
  } = useContacts({ clientId });

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleEditContact = (contact: ClientContact) => {
    // TODO: Implement edit functionality
    console.log('Edit contact:', contact);
  };

  const handleDeleteContact = (contact: ClientContact) => {
    setContactToDelete(contact);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;
    
    try {
      await deleteContact(contactToDelete.id);
      setDeleteConfirmOpen(false);
      setContactToDelete(null);
      onContactChange();
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };

  const handleSetPrimary = async (contact: ClientContact) => {
    try {
      await setPrimaryContact(contact.id);
      onContactChange();
    } catch (error) {
      console.error('Failed to set primary contact:', error);
    }
  };

  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, contact: ClientContact) => {
    setActionMenuAnchor(event.currentTarget);
    setActionMenuContact(contact);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setActionMenuContact(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading && contacts.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Contacts ({contacts.length})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage client contacts and designate primary contact
            </Typography>
          </Box>
          
          {canAccess({
            roles: ['HR', 'PC'],
            permissions: ['create:clients'],
            requireAll: false
          }) && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => console.log('TODO: Add contact functionality')}
              disabled={false}
            >
              Add Contact
            </Button>
          )}
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" onClose={clearError} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Contact List" />
          <Tab label="Relationship Map" />
        </Tabs>

        {/* Contact List Tab */}
        {activeTab === 0 && (
          <>
            {/* Bulk Operations Bar */}
            {selectedContacts.size > 0 && (
              <Box sx={{ 
                mb: 3, 
                p: 2, 
                bgcolor: 'primary.light', 
                borderRadius: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Typography variant="body2" color="primary.dark">
                  {selectedContacts.size} contact{selectedContacts.size !== 1 ? 's' : ''} selected
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setShowBulkOperations(true)}
                  >
                    Bulk Actions
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setSelectedContacts(new Set())}
                  >
                    Clear Selection
                  </Button>
                </Box>
              </Box>
            )}

        {/* Contacts Table */}
        {contacts.length > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedContacts.size === contacts.length && contacts.length > 0}
                      indeterminate={selectedContacts.size > 0 && selectedContacts.size < contacts.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedContacts(new Set(contacts.map(c => c.id)));
                        } else {
                          setSelectedContacts(new Set());
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Contact Info</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow 
                    key={contact.id}
                    selected={selectedContacts.has(contact.id)}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedContacts.has(contact.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedContacts);
                          if (e.target.checked) {
                            newSelected.add(contact.id);
                          } else {
                            newSelected.delete(contact.id);
                          }
                          setSelectedContacts(newSelected);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {contact.name}
                            {contact.isPrimary && (
                              <Tooltip title="Primary Contact">
                                <StarIcon sx={{ ml: 1, fontSize: 16, color: 'warning.main' }} />
                              </Tooltip>
                            )}
                          </Typography>
                          {contact.notes && (
                            <Typography variant="caption" color="text.secondary">
                              {contact.notes}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        {contact.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <EmailIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="body2">{contact.email}</Typography>
                          </Box>
                        )}
                        {contact.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="body2">{contact.phone}</Typography>
                          </Box>
                        )}
                        {!contact.email && !contact.phone && (
                          <Typography variant="body2" color="text.secondary">
                            No contact info
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {contact.role || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {contact.department || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={contact.status}
                        color={contact.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(contact.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleActionMenuOpen(e, contact)}
                        disabled={isDeleting}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <PersonIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No contacts yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add contacts to keep track of your client relationships
            </Typography>
            {canAccess({
              roles: ['HR', 'PC'],
              permissions: ['create:clients'],
              requireAll: false
            }) && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => console.log('TODO: Add first contact functionality')}
              >
                Add First Contact
              </Button>
            )}
          </Box>
        )}
        </>
        )}

        {/* Relationship Map Tab */}
        {activeTab === 1 && (
          <ClientRelationshipVisualization
            client={{
              id: clientId,
              name: `Client ${clientId}`, // This would be provided by parent
              status: 'active',
              relationType: 'Customer',
              projectCount: 0,
              lastActivity: new Date().toISOString(),
              contacts: contacts,
              activities: [], // This would be fetched separately
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }}
            onRefresh={refetch}
          />
        )}

        {/* Actions Menu */}
        {actionMenuContact && (
          <ContactActionsMenu
            contact={actionMenuContact}
            anchorEl={actionMenuAnchor}
            onClose={handleActionMenuClose}
            onEdit={handleEditContact}
            onDelete={handleDeleteContact}
            onSetPrimary={handleSetPrimary}
          />
        )}

        {/* Create Contact Modal */}
        {/* TODO: Implement ContactFormModal */}
        
        {/* Edit Contact Modal */}
        {/* TODO: Implement ContactFormModal */}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
        >
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Delete Contact
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              Are you sure you want to delete contact &quot;{contactToDelete?.name}&quot;? This action cannot be undone.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="contained" 
                color="error" 
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </Box>
          </Box>
        </Dialog>

        {/* Bulk Operations Modal */}
        {showBulkOperations && (
          <BulkContactOperations
            clientId={clientId}
            selectedContacts={contacts.filter(c => selectedContacts.has(c.id))}
            onOperationComplete={() => {
              setShowBulkOperations(false);
              setSelectedContacts(new Set());
              onContactChange();
            }}
            onClearSelection={() => {
              setShowBulkOperations(false);
              setSelectedContacts(new Set());
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}