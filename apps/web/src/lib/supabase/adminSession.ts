import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { isAdminEmail } from '@/lib/auth/isAdmin';

/** Must match server checks in authenticateAdminRequest (dev / explicit flag only). */
export const DEMO_ADMIN_ACCESS_TOKEN = '__VIBESBNB_DEMO_ADMIN__';

const ACTIVE_ACCESS_TOKEN_KEY = 'vibes_active_access_token';
const ACTIVE_REFRESH_TOKEN_KEY = 'vibes_active_refresh_token';
const ACTIVE_EMAIL_KEY = 'vibes_active_email';

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

type CachedAuth = {
  accessToken: string;
  refreshToken: string;
  email: string;
};

let memoryAuth: CachedAuth | null = null;

function readStoredAuth(): CachedAuth | null {
  if (typeof window === 'undefined') return null;
  try {
    const accessToken = localStorage.getItem(ACTIVE_ACCESS_TOKEN_KEY);
    if (!accessToken) return null;
    return {
      accessToken,
      refreshToken: localStorage.getItem(ACTIVE_REFRESH_TOKEN_KEY) || '',
      email: localStorage.getItem(ACTIVE_EMAIL_KEY) || '',
    };
  } catch {
    return null;
  }
}

function headersFromAuth(auth: CachedAuth): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
  };
  if (
    auth.accessToken === DEMO_ADMIN_ACCESS_TOKEN &&
    auth.email &&
    (DEMO_ADMIN_API_EMAIL_ALLOWLIST.has(auth.email.toLowerCase()) ||
      isAdminEmail(auth.email))
  ) {
    headers['X-Vibes-Demo-Admin-Email'] = auth.email.toLowerCase();
  }
  return headers;
}

/** Keep a copy of the signed-in token so admin fetches do not depend on cookies. */
export function rememberAdminAuthSession(session: Session | null) {
  if (!session?.access_token) {
    memoryAuth = null;
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(ACTIVE_ACCESS_TOKEN_KEY);
        localStorage.removeItem(ACTIVE_REFRESH_TOKEN_KEY);
        localStorage.removeItem(ACTIVE_EMAIL_KEY);
      } catch {
        /* ignore quota / private-mode */
      }
    }
    return;
  }

  memoryAuth = {
    accessToken: session.access_token,
    refreshToken: session.refresh_token || '',
    email: (session.user?.email || '').toLowerCase(),
  };
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_ACCESS_TOKEN_KEY, memoryAuth.accessToken);
    localStorage.setItem(ACTIVE_REFRESH_TOKEN_KEY, memoryAuth.refreshToken);
    if (memoryAuth.email) localStorage.setItem(ACTIVE_EMAIL_KEY, memoryAuth.email);
  } catch {
    /* ignore quota / private-mode */
  }
}

function cachedAuth(): CachedAuth | null {
  return memoryAuth || readStoredAuth();
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

async function resolveAdminFetchAuth(
  session?: Session | null
): Promise<Record<string, string>> {
  if (session?.access_token) {
    rememberAdminAuthSession(session);
    return headersFromAuth({
      accessToken: session.access_token,
      refreshToken: session.refresh_token || '',
      email: (session.user?.email || '').toLowerCase(),
    });
  }

  const cached = cachedAuth();
  if (cached?.accessToken) {
    return headersFromAuth(cached);
  }

  const supabase = createClient();
  const {
    data: { session: live },
  } = await supabase.auth.getSession();
  if (live?.access_token) {
    rememberAdminAuthSession(live);
    return headersFromAuth({
      accessToken: live.access_token,
      refreshToken: live.refresh_token || '',
      email: (live.user?.email || '').toLowerCase(),
    });
  }
  if (live?.refresh_token) {
    const { data, error } = await supabase.auth.refreshSession();
    if (data.session?.access_token) {
      rememberAdminAuthSession(data.session);
      return headersFromAuth({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token || '',
        email: (data.session.user?.email || '').toLowerCase(),
      });
    }
    if (error) {
      console.warn('[adminSession] refreshSession failed:', error.message);
    }
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
export async function getAccessTokenForAdminFetch(
  session?: Session | null
): Promise<string | null> {
  const h = await resolveAdminFetchAuth(session);
  const auth = h.Authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.replace(/^Bearer\s+/i, '').trim();
}

/** Headers for /api/admin/* (includes demo email header when using demo token). */
export async function getHeadersForAdminFetch(
  session?: Session | null
): Promise<Record<string, string>> {
  return resolveAdminFetchAuth(session);
}
