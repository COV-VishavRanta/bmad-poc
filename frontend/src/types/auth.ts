/**
 * Authentication types for the frontend
 * 
 * Defines the data structures used for authentication,
 * including user data and API responses.
 */

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'HR' | 'PC' | 'RM';
  is_active: boolean;
  full_name: string;
  created_at: string;
  updated_at: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  message: string;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  user: User | null;
}

export interface LogoutResponse {
  message: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}