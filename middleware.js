// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const authToken = request.cookies.get('auth_token');
  const url = request.nextUrl.clone();

  // Define protected routes
  const protectedRoutes = ['/dashboard'];

  // Redirect to login if trying to access protected route without auth_token
  if (protectedRoutes.includes(url.pathname) && (!authToken || authToken.value !== 'my-secret-token')) {
    url.pathname = '/'; // Redirect to the login page
    return NextResponse.redirect(url);
  }

  // Allow access to login page if already authenticated
  if (url.pathname === '/' && authToken && authToken.value === 'my-secret-token') {
    url.pathname = '/dashboard'; // Redirect to dashboard if already logged in
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard'], // Apply middleware to these paths
};
