import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const type = searchParams.get('type'); // Supabase includes type=signup for email verification

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Get the user to check their role and verification status
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check if this is an email verification (type=signup or email_confirmed_at is recent)
      const isEmailVerification = type === 'signup' || 
        (user?.email_confirmed_at && 
         new Date(user.email_confirmed_at).getTime() > Date.now() - 60000); // Verified within last minute
      
      // If this is an email verification, redirect to success page
      if (isEmailVerification) {
        return NextResponse.redirect(`${origin}/auth/verify-success`);
      }
      
      // If next is specified, use it; otherwise redirect based on role
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      
      // Redirect based on user role
      // Only redirect hosts to host dashboard, all others (including travellers) go to landing page
      const userRole = user?.user_metadata?.role;
      if (userRole === 'host') {
        return NextResponse.redirect(`${origin}/host/properties`);
      }
      
      // For travellers or any other role (or no role), redirect to landing page
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

