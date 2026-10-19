/** Canonical public origin for metadata, sitemaps, iCal export, and JSON-LD. */

const CANONICAL_SITE_URL = 'https://vibesbnb.com';

function isVercelAppHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'vercel.app' || host.endsWith('.vercel.app');
}

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || '';
  const cleaned = raw.replace(/\/$/, '');
  if (!cleaned) return CANONICAL_SITE_URL;
  try {
    const host = new URL(cleaned).hostname;
    if (isVercelAppHost(host)) return CANONICAL_SITE_URL;
  } catch {
    return CANONICAL_SITE_URL;
  }
  return cleaned;
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Host shown on iCal export links. Production apex (`vibesbnb.com`) 307s to `www`;
 * Airbnb/VRBO calendar fetchers often do not follow that redirect, so feeds look empty.
 */
export function getCalendarExportOrigin(): string {
  const site = getSiteUrl();
  try {
    const u = new URL(site);
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost')) return site;
    if (host === 'vibesbnb.com' || isVercelAppHost(host)) {
      return 'https://www.vibesbnb.com';
    }
    return site;
  } catch {
    return 'https://www.vibesbnb.com';
  }
}
