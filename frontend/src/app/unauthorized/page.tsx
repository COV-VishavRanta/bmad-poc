'use client';

import { useAuth } from '@/lib/auth';
import {
    ArrowBack,
    Home,
    Lock,
} from '@mui/icons-material';
import {
    Box,
    Button,
    Container,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <Container component="main" maxWidth="md">
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
        <Paper
          elevation={3}
          sx={{
            p: 6,
            textAlign: 'center',
            maxWidth: 500,
            width: '100%',
          }}
        >
          <Box sx={{ mb: 4 }}>
            <Lock
              sx={{
                fontSize: 64,
                color: 'error.main',
                mb: 2,
              }}
            />
          </Box>

          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 'bold', color: 'error.main' }}
          >
            Access Denied
          </Typography>

          <Typography variant="h6" color="text.secondary" gutterBottom>
            Insufficient Permissions
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            You don&apos;t have permission to access this page. 
            {user && (
              <>
                {' '}Your current role ({user.role}) does not allow access to this resource.
              </>
            )}
          </Typography>

          {user && (
            <Box sx={{ mb: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Signed in as: <strong>{user.email}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Role: <strong>{user.role}</strong>
              </Typography>
            </Box>
          )}

          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={handleGoBack}
            >
              Go Back
            </Button>

            <Button
              variant="contained"
              startIcon={<Home />}
              onClick={handleGoHome}
            >
              Dashboard
            </Button>

            <Button
              variant="text"
              color="error"
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </Stack>
        </Paper>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Need help? Contact your system administrator or{' '}
            <Typography
              component="a"
              href="mailto:support@clientops.com"
              sx={{ color: 'primary.main', textDecoration: 'none' }}
            >
              support@clientops.com
            </Typography>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}