import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side storage for property photos.
 * Photos kept as base64 inside `properties.images` break the gallery (it only accepts
 * http(s) URLs), bloat every property read, and push editor saves past the request limit.
 */

export const PROPERTY_IMAGE_BUCKET = 'property-images';

/** Ceiling for a single stored photo, and the bucket's file size limit. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export type DecodedImage = { buffer: Buffer; contentType: string };

export function isEmbeddedImage(value: unknown): value is string {
  return typeof value === 'string' && value.trim().toLowerCase().startsWith('data:image/');
}

export function isHttpImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const lower = value.trim().toLowerCase();
  return lower.startsWith('http://') || lower.startsWith('https://');
}

export function decodePropertyImage(
  dataUrl: string,
  maxBytes = MAX_IMAGE_BYTES
): DecodedImage | { error: string } {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl.trim());
  if (!match) {
    return { error: 'Expected a base64 image data URL' };
  }

  const contentType = match[1].toLowerCase();
  if (!ALLOWED_TYPES.includes(contentType as (typeof ALLOWED_TYPES)[number])) {
    return { error: `Unsupported image type: ${contentType}` };
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.byteLength === 0) {
    return { error: 'Image data was empty' };
  }
  if (buffer.byteLength > maxBytes) {
    return { error: `Image is larger than ${Math.round(maxBytes / 1024 / 1024)} MB` };
  }

  return { buffer, contentType };
}

type RoomRow = Record<string, unknown> & { images?: unknown };

/** Every distinct embedded photo on a property, listing order first, then per-room order. */
export function collectEmbeddedPhotos(images: unknown, rooms: unknown): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  const collect = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!isEmbeddedImage(item) || seen.has(item)) continue;
      seen.add(item);
      found.push(item);
    }
  };

  collect(images);
  if (Array.isArray(rooms)) {
    for (const room of rooms as RoomRow[]) collect(room?.images);
  }

  return found;
}

/** Swap migrated photos for their stored URLs, leaving order and untouched entries alone. */
export function rewriteImageList(list: unknown, map: Map<string, string>): unknown {
  if (!Array.isArray(list)) return list;
  return list.map((item) => (typeof item === 'string' ? map.get(item) ?? item : item));
}

/** Created on demand so deployments need no manual storage setup. */
export async function ensurePropertyImageBucket(service: SupabaseClient): Promise<void> {
  const { data: existing } = await service.storage.getBucket(PROPERTY_IMAGE_BUCKET);

  if (existing) {
    const limit = existing.file_size_limit;
    if (typeof limit === 'number' && limit > 0 && limit < MAX_IMAGE_BYTES) {
      await service.storage.updateBucket(PROPERTY_IMAGE_BUCKET, {
        public: true,
        fileSizeLimit: MAX_IMAGE_BYTES,
      });
    }
    return;
  }

  const { error } = await service.storage.createBucket(PROPERTY_IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: MAX_IMAGE_BYTES,
    allowedMimeTypes: [...ALLOWED_TYPES],
  });

  // A parallel request may have created it first.
  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

/** Upload one decoded photo and return its public URL. */
export async function storePropertyImage(
  service: SupabaseClient,
  propertyId: string,
  image: DecodedImage
): Promise<string> {
  const extension = EXTENSIONS[image.contentType] ?? 'jpg';
  const unique =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${propertyId}/${unique}.${extension}`;

  const { error } = await service.storage
    .from(PROPERTY_IMAGE_BUCKET)
    .upload(path, image.buffer, {
      contentType: image.contentType,
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) throw error;

  const { data } = service.storage.from(PROPERTY_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
