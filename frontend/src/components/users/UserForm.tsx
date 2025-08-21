'use client';

import { UserCreateFormData, userCreateSchema, UserUpdateFormData, userUpdateSchema } from '@/lib/validations/users';
import { UserRole } from '@/types/auth';
import { User, UserCreateRequest, UserUpdateRequest } from '@/types/users';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';

interface CreateUserFormProps {
  onSubmit: (data: UserCreateRequest) => Promise<void>;
  onCancel: () => void;
  mode: 'create';
  initialData?: never;
}

interface EditUserFormProps {
  initialData: User;
  onSubmit: (data: UserUpdateRequest) => Promise<void>;
  onCancel: () => void;
  mode: 'edit';
}

type UserFormProps = CreateUserFormProps | EditUserFormProps;

export function UserForm(props: UserFormProps) {
  const { onSubmit, onCancel, mode } = props;

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  if (mode === 'create') {
    return <CreateUserForm onSubmit={onSubmit} onCancel={onCancel} isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} submitError={submitError} setSubmitError={setSubmitError} />;
  } else {
    return <EditUserForm initialData={props.initialData} onSubmit={onSubmit} onCancel={onCancel} isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} submitError={submitError} setSubmitError={setSubmitError} />;
  }
}

interface CreateUserFormComponentProps {
  onSubmit: (data: UserCreateRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  submitError: string | null;
  setSubmitError: (value: string | null) => void;
}

function CreateUserForm({
  onSubmit,
  onCancel,
  isSubmitting,
  setIsSubmitting,
  submitError,
  setSubmitError,
}: CreateUserFormComponentProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<UserCreateFormData>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      email: '',
      full_name: '',
      role: 'PC' as UserRole,
      phone: '',
      department: '',
      hire_date: '',
    },
    mode: 'onChange',
  });

  const onFormSubmit = async (data: UserCreateFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit(data);
      reset();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onFormSubmit)} sx={{ pt: 2 }}>
      {submitError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError}
        </Alert>
      )}

      <Box display="flex" flexDirection="column" gap={3}>
        {/* Email */}
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Email Address"
              type="email"
              fullWidth
              required
              error={!!errors.email}
              helperText={errors.email?.message}
              disabled={isSubmitting}
            />
          )}
        />

        {/* Full Name */}
        <Controller
          name="full_name"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Full Name"
              fullWidth
              required
              error={!!errors.full_name}
              helperText={errors.full_name?.message}
              disabled={isSubmitting}
            />
          )}
        />

        {/* Role */}
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth required error={!!errors.role} disabled={isSubmitting}>
              <InputLabel>Role</InputLabel>
              <Select {...field} label="Role">
                <MenuItem value="HR">HR - Human Resources</MenuItem>
                <MenuItem value="PC">PC - Project Coordinator</MenuItem>
                <MenuItem value="RM">RM - Resource Manager</MenuItem>
              </Select>
              {errors.role && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                  {errors.role.message}
                </Typography>
              )}
            </FormControl>
          )}
        />

        {/* Phone */}
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
              disabled={isSubmitting}
              placeholder="+1234567890"
            />
          )}
        />

        {/* Department */}
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
              disabled={isSubmitting}
              placeholder="Engineering, Sales, Marketing, etc."
            />
          )}
        />

        {/* Hire Date */}
        <Controller
          name="hire_date"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Hire Date"
              type="date"
              fullWidth
              error={!!errors.hire_date}
              helperText={errors.hire_date?.message}
              disabled={isSubmitting}
              InputLabelProps={{
                shrink: true,
              }}
            />
          )}
        />

        {/* Action Buttons */}
        <Box display="flex" gap={2} justifyContent="flex-end" mt={2}>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!isValid || isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {isSubmitting ? 'Creating...' : 'Create User'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

interface EditUserFormComponentProps {
  initialData: User;
  onSubmit: (data: UserUpdateRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  submitError: string | null;
  setSubmitError: (value: string | null) => void;
}

function EditUserForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  setIsSubmitting,
  submitError,
  setSubmitError,
}: EditUserFormComponentProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<UserUpdateFormData>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      full_name: initialData.full_name,
      phone: initialData.phone || '',
      department: initialData.department || '',
      hire_date: initialData.hire_date ? initialData.hire_date.split('T')[0] : '',
    },
    mode: 'onChange',
  });

  const onFormSubmit = async (data: UserUpdateFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit(data);
      reset();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onFormSubmit)} sx={{ pt: 2 }}>
      {submitError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError}
        </Alert>
      )}

      <Box display="flex" flexDirection="column" gap={3}>
        {/* Email (Read-only) */}
        <TextField
          label="Email Address"
          value={initialData.email}
          fullWidth
          disabled
          helperText="Email cannot be changed"
        />

        {/* Full Name */}
        <Controller
          name="full_name"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Full Name"
              fullWidth
              error={!!errors.full_name}
              helperText={errors.full_name?.message}
              disabled={isSubmitting}
            />
          )}
        />

        {/* Role (Read-only) */}
        <TextField
          label="Role"
          value={`${initialData.role} - ${
            initialData.role === 'HR' ? 'Human Resources' :
            initialData.role === 'PC' ? 'Project Coordinator' : 'Resource Manager'
          }`}
          fullWidth
          disabled
          helperText="Role changes require separate authorization"
        />

        {/* Phone */}
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
              disabled={isSubmitting}
              placeholder="+1234567890"
            />
          )}
        />

        {/* Department */}
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
              disabled={isSubmitting}
              placeholder="Engineering, Sales, Marketing, etc."
            />
          )}
        />

        {/* Hire Date */}
        <Controller
          name="hire_date"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Hire Date"
              type="date"
              fullWidth
              error={!!errors.hire_date}
              helperText={errors.hire_date?.message}
              disabled={isSubmitting}
              InputLabelProps={{
                shrink: true,
              }}
            />
          )}
        />

        {/* Action Buttons */}
        <Box display="flex" gap={2} justifyContent="flex-end" mt={2}>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!isValid || isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {isSubmitting ? 'Updating...' : 'Update User'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}