/**
 * Main navigation component for the B-MAD system
 * 
 * Provides navigation links based on user role and authentication status
 */

'use client'

import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';

export function Navigation() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex space-x-6">
          <Link href="/" className="text-white hover:text-gray-300 font-semibold">
            Dashboard
          </Link>
          
          {/* Client Management - Available to all authenticated users */}
          <Link href="/clients" className="text-white hover:text-gray-300">
            Clients
          </Link>
          
          {/* Additional navigation items based on role */}
          {(user.role === 'HR' || user.role === 'PC') && (
            <>
              <Link href="/projects" className="text-white hover:text-gray-300">
                Projects
              </Link>
              <Link href="/resources" className="text-white hover:text-gray-300">
                Resources
              </Link>
            </>
          )}
          
          {user.role === 'HR' && (
            <Link href="/users" className="text-white hover:text-gray-300">
              Users
            </Link>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm">
            Welcome, {user.first_name} ({user.role})
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}