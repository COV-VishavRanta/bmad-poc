export type UserRole = 'HR' | 'PC' | 'RM';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: string;
  last_login?: Date;
  // Legacy properties for backward compatibility
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  sessionExpiry: Date;
}

export interface AuthError {
  message: string;
  code?: string;
  field?: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
}

export interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole) => boolean;
}

export type AuthStore = AuthState & AuthActions;

export interface RouteConfig {
  path: string;
  roles: UserRole[];
  requiresAuth: boolean;
}

export interface NavigationItem {
  label: string;
  href: string;
  icon?: string;
  roles: UserRole[];
  children?: NavigationItem[];
}