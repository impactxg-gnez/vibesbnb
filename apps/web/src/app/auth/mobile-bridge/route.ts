import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * Authenticated WebView entry: mobile sends Bearer access token (+ optional refresh_token query).
 * Sets Supabase cookie session and redirects to in-app web path.
 */
export async function GET(request: NextRequest) {
  const redirect = request.nextUrl.searchParams.get('redirect') || '/';
  const safeRedirect = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';
  const refreshToken = request.nextUrl.searchParams.get('refresh_token') || '';

  const authHeader = request.headers.get('Authorization');
  const accessToken = authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', safeRedirect);
    return NextResponse.redirect(loginUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const tokenClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await tokenClient.auth.getUser(accessToken);
  if (userError || !userData.user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', safeRedirect);
    return NextResponse.redirect(loginUrl);
  }

  const supabase = createClient();
  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return NextResponse.redirect(new URL(safeRedirect, request.url));
}
