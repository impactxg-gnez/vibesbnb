import { NextRequest } from 'next/server';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

/** Resolve user from Bearer token (mobile) or session cookie (web). */
export async function getUserFromRequest(
  request: NextRequest
): Promise<User | null> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (token) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && anonKey) {
      const client = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await client.auth.getUser(token);
      if (data.user) return data.user;
    }
  }

  const cookieClient = createServerClient();
  const { data } = await cookieClient.auth.getUser();
  return data.user ?? null;
}

/** Supabase client scoped to the request user (Bearer or cookie session). */
export async function getAuthenticatedSupabaseFromRequest(
  request: NextRequest
): Promise<{ user: User; supabase: SupabaseClient } | null> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (token && supabaseUrl && anonKey) {
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data } = await client.auth.getUser(token);
    if (data.user) return { user: data.user, supabase: client };
  }

  const cookieClient = createServerClient();
  const { data } = await cookieClient.auth.getUser();
  if (!data.user) return null;
  return { user: data.user, supabase: cookieClient as unknown as SupabaseClient };
}
