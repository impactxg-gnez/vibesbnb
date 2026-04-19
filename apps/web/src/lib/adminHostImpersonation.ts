import type { User } from '@supabase/supabase-js';
import { isAdminUser } from '@/lib/auth/isAdmin';

const STORAGE_ID = 'vibesbnb_admin_impersonate_host_id';
const STORAGE_LABEL = 'vibesbnb_admin_impersonate_host_label';
const CHANGE_EVENT = 'vibesbnb-impersonation-change';

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export function getImpersonatedHostId(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(STORAGE_ID);
  return raw && isUuid(raw) ? raw : null;
}

export function getImpersonationHostLabel(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(STORAGE_LABEL);
}

export function setImpersonatedHost(hostId: string, label: string) {
  if (typeof window === 'undefined') return;
  if (!isUuid(hostId)) return;
  sessionStorage.setItem(STORAGE_ID, hostId);
  sessionStorage.setItem(STORAGE_LABEL, label || hostId);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearImpersonatedHost() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_ID);
  sessionStorage.removeItem(STORAGE_LABEL);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function onImpersonationChanged(handler: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

/**
 * Host-scoped data (queries, cache keys): admin + active impersonation → target host; else Supabase user id.
 */
export function getHostScopeUserId(authUser: User | null | undefined, supabaseUserId: string): string {
  if (authUser && isAdminUser(authUser)) {
    const imp = getImpersonatedHostId();
    if (imp) return imp;
  }
  return supabaseUserId;
}

/** Cache key / scope when Supabase session is not available (uses auth user id for non-admins). */
export function getHostScopeUserIdFromAuthOnly(authUser: User | null | undefined): string | null {
  if (!authUser?.id) return null;
  if (isAdminUser(authUser)) {
    const imp = getImpersonatedHostId();
    if (imp) return imp;
  }
  return authUser.id;
}
