import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function baseUrl(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '').trim();
  if (fromEnv) return fromEnv;
  return new URL(request.url).origin;
}

/** Internal path only; avoids open redirects and bad URLs that become 404s */
function safeInternalPath(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

export async function GET(request: Request) {
  const base = baseUrl(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeInternalPath(searchParams.get('next'));
  const type = searchParams.get('type');

  const home = `${base}/`;

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const isEmailVerification =
        type === 'signup' ||
        type === 'email' ||
        (user?.email_confirmed_at &&
          new Date(user.email_confirmed_at).getTime() > Date.now() - 5 * 60 * 1000);

      if (isEmailVerification) {
        const celebrate = new URL('/auth/verify-success', base);
        if (next) {
          celebrate.searchParams.set('next', next);
        }
        return NextResponse.redirect(celebrate.toString());
      }

      if (next) {
        return NextResponse.redirect(`${base}${next}`);
      }

      const userRole = user?.user_metadata?.role;
      if (userRole === 'host_pending') {
        return NextResponse.redirect(`${base}/host/properties/new`);
      }
      if (userRole === 'host') {
        return NextResponse.redirect(`${base}/host/properties`);
      }

      return NextResponse.redirect(home);
    }
  }

  return NextResponse.redirect(home);
}
