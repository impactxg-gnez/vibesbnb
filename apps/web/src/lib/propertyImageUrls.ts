/**
 * Smaller image URLs for listing cards so browsers download fewer bytes.
 * - Supabase Storage: `/storage/v1/render/image/public/...` (requires image transformations enabled; Pro+)
 * - Unsplash: strip/cache-friendly query params
 * Set NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORMS=false to use original Supabase object URLs (e.g. free tier).
 */

const TRANSFORMS_ENABLED = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORMS !== 'false';

/** ~half-Retina for 68×48 CSS thumbs */
const THUMB = { width: 200, height: 150, quality: 72 } as const;
/** Card hero: fits 2-col / 3-col layouts without shipping full camera originals */
const CARD = { width: 960, height: 720, quality: 80 } as const;

const SUPABASE_OBJECT_PUBLIC =
  /^(https:\/\/[^/]+\.supabase\.co)\/storage\/v1\/object\/public\/(.+)$/i;

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

function applyKind(url: string, kind: 'thumb' | 'cardMain'): string {
  if (!url || url.startsWith('data:')) return url;

  const dim = kind === 'thumb' ? THUMB : CARD;
  const resize = kind === 'thumb' ? 'cover' : 'cover';

  const supa = supabaseRenderUrl(url, {
    width: dim.width,
    height: dim.height,
    quality: dim.quality,
    resize,
  });
  if (supa) return supa;

  const unsplash = unsplashResize(url, kind === 'thumb' ? 200 : 1080, dim.quality);
  if (unsplash) return unsplash;

  return url;
}

/** Thumbnail strip (~200px wide sources). */
export function listingThumbImageUrl(url: string): string {
  return applyKind(url, 'thumb');
}

/** Main card photo: next/image still optimizes, but smaller origin bytes help cold loads. */
export function listingCardMainImageUrl(url: string): string {
  return applyKind(url, 'cardMain');
}
