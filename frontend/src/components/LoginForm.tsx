/**
 * Login form component
 * 
 * Provides a user interface for authentication with email and password.
 * Includes form validation and error handling.
 */

'use client'

import { FormEvent, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface LoginFormProps {
  onLoginSuccess?: () => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Basic validation
    if (!email || !password) {
      setError('Please enter both email and password');
      setIsSubmitting(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    try {
      const success = await login(email, password);
      
      if (success) {
        setEmail('');
        setPassword('');
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        setError('Invalid email or password');
      }
    } catch (error) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-form">
      <h2>Login</h2>
      
      <form onSubmit={handleSubmit} className="login-form__form">
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="Enter your email"
            disabled={isLoading || isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            placeholder="Enter your password"
            disabled={isLoading || isSubmitting}
            required
          />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="submit-button"
          disabled={isLoading || isSubmitting}
        >
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="demo-credentials">
        <h3>Demo Credentials</h3>
        <div className="demo-list">
          <div className="demo-item">
            <strong>HR User:</strong> hr.demo@bmad.com / hrpassword123
          </div>
          <div className="demo-item">
            <strong>PC User:</strong> pc.demo@bmad.com / pcpassword123
          </div>
          <div className="demo-item">
            <strong>RM User:</strong> rm.demo@bmad.com / rmpassword123
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * User profile display component
 * 
 * Shows current user information and provides logout functionality.
 */
export function UserProfile() {
  const { user, logout, isLoading } = useAuth();

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="user-profile">
      <div className="user-info">
        <h3>Welcome, {user.full_name}</h3>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
        <p><strong>Status:</strong> {user.is_active ? 'Active' : 'Inactive'}</p>
      </div>
      
      <button
        onClick={handleLogout}
        className="logout-button"
        disabled={isLoading}
      >
        {isLoading ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  );
}