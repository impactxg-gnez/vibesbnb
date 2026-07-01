/** Canonical site origin for OAuth redirects (avoids www / non-www mismatches). */
export function getAuthRedirectOrigin(request?: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '').trim();
  if (fromEnv) return fromEnv;
  if (request) return new URL(request.url).origin;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}
