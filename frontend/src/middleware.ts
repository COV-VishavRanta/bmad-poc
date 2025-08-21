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
    
    // If there's a session cookie, let the client-side handle validation
    // The AuthProvider will validate the session and redirect if invalid
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