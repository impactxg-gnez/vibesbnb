/**
 * Resolve alt text for a listing photo (host → AI cache → fallback).
 * image_alts rows: { url, alt, source?: 'host' | 'ai' | 'fallback' }
 */

export type ImageAltEntry = {
  url: string;
  alt: string;
  source?: 'host' | 'ai' | 'fallback';
};

export function normalizeImageAlts(raw: unknown): ImageAltEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ImageAltEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const url = typeof r.url === 'string' ? r.url : '';
    const alt = typeof r.alt === 'string' ? r.alt.trim() : '';
    if (!url) continue;
    const source =
      r.source === 'host' || r.source === 'ai' || r.source === 'fallback' ? r.source : undefined;
    out.push({ url, alt, source });
  }
  return out;
}

export function altForImageUrl(
  url: string | undefined | null,
  imageAlts: ImageAltEntry[] | unknown,
  fallback: string
): string {
  if (!url) return fallback;
  const list = normalizeImageAlts(imageAlts);
  const hit = list.find((e) => e.url === url && e.alt);
  if (hit?.alt) return hit.alt;
  return fallback;
}

/** Build image_alts aligned to an images[] URL list, preserving existing host/ai alts. */
export function syncImageAltsWithUrls(
  urls: string[],
  existing: ImageAltEntry[] | unknown,
  defaults?: { propertyName?: string }
): ImageAltEntry[] {
  const prev = normalizeImageAlts(existing);
  const byUrl = new Map(prev.map((e) => [e.url, e]));
  return urls.filter(Boolean).map((url, i) => {
    const found = byUrl.get(url);
    if (found?.alt) return found;
    const name = defaults?.propertyName?.trim();
    return {
      url,
      alt: name ? `${name} — photo ${i + 1}` : `Listing photo ${i + 1}`,
      source: 'fallback' as const,
    };
  });
}

/** Accessibility amenity labels used in search filters (DOJ-style). */
export const ACCESSIBILITY_FILTER_CHIPS = [
  'Step-free guest entrance',
  'Lit path to entrance',
  'Roll-in shower',
  'Wide doorways',
  'Accessible parking spot',
  'Grab bars in shower',
] as const;
