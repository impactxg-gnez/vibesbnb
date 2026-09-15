const AUTH_LOOP_PATHS = new Set(['/login', '/signup']);

/**
 * Allows only same-origin relative paths (rejects protocol-relative URLs).
 * Drops login/signup so a bounced session cannot loop on /login?next=/login.
 */
export function safeInternalReturnPath(raw: string | null | undefined): string | null {
  if (raw == null || raw === '') return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  const pathOnly = raw.split('?')[0];
  if (AUTH_LOOP_PATHS.has(pathOnly) || pathOnly.startsWith('/login/') || pathOnly.startsWith('/signup/')) {
    return null;
  }
  return raw;
}

export function loginUrlWithNext(returnPath: string): string {
  const safe = safeInternalReturnPath(returnPath);
  if (!safe) return '/login';
  return `/login?next=${encodeURIComponent(safe)}`;
}
