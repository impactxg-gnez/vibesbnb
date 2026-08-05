import type { User } from '@supabase/supabase-js';
import { isAdminUser } from '@/lib/auth/isAdmin';

/** Read multi-role list from localStorage (client only). */
export function readStoredUserRoles(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('userRoles');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function ensureStoredHostRole(): void {
  if (typeof window === 'undefined') return;
  const roles = readStoredUserRoles();
  if (!roles.includes('host')) {
    roles.push('host');
    localStorage.setItem('userRoles', JSON.stringify(roles));
  }
  localStorage.setItem('activeRole', 'host');
  localStorage.setItem('vibesbnb_mode', 'hosting');
}

function roleLooksLikeHost(role: unknown): boolean {
  return role === 'host' || role === 'host_pending';
}

/** True when auth metadata already marks the user as a host. */
export function metadataIndicatesHost(user: User | null | undefined): boolean {
  return roleLooksLikeHost(user?.user_metadata?.role);
}

/**
 * Client-side host capability check.
 * Prefer auth metadata; also honor localStorage roles (multi-role accounts)
 * and admin impersonation callers separately.
 */
export function userHasHostCapability(
  user: User | null | undefined,
  storedRoles?: string[]
): boolean {
  if (!user) return false;
  if (metadataIndicatesHost(user)) return true;
  if (isAdminUser(user)) return true;
  const roles = storedRoles ?? readStoredUserRoles();
  return roles.includes('host') || roles.includes('host_pending');
}
