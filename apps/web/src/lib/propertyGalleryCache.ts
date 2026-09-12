/** In-memory gallery URL cache so cards don't refetch while scrolling. */

const results = new Map<string, string[]>();
const inflight = new Map<string, Promise<string[]>>();

function isHttpOrProxy(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const t = url.trim();
  if (t.length < 8 || t.length > 4000) return false;
  if (t.startsWith('data:')) return false;
  return (
    t.startsWith('https://') ||
    t.startsWith('http://') ||
    t.startsWith('/api/properties/')
  );
}

export function cachedPropertyGallery(propertyId: string): string[] | null {
  return results.get(propertyId) ?? null;
}

/** Lightweight URL list only — does not download image bytes. */
export function loadPropertyGalleryUrls(propertyId: string): Promise<string[]> {
  const hit = results.get(propertyId);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(propertyId);
  if (pending) return pending;

  const request = fetch(`/api/properties/${encodeURIComponent(propertyId)}/gallery`, {
    cache: 'force-cache',
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      const urls = Array.isArray(data?.images)
        ? (data.images as unknown[]).filter(isHttpOrProxy)
        : [];
      results.set(propertyId, urls);
      inflight.delete(propertyId);
      return urls;
    })
    .catch(() => {
      inflight.delete(propertyId);
      return [] as string[];
    });

  inflight.set(propertyId, request);
  return request;
}
