import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { invalidatePropertyListingCaches } from '@/lib/cache/invalidation';
import { isAdminUser } from '@/lib/auth/isAdmin';

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

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: property, error } = await supabase
      .from('properties')
      .select('id, host_id')
      .eq('id', propertyId)
      .maybeSingle();

    if (error || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const isHost = property.host_id === user.id;
    const isAdmin = isAdminUser(user);
    if (!isHost && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await invalidatePropertyListingCaches(propertyId);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('[invalidate-cache]', e);
    const message = e instanceof Error ? e.message : 'Failed to invalidate cache';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
