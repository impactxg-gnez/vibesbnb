import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { isAdminEmail } from '@/lib/auth/isAdmin';

/** Must match server checks in authenticateAdminRequest (dev / explicit flag only). */
export const DEMO_ADMIN_ACCESS_TOKEN = '__VIBESBNB_DEMO_ADMIN__';

/** Emails allowed to use the demo-admin API token (password demo accounts). */
export const DEMO_ADMIN_API_EMAIL_ALLOWLIST = new Set([
  'demo@admin.com',
  'admin@vibesbnb.com',
]);

export function isDemoAdminPersistedUser(u: {
  email?: string;
  user_metadata?: { role?: string };
}): boolean {
  if (u.user_metadata?.role !== 'admin') return false;
  const email = (u.email ?? '').toLowerCase();
  return DEMO_ADMIN_API_EMAIL_ALLOWLIST.has(email) || isAdminEmail(email);
}

export function buildDemoAdminSession(
  parsedUser: User | Record<string, unknown>
): Session {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
  return {
    access_token: DEMO_ADMIN_ACCESS_TOKEN,
    refresh_token: '',
    expires_in: 60 * 60 * 24 * 365,
    expires_at: expiresAt,
    token_type: 'bearer',
    user: parsedUser as User,
  } as Session;
}

function readDemoAdminEmailFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('demoUser');
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!isDemoAdminPersistedUser(u)) return null;
    return typeof u.email === 'string' ? u.email : null;
  } catch {
    return null;
  }
}

async function resolveAdminFetchAuth(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  const { data, error } = await supabase.auth.refreshSession();
  if (data.session?.access_token) {
    return { Authorization: `Bearer ${data.session.access_token}` };
  }
  if (error) {
    console.warn('[adminSession] refreshSession failed:', error.message);
  }

  const demoEmail = readDemoAdminEmailFromStorage();
  if (demoEmail) {
    return {
      Authorization: `Bearer ${DEMO_ADMIN_ACCESS_TOKEN}`,
      'X-Vibes-Demo-Admin-Email': demoEmail,
    };
  }
  return {};
}

/**
 * Returns a fresh access token for calling /api/admin/* routes.
 * Prefers a real Supabase JWT; falls back to a dev-only demo-admin token when appropriate.
 */
export async function getAccessTokenForAdminFetch(): Promise<string | null> {
  const h = await resolveAdminFetchAuth();
  const auth = h.Authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.replace(/^Bearer\s+/i, '').trim();
}

/** Headers for /api/admin/* (includes demo email header when using demo token). */
export async function getHeadersForAdminFetch(): Promise<Record<string, string>> {
  return resolveAdminFetchAuth();
}
