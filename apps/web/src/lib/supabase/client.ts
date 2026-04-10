import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      'Supabase credentials not configured. Authentication will not work.'
    );
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    );
  }

  if (typeof window !== 'undefined') {
    if (!browserClient) {
      browserClient = createBrowserClient(supabaseUrl, supabaseKey);
      browserClient.auth.getSession().catch((error: Error) => {
        console.debug('[Supabase Client] Session check:', error.message);
      });
    }
    return browserClient;
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
