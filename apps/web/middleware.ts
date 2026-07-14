import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { isWwwApexAlias } from '@/lib/supabase/authRedirect';

/**
 * Keep users on the canonical host from NEXT_PUBLIC_APP_URL when the only
 * difference is www vs apex. Prevents OAuth PKCE cookies from being set on
 * one host while the callback lands on the other.
 */
function redirectWwwApexToCanonical(request: NextRequest): NextResponse | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '').trim();
  if (!appUrl) return null;

  let canonical: URL;
  try {
    canonical = new URL(appUrl);
  } catch {
    return null;
  }

  const requestHost = (request.headers.get('host') || '').split(':')[0].toLowerCase();
  const canonicalHost = canonical.host.toLowerCase();
  if (!requestHost || !isWwwApexAlias(requestHost, canonicalHost)) return null;

  const url = request.nextUrl.clone();
  url.protocol = canonical.protocol;
  url.host = canonical.host;
  return NextResponse.redirect(url, 308);
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  const canonicalRedirect = redirectWwwApexToCanonical(request);
  if (canonicalRedirect) return canonicalRedirect;

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
