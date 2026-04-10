import type { User } from '@supabase/supabase-js';

/** Lowercase. Keep in sync with `is_vibesbnb_admin_jwt()` in SUPABASE_ADMIN_REALTIME_RLS.sql */
const ADMIN_EMAILS = new Set([
  'admin@vibesbnb.com',
  'info@vibesbnb.com',
  'vibewithdeon@vibesbnb.com',
  'keval65@gmail.com',
  'mrdeonmack@gmail.com',
]);

export function isAdminEmail(email?: string | null) {
  return Boolean(email && ADMIN_EMAILS.has(email.toLowerCase()));
}

export function isAdminUser(user: User | null | undefined) {
  if (!user) return false;

  const appRole = (user.app_metadata as { role?: string } | null | undefined)?.role;

  return (
    user.user_metadata?.role === 'admin' ||
    appRole === 'admin' ||
    isAdminEmail(user.email)
  );
}
