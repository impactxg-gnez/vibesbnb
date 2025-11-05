import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // Update Supabase session
  const response = await updateSession(request);

  // Define signup-only pages
  const signupPages = ['/coming-soon', '/early-access', '/thank-you'];
  
  // Define main app pages (not accessible on signup site)
  const mainAppPages = [
    '/dashboard',
    '/bookings',
    '/listings',
    '/messages',
    '/profile',
    '/search',
    '/favorites',
    '/itinerary',
    '/admin',
    '/host',
  ];

  // If hostname contains "signup" (e.g., signup.vibesbnb.com or vibesbnb-signup.vercel.app)
  if (hostname.includes('signup')) {
    // Redirect root to /coming-soon
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/coming-soon', request.url));
    }

    // Block access to main app pages
    if (mainAppPages.some(page => pathname.startsWith(page))) {
      return NextResponse.redirect(new URL('/coming-soon', request.url));
    }
  }
  
  // If on main app (NOT signup subdomain)
  // Both signup pages and main app pages are accessible
  // This allows for flexible testing and future separation if needed

  return response;
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
