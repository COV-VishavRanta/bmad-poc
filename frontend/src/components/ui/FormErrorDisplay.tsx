import {
    Error as ErrorIcon,
    ExpandLess as ExpandLessIcon,
    ExpandMore as ExpandMoreIcon,
    Info as InfoIcon,
    Refresh as RetryIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import {
    Alert,
    AlertTitle,
    Box,
    Button,
    Collapse,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import React from 'react';

export type ValidationErrorType = 'error' | 'warning' | 'info';

export interface ValidationError {
  field: string;
  message: string;
  type: ValidationErrorType;
  code?: string;
}

export interface NetworkError {
  message: string;
  code?: string;
  statusCode?: number;
  retryable?: boolean;
}

interface FormErrorDisplayProps {
  errors: ValidationError[];
  networkError?: NetworkError | null;
  onRetry?: () => void;
  onClearNetworkError?: () => void;
  showErrorSummary?: boolean;
  maxHeight?: string;
}

const FormErrorDisplay: React.FC<FormErrorDisplayProps> = ({
  errors,
  networkError,
  onRetry,
  onClearNetworkError,
  showErrorSummary = true,
  maxHeight = '300px',
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  const errorsByType = React.useMemo(() => {
    return {
      error: errors.filter(e => e.type === 'error'),
      warning: errors.filter(e => e.type === 'warning'),
      info: errors.filter(e => e.type === 'info'),
    };
  }, [errors]);

  const getIcon = (type: ValidationErrorType) => {
    switch (type) {
      case 'error': return <ErrorIcon color="error" fontSize="small" />;
      case 'warning': return <WarningIcon color="warning" fontSize="small" />;
      case 'info': return <InfoIcon color="info" fontSize="small" />;
      default: return <ErrorIcon color="error" fontSize="small" />;
    }
  };

  const hasErrors = errors.length > 0 || networkError;

  if (!hasErrors) return null;

  return (
    <Box>
      {/* Network Error Display */}
      {networkError && (
        <Alert 
          severity="error" 
          onClose={onClearNetworkError}
          sx={{ mb: 2 }}
          action={
            networkError.retryable && onRetry && (
              <Button
                color="inherit"
                size="small"
                startIcon={<RetryIcon />}
                onClick={onRetry}
              >
                Retry
              </Button>
            )
          }
        >
          <AlertTitle>Network Error</AlertTitle>
          {networkError.message}
          {networkError.statusCode && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              Error Code: {networkError.statusCode}
              {networkError.code && ` (${networkError.code})`}
            </Typography>
          )}
        </Alert>
      )}

      {/* Validation Errors Summary */}
      {errors.length > 0 && showErrorSummary && (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'error.main', mb: 2 }}>
          <Alert severity="error" sx={{ borderRadius: 0 }}>
            <AlertTitle>
              Please correct the following {errors.length} error{errors.length > 1 ? 's' : ''}:
            </AlertTitle>
            
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              {errorsByType.error.length > 0 && (
                <Typography variant="body2" color="error">
                  {errorsByType.error.length} error{errorsByType.error.length > 1 ? 's' : ''}
                </Typography>
              )}
              {errorsByType.warning.length > 0 && (
                <Typography variant="body2" color="warning.main">
                  {errorsByType.warning.length} warning{errorsByType.warning.length > 1 ? 's' : ''}
                </Typography>
              )}
              {errorsByType.info.length > 0 && (
                <Typography variant="body2" color="info.main">
                  {errorsByType.info.length} info
                </Typography>
              )}
            </Stack>

            <Button
              size="small"
              onClick={() => setShowDetails(!showDetails)}
              endIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ mt: 1, p: 0, minWidth: 'auto' }}
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>

            <Collapse in={showDetails}>
              <Box sx={{ mt: 2, maxHeight, overflow: 'auto' }}>
                {/* Error Messages */}
                {errorsByType.error.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      Errors:
                    </Typography>
                    <List dense>
                      {errorsByType.error.map((error, index) => (
                        <ListItem key={`error-${index}`} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {getIcon(error.type)}
                          </ListItemIcon>
                          <ListItemText
                            primary={`${error.field}: ${error.message}`}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Warning Messages */}
                {errorsByType.warning.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="warning.main" gutterBottom>
                      Warnings:
                    </Typography>
                    <List dense>
                      {errorsByType.warning.map((error, index) => (
                        <ListItem key={`warning-${index}`} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {getIcon(error.type)}
                          </ListItemIcon>
                          <ListItemText
                            primary={`${error.field}: ${error.message}`}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Info Messages */}
                {errorsByType.info.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="info.main" gutterBottom>
                      Information:
                    </Typography>
                    <List dense>
                      {errorsByType.info.map((error, index) => (
                        <ListItem key={`info-${index}`} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {getIcon(error.type)}
                          </ListItemIcon>
                          <ListItemText
                            primary={`${error.field}: ${error.message}`}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            </Collapse>
          </Alert>
        </Paper>
      )}
    </Box>
  );
};

export default FormErrorDisplay;