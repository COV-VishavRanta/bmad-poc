'use client';

import { useAuth } from '@/lib/auth';
import { LoginFormData, loginSchema } from '@/lib/validations/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Email,
    Lock,
    Visibility,
    VisibilityOff,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    CircularProgress,
    IconButton,
    InputAdornment,
    Link as MuiLink,
    TextField,
    Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface LoginFormProps {
  redirectTo?: string;
  onSuccess?: () => void;
}

export default function LoginForm({ redirectTo = '/dashboard', onSuccess }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { login, error, clearError, isLoading } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError();
      await login(data);
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(redirectTo);
      }
    } catch (err) {
      const error = err as { field?: string; message?: string };
      if (error?.field) {
        setError(error.field as keyof LoginFormData, {
          message: error.message || 'An error occurred',
        });
      }
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const isFormLoading = isLoading || isSubmitting;

  return (
    <Card
      sx={{
        maxWidth: 400,
        width: '100%',
        mx: 'auto',
        mt: 4,
        boxShadow: 3,
      }}
    >
      <CardHeader
        title={
          <Typography variant="h4" component="h1" textAlign="center" gutterBottom>
            Sign In
          </Typography>
        }
        subheader={
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Enter your credentials to access the system
          </Typography>
        }
        sx={{ pb: 1 }}
      />
      
      <CardContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              onClose={clearError}
            >
              {error.message}
            </Alert>
          )}

          <TextField
            {...register('email')}
            fullWidth
            label="Email Address"
            type="email"
            autoComplete="email"
            autoFocus
            error={!!errors.email}
            helperText={errors.email?.message}
            disabled={isFormLoading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email color={errors.email ? 'error' : 'action'} />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
            aria-describedby="email-error-text"
          />

          <TextField
            {...register('password')}
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            error={!!errors.password}
            helperText={errors.password?.message}
            disabled={isFormLoading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color={errors.password ? 'error' : 'action'} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={handleTogglePasswordVisibility}
                    edge="end"
                    disabled={isFormLoading}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
            aria-describedby="password-error-text"
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isFormLoading}
            sx={{ mb: 2, py: 1.5 }}
            aria-describedby="login-status"
          >
            {isFormLoading ? (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={20} color="inherit" />
                <span>Signing In...</span>
              </Box>
            ) : (
              'Sign In'
            )}
          </Button>

          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Need help?{' '}
              <MuiLink
                href="mailto:support@clientops.com"
                underline="hover"
                color="primary"
              >
                Contact Support
              </MuiLink>
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}