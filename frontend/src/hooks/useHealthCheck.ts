import type { ApiError, HealthCheckResponse, HealthStatus } from '@/types/api';
import { useCallback, useState } from 'react';

interface UseHealthCheckReturn {
  status: HealthStatus;
  healthData: HealthCheckResponse | null;
  error: ApiError | null;
  checkHealth: () => Promise<void>;
  isLoading: boolean;
}

/**
 * Custom hook for checking backend API health status
 * @returns Object containing health status, data, error state, and check function
 */
export const useHealthCheck = (): UseHealthCheckReturn => {
  const [status, setStatus] = useState<HealthStatus>('loading');
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const checkHealth = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/health`);
      
      if (response.ok) {
        const data: HealthCheckResponse = await response.json();
        setHealthData(data);
        setStatus('success');
      } else {
        const errorData: ApiError = {
          message: `Backend Error: ${response.status} ${response.statusText}`,
          status: response.status,
          statusText: response.statusText,
        };
        setError(errorData);
        setStatus('error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError({
        message: `Connection Failed: ${errorMessage}`,
      });
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    status,
    healthData,
    error,
    checkHealth,
    isLoading,
  };
};