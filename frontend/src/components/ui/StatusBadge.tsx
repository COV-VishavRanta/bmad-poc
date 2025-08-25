import type { HealthStatus } from '@/types/api';
import React from 'react';

interface StatusBadgeProps {
  status: HealthStatus;
  children: React.ReactNode;
}

/**
 * Status badge component for displaying health check status
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, children }) => {
  const getStatusClass = (status: HealthStatus): string => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'loading':
      default:
        return 'loading';
    }
  };

  return (
    <p className={getStatusClass(status)}>
      {children}
    </p>
  );
};