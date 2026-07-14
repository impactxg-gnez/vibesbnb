import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { syncProfileFromAuthUser } from '@/lib/supabase/syncProfileFromAuthUser';
import { getAuthRedirectOrigin } from '@/lib/supabase/authRedirect';
import { resolvePostAuthRedirectPath, safeOAuthNextPath } from '@/lib/auth/oauthCallback';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const base = getAuthRedirectOrigin(request);
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeOAuthNextPath(searchParams.get('next'));
  const type = searchParams.get('type');
  const oauthError = searchParams.get('error');
  const oauthErrorDescription = searchParams.get('error_description');

  const loginWithError = (errorCode: string) => {
    const loginUrl = new URL('/login', base);
    loginUrl.searchParams.set('error', errorCode);
    if (next) loginUrl.searchParams.set('next', next);
    return NextResponse.redirect(loginUrl.toString());
  };

  if (oauthError) {
    console.error('[auth/callback] OAuth provider error:', oauthError, oauthErrorDescription);
    return loginWithError('oauth_denied');
  }

  if (!code) {
    return loginWithError('missing_code');
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://placeholder.supabase.co') {
    return loginWithError('not_configured');
  }

  const sessionCookies: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          sessionCookies.push({ name, value, options });
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const hasVerifier = request.cookies
      .getAll()
      .some((c) => c.name.includes('code-verifier'));
    console.error('[auth/callback] exchangeCodeForSession:', error.message, {
      hasVerifier,
      host: request.nextUrl.host,
    });
    return loginWithError('auth_callback');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await syncProfileFromAuthUser(user);

  const destPath = resolvePostAuthRedirectPath(user, next, type);
  const response = NextResponse.redirect(`${base}${destPath}`);

  sessionCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
