import { createClient } from '@/lib/supabase/client';

/**
 * Returns a fresh access token for calling /api/admin/* routes.
 * Refreshes the session once if the current session has no token.
 */
export async function getAccessTokenForAdminFetch(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    return session.access_token;
  }
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    console.warn('[adminSession] refreshSession failed:', error.message);
    return null;
  }
  return data.session?.access_token ?? null;
}
