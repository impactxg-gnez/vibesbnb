import type { User } from '@supabase/supabase-js';
import { phoneFromAuthMetadata } from '@/lib/supabase/profileContactFromUser';

/** True when Supabase auth has a confirmed phone (OTP verified). */
export function hasVerifiedPhone(user: User | null | undefined): boolean {
  if (!user) return false;

  const authPhone = typeof user.phone === 'string' ? user.phone.trim() : '';
  if (authPhone && user.phone_confirmed_at) return true;

  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  if (meta.phone_verified === true && phoneFromAuthMetadata(meta)) return true;

  return false;
}

/** Phone to pre-fill OTP UI — auth phone or metadata fallback. */
export function pendingPhoneFromUser(user: User | null | undefined): string | null {
  if (!user) return null;
  const authPhone = typeof user.phone === 'string' ? user.phone.trim() : '';
  if (authPhone) return authPhone;
  return phoneFromAuthMetadata(user.user_metadata as Record<string, unknown>);
}

/** Travellers need a verified phone to book; hosts/admins are exempt. */
export function travellerNeedsPhoneVerification(user: User | null | undefined): boolean {
  if (!user || hasVerifiedPhone(user)) return false;
  const role = user.user_metadata?.role;
  if (role === 'host' || role === 'host_pending' || role === 'admin' || role === 'dispensary') {
    return false;
  }
  return true;
}
