/**
 * Property photos must reach the database as storage URLs, never as `data:` blobs.
 * A listing with a dozen embedded photos produces a multi-megabyte PATCH body, which the
 * serverless request limit rejects with 413 before any route code runs.
 */

/** Longest edge kept when re-encoding a photo for upload. */
const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.82;

export function isDataUrl(url: string): boolean {
  return typeof url === 'string' && url.startsWith('data:');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = src;
  });
}

/** Re-encode a `data:` photo down to MAX_EDGE so one upload stays well inside request limits. */
export async function compressDataUrl(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const longest = Math.max(img.width, img.height);
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const encoded = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  return encoded.length < dataUrl.length ? encoded : dataUrl;
}

async function uploadDataUrl(propertyId: string, dataUrl: string): Promise<string> {
  const compressed = await compressDataUrl(dataUrl);
  const response = await fetch(`/api/host/properties/${encodeURIComponent(propertyId)}/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ dataUrl: compressed }),
  });

  const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !payload.url) {
    throw new Error(payload.error || `Photo upload failed (${response.status})`);
  }
  return payload.url;
}

export type UploadedImages = {
  /** Same order as the input, with embedded photos replaced by storage URLs. */
  urls: string[];
  /** Count of photos moved into storage during this save. */
  uploaded: number;
  /** First upload error, when at least one photo could not be stored. */
  error: string | null;
};

/**
 * Replace embedded photos with storage URLs, keeping order and existing remote URLs.
 * Uploads run one at a time so a listing with many legacy photos cannot burst the API.
 */
export async function uploadPropertyImages(
  propertyId: string,
  urls: string[],
  onProgress?: (done: number, total: number) => void
): Promise<UploadedImages> {
  const embeddedCount = urls.filter(isDataUrl).length;
  const result: UploadedImages = { urls: [], uploaded: 0, error: null };

  for (const url of urls) {
    if (!isDataUrl(url)) {
      result.urls.push(url);
      continue;
    }

    if (result.error) {
      // Keep the original so a failed batch does not silently drop photos.
      result.urls.push(url);
      continue;
    }

    try {
      result.urls.push(await uploadDataUrl(propertyId, url));
      result.uploaded += 1;
      onProgress?.(result.uploaded, embeddedCount);
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Photo upload failed';
      result.urls.push(url);
    }
  }

  return result;
}
