import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAuthCookieOptions } from '@/lib/supabase/authCookieOptions';

let browserClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  const cookieOptions = supabaseAuthCookieOptions();

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      'Supabase credentials not configured. Authentication will not work.'
    );
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      { cookieOptions }
    );
  }

  if (typeof window !== 'undefined') {
    if (!browserClient) {
      browserClient = createBrowserClient(supabaseUrl, supabaseKey, { cookieOptions });
    }
    return browserClient;
  }

  return createBrowserClient(supabaseUrl, supabaseKey, { cookieOptions });
}
