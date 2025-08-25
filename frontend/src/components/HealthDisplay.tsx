import type { ApiError, HealthCheckResponse } from '@/types/api';
import React from 'react';

interface HealthDisplayProps {
  healthData: HealthCheckResponse | null;
  error: ApiError | null;
  onRefresh: () => void;
  isLoading: boolean;
}

/**
 * Component for displaying API health status and data
 */
export const HealthDisplay: React.FC<HealthDisplayProps> = ({
  healthData,
  error,
  onRefresh,
  isLoading,
}) => {
  const getDisplayMessage = (): string => {
    if (isLoading) {
      return 'Checking backend status...';
    }
    
    if (error) {
      return `❌ ${error.message}`;
    }
    
    if (healthData) {
      return `✅ Backend Connected: ${JSON.stringify(healthData)}`;
    }
    
    return 'Ready to check backend status';
  };

  const getStatusClass = (): string => {
    if (isLoading) return 'loading';
    if (error) return 'error';
    if (healthData) return 'success';
    return 'loading';
  };

  return (
    <div className="api-test">
      <h2>Backend API Status</h2>
      <p className={getStatusClass()}>
        {getDisplayMessage()}
      </p>
      <button 
        onClick={onRefresh} 
        disabled={isLoading}
        type="button"
      >
        🔄 {isLoading ? 'Checking...' : 'Refresh'}
      </button>
    </div>
  );
};