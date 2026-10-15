/** Host-chosen public path: https://vibesbnb.com/{slug} → /listings/{id} */

export const PROPERTY_SLUG_MIN = 3;
export const PROPERTY_SLUG_MAX = 60;

const RESERVED_SLUGS = new Set([
  'about',
  'accessibility',
  'admin',
  'api',
  'apple-icon',
  'auth',
  'bookings',
  'coming-soon',
  'dispensary',
  'early-access',
  'faq',
  'favorites',
  'forgot-password',
  'host',
  'icon',
  'itinerary',
  'listings',
  'login',
  'llms.txt',
  'map',
  'manifest',
  'messages',
  'miami',
  'opengraph-image',
  'p',
  'privacy',
  'profile',
  'reset-password',
  'review',
  'robots.txt',
  'search',
  'signup',
  'sitemap.xml',
  'stay',
  'terms',
  'thank-you',
  'users',
  'verify-email',
  'verify-phone',
  'vibesbnb',
  'www',
  'wynwood',
  'downtown',
  'brickell',
]);

export function normalizePropertySlug(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, PROPERTY_SLUG_MAX);
}

export function isReservedPropertySlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

export function validatePropertySlug(raw: string): { slug: string } | { error: string } {
  const slug = normalizePropertySlug(raw);
  if (slug.length < PROPERTY_SLUG_MIN) {
    return { error: `Use at least ${PROPERTY_SLUG_MIN} letters or numbers.` };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { error: 'Use lowercase letters, numbers, and hyphens only.' };
  }
  if (isReservedPropertySlug(slug)) {
    return { error: 'That path is reserved. Choose a different slug.' };
  }
  return { slug };
}

export function suggestPropertySlug(name: string): string {
  return normalizePropertySlug(name);
}

export function customListingPath(slug: string): string {
  return `/${slug}`;
}
