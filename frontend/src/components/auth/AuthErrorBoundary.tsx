'use client';

import {
    Error as ErrorIcon,
    Home,
    Refresh,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Container,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

export default class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('Auth Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      hasError: true,
      error,
      errorInfo: errorInfo.componentStack,
    });

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // logErrorToService(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

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
                maxWidth: 600,
                width: '100%',
              }}
            >
              <Box sx={{ mb: 4 }}>
                <ErrorIcon
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
                Something went wrong
              </Typography>

              <Typography variant="h6" color="text.secondary" gutterBottom>
                An authentication error occurred
              </Typography>

              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                We encountered an error while processing your authentication. 
                Please try refreshing the page or contact support if the problem persists.
              </Typography>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Alert severity="error" sx={{ mb: 4, textAlign: 'left' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Error Details (Development Only):
                  </Typography>
                  <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                    {this.state.error.message}
                  </Typography>
                  {this.state.errorInfo && (
                    <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', mt: 1 }}>
                      {this.state.errorInfo}
                    </Typography>
                  )}
                </Alert>
              )}

              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={this.handleRetry}
                >
                  Try Again
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<Home />}
                  onClick={this.handleGoHome}
                >
                  Go Home
                </Button>
              </Stack>
            </Paper>

            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Need help? Contact{' '}
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

    return this.props.children;
  }
}