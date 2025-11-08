import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Get the user to check their role
      const { data: { user } } = await supabase.auth.getUser();
      
      // If next is specified, use it; otherwise redirect based on role
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      
      // Redirect based on user role
      if (user?.user_metadata?.role === 'host') {
        return NextResponse.redirect(`${origin}/host/properties`);
      }
      
      // Default to home page
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

