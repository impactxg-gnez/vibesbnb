import { NextRequest, NextResponse } from 'next/server';
import { resolveHostPropertyAccess } from '@/lib/auth/resolveHostPropertyAccess';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';
import { invalidatePropertyListingCaches } from '@/lib/cache/invalidation';
import {
  collectEmbeddedPhotos,
  decodePropertyImage,
  ensurePropertyImageBucket,
  isHttpImageUrl,
  rewriteImageList,
  storePropertyImage,
} from '@/lib/propertyImageStorage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/** Few enough photos per call to finish inside the function timeout; callers loop. */
const DEFAULT_BATCH = 6;
const MAX_BATCH = 12;

type RoomRow = Record<string, unknown> & { images?: unknown };
type AltRow = Record<string, unknown> & { url?: unknown };

/**
 * Move photos already saved as base64 into storage, rewriting the property to URLs.
 * Runs in batches and reports what is left so a listing with dozens of photos can be
 * finished by repeated calls instead of one request that would time out.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const access = await resolveHostPropertyAccess(params.id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        {
          error:
            'Server missing SUPABASE_SERVICE_ROLE_KEY, so photos cannot be moved to storage. Add it in Vercel environment variables and redeploy.',
        },
        { status: 503 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { limit?: unknown };
    const requested = Number(body.limit);
    const batchSize = Number.isFinite(requested)
      ? Math.min(Math.max(1, Math.trunc(requested)), MAX_BATCH)
      : DEFAULT_BATCH;

    const service = createServiceClient();
    const { data: row, error: readError } = await service
      .from('properties')
      .select('images, rooms, image_alts')
      .eq('id', params.id)
      .maybeSingle();

    if (readError) throw readError;
    if (!row) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const embedded = collectEmbeddedPhotos(row.images, row.rooms);
    const total = Array.isArray(row.images) ? row.images.length : 0;

    if (embedded.length === 0) {
      return NextResponse.json({ total, migrated: 0, remaining: 0, failed: [] });
    }

    await ensurePropertyImageBucket(service);

    const map = new Map<string, string>();
    const failed: string[] = [];

    for (const dataUrl of embedded.slice(0, batchSize)) {
      const decoded = decodePropertyImage(dataUrl);
      if ('error' in decoded) {
        failed.push(decoded.error);
        continue;
      }
      try {
        map.set(dataUrl, await storePropertyImage(service, params.id, decoded));
      } catch (error) {
        failed.push(error instanceof Error ? error.message : 'Upload failed');
        break;
      }
    }

    if (map.size === 0) {
      return NextResponse.json(
        { error: failed[0] || 'No photos could be moved to storage', failed },
        { status: 502 }
      );
    }

    const images = rewriteImageList(row.images, map);
    const rooms = Array.isArray(row.rooms)
      ? (row.rooms as RoomRow[]).map((room) =>
          room && typeof room === 'object'
            ? { ...room, images: rewriteImageList(room.images, map) }
            : room
        )
      : row.rooms;
    const imageAlts = Array.isArray(row.image_alts)
      ? (row.image_alts as AltRow[]).map((alt) =>
          alt && typeof alt === 'object' && typeof alt.url === 'string'
            ? { ...alt, url: map.get(alt.url) ?? alt.url }
            : alt
        )
      : row.image_alts;

    const update: Record<string, unknown> = {
      images,
      rooms,
      image_alts: imageAlts,
      updated_at: new Date().toISOString(),
    };

    const firstHttp = Array.isArray(images) ? images.find(isHttpImageUrl) : undefined;
    if (firstHttp) update.cover_image = firstHttp;

    const { error: writeError } = await service
      .from('properties')
      .update(update)
      .eq('id', params.id);

    if (writeError) throw writeError;

    void invalidatePropertyListingCaches(params.id);

    return NextResponse.json({
      total,
      migrated: map.size,
      remaining: Math.max(0, embedded.length - map.size),
      failed,
    });
  } catch (error: unknown) {
    console.error('[host/properties images migrate]', error);
    const message = error instanceof Error ? error.message : 'Photo migration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
