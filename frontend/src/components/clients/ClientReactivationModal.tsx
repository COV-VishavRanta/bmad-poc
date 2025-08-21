import { useClientStore } from '@/store/clients';
import { Client } from '@/types/client';
import {
    Close,
    CheckCircle as ReactivateIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
    Typography
} from '@mui/material';
import React, { useState } from 'react';

interface ClientReactivationModalProps {
  open: boolean;
  client: Client;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClientReactivationModal: React.FC<ClientReactivationModalProps> = ({
  open,
  client,
  onClose,
  onSuccess
}) => {
  const { reactivateClient } = useClientStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState('');

  // Handle form submission
  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for reactivation');
      return;
    }

    setIsSubmitting(true);
    try {
      // Note: The API should be updated to accept a reason parameter
      await reactivateClient(client.id);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error reactivating client:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <ReactivateIcon color="success" />
            <Typography variant="h6">
              Reactivate Client: {client.name}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Info Alert */}
          <Alert severity="info">
            <Typography variant="body2">
              Reactivating this client will restore access to all associated data and 
              allow new projects and assignments to be created.
            </Typography>
          </Alert>

          {/* Client Info */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Client Details
            </Typography>
            <Typography variant="body1">
              <strong>Name:</strong> {client.name}
            </Typography>
            <Typography variant="body1">
              <strong>Status:</strong> {client.status}
            </Typography>
            <Typography variant="body1">
              <strong>Relation Type:</strong> {client.relationType}
            </Typography>
            <Typography variant="body1">
              <strong>Project Count:</strong> {client.projectCount}
            </Typography>
          </Box>

          {/* Reason Input */}
          <TextField
            label="Reason for Reactivation"
            multiline
            rows={3}
            fullWidth
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            helperText="Provide a clear explanation for why this client is being reactivated"
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="success"
          disabled={isSubmitting || !reason.trim()}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : <ReactivateIcon />}
        >
          {isSubmitting ? 'Reactivating...' : 'Reactivate Client'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientReactivationModal;