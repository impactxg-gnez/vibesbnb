import { NextRequest, NextResponse } from 'next/server';
import { createClient, type User } from '@supabase/supabase-js';
import { isAdminEmail, isAdminUser } from '@/lib/auth/isAdmin';
import {
  DEMO_ADMIN_ACCESS_TOKEN,
  DEMO_ADMIN_API_EMAIL_ALLOWLIST,
} from '@/lib/supabase/adminSession';

export type AdminAuthResult =
  | { user: User }
  | { response: NextResponse };

const allowDemoAdminApi =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_ENABLE_DEMO_ADMIN_API === 'true';

/**
 * Validates Bearer JWT and ensures the user is an admin (metadata, app_metadata, or allowlisted email).
 */
export async function authenticateAdminRequest(
  request: NextRequest
): Promise<AdminAuthResult> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) {
    return {
      response: NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      ),
    };
  }

  if (allowDemoAdminApi && token === DEMO_ADMIN_ACCESS_TOKEN) {
    const email = request.headers
      .get('x-vibes-demo-admin-email')
      ?.toLowerCase()
      .trim();
    if (
      !email ||
      (!DEMO_ADMIN_API_EMAIL_ALLOWLIST.has(email) && !isAdminEmail(email))
    ) {
      return {
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }
    const user = {
      id: `demo-${email.replace(/[@.]/g, '-')}`,
      email,
      user_metadata: { role: 'admin' as const },
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User;
    return { user };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      response: NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      ),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!isAdminUser(user)) {
    return {
      response: NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      ),
    };
  }

  return { user };
}
