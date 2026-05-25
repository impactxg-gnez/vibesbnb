import type { User } from '@supabase/supabase-js';

const OAUTH_PROVIDERS = new Set(['google', 'apple', 'github', 'azure', 'facebook', 'discord']);

/** Demo / test accounts skip verification (local demo mode only). */
export function isDemoAuthEmail(email?: string | null): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  return (
    e.startsWith('demo@') ||
    e === 'demo@traveller.com' ||
    e === 'demo@host.com' ||
    e === 'demo@admin.com'
  );
}

/** True when the user signed up with email+password (not OAuth-only). */
export function usesEmailPasswordAuth(user: User): boolean {
  const identities = user.identities ?? [];
  if (identities.length === 0) return true;
  return identities.every((i) => i.provider === 'email');
}

/** Email is verified via Supabase confirm link or a trusted OAuth provider. */
export function isEmailVerified(user: User): boolean {
  if (isDemoAuthEmail(user.email)) return true;
  if (user.email_confirmed_at) return true;

  const identities = user.identities ?? [];
  if (identities.some((i) => OAUTH_PROVIDERS.has(i.provider))) {
    return true;
  }

  return false;
}

export function requiresEmailVerification(user: User): boolean {
  if (!usesEmailPasswordAuth(user)) return false;
  return !isEmailVerified(user);
}
