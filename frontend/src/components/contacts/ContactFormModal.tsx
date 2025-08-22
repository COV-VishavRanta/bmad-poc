'use client';

import { useContacts } from '@/hooks/useContacts';
import { ContactFormDataInterface, contactFormSchema } from '@/lib/validations/contacts';
import { ClientContact } from '@/types/client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    TextField,
} from '@mui/material';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

interface ContactFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  clientId: number;
  contactData?: ClientContact | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ContactFormModal({
  open,
  mode,
  clientId,
  contactData,
  onClose,
  onSuccess,
}: ContactFormModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createContact, updateContact } = useContacts({ clientId });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormDataInterface>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: contactData?.name || '',
      email: contactData?.email || '',
      phone: contactData?.phone || '',
      role: contactData?.role || '',
      department: contactData?.department || '',
      isPrimary: contactData?.isPrimary || false,
      notes: contactData?.notes || '',
    },
  });

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  const onSubmit = async (data: ContactFormDataInterface) => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (mode === 'create') {
        await createContact(data);
      } else if (mode === 'edit' && contactData) {
        await updateContact(contactData.id, data);
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {mode === 'create' ? 'Add New Contact' : 'Edit Contact'}
      </DialogTitle>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Name Field */}
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Contact Name"
                  required
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />

            {/* Email Field */}
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email Address"
                  type="email"
                  fullWidth
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              )}
            />

            {/* Phone Field */}
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Phone Number"
                  fullWidth
                  error={!!errors.phone}
                  helperText={errors.phone?.message}
                />
              )}
            />

            {/* Role Field */}
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Role/Position"
                  fullWidth
                  error={!!errors.role}
                  helperText={errors.role?.message}
                />
              )}
            />

            {/* Department Field */}
            <Controller
              name="department"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Department"
                  fullWidth
                  error={!!errors.department}
                  helperText={errors.department?.message}
                />
              )}
            />

            {/* Primary Contact Checkbox */}
            <Controller
              name="isPrimary"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  }
                  label="Set as primary contact"
                />
              )}
            />

            {/* Notes Field */}
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Notes"
                  multiline
                  rows={3}
                  fullWidth
                  error={!!errors.notes}
                  helperText={errors.notes?.message}
                />
              )}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
          >
            {isSubmitting 
              ? (mode === 'create' ? 'Creating...' : 'Updating...')
              : (mode === 'create' ? 'Create Contact' : 'Update Contact')
            }
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}