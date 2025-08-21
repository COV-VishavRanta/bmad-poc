'use client';

import LoginForm from '@/components/auth/LoginForm';
import { useIsAuthenticated } from '@/lib/auth';
import { Box, Container, Paper, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4,
        }}
      >
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 'bold', color: 'primary.main' }}
          >
            ClientOps
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Project Management System
          </Typography>
        </Box>

        <Paper elevation={0} sx={{ width: '100%', bgcolor: 'transparent' }}>
          <LoginForm />
        </Paper>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            © 2025 ClientOps. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}