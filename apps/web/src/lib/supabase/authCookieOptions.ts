/** Cookie domain so www and apex share the Supabase session. */
export function supabaseAuthCookieDomain(): string | undefined {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '').trim();
  if (!appUrl) return undefined;
  try {
    const host = new URL(appUrl).hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
    ) {
      return undefined;
    }
    const apex = host.replace(/^www\./, '');
    if (!apex.includes('.')) return undefined;
    return `.${apex}`;
  } catch {
    return undefined;
  }
}

export function supabaseAuthCookieOptions(): {
  path: string;
  sameSite: 'lax';
  domain?: string;
} {
  const domain = supabaseAuthCookieDomain();
  return {
    path: '/',
    sameSite: 'lax',
    ...(domain ? { domain } : {}),
  };
}
