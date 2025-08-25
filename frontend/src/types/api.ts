/**
 * API response types for the B-MAD Client Ops system
 */

export interface HealthCheckResponse {
  status: string;
  service: string;
  version: string;
  database: string;
}

export interface ApiError {
  message: string;
  status?: number;
  statusText?: string;
}

export type HealthStatus = 'loading' | 'success' | 'error';