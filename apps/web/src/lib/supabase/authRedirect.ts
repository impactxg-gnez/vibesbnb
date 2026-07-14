/**
 * Origin for auth redirects.
 * Prefer the live browser/request host so PKCE code-verifier cookies match the
 * OAuth callback host. Using NEXT_PUBLIC_APP_URL while the user is on the other
 * of www / apex causes exchangeCodeForSession to fail on the first attempt.
 * Env is only a fallback (email links, server code without a request).
 */
export function getAuthRedirectOrigin(request?: Request): string {
  if (request) return new URL(request.url).origin;
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '').trim() || '';
}

/** True when hosts differ only by a www. prefix (same site). */
export function isWwwApexAlias(hostA: string, hostB: string): boolean {
  const normalize = (h: string) => h.toLowerCase().replace(/^www\./, '');
  return Boolean(hostA && hostB && hostA !== hostB && normalize(hostA) === normalize(hostB));
}
