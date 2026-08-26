/**
 * Host property list cache in localStorage — never store base64 / data-URL images
 * (they blow the ~5MB quota and can fail saves even after Supabase succeeded).
 */

function isRemoteImageUrl(u: unknown): u is string {
  return typeof u === 'string' && /^https?:\/\//i.test(u.trim());
}

/** Keep only http(s) image URLs; drop data: / blob: / empty. */
export function slimImageUrls(images: unknown, max = 24): string[] {
  if (!Array.isArray(images)) return [];
  return images.filter(isRemoteImageUrl).slice(0, max);
}

export function slimPropertyForLocalCache(property: Record<string, unknown>): Record<string, unknown> {
  const rooms = property.rooms;
  return {
    ...property,
    images: slimImageUrls(property.images),
    imagePreviewUrls: undefined,
    rooms: Array.isArray(rooms)
      ? rooms.map((r) => {
          if (!r || typeof r !== 'object') return r;
          const room = r as Record<string, unknown>;
          return {
            ...room,
            images: slimImageUrls(room.images),
            imagePreviewUrls: undefined,
          };
        })
      : rooms,
  };
}

/**
 * Persist host properties cache. Never throws (quota / private mode).
 * Returns false if nothing could be written.
 */
export function writeHostPropertiesCache(
  scopeId: string,
  properties: Record<string, unknown>[]
): boolean {
  if (typeof window === 'undefined' || !scopeId) return false;
  const key = `properties_${scopeId}`;
  const slimmed = properties.map((p) => slimPropertyForLocalCache(p));

  // Reclaim quota from older caches that stored base64 image blobs
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }

  try {
    localStorage.setItem(key, JSON.stringify(slimmed));
    return true;
  } catch {
    /* quota — try metadata only */
  }

  try {
    const metaOnly = slimmed.map((p) => ({
      ...p,
      images: [] as string[],
      rooms: Array.isArray(p.rooms)
        ? (p.rooms as Record<string, unknown>[]).map((r) => ({
            ...r,
            images: [] as string[],
          }))
        : p.rooms,
    }));
    localStorage.setItem(key, JSON.stringify(metaOnly));
    return true;
  } catch {
    return false;
  }
}

/** Drop a bloated host properties cache key (e.g. after quota errors). */
export function clearHostPropertiesCache(scopeId: string): void {
  if (typeof window === 'undefined' || !scopeId) return;
  try {
    localStorage.removeItem(`properties_${scopeId}`);
  } catch {
    /* ignore */
  }
}
