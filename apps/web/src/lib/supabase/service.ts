import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function hasServiceRoleKey(): boolean {
  return Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

/**
 * For authenticated /api/admin/* routes: use the service role when available (bypasses RLS).
 * If the service key is not set in the deployment, use the caller's Supabase access token with
 * the anon key so RLS policies for admins (e.g. is_vibesbnb_admin_jwt in
 * SUPABASE_ADMIN_REALTIME_RLS.sql) apply. The previous "anon with no JWT" fallback could not
 * satisfy those policies, so the admin table stayed empty or queries failed.
 */
export function createSupabaseForAdminApi(accessToken: string): SupabaseClient {
  if (hasServiceRoleKey()) {
    return createServiceClient();
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey || !accessToken.trim()) {
    return createServiceClient();
  }
  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.warn(
      '[Supabase] Service role key missing. Falling back to anon client. Some privileged operations may be limited.'
    );
    if (!supabaseUrl || !anonKey) {
      return createClient('https://placeholder.supabase.co', 'placeholder-key');
    }
    return createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

