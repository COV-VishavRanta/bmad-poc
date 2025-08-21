import { UserRole } from '@/types/auth';
import { NextRequest, NextResponse } from 'next/server';

// Protected routes configuration
const PROTECTED_ROUTES = [
  '/dashboard',
  '/users',
  '/clients',
  '/projects',
  '/sows',
  '/assignments',
  '/timelines',
  '/teams',
  '/reports',
  '/profile',
  '/settings',
];

// Role-based route access configuration
const ROLE_ROUTES: Record<string, UserRole[]> = {
  '/users': ['HR'],
  '/clients': ['HR', 'PC'],
  '/projects': ['HR', 'PC'],
  '/sows': ['HR', 'PC'],
  '/assignments': ['HR', 'RM'],
  '/timelines': ['HR', 'RM'],
  '/teams': ['HR', 'RM'],
  '/reports': ['HR', 'PC', 'RM'],
  '/dashboard': ['HR', 'PC', 'RM'],
  '/profile': ['HR', 'PC', 'RM'],
  '/settings': ['HR'],
};

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/unauthorized',
  '/api/health',
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

function getUserRoleFromToken(token: string | undefined): UserRole | null {
  if (!token) return null;
  
  try {
    // In a real implementation, you would decode and verify the JWT token
    // For now, we'll assume the session cookie contains role information
    // This would be handled by your backend authentication system
    
    // Placeholder implementation - in real app, decode JWT or make API call
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // return decoded.role;
    
    return null; // Will rely on client-side auth state for now
  } catch {
    return null;
  }
}

function hasRouteAccess(pathname: string, userRole: UserRole | null): boolean {
  if (!userRole) return false;
  
  // Find the most specific route match
  const routeKey = Object.keys(ROLE_ROUTES).find(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  
  if (!routeKey) {
    // If no specific route config, allow access to authenticated users
    return true;
  }
  
  const allowedRoles = ROLE_ROUTES[routeKey];
  return allowedRoles.includes(userRole);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and API routes (except auth)
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }
  
  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }
  
  // Check if route requires authentication
  if (isProtectedRoute(pathname)) {
    const token = request.cookies.get('clientops_session')?.value;
    
    // No session token - redirect to login
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // For now, we'll let the client-side handle role-based access
    // In a production app, you'd verify the token here and check roles
    const userRole = getUserRoleFromToken(token);
    
    // If we can determine the role from the token, check access
    if (userRole && !hasRouteAccess(pathname, userRole)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
  
  // Redirect root to dashboard for authenticated users
  if (pathname === '/') {
    const token = request.cookies.get('clientops_session')?.value;
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};