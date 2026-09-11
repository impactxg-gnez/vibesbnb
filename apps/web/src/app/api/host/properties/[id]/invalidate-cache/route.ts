import { NextRequest, NextResponse } from 'next/server';
import { invalidatePropertyListingCaches } from '@/lib/cache/invalidation';
import { resolveHostPropertyAccess } from '@/lib/auth/resolveHostPropertyAccess';

/**
 * Bust Redis browse/availability caches after host edits listing fields
 * (wellness indoor/outdoor, amenities, etc.) so search cards update immediately.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    if (!propertyId) {
      return NextResponse.json({ error: 'property id required' }, { status: 400 });
    }

    const access = await resolveHostPropertyAccess(propertyId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    await invalidatePropertyListingCaches(propertyId);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('[invalidate-cache]', e);
    const message = e instanceof Error ? e.message : 'Failed to invalidate cache';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
