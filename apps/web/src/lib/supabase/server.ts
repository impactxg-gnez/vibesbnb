import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAuthCookieOptions } from '@/lib/supabase/authCookieOptions';

export function createClient() {
  const cookieStore = cookies();
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  const cookieOptions = supabaseAuthCookieOptions();

  // If credentials are not available, return a mock client that won't work
  // but will allow the build to succeed
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not configured. Authentication will not work.');
    return createServerClient('https://placeholder.supabase.co', 'placeholder-key', {
      cookieOptions,
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    });
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options });
          });
        } catch {
          // Called from a Server Component — middleware refreshes sessions instead.
        }
      },
    },
  });
}
