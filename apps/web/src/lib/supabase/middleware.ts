import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { requiresEmailVerification } from '@/lib/auth/emailVerification';
import { isAdminUser } from '@/lib/auth/isAdmin';
import { pathRequiresVerifiedEmail } from '@/lib/auth/protectedRoutes';
import { supabaseAuthCookieOptions } from '@/lib/supabase/authCookieOptions';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  // If credentials are not available, skip session update
  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookieOptions: supabaseAuthCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  if (
    user &&
    pathRequiresVerifiedEmail(pathname) &&
    requiresEmailVerification(user) &&
    !isAdminUser(user)
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/verify-email';
    redirectUrl.searchParams.set('email', user.email ?? '');
    redirectUrl.searchParams.set('reason', 'unverified');
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
