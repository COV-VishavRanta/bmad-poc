'use client'

import { Error as ErrorIcon, ExpandLess, ExpandMore } from '@mui/icons-material'
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Collapse,
    Typography,
} from '@mui/material'
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    }
  }

  static getDerivedStateFromError(): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console and external service
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo,
    })

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo)
    }
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, you would send this to an error tracking service
    // like Sentry, LogRocket, Bugsnag, etc.
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }

    // Example: send to error tracking service
    // errorTrackingService.captureException(errorReport)
    console.error('Error report:', errorReport)
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    })
  }

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }))
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
          p={3}
        >
          <Card sx={{ maxWidth: 600, width: '100%' }}>
            <CardContent>
              <Alert
                severity="error"
                icon={<ErrorIcon />}
                sx={{ mb: 2 }}
              >
                <Typography variant="h6" component="div" gutterBottom>
                  Something went wrong
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
                </Typography>
              </Alert>

              <Box display="flex" gap={2} flexDirection="column">
                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={this.handleRetry}
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => window.location.reload()}
                  >
                    Refresh Page
                  </Button>
                </Box>

                {process.env.NODE_ENV === 'development' && (
                  <>
                    <Button
                      variant="text"
                      onClick={this.toggleDetails}
                      startIcon={
                        this.state.showDetails ? <ExpandLess /> : <ExpandMore />
                      }
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      {this.state.showDetails ? 'Hide' : 'Show'} Error Details
                    </Button>

                    <Collapse in={this.state.showDetails}>
                      <Box
                        sx={{
                          bgcolor: 'grey.100',
                          p: 2,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'grey.300',
                        }}
                      >
                        <Typography variant="subtitle2" gutterBottom>
                          Error Message:
                        </Typography>
                        <Typography
                          variant="body2"
                          component="pre"
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            mb: 2,
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {this.state.error?.message}
                        </Typography>

                        <Typography variant="subtitle2" gutterBottom>
                          Stack Trace:
                        </Typography>
                        <Typography
                          variant="body2"
                          component="pre"
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            mb: 2,
                            whiteSpace: 'pre-wrap',
                            maxHeight: '200px',
                            overflow: 'auto',
                          }}
                        >
                          {this.state.error?.stack}
                        </Typography>

                        {this.state.errorInfo && (
                          <>
                            <Typography variant="subtitle2" gutterBottom>
                              Component Stack:
                            </Typography>
                            <Typography
                              variant="body2"
                              component="pre"
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                whiteSpace: 'pre-wrap',
                                maxHeight: '200px',
                                overflow: 'auto',
                              }}
                            >
                              {this.state.errorInfo.componentStack}
                            </Typography>
                          </>
                        )}
                      </Box>
                    </Collapse>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary