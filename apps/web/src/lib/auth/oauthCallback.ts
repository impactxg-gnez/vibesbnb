import type { User } from '@supabase/supabase-js';
import { travellerNeedsPhoneVerification } from '@/lib/auth/hasVerifiedPhone';

const OAUTH_PROVIDERS = new Set(['google', 'apple', 'github', 'azure', 'facebook', 'discord']);

function userSignedInWithOAuth(user: User | null | undefined): boolean {
  const identities = user?.identities ?? [];
  return identities.some((i) => OAUTH_PROVIDERS.has(i.provider));
}

/** Internal path only; avoids open redirects. */
export function safeOAuthNextPath(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

/** Where to send the user after a successful OAuth / email-confirm callback. */
export function resolvePostAuthRedirectPath(
  user: User | null | undefined,
  next: string | null,
  type: string | null
): string {
  if (type === 'recovery') {
    return next || '/reset-password';
  }

  const isEmailVerification =
    !userSignedInWithOAuth(user) &&
    (type === 'signup' ||
      type === 'email' ||
      (user?.email_confirmed_at &&
        new Date(user.email_confirmed_at).getTime() > Date.now() - 5 * 60 * 1000));

  if (isEmailVerification) {
    const userRole = user?.user_metadata?.role;
    if (userRole === 'host' || userRole === 'host_pending') {
      return '/host/properties';
    }
    if (travellerNeedsPhoneVerification(user)) {
      const dest = next
        ? `/verify-phone?next=${encodeURIComponent(next)}`
        : '/verify-phone';
      return dest;
    }
    if (next) {
      return `/auth/verify-success?next=${encodeURIComponent(next)}`;
    }
    return '/auth/verify-success';
  }

  if (next) {
    if (travellerNeedsPhoneVerification(user) && next.startsWith('/bookings')) {
      return `/verify-phone?next=${encodeURIComponent(next)}`;
    }
    return next;
  }

  const userRole = user?.user_metadata?.role;
  if (userRole === 'host_pending' || userRole === 'host') {
    return '/host/properties';
  }

  return '/';
}
