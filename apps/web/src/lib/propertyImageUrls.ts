/**
 * Smaller image URLs for listing cards so browsers download fewer bytes.
 * - Supabase Storage: `/storage/v1/render/image/public/...` (requires image transformations enabled; Pro+)
 * - Unsplash: strip/cache-friendly query params
 *
 * Transforms are OFF by default — this project returns
 * `FeatureNotEnabled` on `/storage/v1/render/image/...`.
 * Set NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORMS=true only after enabling
 * Image Transformations in the Supabase dashboard.
 */

const TRANSFORMS_ENABLED = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORMS === 'true';

/** ~half-Retina for 68×48 CSS thumbs */
const THUMB = { width: 200, height: 150, quality: 72 } as const;
/** Card hero: fits 2-col / 3-col layouts without shipping full camera originals */
const CARD = { width: 832, height: 624, quality: 75 } as const;
/** Listing detail hero (≈50vw on lg at ~2× DPR) — still capped vs full uploads */
const GALLERY = { width: 1400, height: 1050, quality: 78 } as const;

const SUPABASE_OBJECT_PUBLIC =
  /^(https:\/\/[^/]+\.supabase\.co)\/storage\/v1\/object\/public\/(.+)$/i;

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=600&h=400&fit=crop';

const NON_IMAGE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'vimeo.com',
  'www.vimeo.com',
]);

/**
 * Bulk imports often store Next.js optimizer URLs from the source site, e.g.
 * `https://ionica.world/_next/image?url=<encoded-supabase-url>&w=3840&q=75`.
 * Those hosts are blocked by our next/image remotePatterns, so the gallery
 * appears stuck on slide 1. Unwrap to the underlying asset URL.
 */
export function unwrapProxiedImageUrl(raw: string): string {
  let current = raw.trim();
  for (let i = 0; i < 3; i++) {
    try {
      const u = new URL(current);
      if (!u.pathname.includes('/_next/image')) break;
      const inner = u.searchParams.get('url');
      if (!inner) break;
      const decoded = decodeURIComponent(inner).trim();
      if (!decoded || decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }
  return current;
}

function isLikelyDisplayableImageUrl(url: string): boolean {
  if (url.startsWith('data:image/')) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (NON_IMAGE_HOSTS.has(host)) return false;
    return true;
  } catch {
    return false;
  }
}

function supabaseRenderUrl(
  url: string,
  opts: { width: number; height: number; quality: number; resize: 'cover' | 'contain' }
): string | null {
  if (!TRANSFORMS_ENABLED) return null;
  const m = url.trim().match(SUPABASE_OBJECT_PUBLIC);
  if (!m) return null;
  const origin = m[1];
  const pathAfterPublic = m[2];
  const qs = new URLSearchParams({
    width: String(opts.width),
    height: String(opts.height),
    quality: String(opts.quality),
    resize: opts.resize,
  });
  return `${origin}/storage/v1/render/image/public/${pathAfterPublic}?${qs.toString()}`;
}

function unsplashResize(url: string, w: number, q: number): string | null {
  try {
    const u = new URL(url);
    if (u.hostname !== 'images.unsplash.com') return null;
    u.searchParams.set('auto', 'format');
    u.searchParams.set('fit', 'crop');
    u.searchParams.set('w', String(w));
    u.searchParams.set('q', String(q));
    return u.toString();
  } catch {
    return null;
  }
}

function applyKind(url: string, kind: 'thumb' | 'cardMain' | 'gallery'): string {
  if (!url || url.startsWith('data:')) return url;

  const dim = kind === 'thumb' ? THUMB : kind === 'gallery' ? GALLERY : CARD;
  const resize = 'cover';

  const supa = supabaseRenderUrl(url, {
    width: dim.width,
    height: dim.height,
    quality: dim.quality,
    resize,
  });
  if (supa) return supa;

  const unsplashW = kind === 'thumb' ? 200 : kind === 'gallery' ? 1600 : 900;
  const unsplash = unsplashResize(url, unsplashW, dim.quality);
  if (unsplash) return unsplash;

  return url;
}

/**
 * Clean property image arrays for display.
 * - Unwraps Next.js `/_next/image?url=` proxies (bulk-import source sites)
 * - Drops blanks / non-image hosts (e.g. YouTube)
 * - Prefers remote http(s) URLs before huge data: URLs (common after scrapes)
 * - Dedupes exact matches after unwrap
 */
export function normalizePropertyImages(
  images: Array<string | null | undefined> | null | undefined,
  fallback: string = PLACEHOLDER
): string[] {
  if (!Array.isArray(images) || images.length === 0) return [fallback];

  const seen = new Set<string>();
  const remote: string[] = [];
  const embedded: string[] = [];

  for (const raw of images) {
    if (typeof raw !== 'string') continue;
    const url = unwrapProxiedImageUrl(raw);
    if (!url || seen.has(url) || !isLikelyDisplayableImageUrl(url)) continue;
    seen.add(url);

    if (url.startsWith('data:image/')) {
      // Scraped listings often store many huge base64 blobs — keep a few for fallbacks.
      if (embedded.length < 8) embedded.push(url);
    } else if (/^https?:\/\//i.test(url)) {
      remote.push(url);
    }
  }

  const ordered = [...remote, ...embedded];
  return ordered.length > 0 ? ordered : [fallback];
}

/** First usable listing image (after normalize), or placeholder. */
export function primaryPropertyImageUrl(
  images: Array<string | null | undefined> | null | undefined,
  fallback: string = PLACEHOLDER
): string {
  return normalizePropertyImages(images, fallback)[0] ?? fallback;
}

/** Thumbnail strip (~200px wide sources). */
export function listingThumbImageUrl(url: string): string {
  return applyKind(unwrapProxiedImageUrl(url), 'thumb');
}

/** Main card photo: next/image still optimizes, but smaller origin bytes help cold loads. */
export function listingCardMainImageUrl(url: string): string {
  return applyKind(unwrapProxiedImageUrl(url), 'cardMain');
}

/** PDP main gallery photo — narrower than originals, wider than listing cards */
export function listingGalleryImageUrl(url: string): string {
  return applyKind(unwrapProxiedImageUrl(url), 'gallery');
}
