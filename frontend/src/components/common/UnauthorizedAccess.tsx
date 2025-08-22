import {
    ArrowBack as ArrowBackIcon,
    Block as BlockIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import React from 'react';

interface UnauthorizedAccessProps {
  message?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export const UnauthorizedAccess: React.FC<UnauthorizedAccessProps> = ({
  message = "You don't have permission to access this resource.",
  showBackButton = true,
  onBack
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        p: 3,
        textAlign: 'center',
      }}
    >
      <BlockIcon 
        sx={{ 
          fontSize: 80, 
          color: 'error.main', 
          mb: 2 
        }} 
      />
      
      <Typography variant="h4" gutterBottom color="error">
        Access Denied
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500 }}>
        {message}
      </Typography>
      
      <Alert severity="error" sx={{ mb: 3, maxWidth: 500 }}>
        Please contact your administrator if you believe you should have access to this resource.
      </Alert>
      
      {showBackButton && (
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Go Back
        </Button>
      )}
    </Box>
  );
};