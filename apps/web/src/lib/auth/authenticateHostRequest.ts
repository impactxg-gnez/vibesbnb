import { NextRequest, NextResponse } from 'next/server';
import { createClient, type User } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/auth/isAdmin';

export type HostAuthResult =
  | { user: User; hostId: string }
  | { response: NextResponse };

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

/**
 * Resolve the signed-in user (cookie or Bearer) and the host scope id
 * (supports admin impersonation via ?hostId= or x-impersonate-host-id).
 */
export async function authenticateHostRequest(
  request: NextRequest
): Promise<HostAuthResult> {
  let user: User | null = null;

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
      user = data.user;
    }
  }

  if (!user) {
    const cookieClient = createServerClient();
    const { data } = await cookieClient.auth.getUser();
    user = data.user;
  }

  if (!user) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const requestedHost =
    request.nextUrl.searchParams.get('hostId') ||
    request.headers.get('x-impersonate-host-id') ||
    '';

  let hostId = user.id;
  if (requestedHost && isUuid(requestedHost)) {
    if (!isAdminUser(user)) {
      return {
        response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      };
    }
    hostId = requestedHost;
  } else {
    const role = user.user_metadata?.role;
    if (role !== 'host' && !isAdminUser(user)) {
      return {
        response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      };
    }
  }

  return { user, hostId };
}
