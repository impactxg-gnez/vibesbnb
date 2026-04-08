const ADMIN_EMAILS = new Set(['admin@vibesbnb.com']);

type AdminCandidate = {
  email?: string | null;
  user_metadata?: { role?: string | null } | null;
  app_metadata?: { role?: string | null } | null;
} | null | undefined;

export function isAdminEmail(email?: string | null) {
  return Boolean(email && ADMIN_EMAILS.has(email.toLowerCase()));
}

export function isAdminUser(user: AdminCandidate) {
  if (!user) return false;

  return (
    user.user_metadata?.role === 'admin' ||
    user.app_metadata?.role === 'admin' ||
    isAdminEmail(user.email)
  );
}
